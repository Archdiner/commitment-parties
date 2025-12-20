# Backend API

FastAPI backend for Commitment Parties - manages pool metadata, check-ins, and Solana Actions endpoints.

## Overview

REST API that provides:
- Pool metadata storage and retrieval with recruitment tracking
- Check-in submissions for lifestyle challenges
- GitHub commit verification via GitHub API
- Screen time screenshot verification via OpenAI Vision API
- User profile management with GitHub OAuth integration
- Solana Actions endpoints for Twitter Blinks integration
- AI-powered challenge blueprint generation from natural language

## Setup

### Prerequisites

- Python 3.8+
- Virtual environment activated
- Supabase database configured
- Environment variables configured

### Installation

```bash
cd backend
source ../venv/bin/activate
pip install -r requirements.txt
```

### Configuration

Copy the example environment file:

```bash
cp docs/env-templates/backend.env.example .env
```

Required environment variables:

```bash
# Server
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=your_program_id_here

# CORS
CORS_ORIGINS=https://your-frontend-url,http://localhost:3000

# GitHub OAuth (for commit verification)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# OpenAI (for screen time verification)
OPENAI_API_KEY=your_openai_api_key

# AI Features (optional)
OPENAI_API_KEY=your_openai_api_key  # For AI challenge generation
```

### Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run schema: Copy contents of `sql/schema.sql` to Supabase SQL Editor
3. Run migrations: `sql/migration_*.sql` files if needed
4. Update `DATABASE_URL` and `SUPABASE_URL` in `.env`

## Running

### Development

```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
```

API available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Production

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## API Endpoints

### Health Check
- `GET /health` - API health status

### Pools
- `GET /api/pools` - List active pools (with filters)
- `GET /api/pools/{pool_id}` - Get pool details
- `POST /api/pools` - Create pool metadata
- `POST /api/pools/create/confirm` - Confirm pool creation (with recruitment system)
- `GET /api/pools/{pool_id}/participants` - Get pool participants

### Check-ins
- `POST /api/checkins` - Submit check-in
- `GET /api/checkins/{pool_id}/{wallet}` - Get user check-ins

### Verification
- `POST /api/pools/{pool_id}/participants/{wallet}/verify-github` - Verify GitHub commits
- `POST /api/pools/{pool_id}/participants/{wallet}/verify-screen-time` - Verify screen time with screenshot
- `GET /api/pools/{pool_id}/participants/{wallet}/verifications` - Get verification history

### Users
- `GET /api/users/{wallet}` - Get user profile
- `POST /api/users` - Create/update user profile
- `POST /api/users/{wallet}/link-github` - Link GitHub account via OAuth
- `GET /api/users/{wallet}/github-status` - Check GitHub verification status

### Solana Actions (Blinks)
- `GET /solana/actions/join-pool` - Get action metadata
- `POST /solana/actions/join-pool` - Build join transaction

### AI On-chain Actions
- `POST /api/ai/onchain/generate` - Generate on-chain action from natural language
- `POST /api/ai/onchain/challenges/parse` - Parse natural language into challenge blueprint
- `POST /api/ai/onchain/create-pool` - Create pool on-chain
- `POST /api/ai/onchain/join-pool` - Join pool on-chain
- `POST /api/ai/onchain/verify` - Submit verification

## Project Structure

```
backend/
├── main.py                 # FastAPI application
├── config.py               # Configuration settings
├── database.py             # Database connection
├── models.py               # Pydantic models
├── routers/                # API route handlers
│   ├── pools.py
│   ├── checkins.py
│   ├── users.py
│   ├── solana_actions.py
│   └── ai_onchain.py
├── sql/                    # Database schema
│   ├── schema.sql
│   └── migration_*.sql
└── requirements.txt
```

## Database Schema

Key tables:
- `pools` - Pool metadata and configuration
  - Includes recruitment tracking: `recruitment_deadline`, `filled_at`, `auto_start_time`
  - Enforces min_participants (5-50) and max_participants
- `participants` - Pool participants with verification tracking
- `checkins` - Lifestyle challenge check-ins (GitHub, screen time, custom)
- `verifications` - Agent verification results with proof data
- `users` - User profiles with GitHub OAuth integration
  - Stores verified GitHub usernames for commit verification

See `sql/schema.sql` for complete schema.

## Verification Systems

### GitHub Commit Verification
- Uses GitHub OAuth to verify user identity
- Queries GitHub API for commits within challenge day window
- Validates commit count and code changes (lines added/modified)
- Supports repository-specific or all-public-repos verification
- AI-powered validation to prevent gaming (nonsensical commits)

### Screen Time Verification
- Accepts screenshot uploads (PNG, JPEG)
- Uses OpenAI Vision API to extract screen time data
- Validates date matches current challenge day
- Checks screen time is below configured limit
- Returns detailed verification results with extracted data

### Custom Check-in Verification
- Photo-based with optional GPS validation
- Time-window based verification (e.g., 5-7am check-ins)
- Flexible proof requirements per challenge type

## Deployment

### Railway

1. Connect GitHub repository
2. Set root directory to `backend`
3. Configure environment variables
4. Railway auto-detects Python and installs dependencies

### Render

1. Create Web Service
2. Connect GitHub repository
3. Set root directory to `backend`
4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### VPS

Use systemd service or process manager (PM2, supervisor) to keep API running.

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=.
```

## Troubleshooting

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Ensure database schema is applied

### CORS errors
- Add frontend URL to `CORS_ORIGINS`
- Check environment variable format (comma-separated)

### API not starting
- Check port is not already in use
- Verify all environment variables are set
- Check Python version matches requirements
