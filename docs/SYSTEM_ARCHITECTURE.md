# Commitment Parties - Complete System Architecture

## Quick Answer: Agent vs Twitter Bot

**The Twitter bot is NOT separate from the agent** - it's a **component within the agent**.

The `SocialManager` class is initialized as part of the `CommitmentAgent` and runs as one of the concurrent tasks. The agent is a single Python process that runs multiple monitoring loops, including the Twitter posting loop.

## System Overview

Your project has **4 main components** that work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (Next.js Frontend)                            │
│  - Browse pools, create pools, join pools, submit check-ins      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ HTTP/REST API
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                      BACKEND API                                 │
│                   (FastAPI/Python)                               │
│  - Pool metadata storage                                        │
│  - Check-in submissions                                          │
│  - User management                                              │
│  - Solana Actions (Blinks) endpoints                            │
└───────┬───────────────────────────────┬─────────────────────────┘
        │                               │
        │ Database                      │ Solana Actions
        │                               │
┌───────▼──────────┐        ┌──────────▼───────────────────────┐
│   DATABASE       │        │     TWITTER/X                       │
│  (Supabase/      │        │  - Blink URLs in tweets            │
│   PostgreSQL)    │        │  - Users click Blink               │
│                  │        │  - Wallet signs transaction         │
└──────────────────┘        └──────────┬─────────────────────────┘
                                        │
                                        │ Action POST
                                        │
┌───────────────────────────────────────▼─────────────────────────┐
│                    SOLANA BLOCKCHAIN                              │
│              (Smart Contracts - Anchor/Rust)                      │
│  - Pool accounts (PDAs)                                          │
│  - Participant accounts                                          │
│  - Vault accounts (hold staked SOL)                              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ RPC Calls
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                    AI AGENT                                      │
│                 (Python Process)                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Monitor (monitor.py)                                  │  │
│  │    - Checks DCA pools (daily)                            │  │
│  │    - Checks HODL pools (hourly)                          │  │
│  │    - Checks lifestyle pools (every 5 min)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Verifier (verify.py)                                  │  │
│  │    - Submits verifications to smart contracts           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Distributor (distribute.py)                          │  │
│  │    - Distributes rewards when pools end                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. SocialManager (social.py) ← TWITTER BOT IS HERE      │  │
│  │    - Posts tweets about pools                            │  │
│  │    - Creates Blink URLs                                  │  │
│  │    - Runs continuously (hourly updates)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. PoolActivator (activate_pools.py)                    │  │
│  │    - Activates pools when recruitment period ends         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (Next.js/TypeScript)
**Location**: `app/frontend/`

**Purpose**: User-facing web application

**Key Features**:
- Wallet connection (currently Phantom, can be extended to multiple wallets)
- Pool browsing and creation
- Joining pools (on-chain transactions)
- Submitting check-ins (lifestyle challenges)
- Viewing progress and leaderboards

**How it works**:
- Connects to backend API for pool metadata
- Directly interacts with Solana blockchain for on-chain operations
- Uses `@solana/web3.js` for transaction building
- Can also use Blink URLs from Twitter to join pools

### 2. Backend API (FastAPI/Python)
**Location**: `backend/`

**Purpose**: Off-chain data management and API endpoints

**Key Responsibilities**:
- Store pool metadata (name, description, settings)
- Manage check-in submissions
- User profile management
- **Solana Actions endpoints** (for Blinks)

**Important Endpoints**:
- `GET /api/pools` - List pools
- `POST /api/pools/create/confirm` - Store pool metadata after on-chain creation
- `POST /api/checkins` - Submit check-ins
- `GET /solana/actions/join-pool` - **Blink GET endpoint** (describes action)
- `POST /solana/actions/join-pool` - **Blink POST endpoint** (builds transaction)

**Database**: Supabase (PostgreSQL) stores:
- `pools` - Pool metadata
- `participants` - Who joined which pools
- `checkins` - Lifestyle challenge check-ins
- `verifications` - Agent verification results
- `users` - User profiles

### 3. Smart Contracts (Anchor/Rust)
**Location**: `programs/commitment-pool/`

**Purpose**: Trustless on-chain pool and participant management

**Key Accounts**:
- `CommitmentPool` (PDA) - Pool state and configuration
- `Participant` (PDA) - Individual participant status
- `Vault` (PDA) - Holds all staked SOL in escrow

**Key Instructions**:
- `create_pool` - Initialize a new pool
- `join_pool` - User stakes SOL and joins
- `verify_participant` - Agent submits verification results
- `distribute_rewards` - Settle pool and distribute to winners

**Security**: All stakes are locked in PDAs until distribution

### 4. AI Agent (Python)
**Location**: `agent/`

**Purpose**: Autonomous 24/7 monitoring and automation

**This is a SINGLE Python process** that runs multiple concurrent tasks:

#### Task 1: Monitor (`monitor.py`)
- **DCA Pools**: Checks daily for Jupiter/Raydium swap activity
- **HODL Pools**: Checks hourly for token balance changes
- **Lifestyle Pools**: Checks every 5 minutes for check-ins

#### Task 2: Verifier (`verify.py`)
- Takes verification results from Monitor
- Submits `verify_participant` transactions to smart contracts
- Updates participant status on-chain

#### Task 3: Distributor (`distribute.py`)
- Checks hourly for pools that have ended
- Calculates winners/losers
- Executes `distribute_rewards` to settle pools
- Transfers SOL to winners and charity

#### Task 4: SocialManager (`social.py`) ← **THIS IS THE TWITTER BOT**
- **Runs continuously** as part of the agent
- Posts tweets about active pools (hourly updates)
- Generates engaging tweet content (AI-powered or templates)
- Creates Blink URLs for joining pools
- **NOT a separate service** - it's a component of the agent

#### Task 5: PoolActivator (`activate_pools.py`)
- Checks for pools with scheduled start times
- Activates pools when recruitment period ends

**How Agent Starts**:
```python
# agent/src/main.py
tasks = [
    self.monitor.monitor_dca_pools(),      # Concurrent task 1
    self.monitor.monitor_hodl_pools(),     # Concurrent task 2
    self.monitor.monitor_lifestyle_pools(), # Concurrent task 3
    self.distributor.check_and_distribute(), # Concurrent task 4
    self.social.post_updates(),            # Concurrent task 5 ← Twitter bot
    self.activator.activate_scheduled_pools(), # Concurrent task 6
]
await asyncio.gather(*tasks)  # All run concurrently
```

## How Blinks/Actions Work

### Current Status: ✅ **IMPLEMENTED AND FUNCTIONAL**

We just completed the implementation. Here's how it works:

### Step-by-Step Blink Flow

```
1. Agent posts tweet with Blink URL
   └─> SocialManager.post_event_update() or post_updates()
       └─> Creates URL: https://api.your-domain.xyz/solana/actions/join-pool?pool_id=123
       └─> Posts to Twitter: "🎉 New challenge: Daily DCA Challenge
                              🔗 Join: https://api.../join-pool?pool_id=123
                              🌐 Details: https://app.../pools/123"

2. User sees tweet on Twitter/X
   └─> Twitter detects Solana Action URL
   └─> Renders as clickable button: "Join Challenge"

3. User clicks button
   └─> Wallet (Phantom, Solflare, etc.) opens
   └─> Wallet calls GET /solana/actions/join-pool?pool_id=123
       └─> Backend returns Action metadata:
           {
             "type": "action",
             "title": "Join Daily DCA Challenge",
             "description": "Join this commitment challenge...",
             "links": {
               "actions": [{"label": "Join Challenge", "href": "..."}]
             }
           }

4. User confirms in wallet
   └─> Wallet calls POST /solana/actions/join-pool
       └─> Request body: {"account": "user_wallet_address", "pool_id": 123}
       └─> Backend builds transaction:
           - Derives PDAs (pool, participant, vault)
           - Builds join_pool instruction
           - Creates unsigned transaction
           - Returns base64-encoded transaction

5. Wallet signs and submits
   └─> User approves transaction in wallet
   └─> Transaction sent to Solana blockchain
   └─> SOL transferred to vault
   └─> Participant account created on-chain

6. User joins pool
   └─> On-chain transaction confirms
   └─> User is now a participant
```

### Implementation Files

**Backend**:
- `backend/routers/solana_actions.py` - Action endpoints (GET/POST)
- `backend/solana_tx_builder.py` - Transaction builder

**Agent**:
- `agent/src/social.py` - Twitter posting and Blink URL creation
- `agent/src/config.py` - URL configuration (ACTION_BASE_URL, APP_BASE_URL)

### What's Working

✅ **Backend Action endpoints** - Fully implemented
✅ **Transaction building** - Real Solana transactions (not dummies)
✅ **Twitter posting** - Agent can post tweets with Blink URLs
✅ **Blink URL generation** - Correct format for Solana Actions

### What Needs Testing

⚠️ **End-to-end Blink flow** - Need to test:
1. Post a tweet with Blink URL
2. Click Blink in Twitter
3. Verify wallet opens and shows transaction
4. Sign and submit transaction
5. Verify user joins pool on-chain

⚠️ **Twitter/X Blink rendering** - Twitter needs to recognize the URL format. May need to:
- Register domain with Solana Actions
- Ensure proper Action JSON format
- Test with actual Twitter account

## Complete Data Flow Examples

### Example 1: User Creates a Pool

```
1. User fills form in frontend
   └─> Frontend builds create_pool transaction
   
2. User signs transaction with wallet
   └─> Transaction sent to Solana
   └─> Pool account created on-chain
   
3. Frontend calls backend API
   └─> POST /api/pools/create/confirm
   └─> Backend stores pool metadata in database
   
4. Agent detects new pool
   └─> PoolActivator or Monitor sees pool
   └─> (Optional) SocialManager posts tweet about new pool
       └─> Includes Blink URL for joining
```

### Example 2: User Joins Pool via Blink

```
1. User sees tweet with Blink
   └─> Clicks "Join Challenge" button
   
2. Wallet opens and requests transaction
   └─> GET /solana/actions/join-pool?pool_id=123
   └─> POST /solana/actions/join-pool
       └─> Backend builds join_pool transaction
       └─> Returns base64 transaction
   
3. User signs transaction
   └─> Transaction sent to Solana
   └─> SOL transferred to vault
   └─> Participant account created
   
4. Frontend (optional) confirms join
   └─> POST /api/pools/{id}/join/confirm
   └─> Backend updates participant count
```

### Example 3: Agent Verifies Participant

```
1. Agent Monitor checks lifestyle pool
   └─> Queries database for check-ins
   └─> Checks GitHub API for commits
   
2. Agent Verifier determines result
   └─> Passed or failed for the day
   
3. Agent submits on-chain verification
   └─> verify_participant instruction
   └─> Updates participant status on-chain
   
4. Agent updates database
   └─> Stores verification record
   └─> Updates days_verified count
```

### Example 4: Agent Posts Twitter Update

```
1. Agent SocialManager runs hourly
   └─> Queries database for active pools
   
2. For each pool, checks if update needed
   └─> Rate limiting (1 post per pool per hour)
   
3. Generates tweet content
   └─> Uses AI (if configured) or templates
   └─> Includes pool stats
   
4. Creates Blink URL
   └─> https://api.../solana/actions/join-pool?pool_id=123
   
5. Posts to Twitter
   └─> Tweet includes Blink URL
   └─> Twitter renders as action button
```

## Component Communication

### Frontend ↔ Backend
- **Protocol**: HTTP/REST API
- **Purpose**: Pool metadata, check-ins, user data
- **No direct blockchain interaction** for metadata

### Frontend ↔ Blockchain
- **Protocol**: Solana RPC
- **Purpose**: On-chain transactions (create_pool, join_pool)
- **Direct interaction** using wallet

### Backend ↔ Database
- **Protocol**: Supabase (PostgreSQL)
- **Purpose**: All off-chain data storage

### Agent ↔ Blockchain
- **Protocol**: Solana RPC
- **Purpose**: Verification and distribution transactions
- **Uses agent wallet** for signing

### Agent ↔ Database
- **Protocol**: Supabase (PostgreSQL)
- **Purpose**: Reading pool data, storing verifications

### Agent ↔ Twitter
- **Protocol**: Twitter API v2 (tweepy)
- **Purpose**: Posting tweets with Blink URLs

### Wallet ↔ Backend (via Blinks)
- **Protocol**: HTTP (Solana Actions spec)
- **Purpose**: Getting transaction to sign
- **Flow**: Wallet requests transaction, backend builds it, wallet signs

## Running the System

### Development Setup

**1. Start Backend**:
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
# Runs on http://localhost:8000
```

**2. Start Frontend**:
```bash
cd app/frontend
npm run dev
# Runs on http://localhost:3000
```

**3. Start Agent** (includes Twitter bot):
```bash
cd agent
source ../venv/bin/activate
python src/main.py
# Runs continuously, includes:
#   - Monitoring loops
#   - Verification
#   - Distribution
#   - Twitter posting (SocialManager)
#   - Pool activation
```

### Production Deployment

- **Frontend**: Deploy to Vercel/Netlify
- **Backend**: Deploy to Railway/Render/Fly.io
- **Agent**: Run on a VPS or cloud instance (needs to run 24/7)
- **Database**: Supabase (managed PostgreSQL)
- **Blockchain**: Solana devnet/mainnet

## Key Takeaways

1. **Agent and Twitter bot are the same process** - SocialManager is a component of the agent
2. **Blinks are implemented** - Backend endpoints exist and build real transactions
3. **System is modular** - Each component has a clear responsibility
4. **Agent is autonomous** - Runs 24/7 without human intervention
5. **Blinks enable viral growth** - Users can join pools directly from Twitter

## Next Steps for Full Blink Testing

1. **Deploy backend** with Action endpoints publicly accessible
2. **Configure agent** with ACTION_BASE_URL pointing to deployed backend
3. **Post test tweet** with Blink URL
4. **Test Blink flow** - Click in Twitter, verify wallet opens
5. **Verify transaction** - Sign and submit, check on-chain result

---

**Summary**: Your system is well-architected with clear separation of concerns. The Twitter bot is integrated into the agent as a concurrent task, and Blinks are fully implemented and ready for testing.


