# Twitter Tweet Not Posting - Troubleshooting

## Problem
Tweets are not being posted when pools are created.

## Root Cause
The agent logs show: `"Twitter not enabled, sleeping for 1 hour..."`

This means Twitter credentials are not properly configured in `agent/.env`.

## Current Status
Your `agent/.env` file has placeholder values:
```
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
```

The agent checks if all 4 credentials are set and non-empty. Since these are placeholders, Twitter is disabled.

## Solution

### Step 1: Get Twitter API Credentials

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new app or use an existing one
3. Navigate to "Keys and tokens" tab
4. You'll need:
   - **API Key** (Consumer Key)
   - **API Secret** (Consumer Secret)
   - **Access Token**
   - **Access Token Secret**

### Step 2: Update agent/.env

Replace the placeholder values with your real credentials:

```env
TWITTER_API_KEY=your_actual_api_key_here
TWITTER_API_SECRET=your_actual_api_secret_here
TWITTER_ACCESS_TOKEN=your_actual_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_actual_access_token_secret_here
```

### Step 3: Restart the Agent

After updating credentials, restart the agent:

```bash
# Stop the current agent (Ctrl+C if running in terminal)
# Then restart:
cd agent
source ../venv/bin/activate
python3 src/main.py
```

### Step 4: Verify Twitter is Enabled

Check the agent logs. You should see:
```
Twitter client initialized successfully
```

Instead of:
```
Twitter not enabled, sleeping for 1 hour...
```

## When Tweets Are Posted

Tweets are posted automatically when:

1. **New Pool Created** (`POOL_CREATED` event):
   - Pool must be **public** (`is_public: true`)
   - Pool must have a **scheduled start time** (not immediate start)
   - Pool status must be `pending` or `active`
   - Triggered when `PoolActivator` activates a scheduled pool

2. **Midway Update** (`POOL_MIDWAY` event):
   - Currently not automatically triggered (would need to be added to monitoring)

3. **Pool Completed** (`POOL_COMPLETED` event):
   - Currently not automatically triggered (would need to be added to distribution logic)

## Testing

To test if Twitter is working, you can manually trigger a tweet by:

1. Creating a new **public** pool with a **scheduled start time** (not immediate)
2. Wait for the agent to activate it (checks every minute)
3. Check agent logs for: `"Posted new pool tweet for pool {pool_id}"`
4. Check your Twitter account for the tweet

## Common Issues

### Issue 1: "Twitter not enabled"
- **Cause**: Missing or invalid credentials
- **Fix**: Update `agent/.env` with real Twitter API credentials

### Issue 2: "Failed to initialize Twitter client"
- **Cause**: Invalid credentials or API permissions
- **Fix**: 
  - Verify credentials are correct
  - Ensure your Twitter app has "Read and Write" permissions
  - Regenerate tokens if needed

### Issue 3: "Rate limit reached"
- **Cause**: Too many tweets in a short time
- **Fix**: Wait for rate limit to reset (usually 15 minutes)

### Issue 4: Tweet not posted for immediate start pool
- **Cause**: By design, immediate start pools don't trigger `POOL_CREATED` tweets
- **Fix**: This is intentional - only scheduled pools get "new pool" tweets

### Issue 5: Pool activated but no tweet
- **Check**:
  1. Is the pool public? (`is_public: true`)
  2. Does it have a `scheduled_start_time`? (not `null`)
  3. Are Twitter credentials configured?
  4. Check agent logs for errors

## Code Flow

1. `PoolActivator.activate_scheduled_pools()` runs every minute
2. When a pool's `scheduled_start_time` is reached, it activates the pool
3. If pool is public and has `scheduled_start_time`, it calls:
   ```python
   await _social_manager.post_event_update(
       SocialEventType.POOL_CREATED,
       pool_id
   )
   ```
4. `SocialManager.post_event_update()` checks:
   - Twitter is enabled
   - Not rate-limited (1 hour between same event type for same pool)
   - Pool exists and has correct status
   - Generates tweet and posts to Twitter

## Logs to Check

```bash
# Check for Twitter initialization
grep -i "twitter" agent/src/agent.log

# Check for pool activation
grep -i "activate\|pool.*created" agent/src/agent.log

# Check for tweet posts
grep -i "posted.*tweet\|post.*event" agent/src/agent.log
```

