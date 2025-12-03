# Twitter Multiple Accounts & Rate Limit Monitoring - Implementation Complete

## What Was Implemented

### 1. Multiple Twitter Account Support ✅

- **2 accounts** with automatic rotation
- Round-robin selection of available accounts
- Each account tracks its own rate limits independently
- Automatic failover if one account is rate limited

### 2. Rate Limit Header Monitoring ✅

- Extracts `x-rate-limit-remaining` from Twitter API responses
- Extracts `x-rate-limit-limit` to know total quota
- Extracts `x-rate-limit-reset` to know when limit resets
- Updates account rate limit tracking in real-time
- Logs remaining quota for visibility

### 3. Smart Account Selection ✅

- Checks rate limit remaining before selecting account
- Keeps 5-tweet buffer to avoid hitting limit
- Skips rate-limited accounts automatically
- Rotates to next available account

## Configuration

### Update `agent/.env`:

Add your second account credentials:

```env
# Twitter Account 1 (Primary)
TWITTER_API_KEY=your_api_key_1
TWITTER_API_SECRET=your_api_secret_1
TWITTER_ACCESS_TOKEN=your_access_token_1
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_1

# Twitter Account 2 (Secondary) - Add these when ready
TWITTER_API_KEY_2=your_api_key_2
TWITTER_API_SECRET_2=your_api_secret_2
TWITTER_ACCESS_TOKEN_2=your_access_token_2
TWITTER_ACCESS_TOKEN_SECRET_2=your_access_token_secret_2
```

## How It Works

### Account Selection Flow

```
1. Tweet queued
   ↓
2. Get next available account
   ↓
3. Check account rate limit remaining > 5?
   ↓
4. Check account not rate limited?
   ↓
5. Use account to post tweet
   ↓
6. Extract rate limit headers from response
   ↓
7. Update account rate limit tracking
   ↓
8. Log remaining quota
```

### Rate Limit Monitoring

**Before Posting:**
- Checks `account.rate_limit_remaining > 5` (safety buffer)
- Checks `account.rate_limit_until` (not currently rate limited)

**After Posting:**
- Extracts headers: `x-rate-limit-remaining`, `x-rate-limit-limit`, `x-rate-limit-reset`
- Updates account tracking with real values
- Logs: `"remaining: 150/300"` for visibility

**On Rate Limit Error:**
- Extracts reset time from `x-rate-limit-reset` header
- Sets `account.rate_limit_until = reset_time`
- Sets `account.rate_limit_remaining = 0`
- Tries next available account (if multiple accounts)

## Logging

### What You'll See:

**Account Selection:**
```
INFO:social:Posting pool_created update for pool 123 using Twitter account 1 (remaining: 250/300)
```

**Rate Limit Tracking:**
```
DEBUG:social:Account 1 rate limit: 249/300 remaining
```

**Success:**
```
INFO:social:Successfully posted tweet 123456789 for pool 123 using account 1 (remaining: 249/300)
```

**Rate Limited:**
```
WARNING:social:Twitter account 1 rate limited. Will retry after 900 seconds (reset at: 2025-12-03 20:00:00 UTC)
INFO:social:Retrying with account 2
```

**All Accounts Rate Limited:**
```
WARNING:social:All Twitter accounts rate limited. Will retry after 900 seconds (Account 1: 0 remaining, Account 2: 0 remaining)
```

## Benefits

### Capacity Increase

| Accounts | Tweets / 3 Hours | Tweets / Day (est.) |
|----------|-------------------|---------------------|
| 1        | 300               | ~2,400              |
| 2        | 600               | ~4,800              |

### Real-Time Visibility

- See exactly how many tweets remaining per account
- Know when rate limits reset
- Monitor quota usage in real-time

### Automatic Failover

- If account 1 is rate limited, automatically uses account 2
- No manual intervention needed
- Seamless operation

## Testing

### Test with Single Account (Current):

```bash
cd agent
source ../venv/bin/activate
python3 test_manual_tweet.py <pool_id>
```

You should see:
```
INFO:social:Posting pool_created update for pool 123 using Twitter account 1 (remaining: 299/300)
INFO:social:Successfully posted tweet ... using account 1 (remaining: 298/300)
```

### Test with Two Accounts (After Adding Credentials):

Same command, but you'll see account rotation:
```
INFO:social:Posting pool_created update for pool 123 using Twitter account 1 (remaining: 150/300)
INFO:social:Posting pool_created update for pool 124 using Twitter account 2 (remaining: 300/300)
```

## Next Steps

1. **Add Second Account Credentials** to `agent/.env`
2. **Restart Agent** to load new credentials
3. **Monitor Logs** to see account rotation and rate limit tracking
4. **Verify Tweets** are posting from both accounts

## Troubleshooting

### Issue: "No Twitter accounts configured"

**Fix**: Make sure at least `TWITTER_API_KEY` is set in `.env`

### Issue: "All Twitter accounts rate limited"

**Fix**: 
- Wait for rate limit reset (check logs for reset time)
- Add more accounts if needed
- Reduce tweet frequency

### Issue: Rate limit remaining not updating

**Possible causes:**
- Twitter API not returning headers (rare)
- Tweepy version doesn't expose headers
- **Workaround**: System estimates by decrementing (still works, just less precise)

### Issue: Only one account being used

**Check:**
- Is `TWITTER_API_KEY_2` set in `.env`?
- Are all 4 credentials for account 2 set?
- Check logs for "Failed to initialize Twitter account 2"

## Summary

✅ **Multiple accounts**: 2 accounts with automatic rotation  
✅ **Rate limit monitoring**: Real-time tracking via API headers  
✅ **Smart selection**: Chooses account with available quota  
✅ **Automatic failover**: Switches accounts on rate limit  
✅ **Visibility**: Logs show remaining quota per account  

**Capacity doubled from 300 to 600 tweets per 3 hours!**

