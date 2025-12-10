# Enhanced Recruitment System - Quick Implementation Checklist

Use this checklist to track your progress as you implement the feature.

## Phase 1: Database Setup ✅
- [ ] Create migration file: `backend/sql/migration_add_recruitment_fields.sql`
- [ ] Add `recruitment_deadline TIMESTAMP` column
- [ ] Add `filled_at TIMESTAMP` column (nullable)
- [ ] Add `auto_start_time TIMESTAMP` column (nullable)
- [ ] Add `min_participants INTEGER` column (default 5)
- [ ] Add constraint: `CHECK (min_participants >= 5 AND min_participants <= max_participants AND max_participants <= 50)`
- [ ] Run migration on your local database
- [ ] Verify columns exist in database

## Phase 2: Backend Models ✅
- [ ] Update `PoolCreate` model in `backend/models.py`
  - [ ] Add `min_participants` field with validation (5-50)
  - [ ] Remove or deprecate `recruitment_period_hours` field
- [ ] Update `PoolResponse` model in `backend/models.py`
  - [ ] Add `recruitment_deadline` field
  - [ ] Add `filled_at` field (optional)
  - [ ] Add `auto_start_time` field (optional)
  - [ ] Add `min_participants` field

## Phase 3: Pool Creation Logic ✅
- [ ] Update `create_pool()` in `backend/routers/pools.py`
  - [ ] Calculate `recruitment_deadline = now + 7 days`
  - [ ] Enforce `min_participants >= 5`
  - [ ] Enforce `max_participants <= 50`
  - [ ] Set `recruitment_deadline` when creating pool
  - [ ] Set `min_participants` from request
- [ ] Test: Create a pool and verify recruitment_deadline is set correctly

## Phase 4: Join Detection ✅
- [ ] Update `confirm_pool_join()` in `backend/routers/pools.py`
  - [ ] After incrementing participant_count, check if `participant_count >= min_participants`
  - [ ] If filled and `filled_at` is NULL:
    - [ ] Set `filled_at = now()`
    - [ ] Set `auto_start_time = now() + 24 hours`
    - [ ] Update `scheduled_start_time` (or `start_timestamp`) to `auto_start_time`
- [ ] Test: Join pool until it fills, verify filled_at and auto_start_time are set

## Phase 5: Agent - Expiration Handler ✅
- [ ] Update `activate_scheduled_pools()` in `agent/src/activate_pools.py`
  - [ ] Query for pools where `recruitment_deadline < now()` AND `filled_at IS NULL` AND `status = 'pending'`
  - [ ] For each expired pool:
    - [ ] Mark status as 'expired' (or create new status)
    - [ ] Refund all participants (use existing forfeit/withdraw logic or create refund endpoint)
    - [ ] Log expiration event
- [ ] Test: Create pool, don't fill it, wait for deadline, verify expiration and refunds

## Phase 6: Agent - Early Start Handler ✅
- [ ] Update `activate_scheduled_pools()` in `agent/src/activate_pools.py`
  - [ ] Query for pools where `auto_start_time <= now()` AND `status = 'pending'` AND `filled_at IS NOT NULL`
  - [ ] Prioritize auto_start_time pools over scheduled_start_time pools
  - [ ] Activate these pools (use existing activation logic)
- [ ] Test: Fill a pool, wait for auto_start_time, verify pool activates

## Phase 7: Frontend - Creation Form ✅
- [ ] Update `app/frontend/app/create/page.tsx`
  - [ ] Remove `recruitmentPeriodHours` field from form
  - [ ] Enforce min_participants input (5-50 range)
  - [ ] Update help text: "Recruits for up to 1 week. Starts 24h after filling, or expires if not filled."
  - [ ] Update form validation
- [ ] Test: Create pool via frontend, verify form works correctly

## Phase 8: Frontend - Pool Display ✅
- [ ] Update `app/frontend/app/pools/page.tsx` (pool listing)
  - [ ] Show recruitment status: "Recruiting (X/5-50)", "Filled - starts in Xh", "Expired"
  - [ ] Show countdown to deadline or start time
- [ ] Update `app/frontend/app/pools/[poolId]/page.tsx` (pool detail)
  - [ ] Show detailed recruitment status
  - [ ] Show countdown timer
  - [ ] Disable join button if expired or starting soon (< 1 hour)
- [ ] Test: View pools in different states, verify UI updates correctly

## Phase 9: Testing & Polish ✅
- [ ] Manual test: Full recruitment flow (create → fill → auto-start)
- [ ] Manual test: Expiration flow (create → don't fill → expire → refund)
- [ ] Manual test: Edge cases (exactly 5 participants, exactly 50 participants)
- [ ] Verify all database queries include new fields
- [ ] Check for any console errors in frontend
- [ ] Verify timezone handling is correct
- [ ] Code review: Check for race conditions
- [ ] Code review: Verify error handling

## Phase 10: Documentation ✅
- [ ] Update any API documentation if needed
- [ ] Add comments to complex logic
- [ ] Update README if recruitment behavior changed significantly

---

## Quick Reference

**Key Timestamps:**
- `recruitment_deadline` = `created_at + 7 days`
- `filled_at` = when `participant_count >= min_participants`
- `auto_start_time` = `filled_at + 24 hours`

**Key Statuses:**
- `pending` (recruiting) → `pending` (filled, waiting) → `active`
- `pending` (recruiting) → `expired` (if deadline passes)

**Key Files:**
- Database: `backend/sql/migration_add_recruitment_fields.sql`
- Backend: `backend/models.py`, `backend/routers/pools.py`
- Agent: `agent/src/activate_pools.py`
- Frontend: `app/frontend/app/create/page.tsx`, `app/frontend/app/pools/page.tsx`, `app/frontend/app/pools/[poolId]/page.tsx`
