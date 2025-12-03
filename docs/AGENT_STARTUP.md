# How to Start the Commitment Agent

## Quick Start

### Option 1: Using the Startup Script (Recommended)

```bash
cd /path/to/commitment-parties
./scripts/start_agent.sh
```

### Option 2: Manual Start

```bash
cd agent
source ../venv/bin/activate  # Activate virtual environment
cd src
python main.py
```

### Option 3: Direct Python Execution

```bash
cd agent/src
python -m main
```

## Prerequisites

Before starting the agent, make sure:

1. **Virtual environment is set up**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r agent/requirements.txt
   ```

2. **Environment variables are configured**:
   - Create `agent/.env` file with required settings
   - See `docs/env-templates/agent.env.example` for template

3. **Backend API is running** (optional, but recommended):
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

4. **Database is accessible**:
   - Supabase connection configured in `.env`
   - Database tables created

## Required Environment Variables

Create `agent/.env` with:

```env
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=GSvoKxVHbtAY2mAAU4RM3PVQC3buLSjRm24N7QhAoieH

# Agent Wallet (required for on-chain operations)
AGENT_KEYPAIR_PATH=/path/to/keypair.json
# OR
AGENT_PRIVATE_KEY=[64-byte array as JSON]

# Database (Supabase)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key

# Twitter (optional - for automatic tweeting)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# URLs for Blinks (optional)
APP_BASE_URL=https://app.your-domain.xyz
ACTION_BASE_URL=https://api.your-domain.xyz/solana/actions
```

## What the Agent Does

When started, the agent runs **6 concurrent tasks**:

1. **DCA Pool Monitoring** - Checks daily for DCA swap activity
2. **HODL Pool Monitoring** - Checks hourly for token balance
3. **Lifestyle Pool Monitoring** - Checks daily (with grace period) for check-ins
4. **Reward Distribution** - Checks hourly for ended pools and distributes rewards
5. **Social Media Updates** - Posts periodic tweets about active pools (hourly)
6. **Pool Activation** - Activates scheduled pools when recruitment period ends

## Automatic Tweeting

### When Pools Are Created

**YES** - The agent will automatically tweet when:
- A pool is activated (moves from `pending` to `active`)
- The pool has a scheduled start time (not immediate start)
- The pool is public (`is_public = true`)
- Twitter is configured

**NO** - The agent will **NOT** tweet for:
- Immediate start pools (`recruitment_period_hours = 0`)
- Private pools (`is_public = false`)
- Pools without Twitter configuration

### Tweet Types

The agent posts three types of tweets:

1. **New Pool Created** (`POOL_CREATED`)
   - Posted when pool is activated (after recruitment period)
   - Includes: pool name, description, stake amount, potential prize, sign-up deadline
   - Includes Blink URL for joining directly from Twitter

2. **Midway Update** (`POOL_MIDWAY`)
   - Posted when pool reaches ~50% completion
   - Includes: active participants, total staked, days remaining
   - Can be triggered manually via `post_event_update(SocialEventType.POOL_MIDWAY, pool_id)`

3. **Pool Completed** (`POOL_COMPLETED`)
   - Posted when pool ends and rewards are distributed
   - Includes: final pool value, podium-style winners
   - Can be triggered manually via `post_event_update(SocialEventType.POOL_COMPLETED, pool_id)`

## Stopping the Agent

Press `Ctrl+C` to gracefully stop the agent. It will:
- Stop all monitoring loops
- Close Solana RPC connections
- Save any pending work
- Exit cleanly

## Troubleshooting

### Agent Won't Start

**Error: "Agent wallet not configured"**
- Set `AGENT_KEYPAIR_PATH` or `AGENT_PRIVATE_KEY` in `.env`

**Error: "Failed to initialize Solana client"**
- Check `SOLANA_RPC_URL` is correct
- Verify RPC endpoint is accessible
- Check `PROGRAM_ID` matches your deployed program

**Error: "Database connection failed"**
- Verify `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_KEY` in `.env`
- Check database is accessible
- Verify tables exist

### Twitter Not Posting

**No tweets appearing:**
- Check Twitter API credentials in `.env`
- Verify Twitter app has "Read and Write" permissions
- Check agent logs for Twitter errors
- Ensure pools are public (`is_public = true`)
- Verify pools have scheduled start (not immediate)

**Rate limit errors:**
- Agent automatically handles rate limits
- Will retry after limit resets
- Consider reducing posting frequency if needed

### Pools Not Activating

**Pools stuck in "pending":**
- Check `scheduled_start_time` is set correctly
- Verify agent is running (activation checks every minute)
- Check logs for activation errors
- Verify minimum participants requirement (if set)

## Logs

Agent logs are written to:
- **Console**: Real-time output
- **File**: `agent/agent.log`

Check logs for:
- Pool activation events
- Verification results
- Twitter posting status
- Errors and warnings

## Running in Production

For production deployment:

1. **Use a process manager** (systemd, PM2, supervisor):
   ```bash
   # Example systemd service
   [Unit]
   Description=Commitment Agent
   After=network.target
   
   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/commitment-parties/agent
   Environment="PATH=/path/to/venv/bin"
   ExecStart=/path/to/venv/bin/python src/main.py
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

2. **Set up log rotation**:
   ```bash
   # Rotate agent.log daily
   logrotate -d /etc/logrotate.d/commitment-agent
   ```

3. **Monitor agent health**:
   - Check `agent.log` regularly
   - Set up alerts for errors
   - Monitor Twitter posting frequency

## Next Steps

- See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for system overview
- See [TWITTER_BLINKS_AGENT.md](TWITTER_BLINKS_AGENT.md) for Twitter setup details
- See [TESTING.md](TESTING.md) for testing the agent

