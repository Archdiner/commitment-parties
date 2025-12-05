# AI Agent

Autonomous Python agent that monitors commitment pools 24/7, verifies goal completion, and executes reward distributions.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Running](#running)
  - [Development](#development)
  - [Production](#production)
- [Architecture](#architecture)
  - [Components](#components)
  - [Monitoring Loops](#monitoring-loops)
- [Technical Summary](#technical-summary)
  - [Functionality Flow](#functionality-flow)
    - [1. Pool Creation & Activation](#1-pool-creation--activation)
    - [2. Pool Joining](#2-pool-joining)
    - [3. Pool Monitoring & Verification](#3-pool-monitoring--verification)
    - [4. Reward Distribution](#4-reward-distribution)
  - [System Architecture](#system-architecture)
    - [Component Interactions](#component-interactions)
    - [Data Flow Patterns](#data-flow-patterns)
    - [Key Technical Patterns](#key-technical-patterns)
- [Testing](#testing)
- [Logging](#logging)
- [Troubleshooting](#troubleshooting)
  - [Agent not starting](#agent-not-starting)
  - [Verification failures](#verification-failures)
  - [Distribution failures](#distribution-failures)

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

## Technical Summary

### Functionality Flow

#### 1. Pool Creation & Activation

```
User creates pool via Frontend
    ↓
Frontend → Backend API: POST /api/pools
    ↓
Backend stores pool metadata in Supabase (PostgreSQL)
    ↓
Backend → Solana: create_pool instruction
    ↓
Smart contract creates Pool PDA account with:
  - Pool configuration (goal_type, stake_amount, duration, etc.)
  - Pool vault PDA for escrow
  - Initial status: Pending
    ↓
If scheduled start: Pool remains "pending"
If immediate start: Pool status set to "active"
    ↓
Agent's PoolActivator monitors pending pools every minute
    ↓
When scheduled_start_time arrives → Pool status → "active"
```

#### 2. Pool Joining

```
User browses pools via Frontend
    ↓
User connects wallet (Phantom/Solflare)
    ↓
User clicks "Join Pool"
    ↓
Frontend → Backend: GET /api/pools/{poolId}
    ↓
Frontend builds join_pool transaction:
  - Derives Pool PDA
  - Derives Participant PDA
  - Transfers stake_amount to vault
    ↓
User signs transaction with wallet
    ↓
Transaction submitted to Solana
    ↓
Smart contract's join_pool instruction:
  - Validates pool status (Pending or Active)
  - Checks pool not full
  - Transfers SOL from user → vault
  - Creates Participant PDA account
  - Updates pool.participant_count
    ↓
Backend receives transaction confirmation
    ↓
Backend updates participants table in database
```

#### 3. Pool Monitoring & Verification

The agent runs continuous monitoring loops in parallel:

**DCA Pool Monitoring (Daily):**
```
Every 24 hours (Eastern Time):
  ↓
Agent queries active DCA pools from database
  ↓
For each pool:
  - Calculate current day number based on pool start_timestamp
  - Query Jupiter/Raydium API for swap transactions
  - Check participant wallets for swaps matching:
    * Token pair (e.g., SOL → USDC)
    * Minimum amount threshold
    * Timestamp within day window
  ↓
For each participant:
  - Verify swap exists for current day
  - Submit verification to smart contract:
    * verify_participant(day, passed: bool)
    * Updates Participant account on-chain
  ↓
Database updated with verification result
```

**HODL Pool Monitoring (Hourly):**
```
Every hour:
  ↓
Agent queries active HODL pools
  ↓
For each pool:
  - Get token mint address and minimum balance
  - Query Solana RPC for current token balances
  - Check each participant's token account
  ↓
For each participant:
  - Compare balance >= minimum_balance
  - Submit verification: verify_participant(day, passed)
  ↓
Database updated
```

**Lifestyle Pool Monitoring (Every 5 minutes):**
```
Every 5 minutes:
  ↓
Agent queries active lifestyle pools
  ↓
For each pool:
  - Query checkins table for recent submissions
  - For GitHub commits: Query GitHub API
  - For screen time: Verify screenshot uploads
  - For custom check-ins: Validate submission data
  ↓
For each participant:
  - Check if check-in submitted for current day
  - Validate check-in content (AI-assisted if enabled)
  - Submit verification: verify_participant(day, passed)
  ↓
Database updated
```

#### 4. Reward Distribution

```
Agent's Distributor checks hourly for ended pools
    ↓
Query pools where:
  - status = "active"
  - end_timestamp <= current_time
    ↓
For each ended pool:
  - Query all participants from database
  - Calculate winners (days_verified >= duration_days)
  - Calculate losers (days_verified < duration_days)
    ↓
Determine distribution amounts:
  - Competitive mode: Winners split losers' stakes
  - Charity mode: Losers' stakes → charity_address
  - Split mode: Configurable percentage split
    ↓
Call smart contract: distribute_rewards()
  - Marks pool as "Ended" then "Settled"
  - Updates pool status on-chain
    ↓
Agent handles actual SOL transfers:
  - Winners: stake + bonus per winner
  - Charity: remaining amount (if applicable)
    ↓
Database updated:
  - Pool status → "settled"
  - Payout records created
```

### System Architecture

#### Component Interactions

```
┌─────────────┐
│  Frontend   │  Next.js 14, TypeScript, Tailwind
│  (Next.js)  │
└──────┬──────┘
       │ HTTPS/REST
       │
┌──────▼──────────────────────────────────┐
│        Backend API (FastAPI)            │
│  ┌────────────────────────────────────┐ │
│  │  Routers:                          │ │
│  │  - /api/pools                      │ │
│  │  - /api/checkins                   │ │
│  │  - /api/users                      │ │
│  │  - /solana/actions (Twitter Blinks)│ │
│  └────────────────────────────────────┘ │
└──────┬──────────────────┬───────────────┘
       │                  │
       │ PostgreSQL       │ Solana RPC
       │                  │
┌──────▼──────┐    ┌──────▼──────────────┐
│  Supabase   │    │  Solana Blockchain  │
│  Database   │    │  (Smart Contracts)  │
│             │    │                     │
│  - pools    │    │  - Pool PDA         │
│  - participants│  │  - Participant PDA │
│  - checkins │    │  - Pool Vault PDA   │
│  - users    │    │  - Verification data│
└─────────────┘    └─────────────────────┘
       ▲                  ▲
       │                  │
       │                  │
┌──────┴──────────────────┴───────────────┐
│         AI Agent (Python)                │
│  ┌────────────────────────────────────┐  │
│  │  CommitmentAgent (Main Loop)       │  │
│  │                                    │  │
│  │  ┌─────────────┐  ┌─────────────┐ │  │
│  │  │  Monitor    │  │  Verifier   │ │  │
│  │  │             │  │             │ │  │
│  │  │ - DCA       │  │ - Submit    │ │  │
│  │  │ - HODL      │  │   verifications │
│  │  │ - Lifestyle │  │             │ │  │
│  │  └──────┬──────┘  └──────┬──────┘ │  │
│  │         │                │        │  │
│  │  ┌──────▼────────────────▼──────┐ │  │
│  │  │    SolanaClient              │ │  │
│  │  │  - RPC client                │ │  │
│  │  │  - Transaction builder       │ │  │
│  │  │  - PDA derivation            │ │  │
│  │  └──────────────────────────────┘ │  │
│  │                                    │  │
│  │  ┌─────────────┐  ┌─────────────┐ │  │
│  │  │ Distributor │  │ SocialManager│ │  │
│  │  │             │  │             │ │  │
│  │  │ - Settlement│  │ - Twitter   │ │  │
│  │  │ - Payouts   │  │   posts     │ │  │
│  │  └─────────────┘  └─────────────┘ │  │
│  │                                    │  │
│  │  ┌─────────────┐                  │  │
│  │  │PoolActivator│                  │  │
│  │  │             │                  │  │
│  │  │ - Scheduled │                  │  │
│  │  │   activation│                  │  │
│  │  └─────────────┘                  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

#### Data Flow Patterns

**On-Chain State:**
- Pool configuration (immutable after creation)
- Participant accounts (verification results)
- Pool vault (escrow of all stakes)
- Pool status transitions (Pending → Active → Ended → Settled)

**Off-Chain State (Database):**
- Pool metadata (title, description, goal params)
- User profiles and preferences
- Check-in submissions (lifestyle challenges)
- Historical verification records
- Social features (invites, shares)

**Verification Flow:**
1. Agent monitors external sources (blockchain, GitHub, etc.)
2. Agent queries database for pool/participant data
3. Agent performs verification logic
4. Agent submits result to smart contract (on-chain)
5. Agent updates database (off-chain record)

**Distribution Flow:**
1. Agent detects pool end condition
2. Agent queries database for all participants
3. Agent calculates winners/losers and payout amounts
4. Agent calls smart contract to mark pool as settled
5. Agent executes SOL transfers (or smart contract handles)
6. Agent records payout transactions in database

#### Key Technical Patterns

**PDA (Program Derived Address) Derivation:**
- Pool PDA: `[b"pool", pool_id.to_le_bytes()]`
- Participant PDA: `[b"participant", pool.key(), wallet.key()]`
- Vault PDA: `[b"vault", pool.key()]`
- All PDAs are deterministic and don't require signatures

**Concurrent Monitoring:**
- Agent runs all monitoring loops in parallel using `asyncio.gather()`
- Each loop has independent error handling and retry logic
- Non-blocking design allows all tasks to run simultaneously

**Error Handling & Resilience:**
- Database connection failures: Graceful degradation, retry with backoff
- RPC failures: Retry with exponential backoff, circuit breaker pattern
- Transaction failures: Logged and retried, no silent failures
- Verification failures: Individual participant failures don't block others

**State Synchronization:**
- Database is source of truth for pool metadata and user data
- Smart contract is source of truth for stakes and verification results
- Agent synchronizes between both, ensuring consistency
- Periodic reconciliation checks for discrepancies

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
