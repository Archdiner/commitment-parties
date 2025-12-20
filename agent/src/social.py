"""
Social media integration.

Handles Twitter posts and Blinks creation for viral growth.
AI-powered agent that posts engaging updates about challenges.
"""

import logging
import asyncio
import time
import warnings
from typing import Optional, Dict, Any, List, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    import tweepy
from datetime import datetime, timezone
import random
from enum import Enum
from dataclasses import dataclass

# Initialize logger first so we can log import errors
logger = logging.getLogger(__name__)

# Suppress SyntaxWarnings from tweepy (they're harmless but noisy)
warnings.filterwarnings("ignore", category=SyntaxWarning, module="tweepy")

try:
    import tweepy
    TWITTER_AVAILABLE = True
    logger.info(f"tweepy imported successfully (version: {getattr(tweepy, '__version__', 'unknown')})")
except Exception as e:
    TWITTER_AVAILABLE = False
    logger.warning(f"tweepy not available. Twitter features will be disabled. Error: {type(e).__name__}: {e}", exc_info=True)

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

from config import settings
from database import execute_query


class SocialEventType(str, Enum):
    """Types of social events that can trigger tweets."""
    POOL_CREATED = "pool_created"
    POOL_MIDWAY = "pool_midway"
    POOL_COMPLETED = "pool_completed"


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
        self.app_base_url = getattr(settings, "APP_BASE_URL", "https://commitmint.app")
        self.action_base_url = getattr(
            settings,
            "ACTION_BASE_URL",
            "https://commitment-backend.onrender.com/solana/actions",
        )
        
        self.rate_limit_until: Optional[float] = None  # Track when rate limit resets (global fallback)
        
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
        
        Generates a properly formatted Blink URL using Dialect's interstitial site
        (dial.to) which works universally for all users, even without wallet extensions.
        
        Format: https://dial.to/?action=<url-encoded-action-url>
        
        This format ensures that when users click the link:
        1. They're taken to dial.to which recognizes it as a Blink
        2. dial.to fetches the action metadata and displays the action UI
        3. Users can sign and execute the transaction directly
        
        Args:
            pool_id: ID of the pool
            pool_pubkey: Optional on-chain pool public key (currently unused,
                         but kept for future customization)
        
        Returns:
            Blink URL using Dialect's interstitial format
        """
        # Ensure action_base_url doesn't have trailing slash
        base_url = self.action_base_url.rstrip('/')
        
        # Build the action URL
        action_url = f"{base_url}/join-pool?pool_id={pool_id}"
        
        # URL-encode the action URL for use in dial.to query parameter
        from urllib.parse import quote
        encoded_action_url = quote(action_url, safe='')
        
        # Return Dialect's blink interstitial URL
        # This format works universally and will open the action in dial.to
        blink_url = f"https://dial.to/?action={encoded_action_url}"
        
        return blink_url

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

    def _is_dca_pool(self, pool: Dict[str, Any]) -> bool:
        """
        Check if a pool is a DCA/trading challenge.
        
        DCA pools can be stored as:
        - goal_type="DailyDCA" or goal_type="dca_trade" (legacy)
        - goal_type="lifestyle_habit" with habit_type="dca_trade" in goal_metadata (current frontend format)
        """
        goal_type = (pool.get("goal_type") or "").lower()
        goal_metadata = pool.get("goal_metadata") or {}
        if not isinstance(goal_metadata, dict):
            goal_metadata = {}
        habit_type = (goal_metadata.get("habit_type") or "").lower()
        
        return goal_type in ("dailydca", "dca_trade") or (goal_type == "lifestyle_habit" and habit_type == "dca_trade")
    
    def _is_crypto_challenge(self, goal_type: Optional[str] = None, pool: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if a goal_type is a crypto challenge (can use Blink action).
        
        Crypto challenges: hodl_token, DailyDCA, daily_dca, lifestyle_habit with habit_type=dca_trade
        Non-crypto challenges: lifestyle_habit (screen time, GitHub commits, etc.)
        
        Args:
            goal_type: The goal_type string (for backward compatibility)
            pool: Pool dictionary (preferred - allows checking metadata)
        """
        # If pool is provided, use it for more accurate detection
        if pool:
            goal_type_lower = (pool.get("goal_type") or "").lower()
            if goal_type_lower == "hodl_token":
                return True
            if self._is_dca_pool(pool):
                return True
            return False
        
        # Fallback to goal_type string only (backward compatibility)
        goal_type_lower = (goal_type or "").lower()
        return goal_type_lower in ("hodl_token", "dailydca", "daily_dca")
    
    def build_full_tweet(self, body: str, blink_url: str, app_url: str, goal_type: Optional[str] = None, pool: Optional[Dict[str, Any]] = None) -> str:
        """
        Combine a tweet body with Blink and app links, respecting Twitter's limit.
        
        For crypto challenges (hodl_token, DailyDCA, lifestyle_habit with habit_type=dca_trade), includes both Blink and app links.
        For non-crypto challenges (lifestyle_habit), includes only app link.
        
        We conservatively enforce 280 characters including URLs.
        If needed, the body is truncated to make room for links.
        
        Args:
            body: Tweet body text
            blink_url: Blink action URL
            app_url: App detail page URL
            goal_type: Goal type string (for backward compatibility)
            pool: Optional pool dictionary (preferred - allows checking metadata for accurate DCA detection)
        """
        # Only include Blink URL for crypto challenges
        # Prefer pool dict if provided for accurate detection (handles lifestyle_habit with habit_type=dca_trade)
        is_crypto = self._is_crypto_challenge(goal_type=goal_type, pool=pool) if (goal_type or pool) else True  # Default to True for backward compatibility
        
        if is_crypto:
            trailer = f"\n\n🔗 Join: {blink_url}\n🌐 Details: {app_url}"
        else:
            # Non-crypto challenges: only app link
            trailer = f"\n\n🌐 Join: {app_url}"
        
        max_len = 280
        if len(body) + len(trailer) <= max_len:
            return body + trailer
        
        # Try truncating body while keeping links
        available = max_len - len(trailer) - 3  # 3 for "..."
        if available <= 0:
            # As a last resort, drop the Blink link and keep only the app link
            if is_crypto:
                trailer = f"\n\n🌐 Details: {app_url}"
            else:
                trailer = f"\n\n🌐 {app_url}"
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
        # Handle DCA pools that might be stored as lifestyle_habit with habit_type="dca_trade"
        challenge_info = ""
        habit_type = (goal_metadata.get("habit_type") or "").lower()
        is_dca = goal_type in ("dailydca", "daily_dca") or (goal_type == "lifestyle_habit" and habit_type == "dca_trade")
        
        if goal_type == "hodl_token":
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            challenge_info = f"💎 HODL {token_symbol}"
        elif is_dca:
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
        Uses recruitment_deadline if available, otherwise falls back to scheduled_start_time.
        """
        current_time = int(time.time())
        
        # NEW RECRUITMENT SYSTEM: Use recruitment_deadline if available
        recruitment_deadline = pool.get("recruitment_deadline")
        if recruitment_deadline:
            deadline_ts = recruitment_deadline
        else:
            # Fallback to scheduled_start_time for backward compatibility
            deadline_ts = pool.get("scheduled_start_time")
        
        # If no deadline or recruitment already closed, return None
        if not deadline_ts or current_time >= deadline_ts:
            return None
        
        # Calculate time remaining
        seconds_remaining = deadline_ts - current_time
        
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
    
    def _format_recruitment_period_duration(self, pool: Dict[str, Any]) -> str:
        """
        Format the total recruitment period duration (not remaining time).
        Returns formatted string like "1 day", "1 week", "2 weeks".
        """
        recruitment_hours = pool.get("recruitment_period_hours", 0)
        
        if recruitment_hours >= 336:  # 2 weeks
            return "2 weeks"
        elif recruitment_hours >= 168:  # 1 week
            return "1 week"
        elif recruitment_hours >= 24:  # 1 day
            days = recruitment_hours // 24
            if days == 1:
                return "1 day"
            return f"{days} days"
        else:
            if recruitment_hours == 0:
                return "until filled"
            return f"{recruitment_hours}h"

    def generate_new_pool_tweet(self, pool: Dict[str, Any], stats: Dict[str, Any]) -> str:
        """
        Generate tweet text for a newly created/activated pool.
        
        Includes challenge-specific details: coin, amount, stake, min/max participants, recruitment period.
        """
        name = pool.get("name", "New Challenge")
        goal_type = pool.get("goal_type", "").lower()
        goal_metadata = pool.get("goal_metadata") or {}
        if not isinstance(goal_metadata, dict):
            goal_metadata = {}
        
        stake = float(pool.get("stake_amount", 0.0))
        max_participants = pool.get("max_participants", 0)
        min_participants = pool.get("min_participants", 5)  # Default to 5 if not set
        recruitment_period = self._format_recruitment_period_duration(pool)
        recruitment_time = self._format_recruitment_time_remaining(pool)
        
        # Build challenge-specific content
        # Handle DCA pools that might be stored as lifestyle_habit with habit_type="dca_trade"
        challenge_details = []
        habit_type = (goal_metadata.get("habit_type") or "").lower()
        is_dca = goal_type in ("dailydca", "daily_dca") or (goal_type == "lifestyle_habit" and habit_type == "dca_trade")
        
        if goal_type == "hodl_token":
            # HODL challenge: coin, amount, stake, min/max participants, recruitment period
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
            
        elif is_dca:
            # DCA challenge: coin, trades per day, stake, min/max participants, recruitment period
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            min_trades_per_day = goal_metadata.get("min_trades_per_day", 1)
            dca_amount_raw = goal_metadata.get("amount")  # Legacy field
            
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
                challenge_details.append(f"💰 DCA {token_symbol} ({min_trades_per_day} trade{'s' if min_trades_per_day > 1 else ''}/day)")
                
        elif goal_type == "lifestyle_habit":
            # Lifestyle challenge: habit name, stake, min/max participants, recruitment period
            habit_name = goal_metadata.get("habit_name") or goal_metadata.get("summary") or "Lifestyle Habit"
            challenge_details.append(f"🏃 {habit_name}")
        
        # Add common details (concise format to fit Twitter limit)
        challenge_details.append(f"💵 {stake:.2f} SOL stake")
        challenge_details.append(f"👥 {min_participants}-{max_participants} people")
        challenge_details.append(f"⏰ {recruitment_period} to recruit")
        
        # Add time remaining if available (only if there's room)
        if recruitment_time:
            challenge_details.append(f"⏳ {recruitment_time} left")
        
        # Build tweet
        base = f"🎉 {name}\n\n"
        base += "\n".join(challenge_details)
        
        # Truncate to 200 chars to leave room for links (trailer is ~50-60 chars)
        return self._truncate_body(base, max_len=200)

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
        # Handle DCA pools that might be stored as lifestyle_habit with habit_type="dca_trade"
        challenge_context = ""
        habit_type = (goal_metadata.get("habit_type") or "").lower()
        is_dca = goal_type in ("dailydca", "daily_dca") or (goal_type == "lifestyle_habit" and habit_type == "dca_trade")
        
        if goal_type == "hodl_token":
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            challenge_context = f"💎 HODL {token_symbol} Challenge"
        elif is_dca:
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
            logger.info(
                f"Pool {pool.get('pool_id')} is at midway point: "
                f"{percent_complete:.1f}% complete ({elapsed_time}/{total_duration} seconds)"
            )
        else:
            logger.debug(
                f"Pool {pool.get('pool_id')} not at midway: "
                f"{percent_complete:.1f}% complete (needs 45-75%)"
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
            
            # Create URLs
            pool_pubkey = pool.get("pool_pubkey")
            blink_url = self.create_blink(pool_id, pool_pubkey)
            app_url = self.create_app_link(pool_id)
            
            # Build full tweet (conditionally includes Blink based on goal_type)
            goal_type = pool.get("goal_type")
            # Pass pool dict for accurate crypto challenge detection (includes metadata for DCA pools)
            full_tweet = self.build_full_tweet(tweet_text, blink_url, app_url, goal_type, pool=pool)
            
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
                error_str = str(e)
                if "oauth1 app permissions" in error_str.lower() or "permissions" in error_str.lower():
                    logger.error(
                        f"Twitter forbidden (403) - OAuth permissions issue for pool {pool_id}. "
                        f"ERROR: {e}. "
                        f"SOLUTION: Go to https://developer.twitter.com/en/portal/dashboard, select your app, "
                        f"go to 'Settings' > 'User authentication settings', and ensure 'App permissions' is set to 'Read and Write'. "
                        f"Then regenerate your Access Token and Secret."
                    )
                else:
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
        Post a tweet immediately for a specific social event (new pool).
        
        Simple: detect new pool -> post tweet immediately.
        """
        try:
            if not self.twitter_enabled or not self.twitter_client:
                logger.debug("Twitter not configured, skipping tweet")
                return None
            
            # Check if we've already posted for this pool/event
            key = (pool_id, event_type)
            last = self.last_event_post_time.get(key, 0.0)
            if time.time() - last < 3600:  # Don't post more than once per hour per pool
                logger.debug(f"Skipping {event_type} for pool {pool_id} (already posted recently)")
                return None
            
            # Get pool data
            pool = await self._get_pool(pool_id)
            if not pool:
                logger.warning(f"Pool {pool_id} not found")
                return None
            
            # Only post for new pools (POOL_CREATED)
            if event_type is not SocialEventType.POOL_CREATED:
                return None
            
            status = pool.get("status")
            is_public = pool.get("is_public", True)
            
            # Only post for public pools that are pending or active
            if not is_public:
                return None
            
            if status not in ("pending", "active"):
                return None
            
            # Post the tweet immediately
            logger.info(f"Posting POOL_CREATED tweet for pool {pool_id} (status={status})")
            
            stats = await self.get_pool_stats(pool)
            body = self.generate_new_pool_tweet(pool, stats)
            pool_pubkey = pool.get("pool_pubkey")
            blink_url = self.create_blink(pool_id, pool_pubkey)
            app_url = self.create_app_link(pool_id)
            goal_type = pool.get("goal_type")
            full_tweet = self.build_full_tweet(body, blink_url, app_url, goal_type, pool=pool)
            
            # Get available account and post
            account = self.get_next_available_account()
            if not account:
                logger.warning(f"No available Twitter account for pool {pool_id}")
                return None
            
            try:
                response = account.client.create_tweet(text=full_tweet)
                tweet_id = response.data.get("id") if response and response.data else None
                
                if tweet_id:
                    self.last_event_post_time[key] = time.time()
                    logger.info(f"Successfully posted tweet {tweet_id} for pool {pool_id}")
                    return tweet_id
                else:
                    logger.warning(f"Tweet posted but no ID returned for pool {pool_id}")
                    return None
                    
            except tweepy.Forbidden as e:
                error_message = str(e).lower()
                if "duplicate content" in error_message:
                    logger.info(f"Tweet for pool {pool_id} already exists (duplicate)")
                    self.last_event_post_time[key] = time.time()
                    return "duplicate"
                else:
                    logger.error(f"Twitter forbidden (403) for pool {pool_id}: {e}")
                    return None
            except tweepy.Unauthorized as e:
                logger.error(f"Twitter authentication failed for pool {pool_id}: {e}")
                return None
            except tweepy.TooManyRequests:
                logger.warning(f"Twitter rate limit reached for pool {pool_id}")
                return None
            except Exception as e:
                logger.error(f"Error posting tweet for pool {pool_id}: {e}", exc_info=True)
                return None
            
        except Exception as e:
            logger.error(f"Error in post_event_update for pool {pool_id}: {e}", exc_info=True)
            return None
    
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
    
    async def post_updates(self):
        """
        Monitor database for new pools and post tweets immediately.
        
        Simple: check for new pools -> post tweet immediately.
        """
        logger.info("Starting social media monitor (simple mode: detect -> post)")
        
        if not self.twitter_enabled:
            logger.warning("Twitter not enabled - configure credentials in agent/.env")
            while True:
                await asyncio.sleep(3600)  # Sleep if Twitter not enabled
            return
        
        logger.info(f"Twitter enabled with {len(self.twitter_accounts)} account(s)")
        
        while True:
            try:
                # Get all public pools (pending or active)
                pools = await execute_query(
                    table="pools",
                    operation="select",
                    filters={"is_public": True}
                )
                
                # Filter to pending/active pools
                pools = [p for p in pools if p.get("status") in ("pending", "active")]
                
                if not pools:
                    logger.debug("No active/pending public pools found")
                    await asyncio.sleep(60)  # Check every minute
                    continue
                
                # Check each pool - if we haven't tweeted about it, tweet now
                for pool in pools:
                    pool_id = pool.get("pool_id")
                    if not pool_id:
                        continue
                    
                    # Check if we've already posted for this pool
                    key = (pool_id, SocialEventType.POOL_CREATED)
                    last_posted = self.last_event_post_time.get(key, 0.0)
                    
                    # If we haven't posted yet, post now
                    if last_posted == 0.0:
                        logger.info(f"New pool {pool_id} detected - posting tweet now")
                        await self.post_event_update(SocialEventType.POOL_CREATED, pool_id)
                        await asyncio.sleep(2)  # Small delay between posts
                
                # Check every 30 seconds for new pools
                await asyncio.sleep(30)
            
            except Exception as e:
                logger.error(f"Error in social media monitor: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying

