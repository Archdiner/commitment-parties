# TODO: MVP Next Steps

Essential features to ship. Keep it simple, keep it working.

---

## 1. End-to-End Testing

**Goal**: Verify the core user journey works from start to finish.

- [ ] **Manual test: Full challenge lifecycle**
  - Create challenge → Join challenge → Challenge starts → Daily verification → Challenge ends → Payout
  - Test with 2-3 participants to catch edge cases
  - Verify all UI states update correctly (pending → active → completed)
  - Verify database state matches UI state at each step

- [ ] **Fix any bugs found**
  - Document issues during testing
  - Fix critical bugs that break the flow
  - Verify fixes don't break existing functionality

**Why this matters**: Can't ship features if the core doesn't work. This is the foundation.

---

## 2. Enhanced Recruitment System

**Goal**: Ensure quality challenges with genuine interest. Challenges need 5-50 participants, recruit for max 1 week. If filled → start 24h later. If not filled → expire and refund.

### Backend Changes
- [ ] **Add recruitment tracking fields to database**
  - `recruitment_deadline` (timestamp): creation_time + 7 days
  - `filled_at` (timestamp, nullable): when min_participants reached
  - `auto_start_time` (timestamp, nullable): filled_at + 24 hours

- [ ] **Update pool creation**
  - Set recruitment_deadline = now + 7 days
  - Enforce min_participants >= 5, max_participants <= 50
  - Remove/update recruitment_period_hours selector (now fixed at 1 week max)

- [ ] **Detect when challenge fills**
  - In `confirm_pool_join`: when participant_count >= min_participants
  - Set filled_at = now, auto_start_time = now + 24h
  - Update scheduled_start_time to auto_start_time

- [ ] **Handle expiration**
  - In agent `PoolActivator`: check for pools where recruitment_deadline passed and not filled
  - Mark as expired, refund all participants
  - Use existing forfeit/withdraw mechanism or create refund endpoint

- [ ] **Handle early start**
  - In agent `PoolActivator`: activate pool when auto_start_time reached
  - Priority: filled pools (auto_start_time) before scheduled pools

### Frontend Changes
- [ ] **Update challenge creation form**
  - Enforce 5-50 participant range
  - Remove recruitment period selector (now fixed)
  - Show: "Recruits for up to 1 week. Starts 24h after filling, or expires if not filled."

- [ ] **Update challenge display**
  - Show recruitment status: "Recruiting (X/5-50)", "Filled - starts in Xh", "Expired"
  - Show countdown to deadline or start time
  - Disable join button if expired or starting soon

**Why this matters**: Prevents dead challenges, ensures quality, builds trust.

---

## 3. Privy + MoonPay Integration

**Goal**: Let non-crypto users sign up and join challenges directly with credit card (no pre-purchasing SOL).

### Privy Setup (Authentication)
- [ ] **Install Privy SDK**
  - Add `@privy-io/react-auth` to frontend
  - Configure Privy provider in app layout
  - Get Privy app ID from dashboard

- [ ] **Replace wallet-only auth**
  - Add email/password sign-up option
  - Keep wallet connection for crypto users
  - Update backend to verify Privy tokens
  - Auto-generate embedded wallet for Privy users (handles transaction signing)

### MoonPay Setup (Direct Payment Flow)
- [ ] **Integrate MoonPay widget for direct challenge payment**
  - When user clicks "Join Challenge" without enough SOL:
    - Show MoonPay widget with exact stake amount needed
    - MoonPay processes credit card → deposits SOL to user's Privy embedded wallet
    - Automatically sign and submit join transaction after payment
    - User is joined seamlessly (one flow, no separate "buy SOL" step)
  - Same flow for challenge creation (if they need SOL to create)

- [ ] **Handle payment flow**
  - Check Privy wallet balance before showing join/create buttons
  - If insufficient: show MoonPay widget with exact amount
  - After MoonPay payment completes: auto-submit the transaction
  - Handle MoonPay webhook for payment confirmation
  - Show clear loading states: "Processing payment..." → "Joining challenge..."

**Why this matters**: Users can join challenges with credit card in one click. No crypto knowledge needed. This is the key differentiator for mainstream adoption.

---

## Priority

1. **Testing (#1)** - Do this first. Can't ship broken features.
2. **Recruitment System (#2)** - Core feature you requested. Do this next.
3. **Privy + MoonPay (#3)** - Important for growth, but can ship without it initially.

---

## Notes

- **Recruitment system**: The 24h delay after filling makes sense - gives people time to prepare. The 1 week max prevents dead challenges. The 5-50 range ensures quality without being too restrictive.

- **Privy + MoonPay**: This is a standard pattern. Privy handles auth + embedded wallets, MoonPay handles fiat-to-crypto. The key is making it seamless: user clicks "Join" → MoonPay widget appears → payment → auto-join. No separate "buy SOL first" step. This is what makes it accessible to non-crypto users.

- **Testing**: Don't overthink this. Just manually test the happy path and fix what breaks. Add automated tests later if needed.

- **Refunds**: You'll need to build a refund mechanism for expired pools. Can reuse forfeit logic or create a dedicated refund endpoint that returns stakes to participants.
