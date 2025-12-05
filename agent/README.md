# AI Agent

Autonomous Python agent that monitors commitment pools 24/7, verifies goal completion, and executes reward distributions.

## Overview

The agent runs continuously and performs the following tasks:

- **Pool Monitoring**: Checks all active pools for goal completion
- **Verification**: Verifies DCA swaps, HODL balances, and lifestyle check-ins
- **Distribution**: Automatically distributes rewards when pools end
- **Social Integration**: Posts to Twitter about pool activity (optional)

## Setup

### Prerequisites

- Python 3.8+
- Virtual environment activated
- Environment variables configured

### Installation

```bash
cd agent
source ../venv/bin/activate
pip install -r requirements.txt
```

### Configuration

Copy the example environment file:

```bash
cp docs/env-templates/agent.env.example .env
```

Required environment variables:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=your_program_id_here

# Agent Wallet (choose one)
AGENT_PRIVATE_KEY=your_base58_private_key
# OR
AGENT_KEYPAIR_PATH=/path/to/keypair.json

# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...

# URLs
ACTION_BASE_URL=https://your-backend-url/solana/actions
APP_BASE_URL=https://your-frontend-url

# Twitter (optional)
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_TOKEN_SECRET=...
```

## Running

### Development

```bash
cd agent
source ../venv/bin/activate
python src/main.py
```

### Production

The agent must run as a persistent service (not serverless). Options:

1. **Render Background Worker** (Recommended)
   - Create Background Worker service
   - Set root directory to `agent`
   - Build: `pip install -r requirements.txt`
   - Start: `python src/main.py`
   - Requires Starter plan ($7/month) for always-on

2. **Railway Background Worker**
   - Similar setup to Render
   - Set root directory to `agent`

3. **VPS (DigitalOcean, AWS EC2)**
   - Setup systemd service for auto-restart
   - See deployment docs for systemd configuration

## Architecture

### Components

- **SolanaClient**: RPC client for blockchain interaction
- **Monitor**: Monitors different challenge types
  - DCA pools: Daily swap verification
  - HODL pools: Hourly balance checks
  - Lifestyle pools: Check-in verification
- **Verifier**: Submits verification results to smart contracts
- **Distributor**: Handles reward distribution when pools end
- **SocialManager**: Twitter integration for social features
- **PoolActivator**: Activates pools when recruitment period ends

### Monitoring Loops

- **DCA Pools**: Check daily for Jupiter/Raydium swaps
- **HODL Pools**: Check hourly for token balance
- **Lifestyle Pools**: Check every 5 minutes for check-ins
- **Distribution**: Check hourly for ended pools

## Testing

```bash
# Run agent tests
python test_agent.py

# Test specific components
python test_social_agent.py
python test_full_flow.py
```

## Logging

Logs are written to:
- Console (stdout)
- `agent.log` file

Log levels can be configured via environment variables.

## Troubleshooting

### Agent not starting
- Verify keypair file exists and is readable
- Check Solana RPC URL is accessible
- Verify program ID is correct
- Check database connection

### Verification failures
- Check RPC endpoint is responding
- Verify agent has sufficient SOL for transactions
- Check program ID matches deployed contract

### Distribution failures
- Ensure agent wallet has SOL for transaction fees
- Verify pool has ended and participants are verified
- Check smart contract state
