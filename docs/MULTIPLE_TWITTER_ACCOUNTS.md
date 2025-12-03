# Multiple Twitter Accounts Implementation Guide

## Why Multiple Accounts?

**Problem**: Twitter API limits you to **300 tweets per 3 hours** per account.

**Solution**: Use multiple Twitter Developer apps to multiply your capacity:
- 2 accounts = 600 tweets / 3 hours
- 3 accounts = 900 tweets / 3 hours
- 5 accounts = 1,500 tweets / 3 hours

## Step 1: Create Multiple Twitter Developer Apps

### For Each Account:

1. **Create Twitter Account** (if you don't have multiple)
   - Go to https://twitter.com
   - Create new account (or use existing)
   - Verify email/phone

2. **Apply for Developer Access**
   - Go to https://developer.twitter.com/en/portal/dashboard
   - Apply for developer access (free)
   - Wait for approval (usually instant for verified accounts)

3. **Create New App**
   - Click "Create App" or "Create Project"
   - Fill in app details:
     - App name: "Commitment Agent 1", "Commitment Agent 2", etc.
     - Use case: "Making automated posts"
     - App environment: Development (free)
   - Accept terms

4. **Get API Credentials**
   - Go to "Keys and tokens" tab
   - Generate/regenerate:
     - API Key (Consumer Key)
     - API Secret (Consumer Secret)
     - Access Token
     - Access Token Secret
   - **Save these securely!**

5. **Set App Permissions**
   - Go to "Settings" → "User authentication settings"
   - Enable "Read and Write" permissions
   - Set callback URL (can be placeholder for now)
   - Save

6. **Repeat for Each Account**
   - Create 2-3 apps total (recommended)
   - Each app gets its own 300 tweets/3hr limit

## Step 2: Update Configuration

### Update `agent/.env`:

```env
# Twitter Account 1 (Primary)
TWITTER_API_KEY=your_api_key_1
TWITTER_API_SECRET=your_api_secret_1
TWITTER_ACCESS_TOKEN=your_access_token_1
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_1

# Twitter Account 2 (Secondary)
TWITTER_API_KEY_2=your_api_key_2
TWITTER_API_SECRET_2=your_api_secret_2
TWITTER_ACCESS_TOKEN_2=your_access_token_2
TWITTER_ACCESS_TOKEN_SECRET_2=your_access_token_secret_2

# Twitter Account 3 (Tertiary) - Optional
TWITTER_API_KEY_3=your_api_key_3
TWITTER_API_SECRET_3=your_api_secret_3
TWITTER_ACCESS_TOKEN_3=your_access_token_3
TWITTER_ACCESS_TOKEN_SECRET_3=your_access_token_secret_3
```

## Step 3: Update Code

### Modify `agent/src/config.py`:

```python
# Twitter (optional) - Support multiple accounts
TWITTER_API_KEY: Optional[str] = os.getenv("TWITTER_API_KEY", None)
TWITTER_API_SECRET: Optional[str] = os.getenv("TWITTER_API_SECRET", None)
TWITTER_ACCESS_TOKEN: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN", None)
TWITTER_ACCESS_TOKEN_SECRET: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", None)

# Twitter Account 2
TWITTER_API_KEY_2: Optional[str] = os.getenv("TWITTER_API_KEY_2", None)
TWITTER_API_SECRET_2: Optional[str] = os.getenv("TWITTER_API_SECRET_2", None)
TWITTER_ACCESS_TOKEN_2: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_2", None)
TWITTER_ACCESS_TOKEN_SECRET_2: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_SECRET_2", None)

# Twitter Account 3 (optional)
TWITTER_API_KEY_3: Optional[str] = os.getenv("TWITTER_API_KEY_3", None)
TWITTER_API_SECRET_3: Optional[str] = os.getenv("TWITTER_API_SECRET_3", None)
TWITTER_ACCESS_TOKEN_3: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_3", None)
TWITTER_ACCESS_TOKEN_SECRET_3: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_SECRET_3", None)
```

### Modify `agent/src/social.py`:

Add this class and update `SocialManager`:

```python
@dataclass
class TwitterAccount:
    """Represents a Twitter account with its own rate limits."""
    account_id: int
    client: Any  # tweepy.Client
    api_key: str
    api_secret: str
    access_token: str
    access_token_secret: str
    rate_limit_remaining: int = 300
    rate_limit_reset_time: Optional[float] = None
    rate_limit_until: Optional[float] = None

class SocialManager:
    def __init__(self):
        # ... existing code ...
        
        # Multiple Twitter accounts
        self.twitter_accounts: List[TwitterAccount] = []
        self.current_account_index = 0
        
        # Initialize Twitter accounts
        if TWITTER_AVAILABLE:
            self._initialize_twitter_accounts()
    
    def _initialize_twitter_accounts(self):
        """Initialize all configured Twitter accounts."""
        accounts_config = [
            {
                'id': 1,
                'key': settings.TWITTER_API_KEY,
                'secret': settings.TWITTER_API_SECRET,
                'token': settings.TWITTER_ACCESS_TOKEN,
                'token_secret': settings.TWITTER_ACCESS_TOKEN_SECRET,
            },
        ]
        
        # Add account 2 if configured
        if hasattr(settings, 'TWITTER_API_KEY_2') and settings.TWITTER_API_KEY_2:
            accounts_config.append({
                'id': 2,
                'key': settings.TWITTER_API_KEY_2,
                'secret': settings.TWITTER_API_SECRET_2,
                'token': settings.TWITTER_ACCESS_TOKEN_2,
                'token_secret': settings.TWITTER_ACCESS_TOKEN_SECRET_2,
            })
        
        # Add account 3 if configured
        if hasattr(settings, 'TWITTER_API_KEY_3') and settings.TWITTER_API_KEY_3:
            accounts_config.append({
                'id': 3,
                'key': settings.TWITTER_API_KEY_3,
                'secret': settings.TWITTER_API_SECRET_3,
                'token': settings.TWITTER_ACCESS_TOKEN_3,
                'token_secret': settings.TWITTER_ACCESS_TOKEN_SECRET_3,
            })
        
        # Initialize clients
        for config in accounts_config:
            try:
                client = tweepy.Client(
                    consumer_key=config['key'],
                    consumer_secret=config['secret'],
                    access_token=config['token'],
                    access_token_secret=config['token_secret'],
                    wait_on_rate_limit=False
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
            
            # Check if account has remaining quota
            if account.rate_limit_remaining > 0:
                self.current_account_index = idx
                return account
        
        # All accounts rate limited
        return None
    
    async def _process_tweet_task(self, task: TweetTask) -> Optional[str]:
        """Process a single tweet task - actually posts to Twitter."""
        # Get available account
        account = self.get_next_available_account()
        if not account:
            # All accounts rate limited - set global rate limit
            min_reset = min(
                (a.rate_limit_until for a in self.twitter_accounts if a.rate_limit_until),
                default=time.time() + 900
            )
            self.rate_limit_until = min_reset
            logger.warning(f"All Twitter accounts rate limited. Will retry after {min_reset - time.time():.0f} seconds")
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
                f"using Twitter account {account.account_id}"
            )
            
            # Use the account's client
            response = account.client.create_tweet(text=full_tweet)
            tweet_id = response.data.get("id") if response and response.data else None
            
            if tweet_id:
                # Update rate limit tracking (if available in response)
                # Note: tweepy doesn't expose headers easily, so we estimate
                account.rate_limit_remaining = max(0, account.rate_limit_remaining - 1)
                logger.info(
                    f"Tweet {tweet_id} posted using account {account.account_id} "
                    f"(remaining: ~{account.rate_limit_remaining})"
                )
                return tweet_id
            else:
                logger.warning(f"Tweet posted but no ID returned for pool {task.pool_id}")
                return None
                
        except tweepy.TooManyRequests as e:
            # This account is rate limited
            reset_time = time.time() + 900  # Default 15 minutes
            if hasattr(e, 'response') and e.response:
                headers = getattr(e.response, 'headers', {})
                reset_header = headers.get('x-rate-limit-reset')
                if reset_header:
                    reset_time = float(reset_header)
            
            account.rate_limit_until = reset_time
            account.rate_limit_remaining = 0
            
            logger.warning(
                f"Twitter account {account.account_id} rate limited. "
                f"Will retry after {reset_time - time.time():.0f} seconds"
            )
            
            # Try next account if available
            next_account = self.get_next_available_account()
            if next_account and next_account != account:
                # Retry with next account
                logger.info(f"Retrying with account {next_account.account_id}")
                # Recursively retry (with limit to prevent infinite loop)
                if task.retry_count < 2:  # Only retry once with different account
                    task.retry_count += 1
                    return await self._process_tweet_task(task)
            
            return None
        except Exception as e:
            logger.error(f"Error processing tweet task for pool {task.pool_id}: {e}", exc_info=True)
            return None
```

## Step 4: Test Multiple Accounts

### Test Script:

```python
# agent/test_multiple_accounts.py
import asyncio
from social import SocialManager

async def test():
    social = SocialManager()
    print(f"Initialized {len(social.twitter_accounts)} Twitter account(s)")
    
    # Test posting with each account
    for account in social.twitter_accounts:
        print(f"\nTesting account {account.account_id}...")
        # Test tweet logic here

asyncio.run(test())
```

## Benefits

### Capacity Increase

| Accounts | Tweets / 3 Hours | Tweets / Day (est.) |
|----------|-------------------|---------------------|
| 1        | 300               | ~2,400              |
| 2        | 600               | ~4,800              |
| 3        | 900               | ~7,200              |
| 5        | 1,500             | ~12,000             |

### Redundancy

- If one account has issues, others continue working
- Automatic failover to next available account
- Better reliability

### Load Distribution

- Spreads load across accounts
- Reduces chance of hitting limits
- More predictable posting

## Best Practices

1. **Start with 2-3 accounts** - Good balance of capacity vs. complexity
2. **Use different Twitter accounts** - Don't use same account for multiple apps
3. **Monitor each account** - Track rate limits per account
4. **Rotate evenly** - Use round-robin to distribute load
5. **Test thoroughly** - Verify each account works before production

## Troubleshooting

### Issue: "No Twitter accounts configured"

**Fix**: Check `.env` file has at least `TWITTER_API_KEY` set

### Issue: "Failed to initialize Twitter account"

**Fix**: 
- Verify credentials are correct
- Check app has "Read and Write" permissions
- Regenerate tokens if needed

### Issue: "All accounts rate limited"

**Fix**: 
- Wait for rate limit reset
- Add more accounts
- Reduce tweet frequency

## Summary

**Multiple Twitter accounts = Multiple capacity**

- 2 accounts = 2x capacity (600 tweets/3hr)
- 3 accounts = 3x capacity (900 tweets/3hr)
- Free to implement (just need multiple Twitter accounts)
- Automatic failover and load balancing

**This is the best solution for overcoming rate limits!**

