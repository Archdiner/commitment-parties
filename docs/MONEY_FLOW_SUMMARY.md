# Money Flow Summary - Quick Reference

## The Core Question: Where Does Reward Money Come From?

### Answer: It Depends on Pool Type

## 1. Multi-Player Competitive Pools (2+ participants)

**Money Source:** Losers' stakes + yield

```
10 people stake 0.5 SOL each = 5 SOL total
↓
Staked in Marinade → generates ~0.07 SOL yield
↓
6 winners, 4 losers
↓
Winners get: Their stake (0.5) + Losers' stakes (2.0) + Yield (0.07) = 2.57 SOL split 6 ways
= 0.845 SOL per winner (69% profit!)

Losers get: 0 SOL (forfeited)
```

**Key Point:** Winners profit from losers' forfeited stakes. This is a **zero-sum redistribution** (losers → winners) plus **positive-sum yield** (everyone benefits from staking).

## 2. Solo Challenges (1 participant)

**Money Source:** Yield only (no losers to redistribute from)

```
1 person stakes 0.5 SOL
↓
Staked in Marinade → generates ~0.007 SOL yield
↓
If WIN: Get back 0.5 SOL + 0.007 SOL yield = 0.507 SOL
If LOSE: 0.5 SOL → charity
```

**Key Point:** Solo players get yield as reward. No redistribution possible (no other participants).

## 3. Distribution Modes (User Choice)

### Competitive Mode
- Losers' stakes → Winners
- Charity gets nothing
- Best for: Friend groups, competitive challenges

### Charity Mode  
- Losers' stakes → Charity
- Winners get: Their stake back + yield only
- Best for: Social impact, doing good

### Split Mode
- Losers' stakes → Split between winners and charity
- Example: 70% to winners, 30% to charity
- Best for: Balance of competition and impact

## Complete Flow Example

### Scenario: 5-Person Competitive Pool

```
Day 1: Pool Created
├─ 5 people join, each stakes 1 SOL
├─ Total: 5 SOL in vault
└─ Staked in Marinade Finance

Day 1-7: Challenge Running
├─ Agent monitors progress
├─ Yield accumulates: ~0.07 SOL (7% APY / 52 weeks)
└─ Total pool value: 5.07 SOL

Day 7: Pool Ends
├─ Results: 3 winners, 2 losers
├─ Losers forfeit: 2 SOL
├─ Yield earned: 0.07 SOL
└─ Total to distribute: 2.07 SOL

Distribution:
├─ Winners each get: 1 SOL (original) + (2.07 / 3) = 1.69 SOL
├─ Winners profit: 0.69 SOL each (69% return!)
└─ Losers get: 0 SOL
```

## Why This Works

1. **Multi-player pools:** Losers fund winners' rewards (redistribution)
2. **Solo pools:** Yield provides the reward (no redistribution possible)
3. **Yield generation:** Makes it positive-sum (everyone benefits from staking)
4. **User choice:** Competitive vs charity vs split modes

## Key Insight

**Solo challenges = Yield-only rewards**  
**Multi-player = Redistribution + Yield**

This ensures there's always a meaningful reward structure, regardless of pool size.

## Agent Communication

The agent can:
- Send messages via app interface (future feature)
- Post updates to Twitter
- Notify users of eliminations
- Remind about check-ins

This is separate from money flow - it's about engagement and accountability.

## Summary Table

| Pool Type | Participants | Reward Source | Winner Gets | Loser Gets |
|-----------|--------------|---------------|------------|------------|
| Solo | 1 | Yield only | Stake + yield | 0 (→ charity) |
| Competitive | 2+ | Losers + yield | Stake + (losers/yield) | 0 (→ winners) |
| Charity | 2+ | Yield only | Stake + yield | 0 (→ charity) |
| Split | 2+ | Losers + yield | Stake + (split %) | 0 (→ winners/charity) |

