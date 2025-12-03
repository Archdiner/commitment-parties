# 🚀 Commitment Parties - Demo Guide

Complete guide for running the full on-chain demo.

## Quick Start (TL;DR)

```bash
# 1. Set up environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your_key_here

# 2. Start backend
cd backend && uvicorn main:app --reload

# 3. Run full demo (in another terminal)
cd agent && python demo.py full --stake-sol 0.01
```

## Prerequisites

### 1. Solana Wallet with SOL
```bash
# Check your wallet
solana address
solana balance

# If needed, airdrop SOL (devnet)
solana airdrop 2 --url devnet
```

### 2. Environment Variables

**Backend (`backend/.env`):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

**Agent (`agent/.env`):**
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=8Qk9e6QJgJ52BsRV58BPByTS1LenzZNQRo7Ehnqhg5zJ
AGENT_KEYPAIR_PATH=~/.config/solana/id.json
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

Or export directly:
```bash
export SUPABASE_URL=https://nqpyljvnjvqqdekkddgd.supabase.co
export SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
```

## Demo Scripts

### Option 1: Quick Demo Commands

```bash
cd agent

# Create a pool (returns pool_id)
python demo.py create --stake-sol 0.01

# Join the pool (transfers SOL to vault)
python demo.py join <pool_id>

# Submit check-in
python demo.py checkin <pool_id>

# Agent verifies (writes to chain)
python demo.py verify <pool_id>

# Check status
python demo.py status <pool_id>
```

### Option 2: Full Automated Flow

```bash
cd agent

# Runs all steps automatically
python demo.py full --stake-sol 0.01
```

### Option 3: Comprehensive Test

```bash
cd agent

# Full test with detailed output
python test_full_flow.py --stake-sol 0.01 --duration-days 1
```

## What Each Step Does

### 1. Create Pool (On-Chain)
- Submits `create_pool` transaction to Solana
- Creates pool PDA account
- Syncs pool data to database

### 2. Join Pool (On-Chain)
- Submits `join_pool` transaction
- **Transfers real SOL** to pool vault PDA
- Creates participant PDA account
- Updates pool participant count

### 3. Submit Check-in (API)
- POST to `/api/checkins/`
- Records check-in in database
- Participant self-reports success

### 4. Agent Verification (On-Chain)
- Agent checks database for check-in
- Submits `verify_participant` transaction
- Updates participant status on-chain

### 5. Distribution (On-Chain)
- Called when pool ends
- Submits `distribute_rewards` transaction
- Marks pool as settled

## Viewing Transactions

All transactions can be viewed on Solscan:
```
https://solscan.io/tx/<SIGNATURE>?cluster=devnet
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/pools/` | GET | List pools |
| `/api/pools/` | POST | Create pool |
| `/api/pools/{id}` | GET | Get pool |
| `/api/checkins/` | POST | Submit check-in |
| `/api/checkins/{pool_id}/{wallet}` | GET | Get check-ins |

## Troubleshooting

### "SUPABASE_URL and SUPABASE_KEY must be set"
```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your_key_here
```

### "Insufficient funds"
```bash
solana airdrop 2 --url devnet
```

### "Pool not found"
The pool doesn't exist on-chain yet. Create it first:
```bash
python demo.py create --stake-sol 0.01
```

### "Account already exists"
You've already joined this pool. Create a new one:
```bash
python demo.py create --stake-sol 0.01
```

### Backend 404 errors
Restart the backend:
```bash
cd backend
kill -9 $(lsof -ti:8000)
uvicorn main:app --reload
```

## Demo Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    COMMITMENT PARTIES DEMO                    │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CREATE    │    │    JOIN     │    │  CHECK-IN   │
│    POOL     │───▶│    POOL     │───▶│  (API)      │
│  (On-Chain) │    │  (On-Chain) │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                          │                  │
                          ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐
                   │    SOL      │    │  Database   │
                   │  Transfer   │    │   Record    │
                   │  to Vault   │    │             │
                   └─────────────┘    └─────────────┘
                                            │
                                            ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ DISTRIBUTE  │◀───│   VERIFY    │◀───│   AGENT     │
│  (On-Chain) │    │  (On-Chain) │    │   CHECKS    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│   Winner    │    │ Participant │
│   Payouts   │    │   Status    │
└─────────────┘    └─────────────┘
```

## Files Created

| File | Description |
|------|-------------|
| `agent/src/onchain.py` | On-chain transaction builders |
| `agent/demo.py` | Quick demo commands |
| `agent/test_full_flow.py` | Full automated test |
| `agent/src/distribute.py` | Enhanced distribution logic |
| `start_demo.sh` | Start all services |
| `stop_demo.sh` | Stop all services |

## Next Steps

1. **Frontend Integration**: Your teammate can call these API endpoints
2. **Wallet Connection**: Frontend connects wallet, signs transactions
3. **Real Testing**: Test with multiple participants
4. **Distribution**: Wait for pool to end, trigger distribution


