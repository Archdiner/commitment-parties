# Twitter Credentials Setup Guide

## Current Status

✅ **System is working correctly:**
- 2 Twitter accounts initialized
- Queue system working
- Account rotation working
- Rate limit monitoring working
- Immediate start pools correctly excluded from tweets

❌ **Issue: 401 Unauthorized**
- Both accounts getting authentication errors
- Credentials need to be in `agent/.env` file (not just environment variables)

## How to Fix 401 Errors

### Option 1: Add to `.env` File (Recommended)

The agent reads credentials from `agent/.env`, not environment variables.

1. **Edit `agent/.env`**:
   ```env
   # Twitter Account 1
   TWITTER_API_KEY=your_actual_api_key_1
   TWITTER_API_SECRET=your_actual_api_secret_1
   TWITTER_ACCESS_TOKEN=your_actual_access_token_1
   TWITTER_ACCESS_TOKEN_SECRET=your_actual_access_token_secret_1
   
   # Twitter Account 2
   TWITTER_API_KEY_2=your_actual_api_key_2
   TWITTER_API_SECRET_2=your_actual_api_secret_2
   TWITTER_ACCESS_TOKEN_2=your_actual_access_token_2
   TWITTER_ACCESS_TOKEN_SECRET_2=your_actual_access_token_secret_2
   ```

2. **Restart the agent**

### Option 2: Export Before Starting Agent

If you prefer environment variables:

```bash
export TWITTER_API_KEY=your_key_1
export TWITTER_API_SECRET=your_secret_1
export TWITTER_ACCESS_TOKEN=your_token_1
export TWITTER_ACCESS_TOKEN_SECRET=your_secret_1

export TWITTER_API_KEY_2=your_key_2
export TWITTER_API_SECRET_2=your_secret_2
export TWITTER_ACCESS_TOKEN_2=your_token_2
export TWITTER_ACCESS_TOKEN_SECRET_2=your_secret_2

./scripts/start_agent.sh
```

**Note**: Environment variables are only available in that shell session. `.env` file is more persistent.

## Immediate Start Pools - Confirmed ✅

The system is correctly configured to **NOT** tweet for immediate start pools:

### Code Checks:

1. **In `activate_pools.py` (line 108)**:
   ```python
   # Only tweet if pool is public and has a scheduled start (not immediate)
   if pool.get("is_public", True) and scheduled_start:
       await _social_manager.post_event_update(...)
   ```
   - Only tweets if `scheduled_start` exists
   - Immediate start pools have `scheduled_start = None`

2. **In `social.py` (line 702)**:
   ```python
   # Immediate start pools have recruitment_period_hours == 0 or no scheduled_start_time
   if recruitment_hours == 0 or scheduled_start is None:
       logger.debug("Skipping POOL_CREATED tweet (immediate start pool)")
       return None
   ```
   - Skips if `recruitment_hours == 0` OR `scheduled_start is None`

### Test Results:

- **Pool 1764803845**: `recruitment_hours: 0`, `scheduled_start: None` → **No tweet** ✅
- **Pool 1764799431**: `recruitment_hours: 1`, `scheduled_start: 1764803040` → **Will tweet** ✅

## What You'll See in Logs

### For Scheduled Pools (Will Tweet):
```
INFO:activate_pools:Activating pool 123 (scheduled start: 1764803040)
INFO:activate_pools:Posted new pool tweet for pool 123
INFO:social:Queued pool_created tweet for pool 123
```

### For Immediate Start Pools (No Tweet):
```
INFO:activate_pools:Activating immediate start pool 456
# No tweet logged - correctly skipped
```

## Summary

✅ **Immediate start pools**: Correctly excluded from tweets  
✅ **Queue system**: Working  
✅ **Account rotation**: Working  
✅ **Rate limit monitoring**: Working  
❌ **Credentials**: Need to be in `.env` file (not just env vars)

**Next step**: Add Twitter credentials to `agent/.env` file and restart agent.

