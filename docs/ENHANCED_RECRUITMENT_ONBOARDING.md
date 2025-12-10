# Enhanced Recruitment System - Onboarding Guide

Welcome! This guide will help you get started working on the **Enhanced Recruitment System** feature for Commitment Parties.

## 📋 Overview

The Enhanced Recruitment System ensures quality challenges with genuine interest. Here's what it does:

- **Recruitment Window**: Challenges recruit for a maximum of 1 week (7 days)
- **Participant Range**: Challenges need 5-50 participants to be valid
- **Auto-Start**: When a challenge fills (reaches min_participants), it automatically starts 24 hours later
- **Expiration**: If a challenge doesn't fill within 7 days, it expires and all participants get refunded

## 🎯 What You Need to Build

### Backend Changes

1. **Database Schema Updates**
   - Add `recruitment_deadline` (timestamp): creation_time + 7 days
   - Add `filled_at` (timestamp, nullable): when min_participants reached
   - Add `auto_start_time` (timestamp, nullable): filled_at + 24 hours
   - Note: `min_participants` field already exists (defaults to 1), but needs constraint update to enforce 5-50 range

2. **Pool Creation Logic** (`backend/routers/pools.py`)
   - Set `recruitment_deadline = now + 7 days` when creating pools
   - Enforce `min_participants >= 5` and `max_participants <= 50`
   - Remove/update `recruitment_period_hours` selector (now fixed at 1 week max)

3. **Join Detection** (`backend/routers/pools.py` - `confirm_pool_join`)
   - When `participant_count >= min_participants`:
     - Set `filled_at = now`
     - Set `auto_start_time = now + 24h`
     - Update `scheduled_start_time` to `auto_start_time`

4. **Expiration Handler** (`agent/src/activate_pools.py`)
   - Check for pools where `recruitment_deadline` passed and not filled
   - Mark as expired, refund all participants
   - Use existing forfeit/withdraw mechanism or create refund endpoint

5. **Early Start Handler** (`agent/src/activate_pools.py`)
   - Activate pool when `auto_start_time` reached
   - Priority: filled pools (auto_start_time) before scheduled pools

### Frontend Changes

1. **Challenge Creation Form** (`app/frontend/app/create/page.tsx`)
   - Enforce 5-50 participant range
   - Remove recruitment period selector (now fixed)
   - Show: "Recruits for up to 1 week. Starts 24h after filling, or expires if not filled."

2. **Challenge Display** (`app/frontend/app/pools/[poolId]/page.tsx` and `app/frontend/app/pools/page.tsx`)
   - Show recruitment status: "Recruiting (X/5-50)", "Filled - starts in Xh", "Expired"
   - Show countdown to deadline or start time
   - Disable join button if expired or starting soon

## 🏗️ Project Structure

```
commitment-parties/
├── backend/
│   ├── routers/
│   │   └── pools.py          # Pool CRUD operations (MODIFY THIS)
│   ├── models.py              # Pydantic models (MODIFY THIS)
│   ├── database.py            # Database utilities
│   └── sql/
│       └── schema.sql         # Database schema (MODIFY THIS)
│
├── agent/
│   └── src/
│       └── activate_pools.py  # Pool activation logic (MODIFY THIS)
│
└── app/frontend/
    └── app/
        ├── create/
        │   └── page.tsx       # Challenge creation form (MODIFY THIS)
        └── pools/
            ├── page.tsx       # Pool listing (MODIFY THIS)
            └── [poolId]/
                └── page.tsx   # Pool detail page (MODIFY THIS)
```

## 🚀 Getting Started

### 1. Setup Your Environment

```bash
# Make sure you're on the feature branch
git checkout feature/enhanced-recruitment-system

# Install dependencies (if not already done)
cd backend
pip install -r requirements.txt

cd ../agent
pip install -r requirements.txt

cd ../app/frontend
npm install
```

### 2. Database Setup

You'll need to create a migration SQL file to add the new fields:

```sql
-- Add recruitment tracking fields
ALTER TABLE pools 
ADD COLUMN IF NOT EXISTS recruitment_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS filled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS auto_start_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS min_participants INTEGER DEFAULT 5;

-- Add constraint for participant range
ALTER TABLE pools
ADD CONSTRAINT check_participant_range 
CHECK (min_participants >= 5 AND min_participants <= max_participants AND max_participants <= 50);
```

**File to create**: `backend/sql/migration_add_recruitment_fields.sql`

### 3. Implementation Order

I recommend implementing in this order:

1. **Database Migration** - Add the new fields
2. **Backend Models** - Update Pydantic models to include new fields
3. **Pool Creation** - Update creation logic to set recruitment_deadline
4. **Join Detection** - Detect when pool fills and set auto_start_time
5. **Agent Expiration Handler** - Handle expired pools
6. **Agent Early Start Handler** - Handle auto-start for filled pools
7. **Frontend Creation Form** - Update UI for creation
8. **Frontend Display** - Update pool listing and detail pages

## 📝 Key Files to Modify

### Backend

1. **`backend/sql/schema.sql`** or create **`backend/sql/migration_add_recruitment_fields.sql`**
   - Add new columns to pools table

2. **`backend/models.py`**
   - Update `PoolCreate` model to include `min_participants` (with validation 5-50)
   - Update `PoolResponse` model to include new recruitment fields

3. **`backend/routers/pools.py`**
   - `create_pool()`: Set recruitment_deadline, enforce min/max participants
   - `confirm_pool_join()`: Detect when filled, set filled_at and auto_start_time
   - Update pool queries to include new fields

### Agent

4. **`agent/src/activate_pools.py`**
   - `activate_scheduled_pools()`: Check for expired pools and auto-start pools
   - Add `handle_expired_pools()` method
   - Update activation priority logic

### Frontend

5. **`app/frontend/app/create/page.tsx`**
   - Remove `recruitmentPeriodHours` field
   - Enforce min/max participants (5-50)
   - Update UI text

6. **`app/frontend/app/pools/page.tsx`**
   - Show recruitment status and countdown

7. **`app/frontend/app/pools/[poolId]/page.tsx`**
   - Show detailed recruitment status
   - Disable join button when expired/starting soon

## 🔍 Understanding the Current Code

### Pool Status Flow

Current statuses: `pending` → `active` → `ended` → `settled`

With recruitment system:
- `pending` (recruiting) → `pending` (filled, waiting 24h) → `active` → `ended` → `settled`
- OR: `pending` (recruiting) → `expired` (refunded)

### Key Functions to Understand

1. **`backend/routers/pools.py::create_pool()`**
   - Creates pool in database
   - Currently sets `start_timestamp` and `end_timestamp`
   - You'll need to also set `recruitment_deadline`

2. **`backend/routers/pools.py::confirm_pool_join()`**
   - Called when user joins a pool
   - Updates `participant_count`
   - You'll need to check if `participant_count >= min_participants` and set `filled_at`

3. **`agent/src/activate_pools.py::activate_scheduled_pools()`**
   - Runs every minute
   - Activates pools when `start_timestamp` is reached
   - You'll need to also check `auto_start_time` and `recruitment_deadline`

## 🧪 Testing Approach

### Manual Testing Checklist

1. **Create a pool with 5-50 participants**
   - ✅ Verify recruitment_deadline is set (creation_time + 7 days)
   - ✅ Verify min_participants is enforced (5-50)

2. **Join pool until it fills**
   - ✅ Verify filled_at is set when min_participants reached
   - ✅ Verify auto_start_time is set (filled_at + 24h)
   - ✅ Verify scheduled_start_time is updated

3. **Wait for auto-start**
   - ✅ Verify pool activates at auto_start_time
   - ✅ Verify pool status changes to "active"

4. **Test expiration**
   - ✅ Create pool, don't fill it
   - ✅ Wait for recruitment_deadline to pass
   - ✅ Verify pool status changes to "expired"
   - ✅ Verify participants get refunded

5. **Frontend display**
   - ✅ Verify recruitment status shows correctly
   - ✅ Verify countdown works
   - ✅ Verify join button is disabled when expired/starting soon

### Test Data

You can use the existing test scripts or create test pools manually via the API.

## 🐛 Common Pitfalls

1. **Timezone Issues**: Make sure all timestamps are in UTC or use the existing timezone utilities (`backend/utils/timezone.py`)

2. **Race Conditions**: When checking if pool is filled, use database transactions or locks to prevent race conditions

3. **Refund Logic**: Make sure you understand the existing forfeit/withdraw mechanism before implementing refunds

4. **Status Updates**: Don't forget to update pool status when expired or when auto-starting

## 📚 Useful Resources

- **Existing Code**: Look at how `scheduled_start_time` is currently handled
- **Database Utilities**: `backend/database.py` has helper functions
- **Timezone Utils**: `backend/utils/timezone.py` for timezone handling
- **Solana Client**: `agent/src/solana_client.py` for on-chain operations (if needed for refunds)

## 🤝 Getting Help

If you get stuck:
1. Check the existing code patterns (especially in `activate_pools.py` and `pools.py`)
2. Look at similar features (like how scheduled_start_time works)
3. Ask questions! The codebase is well-structured and should be readable

## ✅ Definition of Done

Your implementation is complete when:

- [ ] Database migration adds all new fields
- [ ] Pool creation enforces 5-50 range and sets recruitment_deadline
- [ ] Join detection sets filled_at and auto_start_time when pool fills
- [ ] Agent handles expired pools (refunds participants)
- [ ] Agent handles auto-start for filled pools
- [ ] Frontend creation form updated (removed recruitment period, shows new text)
- [ ] Frontend displays recruitment status and countdown
- [ ] All manual tests pass
- [ ] Code is clean and follows existing patterns

## 🎉 Good Luck!

This is a well-scoped feature that touches multiple parts of the system. Take it step by step, test as you go, and you'll have it working in no time!

---

**Branch**: `feature/enhanced-recruitment-system`  
**Related TODO**: Section 2 in `TODO.md`  
**Estimated Complexity**: Medium (touches backend, agent, and frontend)
