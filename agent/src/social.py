"""
Social media integration.

Handles Twitter posts and Blinks creation for viral growth.
AI-powered agent that posts engaging updates about challenges.
"""

import logging
import asyncio
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import random

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


class SocialManager:
    """Manages social media interactions with AI-powered content generation"""
    
    def __init__(self):
        self.twitter_enabled = False
        self.twitter_client = None
        self.ai_client = None
        self.last_post_time = {}  # Track last post time per pool
        self.post_interval = 3600  # Post updates every hour per pool
        
        # Initialize Twitter client
        if TWITTER_AVAILABLE:
            self.twitter_enabled = bool(
                settings.TWITTER_API_KEY and
                settings.TWITTER_API_SECRET and
                settings.TWITTER_ACCESS_TOKEN and
                settings.TWITTER_ACCESS_TOKEN_SECRET
            )
            
            if self.twitter_enabled:
                try:
                    self.twitter_client = tweepy.Client(
                        consumer_key=settings.TWITTER_API_KEY,
                        consumer_secret=settings.TWITTER_API_SECRET,
                        access_token=settings.TWITTER_ACCESS_TOKEN,
                        access_token_secret=settings.TWITTER_ACCESS_TOKEN_SECRET,
                        wait_on_rate_limit=True
                    )
                    logger.info("Twitter client initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize Twitter client: {e}")
                    self.twitter_enabled = False
        
        # Initialize AI client (optional - for enhanced tweet generation)
        if OPENAI_AVAILABLE:
            api_key = getattr(settings, 'OPENAI_API_KEY', None)
            if api_key:
                try:
                    self.ai_client = OpenAI(api_key=api_key)
                    logger.info("OpenAI client initialized for tweet generation")
                except Exception as e:
                    logger.warning(f"OpenAI not configured: {e}")
    
    def create_blink(self, pool_id: int, pool_pubkey: Optional[str] = None) -> str:
        """
        Create a Solana Blink (Action) URL for joining a pool.
        
        Blinks are Solana Actions that can be embedded in tweets,
        allowing users to join pools directly from Twitter.
        
        Args:
            pool_id: ID of the pool
            pool_pubkey: Optional on-chain pool public key
        
        Returns:
            Blink URL
        """
        # Solana Blinks format: https://x.com/i/flow/[action_id]
        # For commitment pools, we create an action that triggers join_pool
        
        if pool_pubkey:
            # Use the pool pubkey for on-chain action
            # Format: solana-action://join_pool?pool={pubkey}&cluster=devnet
            base_url = "https://x.com/i/flow"
            # In production, you'd register this action with Solana Actions
            # For now, we'll use a direct link format
            return f"{base_url}/commitment-pool-{pool_id}"
        else:
            # Fallback to simple pool link
            return f"https://blink.solana.com/pool/{pool_id}"
    
    def generate_tweet_content(self, pool: Dict[str, Any], stats: Dict[str, Any]) -> str:
        """
        Generate engaging tweet content using AI or templates.
        
        Args:
            pool: Pool data from database
            stats: Calculated pool statistics
        
        Returns:
            Tweet text (max 280 characters)
        """
        pool_name = pool.get("name", "Challenge")
        goal_type = pool.get("goal_type", "unknown")
        participant_count = stats.get("participant_count", 0)
        total_staked = stats.get("total_staked", 0.0)
        days_remaining = stats.get("days_remaining", 0)
        eliminations = stats.get("eliminations", 0)
        active_participants = participant_count - eliminations
        
        # Try AI generation first if available
        if self.ai_client:
            try:
                prompt = f"""Create an engaging Twitter post about a commitment challenge pool:
- Pool name: {pool_name}
- Goal type: {goal_type}
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
        
        # Template-based generation (fallback)
        goal_emojis = {
            "daily_dca": "💰",
            "hodl_token": "💎",
            "lifestyle_habit": "🏃"
        }
        emoji = goal_emojis.get(goal_type.lower(), "🎯")
        
        templates = [
            f"{emoji} {pool_name} Challenge Update!\n\n"
            f"👥 {active_participants}/{participant_count} still in\n"
            f"💰 {total_staked:.2f} SOL at stake\n"
            f"⏰ {days_remaining} days left\n\n"
            f"Join the competition!",
            
            f"🔥 {pool_name} is heating up!\n\n"
            f"💪 {active_participants} warriors still fighting\n"
            f"💵 {total_staked:.2f} SOL prize pool\n"
            f"📉 {eliminations} eliminated\n\n"
            f"Who will win?",
            
            f"⚡ {pool_name} Challenge\n\n"
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
            
            # Post to Twitter
            logger.info(f"Posting update for pool {pool_id} to Twitter")
            response = self.twitter_client.create_tweet(text=full_tweet)
            
            tweet_id = response.data.get("id") if response.data else None
            
            if tweet_id:
                self.last_post_time[pool_id] = time.time()
                logger.info(f"Successfully posted tweet {tweet_id} for pool {pool_id}")
                return tweet_id
            else:
                logger.warning(f"Tweet posted but no ID returned for pool {pool_id}")
            return None
        
        except tweepy.TooManyRequests:
            logger.warning("Twitter rate limit reached, skipping post")
            return None
        except Exception as e:
            logger.error(f"Error posting to Twitter: {e}", exc_info=True)
            return None
    
    async def post_updates(self):
        """
        Post pool updates to Twitter periodically.
        
        Runs continuously, posting updates about active pools.
        Posts are rate-limited per pool to avoid spam.
        """
        logger.info("Starting social media update loop...")
        
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
                
                # Post updates for pools that haven't been posted recently
                posted_count = 0
                for pool in pools:
                    pool_id = pool.get("pool_id")
                    if pool_id:
                        tweet_id = await self.post_pool_update(pool_id, pool)
                        if tweet_id:
                            posted_count += 1
                            # Small delay between posts to avoid rate limits
                            await asyncio.sleep(60)  # 1 minute between posts
                
                logger.info(f"Posted {posted_count} updates. Sleeping for 1 hour...")
                
                # Sleep for 1 hour before next check
                await asyncio.sleep(3600)
            
            except Exception as e:
                logger.error(f"Error in social media update loop: {e}", exc_info=True)
                # Sleep before retrying
                await asyncio.sleep(300)  # 5 minutes

