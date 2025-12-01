# Quick Testing Guide - Step by Step

After completing setup, test each component in this order.

## Prerequisites Check

First, verify everything is set up:

- **macOS / WSL2:**

  ```bash
  ./scripts/verify-install.sh
  ```

- **Windows (Git Bash or WSL2 recommended):**

  ```bash
  bash scripts/verify-install.sh
  ```

Should show all green checkmarks (or at least no errors).

## Test 1: Backend API (Easiest - Start Here)

### Step 1.1: Setup Backend Environment

```bash
cd backend

# Copy environment template
cp ../docs/env-templates/backend.env.example .env

# Edit .env (you'll need Supabase credentials, but we can test without DB first)
# For now, just set:
# PORT=8000
# DEBUG=true
```

### Step 1.2: Start Backend Server

```bash
# Make sure venv is activated
source ../venv/bin/activate

# Install dependencies (if not already)
pip install -r requirements.txt

# Start server
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Step 1.3: Test Health Endpoint

In another terminal:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"ok","service":"commitment-agent-backend","version":"1.0.0"}
```

### Step 1.4: Test API Documentation

Open in browser:
```
http://localhost:8000/docs
```

You should see Swagger UI with all endpoints listed.

### Step 1.5: Test Pools Endpoint (Without DB)

```bash
curl http://localhost:8000/api/pools
```

This will fail if Supabase isn't configured, but the endpoint should respond (not crash).

**Success Criteria:**
- ✅ Server starts without errors
- ✅ Health endpoint returns 200
- ✅ API docs accessible
- ✅ Endpoints respond (even if DB errors)

---

## Test 2: Smart Contracts (Anchor)

### Step 2.1: Build the Program

```bash
cd programs/commitment-pool

# Build (this compiles Rust code)
anchor build
```

**Expected:** Should compile without errors. Takes 1-2 minutes first time.

### Step 2.2: Check for Compilation Errors

Look for:
- ✅ "Build successful" message
- ✅ No Rust compilation errors
- ⚠️  Warnings are OK, errors are not

### Step 2.3: Run Tests (Local Validator)

```bash
# Start local validator in one terminal
solana-test-validator

# In another terminal, configure for local
solana config set --url http://localhost:8899

# Airdrop SOL for testing
solana airdrop 2

# Run Anchor tests
anchor test
```

**Expected:** Tests should run (may fail if not fully implemented, but should at least start).

**Success Criteria:**
- ✅ Program builds successfully
- ✅ Tests can run (even if they fail due to incomplete logic)

---

## Test 3: Database Schema (Supabase)

### Step 3.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait 2-3 minutes for provisioning

### Step 3.2: Run Schema

1. Go to SQL Editor in Supabase dashboard
2. Open `backend/sql/schema.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run"

**Expected:** Should create all tables without errors.

### Step 3.3: Verify Tables Created

1. Go to Table Editor in Supabase
2. Should see: `users`, `pools`, `checkins`, `pool_events`

**Success Criteria:**
- ✅ Schema runs without errors
- ✅ All 4 tables visible in Table Editor

### Step 3.4: Test Backend with Database

```bash
# Get Supabase credentials
# Project Settings → Database → Connection string
# Project Settings → API → URL and anon key

# Update backend/.env:
# DATABASE_URL=postgresql://...
# SUPABASE_URL=https://...
# SUPABASE_KEY=...

# Restart backend
uvicorn main:app --reload

# Test creating a pool (this will actually work now)
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

**Expected:** Should return 201 with pool data.

**Success Criteria:**
- ✅ Pool created in database
- ✅ Can query pools: `curl http://localhost:8000/api/pools`

---

## Test 4: Agent Structure

### Step 4.1: Test Agent Configuration

```bash
cd agent

# Copy environment template
cp ../docs/env-templates/agent.env.example .env

# Test config loading
source ../venv/bin/activate
python -c "from src.config import settings; print(f'RPC: {settings.SOLANA_RPC_URL}')"
```

**Expected:** Should print RPC URL without errors.

### Step 4.2: Test Solana Client (Without Full Setup)

```bash
python -c "
from src.solana_client import SolanaClient
import asyncio

async def test():
    client = SolanaClient('https://api.devnet.solana.com', 'test')
    await client.initialize()
    print('✅ Solana client initialized')
    await client.close()

asyncio.run(test())
"
```

**Expected:** Should initialize (may fail on program loading, but client should work).

**Success Criteria:**
- ✅ Config loads without errors
- ✅ Solana client can initialize
- ⚠️  Full agent won't run yet (needs PROGRAM_ID and keypair)

---

## Test 5: End-to-End Flow (After Deployment)

### Step 5.1: Deploy Smart Contract

```bash
cd programs/commitment-pool

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Save PROGRAM_ID
export PROGRAM_ID=$(solana address -k target/deploy/commitment_pool-keypair.json)
echo "PROGRAM_ID: $PROGRAM_ID"
```

### Step 5.2: Update All Configs

Update PROGRAM_ID in:
- `programs/commitment-pool/src/lib.rs` (declare_id!)
- `programs/commitment-pool/Anchor.toml`
- `backend/.env`
- `agent/.env`

### Step 5.3: Test Full Flow

1. Create pool via API
2. Join pool via smart contract
3. Agent monitors (once logic implemented)
4. Verify participant
5. Distribute rewards

---

## Quick Test Checklist

### Can Test Now (No Deployment Needed):
- [ ] Backend API starts
- [ ] Health endpoint works
- [ ] API docs accessible
- [ ] Smart contracts compile
- [ ] Database schema runs
- [ ] Backend can connect to database
- [ ] Agent config loads

### Need Deployment First:
- [ ] Smart contract tests pass
- [ ] Create pool on-chain
- [ ] Join pool on-chain
- [ ] Agent monitoring
- [ ] Full end-to-end flow

---

## Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (need 3.8+)
- Check venv activated: `which python` should show venv path
- Check dependencies: `pip list | grep fastapi`

### Smart contract won't build
- Check Rust: `rustc --version`
- Check Anchor: `anchor --version`
- Try: `cargo clean && anchor build`

### Database connection fails
- Verify Supabase project is active
- Check DATABASE_URL format
- Test connection in Supabase dashboard

### Agent errors
- Most agent tests will fail until PROGRAM_ID is set
- That's expected - structure is there, logic needs implementation

---

## Next Steps After Testing

Once basic tests pass:

1. **Deploy smart contracts** to devnet
2. **Set PROGRAM_ID** everywhere
3. **Test on-chain operations**
4. **Implement agent monitoring logic**
5. **Build frontend UI**
6. **Test full flow**

Start with Test 1 (Backend API) - it's the easiest and doesn't require deployment!

