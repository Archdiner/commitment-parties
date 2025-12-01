# Commitment Agent Architecture

## System Overview

Commitment Agent is a decentralized accountability platform built on Solana. The system consists of four main components:

1. **Smart Contracts** (Anchor/Rust) - On-chain pool and participant management
2. **Backend API** (FastAPI/Python) - Off-chain data and check-in management
3. **AI Agent** (Python) - Autonomous monitoring and verification
4. **Frontend** (Next.js/TypeScript) - User interface

## Component Architecture

### Smart Contracts (`programs/commitment-pool/`)

**Purpose**: Trustless on-chain management of pools, stakes, and verifications.

**Key Accounts**:
- `CommitmentPool` - Stores pool configuration and state
- `Participant` - Tracks individual participant status and progress
- Pool Vault (PDA) - Holds all staked SOL in escrow

**Instructions**:
- `create_pool` - Initialize a new commitment pool
- `join_pool` - Allow users to stake and join
- `verify_participant` - Submit verification results (called by agent)
- `distribute_rewards` - Settle pool and distribute rewards

**Security**:
- All stakes held in Program Derived Addresses (PDAs)
- No early withdrawal possible
- Transparent on-chain verification

### Backend API (`backend/`)

**Purpose**: Fast, queryable database for pool discovery and check-in management.

**Technology**: FastAPI with Supabase (PostgreSQL)

**Endpoints**:
- `GET /api/pools` - List active pools
- `GET /api/pools/{id}` - Get pool details
- `POST /api/pools` - Create pool metadata
- `POST /api/checkins` - Submit lifestyle check-ins
- `GET /api/checkins/{pool_id}/{wallet}` - Get user check-ins

**Database Schema**:
- `users` - User profiles and reputation
- `pools` - Pool metadata and configuration
- `checkins` - Off-chain verification records
- `pool_events` - Activity feed

### AI Agent (`agent/`)

**Purpose**: Autonomous 24/7 monitoring and verification.

**Components**:
- `SolanaClient` - RPC client for blockchain interaction
- `Monitor` - Monitors different challenge types
- `Verifier` - Submits verifications to smart contracts
- `Distributor` - Handles reward distribution
- `SocialManager` - Twitter integration

**Monitoring Loops**:
- DCA pools: Check daily for Jupiter/Raydium swaps
- HODL pools: Check hourly for token balance
- Lifestyle pools: Check every 5 minutes for check-ins
- Distribution: Check hourly for ended pools

### Frontend (`app/`)

**Purpose**: User-facing interface for pool discovery and interaction.

**Technology**: Next.js 14 with Solana wallet adapter

**Features**:
- Wallet connection (Phantom, Solflare)
- Pool browser and creation
- Check-in interface
- Twitter Blinks integration

## Data Flow

### Pool Creation Flow

```
User → Frontend → Smart Contract (create_pool)
                ↓
         Backend API (store metadata)
                ↓
         Database (pools table)
```

### Joining Pool Flow

```
User → Frontend → Smart Contract (join_pool)
                ↓
         Transfer SOL to vault PDA
                ↓
         Create participant account
                ↓
         Backend API (update pool stats)
```

### Verification Flow

```
AI Agent → Monitor pools
         ↓
    Check on-chain/off-chain data
         ↓
    Submit verification (verify_participant)
         ↓
    Update participant status
```

### Distribution Flow

```
AI Agent → Check for ended pools
         ↓
    Query all participants
         ↓
    Calculate winners/losers
         ↓
    Distribute rewards (distribute_rewards)
         ↓
    Transfer to winners & charity
```

## Smart Contract Interactions

### Account Relationships

```
CommitmentPool (PDA: [b"pool", pool_id])
    ├── Pool Vault (PDA: [b"vault", pool.key()])
    └── Participants (PDA: [b"participant", pool.key(), wallet])
```

### Instruction Flow

1. **Create Pool**: Authority creates pool account with PDA
2. **Join Pool**: User transfers SOL to vault, participant account created
3. **Verify**: Agent submits verification, participant status updated
4. **Distribute**: Agent calculates and executes distributions

## Security Considerations

### On-Chain Security

- All stakes in PDAs (cannot be withdrawn by users)
- Program validates all state transitions
- No reentrancy vulnerabilities (Solana's transaction model)
- Authority checks for sensitive operations

### Off-Chain Security

- Agent wallet stored securely (never commit to git)
- Database connection strings in environment variables
- API rate limiting (to be implemented)
- Input validation via Pydantic models

## Scalability

### Current Limitations

- Solana transaction size limits
- RPC rate limits
- Database query performance

### Optimization Strategies

- Batch verifications where possible
- Use Solana's parallel execution
- Database indexes on frequently queried fields
- Caching for pool metadata

## Future Enhancements

- Marinade Finance integration for yield generation
- Jupiter aggregator integration for DCA verification
- Circle USDC integration for charity payments
- Twitter Blinks for viral growth
- Reputation system for users
- Multi-token support (not just SOL)

