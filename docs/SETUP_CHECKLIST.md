# Complete Setup Checklist

Step-by-step checklist to get Commitment Agent fully operational.

## Phase 1: Development Environment ✅

- [x] Rust & Cargo installed
- [x] Solana CLI installed
- [x] Anchor Framework installed
- [x] Node.js & npm installed
- [x] Python 3.8+ installed
- [x] Virtual environment created

**Verify**: Run `./scripts/verify-install.sh`

## Phase 2: Solana Wallet Setup

### 2.1 Development Wallet (for deploying contracts)

```bash
# Generate keypair if not exists
solana-keygen new --outfile ~/.config/solana/id.json

# Get your address
solana address

# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Airdrop test SOL
solana airdrop 2
solana balance  # Verify you have SOL
```

**Save these values:**
- [ ] Development wallet address: `_________________`
- [ ] Keypair path: `~/.config/solana/id.json`

### 2.2 Agent Wallet (for AI agent operations)

```bash
# Generate separate wallet for agent
solana-keygen new --outfile ~/.config/solana/agent-keypair.json

# Get agent address
solana address -k ~/.config/solana/agent-keypair.json

# Airdrop SOL to agent wallet
solana airdrop 2 -k ~/.config/solana/agent-keypair.json
```

**Save these values:**
- [ ] Agent wallet address: `_________________`
- [ ] Agent keypair path: `~/.config/solana/agent-keypair.json`

**Important**: Never commit keypair files to git!

## Phase 3: Supabase Database Setup

### 3.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - Project name: `commitment-agent`
   - Database password: (save this!)
   - Region: Choose closest
5. Wait 2-3 minutes for provisioning

### 3.2 Get Connection Details

1. Go to **Project Settings** → **Database**
2. Find **Connection string** section
3. Copy **URI** (connection string)
4. Go to **Project Settings** → **API**
5. Copy:
   - **Project URL**
   - **anon public** key

**Save these values:**
- [ ] DATABASE_URL: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
- [ ] SUPABASE_URL: `https://[PROJECT].supabase.co`
- [ ] SUPABASE_KEY: `_________________`

### 3.3 Run Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New query**
3. Open `backend/sql/schema.sql` from your project
4. Copy entire contents
5. Paste into SQL Editor
6. Click **Run** (or press Cmd+Enter)
7. Verify tables created:
   - Go to **Table Editor**
   - Should see: `users`, `pools`, `checkins`, `pool_events`

**Verify:**
- [ ] All tables created successfully
- [ ] Indexes created
- [ ] Triggers created

### 3.4 (Optional) Seed Test Data

1. In SQL Editor, open `scripts/seed-data.sql`
2. Copy and paste
3. Run query
4. Verify data in Table Editor

## Phase 4: Deploy Smart Contracts

### 4.1 Build and Deploy

```bash
cd programs/commitment-pool

# Build
anchor build

# Get program ID (save this!)
solana address -k target/deploy/commitment_pool-keypair.json

# Update Anchor.toml with program ID
# Update src/lib.rs declare_id! with program ID

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

**Save these values:**
- [ ] PROGRAM_ID: `_________________`

### 4.2 Verify Deployment

```bash
# Check on Solscan
# https://solscan.io/account/<PROGRAM_ID>?cluster=devnet

# Or check with CLI
solana program show <PROGRAM_ID>
```

**Verify:**
- [ ] Program deployed successfully
- [ ] Program ID saved
- [ ] Can view on Solscan

## Phase 5: Environment Variables

### 5.1 Backend Environment

```bash
cd backend

# Copy template
cp ../docs/env-templates/backend.env.example .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

**Fill in:**
- [ ] DATABASE_URL (from Supabase)
- [ ] SUPABASE_URL (from Supabase)
- [ ] SUPABASE_KEY (from Supabase)
- [ ] PROGRAM_ID (from deployment)
- [ ] SOLANA_RPC_URL (usually `https://api.devnet.solana.com`)
- [ ] CORS_ORIGINS (add your frontend URL)

### 5.2 Agent Environment

```bash
cd agent

# Copy template
cp ../docs/env-templates/agent.env.example .env

# Edit .env
nano .env
```

**Fill in:**
- [ ] SOLANA_RPC_URL
- [ ] PROGRAM_ID
- [ ] AGENT_KEYPAIR_PATH (`~/.config/solana/agent-keypair.json`)
- [ ] DATABASE_URL
- [ ] SUPABASE_URL
- [ ] SUPABASE_KEY
- [ ] (Optional) Twitter API credentials

### 5.3 Frontend Environment

```bash
cd app

# Copy template
cp ../docs/env-templates/frontend.env.example .env.local

# Edit .env.local
nano .env.local
```

**Fill in:**
- [ ] NEXT_PUBLIC_PROGRAM_ID
- [ ] NEXT_PUBLIC_SOLANA_RPC
- [ ] NEXT_PUBLIC_CLUSTER (`devnet`)
- [ ] NEXT_PUBLIC_API_URL (`http://localhost:8000` for dev)

## Phase 6: Install Dependencies

### 6.1 Python Dependencies

```bash
# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install agent dependencies
cd ../agent
pip install -r requirements.txt
```

**Verify:**
- [ ] All packages installed without errors
- [ ] Can import modules: `python -c "import fastapi; print('OK')"`

### 6.2 Node.js Dependencies

```bash
cd app
npm install
```

**Verify:**
- [ ] `node_modules/` created
- [ ] No installation errors

## Phase 7: Test Everything

### 7.1 Test Backend

```bash
cd backend
source ../venv/bin/activate

# Start server
uvicorn main:app --reload

# In another terminal, test
curl http://localhost:8000/health
# Should return: {"status":"ok",...}

# Test API docs
# Open: http://localhost:8000/docs
```

**Verify:**
- [ ] Backend starts without errors
- [ ] Health check works
- [ ] API docs accessible
- [ ] Can connect to Supabase (check logs)

### 7.2 Test Agent

```bash
cd agent
source ../venv/bin/activate

# Test configuration loading
python -c "from src.config import settings; print(f'RPC: {settings.SOLANA_RPC_URL}')"

# Start agent (will run monitoring loops)
python src/main.py
```

**Verify:**
- [ ] Agent starts without errors
- [ ] Connects to Solana RPC
- [ ] Can load program
- [ ] Monitoring loops start

### 7.3 Test Smart Contracts

```bash
cd programs/commitment-pool

# Run Anchor tests
anchor test
```

**Verify:**
- [ ] Tests pass
- [ ] Can create pools
- [ ] Can join pools

## Phase 8: Quick Start Commands

### Start Everything

**Terminal 1 - Backend:**
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2 - Agent:**
```bash
cd agent
source ../venv/bin/activate
python src/main.py
```

**Terminal 3 - Frontend:**
```bash
cd app
npm run dev
```

## Troubleshooting

### Backend won't start
- Check `.env` file exists and has all values
- Verify Supabase credentials
- Check port 8000 not in use: `lsof -i :8000`

### Agent won't start
- Verify keypair file exists: `ls ~/.config/solana/agent-keypair.json`
- Check keypair has SOL: `solana balance -k ~/.config/solana/agent-keypair.json`
- Verify PROGRAM_ID is correct

### Database connection fails
- Check DATABASE_URL format
- Verify Supabase project is active
- Check network connectivity

### Smart contract deployment fails
- Ensure you have SOL: `solana balance`
- Check RPC endpoint is accessible
- Verify Anchor version: `anchor --version`

## Summary Checklist

Before starting development, ensure:

- [ ] All development tools installed
- [ ] Development wallet created and funded
- [ ] Agent wallet created and funded
- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Smart contracts deployed
- [ ] PROGRAM_ID saved
- [ ] All .env files configured
- [ ] Dependencies installed
- [ ] Backend starts successfully
- [ ] Agent starts successfully
- [ ] Tests pass

## Next Steps

Once everything is set up:

1. Read [TESTING.md](TESTING.md) for testing strategies
2. Start implementing business logic
3. Build frontend UI
4. Implement agent monitoring logic
5. Test end-to-end flows


