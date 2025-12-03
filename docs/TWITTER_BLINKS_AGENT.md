# 🤖 Twitter/Blinks Social Agent

AI-powered agent that automatically posts engaging updates about commitment challenges to Twitter with Solana Blinks integration.

## Features

- ✅ **Automatic Twitter Updates** - Posts periodic updates about active pools
- ✅ **Solana Blinks Integration** - Creates clickable Blink actions in tweets for joining pools
- ✅ **AI-Powered Content** - Uses OpenAI to generate engaging, viral-ready tweets
- ✅ **Smart Rate Limiting** - Prevents spam with intelligent posting intervals
- ✅ **Pool Statistics** - Includes real-time stats (participants, eliminations, prize pool)

## Setup

### 1. Install Dependencies

```bash
cd agent
pip install -r requirements.txt
```

This installs:
- `tweepy` - Twitter API v2 client
- `openai` - AI-powered tweet generation (optional)

### 2. Get Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app or use an existing one
3. Generate API keys and access tokens
4. Make sure your app has **Read and Write** permissions

### 3. (Optional) Get OpenAI API Key

For AI-powered tweet generation:
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file

### 4. Configure Environment Variables

Edit `agent/.env`:

```env
# Twitter API (Required for posting)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# OpenAI API (Optional - for AI tweets)
OPENAI_API_KEY=your_openai_api_key_here

# Database (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key
```

## Usage

### Run the Agent

The social agent runs automatically as part of the main commitment agent:

```bash
cd agent
python src/main.py
```

The agent will:
- Monitor active pools every hour
- Generate engaging tweets with pool statistics
- Post updates to Twitter with Blink links
- Rate limit posts (1 post per pool per hour)

### Test the Agent

Test the social agent without posting:

```bash
cd agent
python test_social_agent.py
```

This will:
- Verify Twitter configuration
- Test Blink URL generation
- Generate sample tweets
- Show you what would be posted

### Manual Posting

You can also post updates manually from Python:

```python
import asyncio
from src.social import SocialManager

async def post_update():
    social = SocialManager()
    # Post update for pool ID 123
    tweet_id = await social.post_pool_update(123)
    print(f"Posted tweet: {tweet_id}")

asyncio.run(post_update())
```

## How It Works

### 1. Pool Monitoring

The agent queries the database for active, public pools:

```python
pools = await execute_query(
    table="pools",
    operation="select",
    filters={"status": "active", "is_public": True}
)
```

### 2. Statistics Calculation

For each pool, it calculates:
- Active participants vs eliminations
- Total staked SOL
- Days remaining
- Progress metrics

### 3. Tweet Generation

**With OpenAI (if configured):**
- Uses GPT-3.5 to generate engaging, viral-ready tweets
- Includes emojis and call-to-action
- Keeps under 280 character limit

**Without OpenAI (fallback):**
- Uses template-based generation
- Multiple templates for variety
- Includes pool stats and emojis

### 4. Blink Creation

Creates Solana Blink URLs that allow users to join pools directly from Twitter:

```
https://x.com/i/flow/commitment-pool-{pool_id}
```

When clicked, users can:
- View pool details
- Connect wallet
- Join the pool directly

### 5. Posting

Posts to Twitter with:
- Generated tweet content
- Blink URL (automatically converted to action button)
- Rate limiting to avoid spam

## Example Tweets

**Daily DCA Challenge:**
```
💰 Daily DCA Challenge Update!

👥 7/10 still in
💰 5.50 SOL at stake
⏰ 3 days left

Join the competition!
🔗 Join: https://x.com/i/flow/commitment-pool-123
```

**HODL Challenge:**
```
🔥 HODL Warriors Challenge is heating up!

💪 12 warriors still fighting
💵 15.25 SOL prize pool
📉 3 eliminated

Who will win?
🔗 Join: https://x.com/i/flow/commitment-pool-456
```

## Configuration

### Posting Intervals

Control how often posts are made:

```python
# In social.py
self.post_interval = 3600  # 1 hour between posts per pool
```

### Rate Limiting

The agent automatically:
- Limits to 1 post per pool per hour
- Waits 1 minute between different pool posts
- Respects Twitter API rate limits
- Handles rate limit errors gracefully

## Troubleshooting

### "Twitter not configured"

Make sure all 4 Twitter API credentials are set in `.env`:
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`

### "Rate limit reached"

Twitter has rate limits. The agent will:
- Automatically wait when rate limited
- Skip posts if too many requests
- Resume after the limit resets

### "OpenAI not configured"

This is optional! The agent will use template-based tweets if OpenAI isn't configured.

### Posts not appearing

Check:
1. Twitter API permissions (needs Read + Write)
2. Pool status (only posts about "active" pools)
3. Pool visibility (only posts about "public" pools)
4. Agent logs for errors

## Advanced Usage

### Custom Tweet Templates

Edit `social.py` to add custom templates:

```python
templates = [
    f"Your custom template here\n\n{stats}",
    # Add more templates...
]
```

### Custom Blink URLs

Modify `create_blink()` to use your own Blink service:

```python
def create_blink(self, pool_id: int, pool_pubkey: Optional[str] = None) -> str:
    # Your custom Blink URL format
    return f"https://your-blink-service.com/pool/{pool_id}"
```

### Scheduled Posting

The agent runs continuously. To post at specific times, modify the `post_updates()` loop.

## API Reference

### `SocialManager`

Main class for social media operations.

**Methods:**

- `create_blink(pool_id, pool_pubkey=None)` - Create Blink URL
- `generate_tweet_content(pool, stats)` - Generate tweet text
- `get_pool_stats(pool)` - Calculate pool statistics
- `post_pool_update(pool_id, pool=None)` - Post update to Twitter
- `post_updates()` - Continuous posting loop

## Security Notes

- Never commit `.env` files with API keys
- Use environment variables in production
- Rotate API keys regularly
- Monitor Twitter API usage
- Respect Twitter's automation policies

## Next Steps

1. Set up Twitter API credentials
2. (Optional) Add OpenAI API key for AI tweets
3. Run the agent: `python src/main.py`
4. Monitor Twitter for automatic updates!

---

**Built with ❤️ for viral growth and community engagement**

