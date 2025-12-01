# 🧪 Testing Guide - Start Here!

You've completed setup. Now test each component in this order.

## ✅ Test 1: Backend API (Easiest - Do This First!)

### Step 1: Start the Backend Server

```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Step 2: Test Health Endpoint

In **another terminal**:

```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{"status":"ok","service":"commitment-agent-backend","version":"1.0.0"}
```

### Step 3: Test API Documentation

Open in browser:
```
http://localhost:8000/docs
```

You should see Swagger UI with all endpoints.

### Step 4: Test Pools Endpoint (Will fail without DB, but endpoint should respond)

```bash
curl http://localhost:8000/api/pools
```

**Expected:** Should return error about database, but **not crash**. This means the endpoint works!

**✅ Success Criteria:**
- Server starts without errors
- Health endpoint returns 200
- API docs accessible
- Endpoints respond (even if DB errors)

---

## ✅ Test 2: Smart Contracts (Anchor)

### Step 1: Build the Program

```bash
cd programs/commitment-pool
anchor build
```

**Expected:** Should compile. Takes 1-2 minutes first time.

**✅ Success:** "Build successful" or no errors

### Step 2: (Optional) Run Tests with Local Validator

```bash
# Terminal 1: Start local validator
solana-test-validator

# Terminal 2: Configure for local
solana config set --url http://localhost:8899
solana airdrop 2

# Run tests
anchor test
```

**✅ Success:** Tests run (may fail if logic incomplete, but should at least start)

---

## ✅ Test 3: Database Schema (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait 2-3 minutes

### Step 2: Run Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Open `backend/sql/schema.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run**

**✅ Success:** All tables created without errors

### Step 3: Verify Tables

1. Go to **Table Editor**
2. Should see: `users`, `pools`, `checkins`, `pool_events`

### Step 4: Test Backend with Database

```bash
# Get Supabase credentials:
# Project Settings → Database → Connection string
# Project Settings → API → URL and anon key

# Update backend/.env:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_KEY=your_anon_key_here

# Restart backend
cd backend
uvicorn main:app --reload

# Test creating a pool (should work now!)
curl -X POST http://localhost:8000/api/pools \
  -H "Content-Type: application/json" \
  -d '{
    "pool_id": 1234567890,
    "pool_pubkey": "TestPubkey1111111111111111111111111111111",
    "creator_wallet": "TestWallet111111111111111111111111111111",
    "name": "Test Pool",
    "goal_type": "DailyDCA",
    "goal_metadata": {"amount": 1000000},
    "stake_amount": 0.1,
    "duration_days": 7,
    "max_participants": 10,
    "charity_address": "Charity1111111111111111111111111111111",
    "start_timestamp": 1704067200,
    "end_timestamp": 1704672000
  }'
```

**✅ Success:** Returns 201 with pool data

---

## ✅ Test 4: Agent Structure

```bash
cd agent
source ../venv/bin/activate

# Test config loading
python -c "from src.config import settings; print(f'RPC: {settings.SOLANA_RPC_URL}')"
```

**✅ Success:** Prints RPC URL without errors

**Note:** Full agent won't run yet (needs PROGRAM_ID), but structure is valid.

---

## ✅ Test 5: Smart Contract Deployment (After Tests Pass)

```bash
cd programs/commitment-pool

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Save PROGRAM_ID
export PROGRAM_ID=$(solana address -k target/deploy/commitment_pool-keypair.json)
echo "PROGRAM_ID: $PROGRAM_ID"
```

Then update PROGRAM_ID in all config files.

---

## Quick Test Checklist

### Can Test Now (No Deployment):
- [ ] Backend API starts
- [ ] Health endpoint works  
- [ ] API docs accessible
- [ ] Smart contracts compile
- [ ] Agent config loads

### Need Supabase:
- [ ] Database schema runs
- [ ] Backend can connect to database
- [ ] Can create pools via API

### Need Deployment:
- [ ] Smart contract tests pass
- [ ] Create pool on-chain
- [ ] Join pool on-chain
- [ ] Full end-to-end flow

---

## What to Test Right Now

**Start with Test 1 (Backend API)** - it's the easiest and doesn't require anything else:

```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
```

Then in another terminal:
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok",...}
```

If that works, you're ready to continue testing other components!

