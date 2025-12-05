# 🎮 Commitment Parties

> AI-powered accountability games with real stakes on Solana

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Commitment Parties** is an autonomous AI-powered accountability platform that transforms personal commitments into competitive games with real financial stakes. Users create or join "commitment pools" where they stake SOL or USDC on achieving specific goals over 7-30 days. An AI agent monitors participants 24/7, autonomously verifying goal completion and executing trustless reward distribution via smart contracts.

## 🚀 Quick Start

### Prerequisites

- **Rust & Cargo** - For smart contract development
- **Solana CLI** - For blockchain interaction
- **Anchor Framework** - For Solana program development
- **Node.js & npm** - For frontend and Anchor tests
- **Python 3.8+** - For backend and agent

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/commitment-parties.git
cd commitment-parties
```

2. **Setup Python environment**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install --upgrade pip
```

3. **Install dependencies**
```bash
# Backend dependencies
pip install -r backend/requirements.txt

# Agent dependencies
pip install -r agent/requirements.txt

# Frontend dependencies
cd app/frontend && npm install && cd ../..
```

4. **Setup Solana environment**
```bash
# Install Solana CLI (if not installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Generate keypair and get airdrop
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2
```

5. **Build and deploy smart contracts**
```bash
cd programs/commitment-pool
anchor build
anchor deploy
cd ../..
```

6. **Configure environment variables**
```bash
# Backend
cp docs/env-templates/backend.env.example backend/.env
# Edit backend/.env with your values

# Agent
cp docs/env-templates/agent.env.example agent/.env
# Edit agent/.env with your values

# Frontend
cp docs/env-templates/frontend.env.example app/frontend/.env.local
# Edit app/frontend/.env.local with your values
```

7. **Setup database**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the schema: `backend/sql/schema.sql` in Supabase SQL Editor
   - Update `DATABASE_URL` and `SUPABASE_URL` in your `.env` files

8. **Start services**
```bash
# Terminal 1: Backend API
cd backend
source ../venv/bin/activate
uvicorn main:app --reload

# Terminal 2: Agent
cd agent
source ../venv/bin/activate
python src/main.py

# Terminal 3: Frontend
cd app/frontend
npm run dev
```

## 🏗️ Architecture

The system consists of four main components:

### 1. Smart Contracts (`programs/commitment-pool/`)
- **Technology**: Anchor (Rust) on Solana
- **Purpose**: Trustless on-chain pool and participant management
- **Key Features**:
  - Pool creation and configuration
  - Participant staking and escrow
  - Verification result storage
  - Automatic reward distribution

### 2. Backend API (`backend/`)
- **Technology**: FastAPI (Python) with Supabase (PostgreSQL)
- **Purpose**: Off-chain data management and API endpoints
- **Key Features**:
  - Pool metadata storage
  - Check-in submissions (lifestyle challenges)
  - User profile management
  - Solana Actions endpoints (for Twitter Blinks)

### 3. AI Agent (`agent/`)
- **Technology**: Python with solana-py and anchorpy
- **Purpose**: Autonomous 24/7 monitoring and verification
- **Key Features**:
  - Monitors DCA pools (daily swap verification)
  - Monitors HODL pools (hourly balance checks)
  - Monitors lifestyle pools (check-in verification)
  - Automatic reward distribution
  - Twitter integration for social features

### 4. Frontend (`app/frontend/`)
- **Technology**: Next.js 14, TypeScript, Tailwind CSS
- **Purpose**: User-facing web application
- **Key Features**:
  - Wallet connection (Phantom, Solflare)
  - Pool browsing and creation
  - Joining pools via on-chain transactions
  - Check-in interface for lifestyle challenges
  - Twitter Blinks integration

## 📁 Project Structure

```
commitment-parties/
├── programs/commitment-pool/    # Anchor smart contracts
│   ├── src/
│   │   ├── lib.rs              # Program entry point
│   │   ├── state.rs            # Account structures
│   │   └── instructions/       # Program instructions
│   └── Anchor.toml
├── backend/                     # FastAPI backend
│   ├── main.py                 # FastAPI app
│   ├── routers/                # API route handlers
│   ├── models.py               # Database models
│   └── sql/                    # Database schema
├── agent/                       # Python AI agent
│   ├── src/
│   │   ├── main.py             # Agent entry point
│   │   ├── monitor.py          # Pool monitoring
│   │   ├── verify.py           # Verification logic
│   │   ├── distribute.py       # Reward distribution
│   │   └── social.py           # Twitter integration
│   └── requirements.txt
├── app/frontend/                # Next.js frontend
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   └── lib/                     # Utility libraries
└── docs/                        # Documentation
```

## 🎯 Core Features

### Challenge Types

1. **DCA (Dollar Cost Averaging) Challenges**
   - Daily automated swaps via Jupiter/Raydium
   - Verifies swap transactions on-chain
   - Perfect for consistent investment habits

2. **HODL Challenges**
   - Maintain minimum token balance
   - Hourly balance verification
   - Great for long-term holding goals

3. **Lifestyle Habits**
   - GitHub commits (daily verification)
   - Screen time limits (screenshot verification)
   - Custom check-in based challenges
   - Flexible verification methods

### Economic Model

- **Multi-Player Pools**: Winners split losers' stakes + yield generated
- **Solo Challenges**: Yield-only rewards (stake + yield if win, charity if lose)
- **Distribution Modes**:
  - Competitive: Losers' stakes → Winners
  - Charity: Losers' stakes → Charity
  - Split: Configurable percentage split

### Social Features

- **Twitter Blinks Integration**: Share pools on Twitter with one-click join
- **Viral Growth**: Participants can invite others via Twitter
- **Public/Private Pools**: Control who can join your challenges

## 🔧 Development

### Smart Contracts

```bash
cd programs/commitment-pool
anchor build          # Build the program
anchor test           # Run tests
anchor deploy         # Deploy to devnet
```

### Backend API

```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
```

API available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Agent

```bash
cd agent
source ../venv/bin/activate
python src/main.py
```

### Frontend

```bash
cd app/frontend
npm run dev
```

Frontend available at `http://localhost:3000`

## 🧪 Testing

### Smart Contract Tests
```bash
cd programs/commitment-pool
anchor test
```

### Backend Tests
```bash
cd backend
pytest
```

### Agent Tests
```bash
cd agent
python test_agent.py
```

## 📦 Deployment

### Smart Contracts
1. Build: `anchor build`
2. Deploy: `anchor deploy --provider.cluster devnet`
3. Save PROGRAM_ID for other components

### Backend (Railway/Render)
1. Connect GitHub repository
2. Set root directory to `backend`
3. Configure environment variables
4. Deploy

### Agent (Render Background Worker)
1. Create Background Worker service
2. Set root directory to `agent`
3. Configure environment variables (including agent keypair)
4. Deploy (requires always-on plan, ~$7/month)

### Frontend (Vercel)
1. Import GitHub repository
2. Set root directory to `app/frontend`
3. Configure environment variables
4. Deploy

See component-specific READMEs for detailed deployment instructions.

## 📝 Environment Variables

### Required for All Components

- `SOLANA_RPC_URL` - Solana RPC endpoint
- `PROGRAM_ID` - Deployed program ID
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key

### Backend Specific
- `HOST` - API host (default: 0.0.0.0)
- `PORT` - API port (default: 8000)
- `CORS_ORIGINS` - Allowed CORS origins

### Agent Specific
- `AGENT_PRIVATE_KEY` or `AGENT_KEYPAIR_PATH` - Agent wallet
- `TWITTER_API_KEY` - Twitter API credentials (optional)
- `OPENAI_API_KEY` - OpenAI API key (optional)

### Frontend Specific
- `NEXT_PUBLIC_SOLANA_RPC` - Public Solana RPC URL
- `NEXT_PUBLIC_PROGRAM_ID` - Public program ID
- `NEXT_PUBLIC_CLUSTER` - Solana cluster (devnet/mainnet)
- `NEXT_PUBLIC_API_URL` - Backend API URL

See `docs/env-templates/` for example configuration files.

## 🔐 Security

- **Never commit private keys or keypairs to git**
- Use environment variables for all secrets
- Agent keypair must be kept secure (never exposed)
- Enable HTTPS for all production services
- Implement rate limiting on API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for University Blockchain Conference Hackathon 2025
- Powered by Solana blockchain
- Uses Anchor framework for smart contracts
- Twitter Blinks integration for viral growth

---

**Built with ❤️ for accountability and positive behavior change**
