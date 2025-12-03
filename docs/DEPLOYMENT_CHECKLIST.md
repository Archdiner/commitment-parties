# Deployment Checklist - Quick Reference

Use this checklist to track your deployment progress.

## Prerequisites

- [ ] GitHub repository ready
- [ ] Supabase account created
- [ ] Solana wallet with SOL (devnet or mainnet)
- [ ] Domain name (optional)
- [ ] Twitter Developer account (optional)
- [ ] OpenAI API key (optional)

---

## Step 1: Smart Contracts

- [ ] Navigate to `programs/commitment-pool`
- [ ] Configure Solana CLI: `solana config set --url https://api.devnet.solana.com`
- [ ] Check balance: `solana balance`
- [ ] Build: `anchor build`
- [ ] Deploy: `anchor deploy --provider.cluster devnet`
- [ ] Save PROGRAM_ID: `solana address -k target/deploy/commitment_pool-keypair.json`
- [ ] Update `src/lib.rs` with PROGRAM_ID
- [ ] Verify on Solscan

**PROGRAM_ID**: `___________________________`

---

## Step 2: Database (Supabase)

- [ ] Create Supabase project
- [ ] Run schema: Copy `backend/sql/schema.sql` to SQL Editor
- [ ] Get DATABASE_URL from Project Settings → Database
- [ ] Get SUPABASE_URL from Project Settings → API
- [ ] Get SUPABASE_KEY from Project Settings → API

**DATABASE_URL**: `___________________________`  
**SUPABASE_URL**: `___________________________`  
**SUPABASE_KEY**: `___________________________`

---

## Step 3: Backend API

**Platform**: [ ] Railway [ ] Render [ ] Fly.io [ ] VPS [ ] Other: ________

- [ ] Create account on chosen platform
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Configure build/start commands
- [ ] Set all environment variables:
  - [ ] HOST, PORT, ENVIRONMENT
  - [ ] DATABASE_URL, SUPABASE_URL, SUPABASE_KEY
  - [ ] SOLANA_RPC_URL, PROGRAM_ID
  - [ ] CORS_ORIGINS (update after frontend)
  - [ ] GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (if using)
  - [ ] LLM_API_KEY (if using)
- [ ] Deploy
- [ ] Test: `curl https://your-backend-url/health`
- [ ] Test API docs: `https://your-backend-url/docs`

**Backend URL**: `https://___________________________`

---

## Step 4: Frontend

**Platform**: [ ] Vercel [ ] Netlify [ ] VPS [ ] Other: ________

- [ ] Create account on chosen platform
- [ ] Connect GitHub repository
- [ ] Set root directory to `app/frontend`
- [ ] Configure build settings (auto-detected for Next.js)
- [ ] Set all environment variables:
  - [ ] NEXT_PUBLIC_SOLANA_RPC
  - [ ] NEXT_PUBLIC_PROGRAM_ID
  - [ ] NEXT_PUBLIC_CLUSTER
  - [ ] NEXT_PUBLIC_API_URL (backend URL from Step 3)
  - [ ] NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (if needed)
- [ ] Deploy
- [ ] Test frontend in browser
- [ ] Test wallet connection
- [ ] Update CORS_ORIGINS in backend with frontend URL

**Frontend URL**: `https://___________________________`

---

## Step 5: AI Agent

**Platform**: [ ] Railway [ ] VPS [ ] Docker [ ] Other: ________

- [ ] Create service/instance
- [ ] Set root directory to `agent`
- [ ] Configure build/start commands
- [ ] Set all environment variables:
  - [ ] SOLANA_RPC_URL, PROGRAM_ID
  - [ ] AGENT_KEYPAIR_PATH or AGENT_PRIVATE_KEY
  - [ ] DATABASE_URL, SUPABASE_URL, SUPABASE_KEY
  - [ ] TWITTER_API_KEY, TWITTER_API_SECRET, etc. (if using)
  - [ ] OPENAI_API_KEY (if using)
  - [ ] ACTION_BASE_URL (backend URL)
  - [ ] APP_BASE_URL (frontend URL)
  - [ ] ENVIRONMENT=production
- [ ] Upload keypair file (if using file path)
- [ ] Deploy/Start service
- [ ] Check logs to verify it's running
- [ ] Verify agent is monitoring pools

**Agent Status**: [ ] Running [ ] Not Running

---

## Post-Deployment Verification

### Smart Contracts
- [ ] Can create pools on-chain
- [ ] Can join pools on-chain
- [ ] Program verified on Solscan

### Database
- [ ] Can connect from backend
- [ ] Can connect from agent
- [ ] Tables created successfully

### Backend
- [ ] API accessible
- [ ] `/docs` works
- [ ] `/health` returns 200
- [ ] Can create pools via API
- [ ] Can submit check-ins
- [ ] Solana Actions endpoints work

### Frontend
- [ ] Frontend accessible
- [ ] Wallet connection works
- [ ] Can browse pools
- [ ] Can create pools
- [ ] Can join pools
- [ ] No console errors

### Agent
- [ ] Agent running (check logs)
- [ ] Agent monitoring pools
- [ ] Agent submitting verifications
- [ ] Twitter posting works (if configured)

### Integration Tests
- [ ] Create pool → appears in backend
- [ ] Join pool → on-chain transaction succeeds
- [ ] Submit check-in → agent verifies
- [ ] Agent distributes rewards
- [ ] Twitter Blink → join pool from tweet

---

## Environment Variables Quick Reference

### Backend
```
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_KEY=...
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=...
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Agent
```
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=...
AGENT_KEYPAIR_PATH=/app/keypair.json
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_KEY=...
ACTION_BASE_URL=https://your-backend.railway.app
APP_BASE_URL=https://your-frontend.vercel.app
ENVIRONMENT=production
```

### Frontend
```
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=...
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## Deployment URLs

- **Smart Contract**: `https://solscan.io/account/[PROGRAM_ID]?cluster=devnet`
- **Backend API**: `https://___________________________`
- **Frontend**: `https://___________________________`
- **API Docs**: `https://___________________________/docs`
- **Database**: Supabase dashboard

---

## Notes

_Use this space to jot down any important notes, issues, or custom configurations during deployment._

---

**For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

