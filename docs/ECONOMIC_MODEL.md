# Commitment Agent Economic Model

## Core Problem: Money Flow

This document clarifies how money flows through the system for different pool configurations.

## Pool Types & Economic Models

### 1. Multi-Player Competitive Pools (Default)

**How it works:**
- Multiple participants stake the same amount (e.g., 0.5 SOL each)
- Winners split the losers' stakes + any yield generated
- Losers forfeit their stake (goes to winners or charity)

**Example:**
```
Pool: 10 participants, 0.5 SOL stake each = 5 SOL total
Results: 6 winners, 4 losers
Yield from Marinade: 0.07 SOL (7% APY over 7 days)

Distribution:
- Winners get: (4 losers × 0.5 SOL + 0.07 yield) / 6 = 0.345 SOL each
- Winners receive: 0.5 SOL (original) + 0.345 SOL (reward) = 0.845 SOL total
- Losers get: 0 SOL (forfeited)
```

**Money Flow:**
```
Participants stake → Pool Vault (escrow)
                    ↓
            Staked in Marinade (yield generation)
                    ↓
            Pool ends → Calculate winners/losers
                    ↓
    Winners: Original stake + (losers' stakes + yield) / winners
    Losers: 0 (forfeited to winners or charity)
```

### 2. Solo Challenges (Self-Accountability)

**Problem:** If one person plays alone and wins, where does the reward come from?

**Solution Options:**

#### Option A: Yield-Only Rewards (Recommended)
- Solo player stakes 0.5 SOL
- Stake is deployed to Marinade Finance for yield
- If they win: Get back stake + yield earned
- If they lose: Stake goes to charity

**Example:**
```
Solo player stakes: 0.5 SOL
Yield earned (7 days): ~0.007 SOL (7% APY / 52 weeks)
If win: Receive 0.507 SOL (stake + yield)
If lose: 0.5 SOL → charity
```

**Money Flow:**
```
Solo player stakes → Pool Vault
                    ↓
            Staked in Marinade
                    ↓
            Pool ends
                    ↓
    Win: Stake + yield back to player
    Lose: Stake to charity
```

#### Option B: Platform Fee Model
- Solo player stakes 0.5 SOL
- Platform takes 2% fee (0.01 SOL)
- Remaining 0.49 SOL goes to Marinade
- If win: Get stake + yield - fee
- If lose: Stake goes to charity

#### Option C: Minimum Participants Required
- Require minimum 2 participants for competitive pools
- Solo challenges use Option A (yield-only)

### 3. Charity vs Winner Distribution

**User Choice at Pool Creation:**

#### Mode 1: Competitive (Losers → Winners)
- Losers' stakes go to winners
- Charity gets nothing
- Best for competitive/friend groups

#### Mode 2: Charity (Losers → Charity)
- Losers' stakes go to charity
- Winners only get their stake back + yield
- Best for social impact

#### Mode 3: Split (Hybrid)
- 50% of losers' stakes → winners
- 50% of losers' stakes → charity
- Compromise option

**Implementation:**
```rust
pub enum DistributionMode {
    Competitive,  // Losers → Winners
    Charity,      // Losers → Charity
    Split { winner_percent: u8 },  // Split between winners and charity
}
```

## Complete Money Flow Diagram

### Multi-Player Competitive Pool

```
┌─────────────────────────────────────────────────┐
│  Pool Creation                                  │
│  - 10 participants join                         │
│  - Each stakes 0.5 SOL                          │
│  - Total: 5 SOL in vault                        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Yield Generation (During Pool)                 │
│  - 5 SOL staked in Marinade Finance             │
│  - 7% APY = ~0.07 SOL yield over 7 days         │
│  - Total pool value: 5.07 SOL                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Pool Ends - Results                            │
│  - 6 winners (completed challenge)              │
│  - 4 losers (failed challenge)                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Distribution (Competitive Mode)                │
│                                                  │
│  Winners receive:                               │
│  - Original stake: 0.5 SOL                      │
│  - Losers' stakes: 4 × 0.5 = 2 SOL             │
│  - Yield: 0.07 SOL                              │
│  - Total per winner: (2 + 0.07) / 6 = 0.345 SOL│
│  - Final: 0.5 + 0.345 = 0.845 SOL each          │
│                                                  │
│  Losers receive: 0 SOL (forfeited)              │
└─────────────────────────────────────────────────┘
```

### Solo Challenge (Yield-Only)

```
┌─────────────────────────────────────────────────┐
│  Pool Creation                                  │
│  - 1 participant (solo)                        │
│  - Stakes 0.5 SOL                               │
│  - Total: 0.5 SOL in vault                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Yield Generation                               │
│  - 0.5 SOL staked in Marinade                   │
│  - Yield: ~0.007 SOL over 7 days                │
│  - Total: 0.507 SOL                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Pool Ends                                       │
│  - Win: Get 0.507 SOL (stake + yield)          │
│  - Lose: 0.5 SOL → charity                      │
└─────────────────────────────────────────────────┘
```

## Implementation Details

### Pool Creation Parameters

```rust
pub struct CommitmentPool {
    // ... existing fields ...
    pub distribution_mode: DistributionMode,
    pub min_participants: u16,  // Minimum required (1 for solo, 2+ for competitive)
    pub yield_enabled: bool,    // Whether to stake in Marinade
}
```

### Distribution Logic

```rust
fn calculate_distribution(pool: &CommitmentPool) -> DistributionResult {
    let winners = get_winners(pool);
    let losers = get_losers(pool);
    
    let total_loser_stakes = losers.iter().map(|p| p.stake_amount).sum();
    let yield_earned = get_marinade_yield(pool.vault);
    let total_pool = total_loser_stakes + yield_earned;
    
    match pool.distribution_mode {
        DistributionMode::Competitive => {
            // All to winners
            let per_winner = total_pool / winners.len();
            winners.each(|w| w.payout = w.stake_amount + per_winner);
            losers.each(|l| l.payout = 0);
        }
        DistributionMode::Charity => {
            // Losers to charity, winners get stake + yield only
            let yield_per_winner = yield_earned / winners.len();
            winners.each(|w| w.payout = w.stake_amount + yield_per_winner);
            losers.each(|l| l.payout = 0);  // Goes to charity
            charity_amount = total_loser_stakes;
        }
        DistributionMode::Split { winner_percent } => {
            // Split between winners and charity
            let to_winners = total_pool * winner_percent / 100;
            let to_charity = total_pool - to_winners;
            // ... distribution logic
        }
    }
}
```

## User Experience Flow

### Creating a Pool

1. **Choose Pool Type:**
   - Solo Challenge (self-accountability)
   - Multi-Player (competitive with friends)
   - Public Pool (anyone can join)

2. **Set Distribution Mode:**
   - Competitive: Losers → Winners
   - Charity: Losers → Charity
   - Split: Choose percentage

3. **Configure:**
   - Stake amount
   - Duration
   - Max participants (1 for solo, 2+ for competitive)
   - Charity address (if using charity mode)

### Joining a Pool

- User clicks link or enters pool ID
- Sees pool details (type, mode, stake amount)
- Connects wallet
- Approves stake transfer
- Automatically joined

### During Challenge

- Agent monitors progress
- Agent can send messages via app interface (future feature)
- Real-time updates on who's still in
- Daily check-ins (for lifestyle challenges)

### At End

- Agent calculates winners/losers
- Automatic distribution
- Winners receive SOL
- Losers' stakes go to winners or charity (based on mode)
- Transaction visible on Solscan

## Key Design Decisions

### Why Yield Generation?

- **Solo challenges need rewards**: Yield provides incentive even for solo players
- **Positive-sum game**: Everyone benefits from yield, not just winners
- **Sustainable model**: Platform can take small fee from yield

### Why Charity Option?

- **Social impact**: Appeals to users who want to do good
- **Different motivation**: Some prefer charity over competition
- **Flexibility**: Users choose what motivates them

### Why Minimum Participants?

- **Solo vs Competitive**: Different economic models
- **Clear expectations**: Users know if it's competitive or self-accountability
- **Prevent confusion**: Avoid "where's my reward?" questions

## Platform Fees (Future)

Potential revenue model:
- 2% fee on yield generated
- Or flat fee per pool
- Fees go to platform treasury
- Transparent and disclosed upfront

## Summary

**Multi-Player Pools:**
- Losers' stakes → Winners (or charity, based on mode)
- Yield shared among winners
- Competitive incentive

**Solo Challenges:**
- Yield-only rewards (stake + yield if win)
- Stake to charity if lose
- Self-accountability focus

**Key Insight:** Solo challenges use yield as the reward mechanism, while multi-player pools use redistribution of losers' stakes. This ensures there's always a meaningful reward structure.


