# Agent Deployment Guide

The Commitment Agent must run **24/7** as a persistent service. It monitors pools, verifies goals, distributes rewards, and posts to Twitter.

## Quick Answer: Best Options

1. **Render Background Worker** (Easiest) - $7/month, always-on
2. **Railway Background Worker** (Alternative) - Similar pricing
3. **VPS** (Production) - More control, $5-10/month

---

## Option 1: Render (Recommended for Quick Setup)

### Step 1: Create Background Worker

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Background Worker"**
3. Connect your GitHub repository (if not already connected)
4. Select your `commitment-parties` repository

### Step 2: Configure Service

Fill in these settings:

- **Name**: `commitment-agent` (or any name you prefer)
- **Root Directory**: `agent` ⭐ **IMPORTANT**
- **Branch**: `main` (or your default branch)
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python src/main.py`

### Step 3: Set Environment Variables

Click **"Environment"** tab and add these variables:

```bash
# ============================================
# Solana Configuration
# ============================================
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=your_program_id_here

# ============================================
# Agent Wallet (Choose ONE method)
# ============================================
# Method 1: Private Key (Easier)
AGENT_PRIVATE_KEY=your_base58_private_key_here

# Method 2: Keypair File (More Secure)
# AGENT_KEYPAIR_PATH=/app/keypair.json
# Then upload keypair.json file in Render secrets

# ============================================
# Database (Supabase)
# ============================================
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_KEY=your_supabase_anon_key

# ============================================
# URLs (From your other deployments)
# ============================================
ACTION_BASE_URL=https://your-backend.onrender.com/solana/actions
APP_BASE_URL=https://your-frontend.vercel.app

# ============================================
# Twitter (Optional - for social features)
# ============================================
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# Twitter Account 2 (Optional - for more capacity)
# TWITTER_API_KEY_2=...
# TWITTER_API_SECRET_2=...
# TWITTER_ACCESS_TOKEN_2=...
# TWITTER_ACCESS_TOKEN_SECRET_2=...

# ============================================
# OpenAI (Optional - for AI tweet generation)
# ============================================
OPENAI_API_KEY=your_openai_api_key

# ============================================
# Environment
# ============================================
ENVIRONMENT=production
DEBUG=false
```

### Step 4: Choose Plan

- **Free Tier**: ⚠️ Spins down after 15min idle - **NOT suitable for agent**
- **Starter ($7/month)**: ✅ Always-on, recommended for agent

### Step 5: Deploy

1. Click **"Create Background Worker"**
2. Render will start building and deploying
3. Watch the logs to verify it starts correctly
4. Look for: `"Initializing Commitment Agent..."` and `"Agent started successfully"`

### Step 6: Verify It's Running

Check the logs for:
- ✅ `"Initializing Commitment Agent..."`
- ✅ `"Agent started successfully"`
- ✅ `"Starting pool monitoring loop..."`
- ✅ `"Starting social media update loop..."`

If you see errors, check:
- Environment variables are set correctly
- Database connection works
- Solana RPC URL is accessible

---

## Option 2: Railway (Alternative)

### Step 1: Create Background Worker

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Click **"New"** → **"Service"** → **"Background Worker"**

### Step 2: Configure

- **Root Directory**: `agent`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python src/main.py`

### Step 3: Set Environment Variables

Same as Render (see Step 3 above). Add them in Railway's **"Variables"** tab.

### Step 4: Upload Keypair (If using keypair file method)

1. Go to **"Variables"** tab
2. Click **"New Variable"** → **"File"**
3. Name: `keypair.json`
4. Upload your agent wallet keypair file
5. Set `AGENT_KEYPAIR_PATH=/app/keypair.json`

### Step 5: Deploy

Railway will auto-deploy. Check logs to verify.

---

## Option 3: VPS (Production - Recommended for Scale)

### Step 1: Create VPS

Choose a provider:
- **DigitalOcean**: $6/month (1GB RAM)
- **AWS EC2**: t3.micro (free tier eligible)
- **Linode**: $5/month
- **Hetzner**: €4/month

Recommended specs:
- **Minimum**: 1GB RAM, 1 vCPU
- **Recommended**: 2GB RAM, 2 vCPU
- **OS**: Ubuntu 22.04 LTS

### Step 2: SSH into Server

```bash
ssh root@your-server-ip
```

### Step 3: Install Dependencies

```bash
sudo apt update
sudo apt install -y python3-pip python3-venv git
```

### Step 4: Clone Repository

```bash
git clone https://github.com/your-username/commitment-parties.git
cd commitment-parties/agent
```

### Step 5: Setup Python Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 6: Setup Agent Wallet

**Option A: Copy existing keypair**
```bash
mkdir -p ~/.config/solana
# From your local machine:
scp ~/.config/solana/id.json root@your-server-ip:~/.config/solana/id.json
```

**Option B: Use private key in .env**
```bash
# Just set AGENT_PRIVATE_KEY in .env file (see next step)
```

### Step 7: Create .env File

```bash
cp ../docs/env-templates/agent.env.example .env
nano .env
```

Fill in all your environment variables (same as Render Step 3).

### Step 8: Create Systemd Service

```bash
sudo nano /etc/systemd/system/commitment-agent.service
```

Paste this content (adjust paths as needed):

```ini
[Unit]
Description=Commitment Parties AI Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/commitment-parties/agent
Environment="PATH=/root/commitment-parties/agent/venv/bin"
EnvironmentFile=/root/commitment-parties/agent/.env
ExecStart=/root/commitment-parties/agent/venv/bin/python src/main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Important**: Update paths to match your setup:
- `WorkingDirectory`: Path to your `agent` folder
- `EnvironmentFile`: Path to your `.env` file
- `ExecStart`: Path to Python in your venv

### Step 9: Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable commitment-agent
sudo systemctl start commitment-agent
sudo systemctl status commitment-agent
```

You should see: `Active: active (running)`

### Step 10: View Logs

```bash
# Real-time logs
sudo journalctl -u commitment-agent -f

# Last 100 lines
sudo journalctl -u commitment-agent -n 100

# Application logs (if configured)
tail -f agent.log
```

### Step 11: Useful Commands

```bash
# Restart agent
sudo systemctl restart commitment-agent

# Stop agent
sudo systemctl stop commitment-agent

# Check status
sudo systemctl status commitment-agent

# View logs
sudo journalctl -u commitment-agent -f
```

---

## Getting Your Agent Wallet Private Key

If you need to get your private key from an existing keypair file:

```bash
# On your local machine
solana-keygen recover 'prompt://?full-path=/path/to/keypair.json' -o recovered.json
# Or use a Python script:
python3 -c "
import json
import base58
with open('keypair.json') as f:
    keypair = json.load(f)
private_key = base58.b58encode(bytes(keypair)).decode('utf-8')
print(private_key)
"
```

Then use this private key as `AGENT_PRIVATE_KEY` in your environment variables.

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `PROGRAM_ID` | Your Solana program ID | `GSvoKxVHbtAY2mAAU4RM3PVQC3buLSjRm24N7QhAoieH` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@host:5432/db` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `AGENT_PRIVATE_KEY` | Agent wallet private key (base58) | `5KJvsngHeM...` |
| `ACTION_BASE_URL` | Backend URL for Solana Actions | `https://backend.onrender.com/solana/actions` |
| `APP_BASE_URL` | Frontend URL | `https://app.vercel.app` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_KEYPAIR_PATH` | Path to keypair file (alternative to private key) | None |
| `TWITTER_API_KEY` | Twitter API credentials (for social features) | None |
| `TWITTER_API_SECRET` | Twitter API secret | None |
| `TWITTER_ACCESS_TOKEN` | Twitter access token | None |
| `TWITTER_ACCESS_TOKEN_SECRET` | Twitter access token secret | None |
| `OPENAI_API_KEY` | OpenAI API key (for AI tweets) | None |
| `ENVIRONMENT` | Environment name | `development` |
| `DEBUG` | Enable debug logging | `false` |

---

## Troubleshooting

### Agent Won't Start

**Check logs for errors:**
- Render/Railway: View in dashboard logs
- VPS: `sudo journalctl -u commitment-agent -n 50`

**Common issues:**
1. **Missing environment variables** - Check all required vars are set
2. **Database connection failed** - Verify `DATABASE_URL` is correct
3. **Invalid wallet** - Check `AGENT_PRIVATE_KEY` or `AGENT_KEYPAIR_PATH`
4. **Python dependencies missing** - Run `pip install -r requirements.txt`

### Agent Keeps Restarting

**Check logs for crash reasons:**
- Usually database connection issues
- Or Solana RPC rate limits
- Check error messages in logs

### Agent Not Monitoring Pools

**Verify:**
1. Agent is running: Check logs for `"Starting pool monitoring loop..."`
2. Database has pools: Check your database
3. Pools are active: Check pool status in database

### Twitter Not Posting

**Check:**
1. Twitter credentials are set correctly
2. Twitter app has "Read and Write" permissions
3. Check logs for Twitter errors
4. See [TWITTER_TROUBLESHOOTING.md](TWITTER_TROUBLESHOOTING.md)

---

## Monitoring Your Agent

### What the Agent Does

The agent runs these tasks continuously:

1. **Pool Monitoring** - Checks active pools every hour
2. **Goal Verification** - Verifies participants completed goals
3. **Reward Distribution** - Distributes rewards when pools end
4. **Pool Activation** - Activates pools when recruitment ends
5. **Twitter Posting** - Posts updates about pools

### Check Agent Health

**Render/Railway:**
- View logs in dashboard
- Look for regular activity (monitoring, verification, etc.)

**VPS:**
```bash
# Check if running
sudo systemctl status commitment-agent

# View recent activity
sudo journalctl -u commitment-agent --since "1 hour ago"

# Check for errors
sudo journalctl -u commitment-agent -p err
```

---

## Cost Comparison

| Option | Cost | Always-On | Best For |
|--------|------|-----------|----------|
| **Render Free** | $0 | ❌ No (spins down) | Testing only |
| **Render Starter** | $7/month | ✅ Yes | Quick setup |
| **Railway** | ~$5-10/month | ✅ Yes | Alternative to Render |
| **VPS (DigitalOcean)** | $6/month | ✅ Yes | Production |
| **VPS (Hetzner)** | €4/month | ✅ Yes | Budget option |

---

## Next Steps

After deploying your agent:

1. ✅ Verify it's running (check logs)
2. ✅ Test with a pool (create a test pool and see if agent monitors it)
3. ✅ Check Twitter posting (if configured)
4. ✅ Monitor for 24 hours to ensure stability

---

## Need Help?

- Check [AGENT_STARTUP.md](AGENT_STARTUP.md) for startup troubleshooting
- Check [TWITTER_TROUBLESHOOTING.md](TWITTER_TROUBLESHOOTING.md) for Twitter issues
- Check logs for specific error messages
