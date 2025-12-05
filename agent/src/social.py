"""
Social media integration.

Handles Twitter posts and Blinks creation for viral growth.
AI-powered agent that posts engaging updates about challenges.
"""

import logging
import asyncio
import time
from typing import Optional, Dict, Any, List, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    import tweepy
from datetime import datetime, timezone
import random
from enum import Enum
from dataclasses import dataclass
from collections import deque

try:
    import tweepy
    TWITTER_AVAILABLE = True
except ImportError:
    TWITTER_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("tweepy not installed. Twitter features will be disabled.")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from config import settings
from database import execute_query

if TWITTER_AVAILABLE:
    logger = logging.getLogger(__name__)
else:
    logger = logging.getLogger(__name__)


class SocialEventType(str, Enum):
    """Types of social events that can trigger tweets."""
    POOL_CREATED = "pool_created"
    POOL_MIDWAY = "pool_midway"
    POOL_COMPLETED = "pool_completed"


@dataclass
class TweetTask:
    """Represents a tweet task in the queue."""
    event_type: SocialEventType
    pool_id: int
    created_at: float
    retry_count: int = 0
    max_retries: int = 5
    next_retry_at: Optional[float] = None


@dataclass
class TwitterAccount:
    """Represents a Twitter account with its own rate limits."""
    account_id: int
    client: Any  # tweepy.Client - using Any to avoid circular import
    api_key: str
    api_secret: str
    access_token: str
    access_token_secret: str
    rate_limit_remaining: int = 300  # Track remaining quota
    rate_limit_limit: int = 300  # Total limit per window
    rate_limit_reset_time: Optional[float] = None  # When limit resets (Unix timestamp)
    rate_limit_until: Optional[float] = None  # When we can use this account again


class SocialManager:
    """Manages social media interactions with AI-powered content generation"""
    
    def __init__(self):
        self.twitter_enabled = False
        self.twitter_client = None  # Keep for backward compatibility
        self.ai_client = None
        self.last_post_time: Dict[int, float] = {}  # Track last post time per pool
        self.post_interval = 3600  # Post updates every hour per pool
        # Event-level rate limiting (per pool, per event type)
        self.last_event_post_time: Dict[Tuple[int, SocialEventType], float] = {}
        # URL bases
        self.app_base_url = getattr(settings, "APP_BASE_URL", "https://commitment-parties.vercel.app")
        self.action_base_url = getattr(
            settings,
            "ACTION_BASE_URL",
            "https://commitment-backend.onrender.com/solana/actions",
        )
        
        # Tweet queue for non-blocking posts
        self.tweet_queue: asyncio.Queue = asyncio.Queue()
        self.queue_worker_running = False
        self.rate_limit_until: Optional[float] = None  # Track when rate limit resets (global fallback)
        self.retry_delays = [60, 300, 900, 1800, 3600]  # Exponential backoff: 1min, 5min, 15min, 30min, 1hr
        
        # Multiple Twitter accounts
        self.twitter_accounts: List[TwitterAccount] = []
        self.current_account_index = 0
        
        # Initialize Twitter accounts
        if TWITTER_AVAILABLE:
            self._initialize_twitter_accounts()
        
        # Initialize AI client (optional - for enhanced tweet generation)
        if OPENAI_AVAILABLE:
            api_key = getattr(settings, 'OPENAI_API_KEY', None)
            if api_key:
                try:
                    self.ai_client = OpenAI(api_key=api_key)
                    logger.info("OpenAI client initialized for tweet generation")
                except Exception as e:
                    logger.warning(f"OpenAI not configured: {e}")
    
    def _initialize_twitter_accounts(self):
        """Initialize all configured Twitter accounts."""
        accounts_config = []
        
        # Account 1 (primary)
        if (settings.TWITTER_API_KEY and settings.TWITTER_API_SECRET and
            settings.TWITTER_ACCESS_TOKEN and settings.TWITTER_ACCESS_TOKEN_SECRET):
            accounts_config.append({
                'id': 1,
                'key': settings.TWITTER_API_KEY,
                'secret': settings.TWITTER_API_SECRET,
                'token': settings.TWITTER_ACCESS_TOKEN,
                'token_secret': settings.TWITTER_ACCESS_TOKEN_SECRET,
            })
        
        # Account 2 (secondary)
        if (hasattr(settings, 'TWITTER_API_KEY_2') and settings.TWITTER_API_KEY_2 and
            hasattr(settings, 'TWITTER_API_SECRET_2') and settings.TWITTER_API_SECRET_2 and
            hasattr(settings, 'TWITTER_ACCESS_TOKEN_2') and settings.TWITTER_ACCESS_TOKEN_2 and
            hasattr(settings, 'TWITTER_ACCESS_TOKEN_SECRET_2') and settings.TWITTER_ACCESS_TOKEN_SECRET_2):
            accounts_config.append({
                'id': 2,
                'key': settings.TWITTER_API_KEY_2,
                'secret': settings.TWITTER_API_SECRET_2,
                'token': settings.TWITTER_ACCESS_TOKEN_2,
                'token_secret': settings.TWITTER_ACCESS_TOKEN_SECRET_2,
            })
        
        # Initialize clients
        for config in accounts_config:
            try:
                client = tweepy.Client(
                    consumer_key=config['key'],
                    consumer_secret=config['secret'],
                    access_token=config['token'],
                    access_token_secret=config['token_secret'],
                    wait_on_rate_limit=False  # We handle rate limits ourselves
                )
                
                account = TwitterAccount(
                    account_id=config['id'],
                    client=client,
                    api_key=config['key'],
                    api_secret=config['secret'],
                    access_token=config['token'],
                    access_token_secret=config['token_secret'],
                )
                
                self.twitter_accounts.append(account)
                logger.info(f"Twitter account {config['id']} initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twitter account {config['id']}: {e}")
        
        if self.twitter_accounts:
            self.twitter_enabled = True
            # Set primary client for backward compatibility
            self.twitter_client = self.twitter_accounts[0].client
            logger.info(f"Initialized {len(self.twitter_accounts)} Twitter account(s)")
        else:
            self.twitter_enabled = False
            logger.warning("No Twitter accounts configured")
    
    def get_next_available_account(self) -> Optional[TwitterAccount]:
        """Get the next available Twitter account with rate limit capacity."""
        if not self.twitter_accounts:
            return None
        
        current_time = time.time()
        
        # Try each account in rotation
        for i in range(len(self.twitter_accounts)):
            idx = (self.current_account_index + i) % len(self.twitter_accounts)
            account = self.twitter_accounts[idx]
            
            # Check if account is rate limited
            if account.rate_limit_until and current_time < account.rate_limit_until:
                continue
            
            # Check if account has remaining quota (with safety margin)
            if account.rate_limit_remaining > 5:  # Keep 5 tweet buffer
                self.current_account_index = idx
                return account
        
        # All accounts rate limited or low quota
        return None
    
    def create_blink(self, pool_id: int, pool_pubkey: Optional[str] = None) -> str:
        """
        Create a Solana Blink (Action) URL for joining a pool.
        
        This should point to a Solana Action endpoint that returns
        the transaction to join the pool. When shared on Twitter/X,
        this URL can be rendered as a Blink button.
        
        Args:
            pool_id: ID of the pool
            pool_pubkey: Optional on-chain pool public key (currently unused,
                         but kept for future customization)
        
        Returns:
            Blink/Action URL
        """
        # Example: https://commitment-backend.onrender.com/solana/actions/join-pool?pool_id=123
        return f"{self.action_base_url}/join-pool?pool_id={pool_id}"

    def create_app_link(self, pool_id: int) -> str:
        """
        Create a link to the pool page in the web app.
        
        Args:
            pool_id: ID of the pool
        
        Returns:
            App URL to view pool details
        """
        return f"{self.app_base_url}/pools/{pool_id}"

    @staticmethod
    def _truncate_body(text: str, max_len: int) -> str:
        """Truncate a text body to max_len characters with ellipsis if needed."""
        if len(text) <= max_len:
            return text
        if max_len <= 3:
            return text[:max_len]
        return text[: max_len - 3].rstrip() + "..."

    def build_full_tweet(self, body: str, blink_url: str, app_url: str) -> str:
        """
        Combine a tweet body with Blink and app links, respecting Twitter's limit.
        
        We conservatively enforce 280 characters including both URLs.
        If needed, the body is truncated to make room for links.
        """
        trailer = f"\n\n🔗 Join: {blink_url}\n🌐 Details: {app_url}"
        max_len = 280
        if len(body) + len(trailer) <= max_len:
            return body + trailer
        
        # Try truncating body while keeping both links
        available = max_len - len(trailer) - 3  # 3 for "..."
        if available <= 0:
            # As a last resort, drop the app link and keep only the Blink
            trailer = f"\n\n🔗 Join: {blink_url}"
            available = max_len - len(trailer) - 3
        truncated_body = self._truncate_body(body, max_len=available)
        return truncated_body + trailer
    
    def generate_tweet_content(self, pool: Dict[str, Any], stats: Dict[str, Any]) -> str:
        """
        Generate engaging tweet content using AI or templates.
        
        Includes challenge-specific information for better context.
        
        Args:
            pool: Pool data from database
            stats: Calculated pool statistics
        
        Returns:
            Tweet text (max 280 characters)
        """
        pool_name = pool.get("name", "Challenge")
        goal_type = pool.get("goal_type", "unknown").lower()
        goal_metadata = pool.get("goal_metadata") or {}
        if not isinstance(goal_metadata, dict):
            goal_metadata = {}
        
        participant_count = stats.get("participant_count", 0)
        total_staked = stats.get("total_staked", 0.0)
        days_remaining = stats.get("days_remaining", 0)
        eliminations = stats.get("eliminations", 0)
        active_participants = participant_count - eliminations
        
        # Build challenge context
        challenge_info = ""
        if goal_type == "hodl_token":
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            challenge_info = f"💎 HODL {token_symbol}"
        elif goal_type == "dailydca" or goal_type == "daily_dca":
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            challenge_info = f"💰 DCA {token_symbol}"
        elif goal_type == "lifestyle_habit":
            habit_name = goal_metadata.get("habit_name") or "Lifestyle"
            challenge_info = f"🏃 {habit_name}"
        
        # Try AI generation first if available
        if self.ai_client:
            try:
                prompt = f"""Create an engaging Twitter post about a commitment challenge pool:
- Pool name: {pool_name}
- Challenge type: {challenge_info or goal_type}
- Participants: {participant_count} total, {active_participants} still active
- Total staked: {total_staked:.2f} SOL
- Days remaining: {days_remaining}
- Eliminations: {eliminations}

Make it exciting, use emojis, and keep it under 250 characters. Include a call to action."""
                
                response = self.ai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a social media expert who creates viral Twitter posts about crypto challenges and accountability games."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=100,
                    temperature=0.8
                )
                
                tweet = response.choices[0].message.content.strip()
                # Remove quotes if present
                tweet = tweet.strip('"').strip("'")
                
                if len(tweet) <= 250:
                    return tweet
            except Exception as e:
                logger.warning(f"AI tweet generation failed: {e}, falling back to template")
        
        # Template-based generation (fallback) with challenge context
        goal_emojis = {
            "daily_dca": "💰",
            "dailydca": "💰",
            "hodl_token": "💎",
            "lifestyle_habit": "🏃"
        }
        emoji = goal_emojis.get(goal_type, "🎯")
        
        # Include challenge info in templates if available
        challenge_prefix = f"{challenge_info} " if challenge_info else ""
        
        templates = [
            f"{emoji} {challenge_prefix}{pool_name} Update!\n\n"
            f"👥 {active_participants}/{participant_count} still in\n"
            f"💰 {total_staked:.2f} SOL at stake\n"
            f"⏰ {days_remaining} days left\n\n"
            f"Join the competition!",
            
            f"🔥 {challenge_prefix}{pool_name} is heating up!\n\n"
            f"💪 {active_participants} warriors still fighting\n"
            f"💵 {total_staked:.2f} SOL prize pool\n"
            f"📉 {eliminations} eliminated\n\n"
            f"Who will win?",
            
            f"⚡ {challenge_prefix}{pool_name} Challenge\n\n"
            f"🎯 {active_participants} active participants\n"
            f"🏆 {total_staked:.2f} SOL up for grabs\n"
            f"⏳ {days_remaining} days remaining\n\n"
            f"Join now and compete!",
        ]
        
        tweet = random.choice(templates)
        
        # Ensure it fits Twitter's character limit
        if len(tweet) > 280:
            tweet = tweet[:277] + "..."
        
        return tweet
    
    def _format_signup_deadline(self, pool: Dict[str, Any]) -> str:
        """Format the sign-up deadline based on recruitment or start times."""
        recruitment_hours = pool.get("recruitment_period_hours")
        start_ts = pool.get("start_timestamp")
        end_ts = pool.get("end_timestamp")
        ts: Optional[int] = None
        if recruitment_hours and start_ts:
            # Approximate recruitment end as start time
            ts = start_ts
        elif start_ts:
            ts = start_ts
        elif end_ts:
            ts = end_ts
        if not ts:
            return "soon"
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        return dt.strftime("%b %d, %H:%M UTC")

    def _format_winner_handle(self, participant: Dict[str, Any]) -> str:
        """Format a short handle for a winner, based on wallet address."""
        wallet = participant.get("wallet_address") or ""
        if not wallet or len(wallet) < 8:
            return "winner"
        return f"{wallet[:4]}...{wallet[-4:]}"
    
    def _get_token_symbol(self, token_mint: Optional[str]) -> str:
        """
        Get token symbol from mint address.
        Returns symbol if known, otherwise returns shortened mint address.
        """
        if not token_mint:
            return "SOL"
        
        # Popular token mappings (matching frontend tokens.ts)
        token_map = {
            "So11111111111111111111111111111111111111112": "SOL",
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
            "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
            "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
            "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
            "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP",
        }
        
        # Case-insensitive lookup
        token_mint_lower = token_mint.lower()
        for mint, symbol in token_map.items():
            if mint.lower() == token_mint_lower:
                return symbol
        
        # If not found, return shortened mint (first 4 + last 4 chars)
        if len(token_mint) > 8:
            return f"{token_mint[:4]}...{token_mint[-4:]}"
        return token_mint
    
    def _format_recruitment_time_remaining(self, pool: Dict[str, Any]) -> Optional[str]:
        """
        Calculate and format how long recruitment is still open.
        Returns formatted string like "2h", "1d", "3d 5h", or None if recruitment closed.
        """
        current_time = int(time.time())
        scheduled_start = pool.get("scheduled_start_time")
        recruitment_hours = pool.get("recruitment_period_hours", 0)
        
        # If no scheduled start or recruitment already closed, return None
        if not scheduled_start or current_time >= scheduled_start:
            return None
        
        # Calculate time remaining
        seconds_remaining = scheduled_start - current_time
        
        if seconds_remaining <= 0:
            return None
        
        hours_remaining = seconds_remaining // 3600
        days_remaining = hours_remaining // 24
        hours_in_day = hours_remaining % 24
        
        if days_remaining > 0:
            if hours_in_day > 0:
                return f"{days_remaining}d {hours_in_day}h"
            return f"{days_remaining}d"
        elif hours_remaining > 0:
            return f"{hours_remaining}h"
        else:
            minutes_remaining = seconds_remaining // 60
            if minutes_remaining > 0:
                return f"{minutes_remaining}m"
            return "soon"

    def generate_new_pool_tweet(self, pool: Dict[str, Any], stats: Dict[str, Any]) -> str:
        """
        Generate tweet text for a newly created/activated pool.
        
        Includes challenge-specific details: coin, amount, stake, max participants, recruitment time.
        """
        name = pool.get("name", "New Challenge")
        goal_type = pool.get("goal_type", "").lower()
        goal_metadata = pool.get("goal_metadata") or {}
        if not isinstance(goal_metadata, dict):
            goal_metadata = {}
        
        stake = float(pool.get("stake_amount", 0.0))
        max_participants = pool.get("max_participants", 0)
        recruitment_time = self._format_recruitment_time_remaining(pool)
        
        # Build challenge-specific content
        challenge_details = []
        
        if goal_type == "hodl_token":
            # HODL challenge: coin, amount, stake, max participants, recruitment time
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            min_balance_raw = goal_metadata.get("min_balance")
            
            # Get token decimals (default to 9 for SOL)
            token_decimals = 9
            if token_symbol == "USDC" or token_symbol == "USDT":
                token_decimals = 6
            elif token_symbol == "BONK":
                token_decimals = 5
            elif token_symbol == "RAY" or token_symbol == "JUP":
                token_decimals = 6
            
            if min_balance_raw is not None:
                min_balance_tokens = float(min_balance_raw) / (10 ** token_decimals)
                challenge_details.append(f"💎 Hold {min_balance_tokens:.2f} {token_symbol}")
            else:
                challenge_details.append(f"💎 Hold {token_symbol}")
            
        elif goal_type == "dailydca" or goal_type == "daily_dca":
            # DCA challenge: coin, amount per trade, stake, max participants, recruitment time
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            dca_amount_raw = goal_metadata.get("amount")
            
            # Get token decimals
            token_decimals = 9
            if token_symbol == "USDC" or token_symbol == "USDT":
                token_decimals = 6
            elif token_symbol == "BONK":
                token_decimals = 5
            elif token_symbol == "RAY" or token_symbol == "JUP":
                token_decimals = 6
            
            if dca_amount_raw is not None:
                dca_amount_tokens = float(dca_amount_raw) / (10 ** token_decimals)
                challenge_details.append(f"💰 DCA {dca_amount_tokens:.2f} {token_symbol}/day")
            else:
                challenge_details.append(f"💰 DCA {token_symbol}")
                
        elif goal_type == "lifestyle_habit":
            # Lifestyle challenge: habit name, stake, max participants, recruitment time
            habit_name = goal_metadata.get("habit_name") or goal_metadata.get("summary") or "Lifestyle Habit"
            challenge_details.append(f"🏃 {habit_name}")
        
        # Add common details
        challenge_details.append(f"💵 Stake: {stake:.2f} SOL")
        challenge_details.append(f"👥 Max: {max_participants} participants")
        
        if recruitment_time:
            challenge_details.append(f"⏰ Recruiting for: {recruitment_time}")
        else:
            signup_deadline = self._format_signup_deadline(pool)
            challenge_details.append(f"⏰ Sign-up: {signup_deadline}")
        
        # Build tweet
        base = f"🎉 New challenge: {name}\n\n"
        base += "\n".join(challenge_details)
        
        return self._truncate_body(base, max_len=220)

    def generate_midway_tweet(self, pool: Dict[str, Any], stats: Dict[str, Any]) -> str:
        """
        Generate tweet text for a mid-challenge update.
        
        Highlights challenge details, how many participants remain, and time left.
        """
        name = pool.get("name", "Challenge")
        goal_type = pool.get("goal_type", "").lower()
        goal_metadata = pool.get("goal_metadata") or {}
        if not isinstance(goal_metadata, dict):
            goal_metadata = {}
        
        active = stats.get("active_participants", 0)
        total = stats.get("participant_count", 0)
        days_left = stats.get("days_remaining", 0)
        total_staked = stats.get("total_staked", float(pool.get("total_staked", 0.0)))
        
        # Add challenge-specific context
        challenge_context = ""
        if goal_type == "hodl_token":
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            challenge_context = f"💎 HODL {token_symbol} Challenge"
        elif goal_type == "dailydca" or goal_type == "daily_dca":
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            challenge_context = f"💰 DCA {token_symbol} Challenge"
        elif goal_type == "lifestyle_habit":
            habit_name = goal_metadata.get("habit_name") or "Lifestyle"
            challenge_context = f"🏃 {habit_name} Challenge"
        
        base = f"⚡ {name} is halfway through!\n"
        if challenge_context:
            base += f"{challenge_context}\n"
        base += (
            f"👥 {active}/{total} still in the game\n"
            f"💰 {total_staked:.2f} SOL on the line\n"
            f"⏳ {days_left} days left"
        )
        return self._truncate_body(base, max_len=220)

    def generate_completed_tweet(self, pool: Dict[str, Any], stats: Dict[str, Any], winners: List[Dict[str, Any]]) -> str:
        """
        Generate tweet text for the end of a challenge with podium-style winners.
        """
        name = pool.get("name", "Challenge")
        total_staked = stats.get("total_staked", float(pool.get("total_staked", 0.0)))
        emojis = ["🥇", "🥈", "🥉"]
        podium_lines: List[str] = []
        for i, participant in enumerate(winners[:3]):
            handle = self._format_winner_handle(participant)
            reward = participant.get("final_reward")
            try:
                reward_val = float(reward) if reward is not None else None
            except (TypeError, ValueError):
                reward_val = None
            if reward_val is not None and reward_val > 0:
                line = f"{emojis[i]} {handle} (+{reward_val:.2f} SOL)"
            else:
                line = f"{emojis[i]} {handle}"
            podium_lines.append(line)
        if not podium_lines:
            podium_text = "🏅 Congrats to everyone who stuck it out!"
        else:
            podium_text = "\n".join(podium_lines)
        base = (
            f"🏁 {name} has finished!\n"
            f"💰 Final pool: {total_staked:.2f} SOL\n"
            f"{podium_text}"
        )
        return self._truncate_body(base, max_len=220)
    
    def _is_pool_at_midway(self, pool: Dict[str, Any]) -> bool:
        """
        Check if a pool is at or past its midway point.
        
        Midway is defined as: elapsed time >= 50% of total duration
        But we only post once, so we check if we're between 45% and 75% of the way through.
        
        Args:
            pool: Pool data from database
            
        Returns:
            True if pool is at midway point (between 45% and 75% complete)
        """
        current_time = int(time.time())
        start_time = pool.get("start_timestamp")
        end_time = pool.get("end_timestamp")
        
        if not start_time or not end_time:
            return False
        
        # Calculate total duration and elapsed time
        total_duration = end_time - start_time
        elapsed_time = current_time - start_time
        
        if total_duration <= 0 or elapsed_time < 0:
            return False
        
        # Calculate percentage complete
        percent_complete = (elapsed_time / total_duration) * 100
        
        # Midway point: between 45% and 75% complete
        # This gives us a window to post the midway tweet
        is_at_midway = 45 <= percent_complete <= 75
        
        if is_at_midway:
            logger.debug(
                f"Pool {pool.get('pool_id')} is at midway point: "
                f"{percent_complete:.1f}% complete ({elapsed_time}/{total_duration} seconds)"
            )
        
        return is_at_midway
    
    async def get_pool_stats(self, pool: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate interesting statistics for a pool.
        
        Args:
            pool: Pool data from database
        
        Returns:
            Dictionary with pool statistics
        """
        pool_id = pool.get("pool_id")
        current_time = int(time.time())
        start_time = pool.get("start_timestamp", current_time)
        end_time = pool.get("end_timestamp", current_time)
        
        # Calculate days remaining
        if current_time < end_time:
            days_remaining = (end_time - current_time) // 86400
        else:
            days_remaining = 0
        
        # Get participants
        try:
            participants = await execute_query(
                table="participants",
                operation="select",
                filters={"pool_id": pool_id}
            )
            
            total_participants = len(participants)
            
            # Count active vs eliminated
            active_count = sum(1 for p in participants if p.get("status") == "active")
            eliminated_count = total_participants - active_count
            
            # Get total staked
            total_staked = float(pool.get("total_staked", 0.0))
            
            return {
                "participant_count": total_participants,
                "active_participants": active_count,
                "eliminations": eliminated_count,
                "total_staked": total_staked,
                "days_remaining": days_remaining,
                "days_elapsed": (current_time - start_time) // 86400 if current_time > start_time else 0,
            }
        except Exception as e:
            logger.error(f"Error calculating pool stats: {e}")
            return {
                "participant_count": pool.get("participant_count", 0),
                "active_participants": pool.get("participant_count", 0),
                "eliminations": 0,
                "total_staked": float(pool.get("total_staked", 0.0)),
                "days_remaining": days_remaining,
                "days_elapsed": 0,
            }
    
    async def _get_pool(self, pool_id: int) -> Optional[Dict[str, Any]]:
        """Fetch a single pool from the database."""
        try:
            pools = await execute_query(
                table="pools",
                operation="select",
                filters={"pool_id": pool_id},
                limit=1,
            )
            return pools[0] if pools else None
        except Exception as e:
            logger.error(f"Error fetching pool {pool_id}: {e}", exc_info=True)
            return None

    async def _get_winners(self, pool_id: int) -> List[Dict[str, Any]]:
        """
        Fetch winners for a completed pool.
        
        We consider participants with status 'winner' or 'completed' as winners.
        """
        try:
            participants = await execute_query(
                table="participants",
                operation="select",
                filters={"pool_id": pool_id},
            )
            winners = [
                p
                for p in participants
                if p.get("status") in ("winner", "completed")
            ]
            # Sort by final_reward if available
            def reward_key(p: Dict[str, Any]) -> float:
                val = p.get("final_reward")
                try:
                    return float(val) if val is not None else 0.0
                except (TypeError, ValueError):
                    return 0.0
            winners.sort(key=reward_key, reverse=True)
            return winners[:3]
        except Exception as e:
            logger.error(f"Error fetching winners for pool {pool_id}: {e}", exc_info=True)
            return []

    async def post_pool_update(self, pool_id: int, pool: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Post an update about a specific pool to Twitter.
        
        Args:
            pool_id: ID of the pool
            pool: Optional pool data (will fetch if not provided)
        
        Returns:
            Tweet ID if successful, None otherwise
        """
        try:
            if not self.twitter_enabled or not self.twitter_client:
                logger.warning("Twitter not configured, skipping post")
                return None
            
            # Check if we've posted recently (rate limiting)
            last_post = self.last_post_time.get(pool_id, 0)
            if time.time() - last_post < self.post_interval:
                logger.debug(f"Skipping post for pool {pool_id} (too recent)")
                return None
            
            # Fetch pool data if not provided
            if not pool:
                pools = await execute_query(
                    table="pools",
                    operation="select",
                    filters={"pool_id": pool_id},
                    limit=1
                )
                if not pools:
                    logger.warning(f"Pool {pool_id} not found")
                    return None
                pool = pools[0]
            
            # Only post about active pools
            if pool.get("status") != "active":
                logger.debug(f"Skipping post for pool {pool_id} (status: {pool.get('status')})")
                return None
            
            # Calculate stats
            stats = await self.get_pool_stats(pool)
            
            # Generate tweet content
            tweet_text = self.generate_tweet_content(pool, stats)
            
            # Create Blink URL
            pool_pubkey = pool.get("pool_pubkey")
            blink_url = self.create_blink(pool_id, pool_pubkey)
            
            # Add Blink to tweet (Twitter will automatically convert to action button)
            full_tweet = f"{tweet_text}\n\n🔗 Join: {blink_url}"
            
            # Ensure it fits Twitter's limit
            if len(full_tweet) > 280:
                # Truncate tweet text to make room for link
                max_tweet_len = 280 - len(blink_url) - 10  # 10 chars for spacing/formatting
                tweet_text = tweet_text[:max_tweet_len - 3] + "..."
                full_tweet = f"{tweet_text}\n\n🔗 Join: {blink_url}"
            
            # Post to Twitter - use new account system if available
            logger.info(f"Posting update for pool {pool_id} to Twitter")
            
            # Try to use new account system first
            account = self.get_next_available_account()
            if account:
                try:
                    response = account.client.create_tweet(text=full_tweet)
                    # Update rate limit tracking
                    rate_limit_info = self._extract_rate_limit_headers(response)
                    if rate_limit_info['remaining'] is not None:
                        account.rate_limit_remaining = rate_limit_info['remaining']
                except tweepy.Unauthorized:
                    logger.error(
                        f"Twitter account {account.account_id} authentication failed (401 Unauthorized). "
                        f"Check credentials in agent/.env - they may be invalid or expired."
                    )
                    return None
            elif self.twitter_client:
                # Fallback to old client (backward compatibility)
                response = self.twitter_client.create_tweet(text=full_tweet)
            else:
                logger.error("No Twitter client available")
                return None
            
            tweet_id = response.data.get("id") if response and response.data else None
            
            if tweet_id:
                self.last_post_time[pool_id] = time.time()
                logger.info(f"Successfully posted tweet {tweet_id} for pool {pool_id}")
                return tweet_id
            else:
                logger.warning(f"Tweet posted but no ID returned for pool {pool_id}")
            return None
        
        except tweepy.Forbidden as e:
            # Check if this is a duplicate content error
            error_message = str(e).lower()
            if "duplicate content" in error_message or "duplicate" in error_message:
                # Tweet was already posted - treat as success
                logger.info(
                    f"Tweet for pool {pool_id} already exists (duplicate content). "
                    f"Marking as posted."
                )
                # Update last post time to prevent immediate retry
                self.last_post_time[pool_id] = time.time()
                return "duplicate"
            else:
                # Other 403 errors - log and return None
                logger.error(f"Twitter forbidden (403) for pool {pool_id}: {e}")
                return None
        except tweepy.Unauthorized as e:
            logger.error(
                f"Twitter authentication failed (401 Unauthorized) for pool {pool_id}. "
                f"Check Twitter credentials in agent/.env - they may be invalid, expired, or the app permissions may have changed."
            )
            return None
        except tweepy.TooManyRequests:
            logger.warning("Twitter rate limit reached, skipping post")
            return None
        except Exception as e:
            logger.error(f"Error posting to Twitter: {e}", exc_info=True)
            return None
    
    async def post_event_update(
        self,
        event_type: SocialEventType,
        pool_id: int,
    ) -> Optional[str]:
        """
        Queue a tweet for a specific social event (new, midway, completed).
        
        This is the main entry point for event-driven tweets.
        Returns immediately after queuing - doesn't block on actual posting.
        """
        try:
            if not self.twitter_enabled or not self.twitter_client:
                logger.info("Twitter not configured, skipping social event post")
                return None
            
            key = (pool_id, event_type)
            last = self.last_event_post_time.get(key, 0.0)
            # Reuse post_interval for event-level spacing
            if time.time() - last < self.post_interval:
                logger.debug(f"Skipping event {event_type} for pool {pool_id} (too recent)")
                return None
            
            # Validate pool before queuing
            pool = await self._get_pool(pool_id)
            if not pool:
                logger.warning(f"Pool {pool_id} not found for event {event_type}")
                return None
            
            status = pool.get("status")
            
            # Skip immediate start pools for POOL_CREATED events
            if event_type is SocialEventType.POOL_CREATED:
                recruitment_hours = pool.get("recruitment_period_hours", 24)
                scheduled_start = pool.get("scheduled_start_time")
                # Immediate start pools have recruitment_period_hours == 0 or no scheduled_start_time
                if recruitment_hours == 0 or scheduled_start is None:
                    logger.debug(
                        f"Skipping POOL_CREATED tweet for pool {pool_id} "
                        f"(immediate start pool - recruitment_hours={recruitment_hours}, "
                        f"scheduled_start={scheduled_start})"
                    )
                    return None
                if status not in ("pending", "active"):
                    logger.debug(f"Skipping event {event_type} for pool {pool_id} (status={status})")
                    return None
            elif event_type is SocialEventType.POOL_MIDWAY:
                if status not in ("pending", "active"):
                    logger.debug(f"Skipping event {event_type} for pool {pool_id} (status={status})")
                    return None
            elif event_type is SocialEventType.POOL_COMPLETED:
                if status not in ("completed", "ended", "finished"):
                    logger.debug(f"Skipping completed event for pool {pool_id} (status={status})")
                    return None
            
            # Queue the tweet task (non-blocking)
            task = TweetTask(
                event_type=event_type,
                pool_id=pool_id,
                created_at=time.time(),
                retry_count=0
            )
            await self.tweet_queue.put(task)
            logger.info(f"Queued {event_type.value} tweet for pool {pool_id} (queue size: {self.tweet_queue.qsize()})")
            
            # Return a placeholder - actual tweet ID will be logged by worker
            return "queued"
            
        except Exception as e:
            logger.error(f"Error queuing event update for pool {pool_id}: {e}", exc_info=True)
            return None
    
    async def _tweet_queue_worker(self):
        """
        Background worker that processes the tweet queue.
        Handles rate limits, retries, and exponential backoff.
        """
        if self.queue_worker_running:
            return
        self.queue_worker_running = True
        logger.info("Tweet queue worker started")
        
        while True:
            try:
                # Check if we're rate limited
                current_time = time.time()
                if self.rate_limit_until and current_time < self.rate_limit_until:
                    wait_time = self.rate_limit_until - current_time
                    logger.debug(f"Rate limited, waiting {wait_time:.0f} seconds")
                    await asyncio.sleep(min(wait_time, 60))  # Check every minute max
                    continue
                
                # Get next task (with timeout to check rate limits periodically)
                try:
                    task: TweetTask = await asyncio.wait_for(
                        self.tweet_queue.get(), 
                        timeout=60.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # Check if task should be retried now
                if task.next_retry_at and current_time < task.next_retry_at:
                    # Put it back and wait
                    await self.tweet_queue.put(task)
                    await asyncio.sleep(min(task.next_retry_at - current_time, 60))
                    continue
                
                # Process the tweet
                tweet_id = await self._process_tweet_task(task)
                
                if tweet_id:
                    # Success (including duplicate content - tweet already exists)
                    key = (task.pool_id, task.event_type)
                    self.last_event_post_time[key] = time.time()
                    if tweet_id == "duplicate":
                        logger.info(
                            f"Tweet for pool {task.pool_id} ({task.event_type.value}) already posted "
                            f"(duplicate detected). Marked as completed."
                        )
                    else:
                        logger.info(f"Successfully posted tweet {tweet_id} for pool {task.pool_id} ({task.event_type.value})")
                else:
                    # Failed - retry or give up
                    if task.retry_count < task.max_retries:
                        task.retry_count += 1
                        delay = self.retry_delays[min(task.retry_count - 1, len(self.retry_delays) - 1)]
                        task.next_retry_at = current_time + delay
                        await self.tweet_queue.put(task)
                        logger.warning(
                            f"Tweet failed for pool {task.pool_id}, retrying in {delay}s "
                            f"(attempt {task.retry_count}/{task.max_retries})"
                        )
                    else:
                        logger.error(
                            f"Tweet failed for pool {task.pool_id} after {task.max_retries} retries, giving up"
                        )
                
                # Mark task as done
                self.tweet_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error in tweet queue worker: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying
    
    def _extract_rate_limit_headers(self, response) -> Dict[str, Any]:
        """Extract rate limit information from Twitter API response headers."""
        rate_limit_info = {
            'remaining': None,
            'limit': None,
            'reset_time': None
        }
        
        try:
            # Tweepy v4+ stores response in response attribute
            if hasattr(response, 'response') and response.response:
                headers = getattr(response.response, 'headers', {})
            elif hasattr(response, 'headers'):
                headers = response.headers
            else:
                return rate_limit_info
            
            # Extract rate limit headers
            remaining = headers.get('x-rate-limit-remaining')
            limit = headers.get('x-rate-limit-limit')
            reset = headers.get('x-rate-limit-reset')
            
            if remaining is not None:
                try:
                    rate_limit_info['remaining'] = int(remaining)
                except (ValueError, TypeError):
                    pass
            
            if limit is not None:
                try:
                    rate_limit_info['limit'] = int(limit)
                except (ValueError, TypeError):
                    pass
            
            if reset is not None:
                try:
                    rate_limit_info['reset_time'] = float(reset)
                except (ValueError, TypeError):
                    pass
        except Exception as e:
            logger.debug(f"Error extracting rate limit headers: {e}")
        
        return rate_limit_info
    
    async def _process_tweet_task(self, task: TweetTask) -> Optional[str]:
        """Process a single tweet task - actually posts to Twitter using account rotation."""
        # Get available account
        account = self.get_next_available_account()
        if not account:
            # All accounts rate limited - find earliest reset time
            reset_times = [
                a.rate_limit_reset_time for a in self.twitter_accounts
                if a.rate_limit_reset_time
            ]
            if reset_times:
                min_reset = min(reset_times)
                self.rate_limit_until = min_reset
                wait_time = min_reset - time.time()
                logger.warning(
                    f"All Twitter accounts rate limited. "
                    f"Will retry after {wait_time:.0f} seconds "
                    f"(Account 1: {self.twitter_accounts[0].rate_limit_remaining if self.twitter_accounts else 0} remaining, "
                    f"Account 2: {self.twitter_accounts[1].rate_limit_remaining if len(self.twitter_accounts) > 1 else 'N/A'} remaining)"
                )
            else:
                # Fallback to 15 minutes
                self.rate_limit_until = time.time() + 900
                logger.warning("All Twitter accounts rate limited. Will retry after 900 seconds")
            return None
        
        try:
            pool = await self._get_pool(task.pool_id)
            if not pool:
                logger.warning(f"Pool {task.pool_id} not found, skipping tweet")
                return None
            
            stats = await self.get_pool_stats(pool)
            
            # Generate tweet content
            if task.event_type is SocialEventType.POOL_CREATED:
                body = self.generate_new_pool_tweet(pool, stats)
            elif task.event_type is SocialEventType.POOL_MIDWAY:
                body = self.generate_midway_tweet(pool, stats)
            elif task.event_type is SocialEventType.POOL_COMPLETED:
                winners = await self._get_winners(task.pool_id)
                body = self.generate_completed_tweet(pool, stats, winners)
            else:
                logger.warning(f"Unknown social event type: {task.event_type}")
                return None
            
            pool_pubkey = pool.get("pool_pubkey")
            blink_url = self.create_blink(task.pool_id, pool_pubkey)
            app_url = self.create_app_link(task.pool_id)
            full_tweet = self.build_full_tweet(body, blink_url, app_url)
            
            logger.info(
                f"Posting {task.event_type.value} update for pool {task.pool_id} "
                f"using Twitter account {account.account_id} "
                f"(remaining: {account.rate_limit_remaining}/{account.rate_limit_limit})"
            )
            
            # Post using the selected account
            response = account.client.create_tweet(text=full_tweet)
            
            # Extract and update rate limit info from response headers
            rate_limit_info = self._extract_rate_limit_headers(response)
            if rate_limit_info['remaining'] is not None:
                account.rate_limit_remaining = rate_limit_info['remaining']
                logger.debug(
                    f"Account {account.account_id} rate limit: "
                    f"{account.rate_limit_remaining}/{rate_limit_info.get('limit', account.rate_limit_limit)} remaining"
                )
            else:
                # Estimate - decrement by 1
                account.rate_limit_remaining = max(0, account.rate_limit_remaining - 1)
            
            if rate_limit_info['limit'] is not None:
                account.rate_limit_limit = rate_limit_info['limit']
            
            if rate_limit_info['reset_time'] is not None:
                account.rate_limit_reset_time = rate_limit_info['reset_time']
                # Clear rate_limit_until if we have a reset time
                if account.rate_limit_remaining > 0:
                    account.rate_limit_until = None
            
            tweet_id = response.data.get("id") if response and response.data else None
            
            if tweet_id:
                logger.info(
                    f"Successfully posted tweet {tweet_id} for pool {task.pool_id} "
                    f"using account {account.account_id} "
                    f"(remaining: {account.rate_limit_remaining}/{account.rate_limit_limit})"
                )
                return tweet_id
            else:
                logger.warning(f"Tweet posted but no ID returned for pool {task.pool_id}")
                return None
                
        except tweepy.Forbidden as e:
            # Check if this is a duplicate content error
            error_message = str(e).lower()
            if "duplicate content" in error_message or "duplicate" in error_message:
                # Tweet was already posted - treat as success
                logger.info(
                    f"Tweet for pool {task.pool_id} ({task.event_type.value}) already exists "
                    f"(duplicate content). Marking as posted."
                )
                # Return a special marker to indicate duplicate (treated as success)
                return "duplicate"
            else:
                # Other 403 errors - log and don't retry
                logger.error(
                    f"Twitter account {account.account_id} forbidden (403) for pool {task.pool_id}: {e}"
                )
                return None
        except tweepy.Unauthorized as e:
            # Invalid credentials - don't retry, mark account as invalid
            logger.error(
                f"Twitter account {account.account_id} authentication failed (401 Unauthorized). "
                f"Check credentials in agent/.env - account may need to be re-authenticated."
            )
            account.rate_limit_until = time.time() + 3600  # Don't retry for 1 hour
            account.rate_limit_remaining = 0
            return None
        except tweepy.TooManyRequests as e:
            # This account is rate limited - extract reset time from headers
            reset_time = time.time() + 900  # Default 15 minutes
            
            # Try to extract from exception
            if hasattr(e, 'response') and e.response:
                headers = getattr(e.response, 'headers', {})
                reset_header = headers.get('x-rate-limit-reset')
                if reset_header:
                    try:
                        reset_time = float(reset_header)
                    except (ValueError, TypeError):
                        pass
            
            account.rate_limit_until = reset_time
            account.rate_limit_remaining = 0
            
            # Also try to get remaining/limit from headers
            if hasattr(e, 'response') and e.response:
                headers = getattr(e.response, 'headers', {})
                remaining = headers.get('x-rate-limit-remaining')
                limit = headers.get('x-rate-limit-limit')
                if remaining is not None:
                    try:
                        account.rate_limit_remaining = int(remaining)
                    except (ValueError, TypeError):
                        pass
                if limit is not None:
                    try:
                        account.rate_limit_limit = int(limit)
                    except (ValueError, TypeError):
                        pass
                if reset_header:
                    try:
                        account.rate_limit_reset_time = float(reset_header)
                    except (ValueError, TypeError):
                        pass
            
            wait_time = reset_time - time.time()
            logger.warning(
                f"Twitter account {account.account_id} rate limited. "
                f"Will retry after {wait_time:.0f} seconds "
                f"(reset at: {datetime.fromtimestamp(reset_time, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')})"
            )
            
            # Try next account if available (only once to prevent infinite loop)
            if task.retry_count < 1 and len(self.twitter_accounts) > 1:
                next_account = self.get_next_available_account()
                if next_account and next_account != account:
                    logger.info(f"Retrying with account {next_account.account_id}")
                    task.retry_count += 1
                    return await self._process_tweet_task(task)
            
            return None
        except Exception as e:
            logger.error(f"Error processing tweet task for pool {task.pool_id}: {e}", exc_info=True)
            return None
    
    async def start_queue_worker(self):
        """Start the tweet queue worker (called from main agent)."""
        if self.twitter_enabled and not self.queue_worker_running:
            await self._tweet_queue_worker()
    
    async def post_updates(self):
        """
        Post pool updates to Twitter periodically.
        
        Runs continuously, posting updates about active pools.
        Uses the queue system for non-blocking posts with automatic retries.
        """
        logger.info("Starting social media update loop...")
        
        # Start queue worker if Twitter is enabled
        if self.twitter_enabled:
            asyncio.create_task(self._tweet_queue_worker())
            logger.info("Tweet queue worker started")
        else:
            logger.info("Twitter not enabled, queue worker not started")
        
        while True:
            try:
                if not self.twitter_enabled:
                    logger.info("Twitter not enabled, sleeping for 1 hour...")
                    await asyncio.sleep(3600)
                    continue
                
                # Get active pools
                pools = await execute_query(
                    table="pools",
                    operation="select",
                    filters={"status": "active", "is_public": True}
                )
                
                if not pools:
                    logger.info("No active public pools found, sleeping for 1 hour...")
                    await asyncio.sleep(3600)
                    continue
                
                logger.info(f"Found {len(pools)} active pools to potentially post about")
                
                # Queue updates for pools that are actually at the midway point
                queued_count = 0
                for pool in pools:
                    pool_id = pool.get("pool_id")
                    if not pool_id:
                        continue
                    
                    # Check if we've posted recently (rate limiting)
                    key = (pool_id, SocialEventType.POOL_MIDWAY)
                    last = self.last_event_post_time.get(key, 0.0)
                    if time.time() - last < self.post_interval:
                        continue  # Skip if posted recently
                    
                    # Check if pool is actually at the midway point
                    if not self._is_pool_at_midway(pool):
                        continue  # Skip if not at midway point
                    
                    # Queue a midway update (non-blocking)
                    result = await self.post_event_update(
                        SocialEventType.POOL_MIDWAY,
                        pool_id
                    )
                    if result:
                        queued_count += 1
                        # Small delay between queuing to avoid overwhelming queue
                        await asyncio.sleep(5)  # 5 seconds between queuing
                
                if queued_count > 0:
                    logger.info(f"Queued {queued_count} pool updates (queue size: {self.tweet_queue.qsize()})")
                else:
                    logger.debug("No pool updates queued (all pools posted recently)")
                
                # Sleep for 1 hour before next check
                await asyncio.sleep(3600)
            
            except Exception as e:
                logger.error(f"Error in social media update loop: {e}", exc_info=True)
                # Sleep before retrying
                await asyncio.sleep(300)  # 5 minutes

