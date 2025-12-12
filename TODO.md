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

## 3. Privy Integration (Hackathon Version)

**Goal**: Let non-crypto users sign up and join challenges without needing to understand wallets. For hackathon/devnet, use airdrops instead of real payments.

See `docs/PRIVY_INTEGRATION_PLAN.md` for detailed implementation guide.

### Phase 1: Setup (~1.5 hours)
- [ ] **Install dependencies**
  ```bash
  npm install @privy-io/react-auth @solana/wallet-adapter-react @solana/wallet-adapter-wallets
  ```
- [ ] **Get Privy API keys**
  - Create app at https://dashboard.privy.io/
  - Enable: Email, Google, Twitter, Wallet login methods
  - Enable: Solana embedded wallets on Devnet
  - Add `NEXT_PUBLIC_PRIVY_APP_ID` to `.env.local`

### Phase 2: Provider & Hook (~2.5 hours)
- [ ] **Create `components/providers/PrivyProvider.tsx`**
  - Configure login methods (email/social + wallet)
  - Configure embedded wallets for Solana devnet
  - Configure external wallet support (Phantom, etc.)

- [ ] **Create `hooks/useWallet.ts`**
  - Unified interface for both wallet types
  - `ensureBalance()` - auto-airdrop on devnet if user lacks SOL
  - `sendTransaction()` - works with both embedded and external wallets

### Phase 3: UI Updates (~3 hours)
- [ ] **Update Navbar**
  - Replace Phantom-only connect with Privy login
  - Show wallet type badge (embedded vs external)
  - GitHub linking via Privy

- [ ] **Update Pool Join Flow**
  - Check balance before join
  - Auto-airdrop if needed (devnet)
  - Show loading state: "Getting test SOL..." → "Joining..."
  - Handle both wallet types seamlessly

- [ ] **Update Create Challenge Flow**
  - Same airdrop flow if needed

### Phase 4: Testing (~2 hours)
- [ ] Test email signup → embedded wallet → airdrop → join
- [ ] Test Phantom connect → join (existing flow still works)
- [ ] Test GitHub linking via Privy
- [ ] Test on mobile

**Why this matters**: Non-crypto users can sign up with email, get a wallet auto-created, and join challenges immediately. The airdrop handles the "no SOL" problem for the hackathon demo.

### Future: MoonPay for Mainnet
When going to production with real money:
- Replace `ensureBalance()` airdrop with MoonPay widget
- Add network detection (devnet = airdrop, mainnet = MoonPay)
- Handle MoonPay webhooks for payment confirmation

---

## Priority

1. **Testing (#1)** - Do this first. Can't ship broken features.
2. **Recruitment System (#2)** - Core feature you requested. Do this next.
3. **Privy (#3)** - Makes the app accessible to non-crypto users. Perfect for hackathon demos.

---

## Notes

- **Recruitment system**: The 24h delay after filling makes sense - gives people time to prepare. The 1 week max prevents dead challenges. The 5-50 range ensures quality without being too restrictive.

- **Privy (Hackathon)**: For devnet/hackathon, skip MoonPay entirely. Use Privy for auth + embedded wallets, and devnet airdrops for funding. User clicks "Join" → system airdrops test SOL → auto-join. Seamless experience without real money. MoonPay can be added later for mainnet.

- **Testing**: Don't overthink this. Just manually test the happy path and fix what breaks. Add automated tests later if needed.

- **Refunds**: You'll need to build a refund mechanism for expired pools. Can reuse forfeit logic or create a dedicated refund endpoint that returns stakes to participants.
