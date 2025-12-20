# 🎮 Commitment Parties



**CommitMint* is an autonomous AI-powered accountability platform that transforms personal commitments into competitive games with real financial stakes. Users create or join "commitment pools" where they stake SOL or USDC on achieving specific goals over 7-30 days. An AI agent monitors participants 24/7, autonomously verifying goal completion and executing trustless reward distribution via smart contracts.

## 💭 Why I Built This

I'm a CS student at Cornell, and I personally struggle with holding myself accountable. I've tried every commitment and habit tracking app under the sun, nothing worked. The problem? There was never a real cost to quitting. So I built the app I wish existed: one where you put real money on the line, where failure has consequences, and where success is rewarded. This isn't just another habit tracker—it's accountability with real stakes.

Most importantly, I built this app to be one for everyone, not just web3 users. I had my mother and peers who've never touched crypto in mind when I built this. That's why we support email/Google sign-in with automatic wallet creation, so anyone can use it without needing to understand blockchain technology. The crypto is just the mechanism; the real value is in the accountability it creates.

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
  - Pool metadata storage and recruitment tracking
  - Check-in submissions (lifestyle challenges)
  - GitHub commit verification via GitHub API
  - Screen time screenshot verification via OpenAI Vision API
  - User profile management with GitHub OAuth
  - Solana Actions endpoints (for Twitter Blinks)
  - AI-powered challenge blueprint generation

### 3. AI Agent (`agent/`)
- **Technology**: Python with solana-py and anchorpy
- **Purpose**: Autonomous 24/7 monitoring and verification
- **Key Features**:
  - Monitors DCA pools (daily swap verification)
  - Monitors HODL pools (hourly balance checks)
  - Monitors lifestyle pools (check-in verification)
  - GitHub commit verification (daily checks)
  - Screen time verification (AI-powered screenshot analysis)
  - Pool activation system (scheduled and auto-start)
  - Automatic reward distribution
  - Twitter integration for social features
  - Recruitment deadline monitoring and refund handling

### 4. Frontend (`app/frontend/`)
- **Technology**: Next.js 14, TypeScript, Tailwind CSS
- **Purpose**: User-facing web application
- **Key Features**:
  - **Authentication**: Privy integration for email/Google sign-in
  - **Wallet Management**: Embedded wallets + external wallet support (Phantom, Solflare)
  - **Pool Browsing**: Filter by challenge type, status, and more
  - **Pool Creation**: Intuitive form with AI-assisted challenge generation
  - **Recruitment Status**: Real-time tracking of participant recruitment
  - **Dashboard**: Personal challenge tracking with progress visualization
  - **Check-in Interface**: 
    - GitHub commit verification (automatic)
    - Screen time screenshot upload
    - Photo/GPS check-ins for custom habits
  - **Twitter Blinks Integration**: One-click join from Twitter
  - **Responsive Design**: Mobile-first, works on all devices

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
   - Verifies swap transactions on-chain automatically
   - Perfect for consistent investment habits
   - No manual check-ins required

2. **HODL Challenges**
   - Maintain minimum token balance
   - Hourly balance verification on-chain
   - Great for long-term holding goals
   - Fully automated verification

3. **Lifestyle Habits**
   - **GitHub Commits**: Automatic daily verification via GitHub API
     - Verifies commit count and code changes
     - Supports specific repositories or all public repos
     - AI-powered validation to prevent gaming
   - **Screen Time Limits**: AI-powered screenshot verification
     - Upload daily screen time screenshots
     - OpenAI Vision API validates date and time limits
     - Supports iOS and Android screen time data
   - **Custom Check-ins**: Photo/GPS-based verification
     - Upload proof with optional GPS verification
     - Flexible verification windows (time-based)
     - AI-assisted validation

### Enhanced Recruitment System

- **Smart Recruitment**: Challenges recruit for up to 1 week (configurable)
- **Minimum Participants**: All challenges require 5-50 participants
- **Auto-Start**: Challenges automatically start 24 hours after filling
- **Expiration & Refunds**: If minimum participants aren't met, challenges expire and all stakes are automatically refunded
- **Recruitment Status Tracking**: Real-time display of recruitment progress and countdown timers

### AI-Powered Verification

- **24/7 Autonomous Monitoring**: AI agent continuously monitors all active challenges
- **Multi-Method Verification**:
  - On-chain verification for crypto challenges (DCA, HODL)
  - API-based verification for GitHub commits
  - Computer vision for screen time screenshots
  - GPS validation for location-based check-ins
- **Fair & Transparent**: All verification results stored on-chain and in database
- **Automatic Elimination**: Participants who miss daily verification are automatically eliminated

### Economic Model

- **Multi-Player Pools**: Winners split losers' stakes + yield generated
- **Solo Challenges**: Yield-only rewards (stake + yield if win, charity if lose)
- **Distribution Modes**:
  - Competitive: Losers' stakes → Winners
  - Charity: Losers' stakes → Charity
  - Split: Configurable percentage split
- **Trustless Escrow**: All stakes locked in smart contracts until challenge completion

### User Experience

- **No Crypto Experience Needed**: Sign in with email/Google via Privy
- **Embedded Wallets**: Automatic wallet creation for non-crypto users
- **External Wallet Support**: Connect Phantom, Solflare, or other Solana wallets
- **Seamless Onboarding**: Auto-airdrop on devnet for testing
- **Mobile-Friendly**: Responsive design works on all devices

### Social Features

- **Twitter Blinks Integration**: Share pools on Twitter with one-click join
- **Viral Growth**: Participants can invite others via Twitter
- **Public/Private Pools**: Control who can join your challenges
- **Social Sharing**: Easy sharing of challenge links and progress
- **Leaderboards**: Track progress against other participants

## 🚀 Coming Soon (Mainnet Features)

### MoonPay + Apple Pay Integration

For mainnet deployment, we're integrating seamless fiat on-ramps:

- **MoonPay Integration**: Buy SOL directly with credit/debit cards
- **Apple Pay Support**: One-tap purchases using Apple Pay
- **Off-Ramp Support**: Withdraw winnings directly to bank accounts
- **Multi-Currency**: Support for USD, EUR, and other fiat currencies
- **Regulatory Compliance**: KYC/AML compliance for mainnet transactions

This will enable non-crypto users to:
1. Sign up with email/Google
2. Buy SOL instantly with Apple Pay or credit card
3. Join challenges immediately
4. Withdraw winnings to their bank account

### Additional Planned Features

- **More Challenge Types**: Gym check-ins, meditation tracking, reading goals
- **Team Challenges**: Group-based challenges with shared goals
- **NFT Badges**: Achievement NFTs for completing challenges
- **Yield Generation**: Stakes earn yield during challenge period
- **Mobile App**: Native iOS and Android applications
- **Advanced Analytics**: Detailed progress tracking and insights

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
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID (for commit verification)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `OPENAI_API_KEY` - OpenAI API key (for screen time verification)

### Agent Specific
- `AGENT_PRIVATE_KEY` or `AGENT_KEYPAIR_PATH` - Agent wallet
- `TWITTER_API_KEY` - Twitter API credentials (optional)
- `TWITTER_API_SECRET` - Twitter API secret (optional)
- `TWITTER_ACCESS_TOKEN` - Twitter access token (optional)
- `TWITTER_ACCESS_TOKEN_SECRET` - Twitter access token secret (optional)
- `OPENAI_API_KEY` - OpenAI API key (for AI features)

### Frontend Specific
- `NEXT_PUBLIC_SOLANA_RPC` - Public Solana RPC URL
- `NEXT_PUBLIC_PROGRAM_ID` - Public program ID
- `NEXT_PUBLIC_CLUSTER` - Solana cluster (devnet/mainnet)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy app ID (for authentication)

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
