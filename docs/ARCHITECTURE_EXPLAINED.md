# Architecture Explained: How Commitment Pools Actually Work

## 1. Smart Contract Architecture (One Program, Many Pools)

**You are NOT creating new smart contracts each time.** Instead:

- **One Solana program** (`commitment-pool`) is deployed once
- Each pool is a **new account** (PDA) created by that program
- Think of it like: one factory (program) → many products (pools)

### How Pool Creation Works:

```
User creates pool → Frontend calls create_pool instruction
                  ↓
         Program creates new Pool PDA account
         (seeds: [b"pool", pool_id])
                  ↓
         Pool account stores:
         - pool_id, goal_type, stake_amount, etc.
         - Vault PDA (holds all staked SOL)
                  ↓
         Backend stores metadata in database
```

### Account Structure:

```
CommitmentPool Program (deployed once)
├── Pool PDA #1 (pool_id=123)
│   ├── Vault PDA (holds staked SOL)
│   └── Participant PDAs (one per user)
├── Pool PDA #2 (pool_id=456)
│   ├── Vault PDA
│   └── Participant PDAs
└── Pool PDA #3 (pool_id=789)
    └── ...
```

## 2. Verification Flow

### How Verification Actually Works:

1. **Agent monitors pools** (runs every 5min-24h depending on type)
2. **Checks off-chain data**:
   - HODL: Queries Solana for token balance
   - DCA: Counts transactions per day
   - GitHub: Calls GitHub API for commits
   - Screen-time: Queries `checkins` table for screenshot
3. **Submits on-chain verification**:
   - Calls `verify_participant(pool_id, wallet, day, passed)`
   - Updates `Participant` account state on-chain
   - Stores verification in `verifications` table (off-chain)

### On-Chain Participant State:

```rust
pub struct Participant {
    pub wallet: Pubkey,
    pub status: ParticipantStatus,  // Active, Success, Failed
    pub days_verified: u8,          // Highest day passed
    // ...
}
```

The agent updates this state daily. Users can query their participant account to see their status.

## 3. User Check-In Flow (Screenshots)

### Current State:
- ✅ Backend API exists: `POST /api/checkins`
- ✅ Database schema supports `screenshot_url`
- ❌ **Missing**: Frontend UI to upload screenshots

### How It Should Work:

1. User visits pool detail page
2. Sees "Submit Check-In" button (for lifestyle pools)
3. Uploads screenshot (to Supabase Storage or similar)
4. Frontend calls `POST /api/checkins` with:
   ```json
   {
     "pool_id": 123,
     "participant_wallet": "ABC...",
     "day": 3,
     "success": true,
     "screenshot_url": "https://..."
   }
   ```
5. Agent picks it up in next monitoring cycle

## 4. User Dashboard - What's Missing

### Current Dashboard:
- ✅ Shows pools you **created**
- ❌ **Missing**: Pools you **participated in** (joined)
- ❌ **Missing**: Your verification status per pool
- ❌ **Missing**: Days passed/failed breakdown

### What We Need:

1. **Query participant accounts on-chain** to see:
   - Which pools you joined
   - Your `days_verified` count
   - Your `status` (Active/Success/Failed)

2. **Backend endpoint** to fetch user's participant data:
   ```
   GET /api/users/{wallet}/participations
   ```

3. **Frontend** to display:
   - Active pools you're in
   - Progress bars (days_verified / duration_days)
   - Check-in reminders for lifestyle pools

## 5. AI Integration - Better Use Cases

You're right: AI generating descriptions is low value. Better use cases:

### High-Value AI Tasks:

1. **Natural Language → Smart Contract Actions**:
   - "Create a 7-day HODL challenge for SOL with 0.5 SOL stake"
   - AI generates the exact instruction call
   - User just approves transaction

2. **AI Verification Assistant**:
   - User: "I made a commit but agent says I failed"
   - AI analyzes GitHub API response, explains why
   - Suggests fixes

3. **AI Pool Strategy Advisor**:
   - "What's the best stake amount for a 30-day challenge?"
   - AI analyzes historical pool success rates
   - Recommends optimal parameters

4. **Natural Language Pool Queries**:
   - "Show me all active HODL pools with less than 5 participants"
   - AI converts to database query
   - Returns filtered results

## Implementation Priority

1. **Screenshot upload UI** (highest impact, missing piece)
2. **Participant status tracking** (users need to see progress)
3. **AI on-chain action builder** (high value, differentiator)
4. **Enhanced dashboard** (better UX)

