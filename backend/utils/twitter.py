"""
Twitter posting utility for backend.

Handles posting tweets when pools are created, triggered directly from the backend.
"""

import logging
import warnings
from typing import Optional, Dict, Any
import time

logger = logging.getLogger(__name__)

# Suppress SyntaxWarnings from tweepy (they're harmless but noisy)
warnings.filterwarnings("ignore", category=SyntaxWarning, module="tweepy")

try:
    import tweepy
    TWITTER_AVAILABLE = True
    logger.info("tweepy imported successfully")
except Exception as e:
    TWITTER_AVAILABLE = False
    logger.warning(f"tweepy not available. Twitter features will be disabled. Error: {type(e).__name__}: {e}")

from config import settings


class TwitterPoster:
    """Simple Twitter posting utility for backend triggers"""
    
    def __init__(self):
        self.twitter_enabled = False
        self.twitter_client = None
        
        # URL bases
        self.app_base_url = getattr(settings, "APP_BASE_URL", "https://commitment-parties.vercel.app")
        self.action_base_url = getattr(
            settings,
            "ACTION_BASE_URL",
            "https://commitment-backend.onrender.com/solana/actions",
        )
        
        if TWITTER_AVAILABLE:
            self._initialize_twitter()
    
    def _initialize_twitter(self):
        """Initialize Twitter client from environment variables"""
        try:
            # Check for Twitter credentials in backend config
            api_key = getattr(settings, "TWITTER_API_KEY", None)
            api_secret = getattr(settings, "TWITTER_API_SECRET", None)
            access_token = getattr(settings, "TWITTER_ACCESS_TOKEN", None)
            access_token_secret = getattr(settings, "TWITTER_ACCESS_TOKEN_SECRET", None)
            
            if not all([api_key, api_secret, access_token, access_token_secret]):
                logger.warning("Twitter credentials not configured in backend. Twitter posting disabled.")
                return
            
            self.twitter_client = tweepy.Client(
                consumer_key=api_key,
                consumer_secret=api_secret,
                access_token=access_token,
                access_token_secret=access_token_secret,
                wait_on_rate_limit=False
            )
            
            self.twitter_enabled = True
            logger.info("Twitter client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Twitter client: {e}", exc_info=True)
            self.twitter_enabled = False
    
    def create_blink(self, pool_id: int) -> str:
        """Create a Solana Blink (Action) URL for joining a pool"""
        base_url = self.action_base_url.rstrip('/')
        return f"{base_url}/join-pool?pool_id={pool_id}"
    
    def create_app_link(self, pool_id: int) -> str:
        """Create a link to the pool page in the web app"""
        return f"{self.app_base_url}/pools/{pool_id}"
    
    def _truncate_body(self, text: str, max_len: int) -> str:
        """Truncate text to max_len characters with ellipsis if needed"""
        if len(text) <= max_len:
            return text
        if max_len <= 3:
            return text[:max_len]
        return text[:max_len - 3].rstrip() + "..."
    
    def _get_token_symbol(self, token_mint: Optional[str]) -> str:
        """Get token symbol from mint address"""
        if not token_mint:
            return "SOL"
        
        token_map = {
            "So11111111111111111111111111111111111111112": "SOL",
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
            "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
            "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
            "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
            "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP",
        }
        
        token_mint_lower = token_mint.lower()
        for mint, symbol in token_map.items():
            if mint.lower() == token_mint_lower:
                return symbol
        
        if len(token_mint) > 8:
            return f"{token_mint[:4]}...{token_mint[-4:]}"
        return token_mint
    
    def _format_recruitment_time_remaining(self, pool: Dict[str, Any]) -> Optional[str]:
        """Calculate and format how long recruitment is still open"""
        current_time = int(time.time())
        scheduled_start = pool.get("scheduled_start_time")
        
        if not scheduled_start or current_time >= scheduled_start:
            return None
        
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
    
    def generate_new_pool_tweet(self, pool: Dict[str, Any]) -> str:
        """Generate tweet text for a newly created pool"""
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
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            min_balance_raw = goal_metadata.get("min_balance")
            
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
            token_mint = goal_metadata.get("token_mint")
            token_symbol = self._get_token_symbol(token_mint)
            dca_amount_raw = goal_metadata.get("amount")
            
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
            habit_name = goal_metadata.get("habit_name") or goal_metadata.get("summary") or "Lifestyle Habit"
            challenge_details.append(f"🏃 {habit_name}")
        
        # Add common details
        challenge_details.append(f"💵 Stake: {stake:.2f} SOL")
        challenge_details.append(f"👥 Max: {max_participants} participants")
        
        if recruitment_time:
            challenge_details.append(f"⏰ Recruiting for: {recruitment_time}")
        else:
            challenge_details.append(f"⏰ Starting now!")
        
        # Build tweet
        base = f"🎉 New challenge: {name}\n\n"
        base += "\n".join(challenge_details)
        
        return self._truncate_body(base, max_len=220)
    
    def build_full_tweet(self, body: str, blink_url: str, app_url: str) -> str:
        """Combine tweet body with Blink and app links, respecting Twitter's limit"""
        trailer = f"\n\n🔗 Join: {blink_url}\n🌐 Details: {app_url}"
        max_len = 280
        
        if len(body) + len(trailer) <= max_len:
            return body + trailer
        
        # Try truncating body while keeping both links
        available = max_len - len(trailer) - 3
        if available <= 0:
            # As a last resort, drop the app link and keep only the Blink
            trailer = f"\n\n🔗 Join: {blink_url}"
            available = max_len - len(trailer) - 3
        
        truncated_body = self._truncate_body(body, max_len=available)
        return truncated_body + trailer
    
    async def post_new_pool_tweet(self, pool: Dict[str, Any]) -> Optional[str]:
        """
        Post a tweet about a newly created pool.
        
        Args:
            pool: Pool dictionary from database
            
        Returns:
            Tweet ID if successful, None otherwise
        """
        try:
            if not self.twitter_enabled or not self.twitter_client:
                logger.warning("Twitter not configured, skipping post")
                return None
            
            # Only post about public pools
            is_public = pool.get("is_public", True)
            if not is_public:
                logger.debug(f"Skipping tweet for pool {pool.get('pool_id')} (not public)")
                return None
            
            pool_id = pool.get("pool_id")
            if not pool_id:
                logger.warning("Pool missing pool_id, cannot post tweet")
                return None
            
            # Generate tweet content
            tweet_body = self.generate_new_pool_tweet(pool)
            
            # Create Blink URL
            blink_url = self.create_blink(pool_id)
            app_url = self.create_app_link(pool_id)
            
            # Build full tweet
            full_tweet = self.build_full_tweet(tweet_body, blink_url, app_url)
            
            # Post to Twitter
            logger.info(f"Posting new pool tweet for pool {pool_id}")
            response = self.twitter_client.create_tweet(text=full_tweet)
            
            tweet_id = response.data.get("id") if response and response.data else None
            
            if tweet_id:
                logger.info(f"Successfully posted tweet {tweet_id} for pool {pool_id}")
                return tweet_id
            else:
                logger.warning(f"Tweet posted but no ID returned for pool {pool_id}")
                return None
        
        except tweepy.Forbidden as e:
            error_message = str(e).lower()
            if "duplicate content" in error_message or "duplicate" in error_message:
                logger.info(f"Tweet for pool {pool.get('pool_id')} already exists (duplicate content)")
                return "duplicate"
            else:
                error_str = str(e)
                if "oauth1 app permissions" in error_str.lower() or "permissions" in error_str.lower():
                    logger.error(
                        f"Twitter forbidden (403) - OAuth permissions issue. "
                        f"ERROR: {e}. "
                        f"SOLUTION: Go to https://developer.twitter.com/en/portal/dashboard, select your app, "
                        f"go to 'Settings' > 'User authentication settings', and ensure 'App permissions' is set to 'Read and Write'. "
                        f"Then regenerate your Access Token and Secret."
                    )
                else:
                    logger.error(f"Twitter forbidden (403) for pool {pool.get('pool_id')}: {e}")
                return None
        
        except tweepy.Unauthorized as e:
            logger.error(
                f"Twitter authentication failed (401 Unauthorized). "
                f"Check Twitter credentials in backend/.env - they may be invalid or expired."
            )
            return None
        
        except tweepy.TooManyRequests:
            logger.warning("Twitter rate limit reached, skipping post")
            return None
        
        except Exception as e:
            logger.error(f"Error posting to Twitter: {e}", exc_info=True)
            return None


# Global instance
_twitter_poster: Optional[TwitterPoster] = None


def get_twitter_poster() -> TwitterPoster:
    """Get or create the global Twitter poster instance"""
    global _twitter_poster
    if _twitter_poster is None:
        _twitter_poster = TwitterPoster()
    return _twitter_poster

