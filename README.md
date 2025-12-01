# 🎮 Commitment Agent

> AI-powered accountability games with real stakes on Solana

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Commitment Agent** is an autonomous AI-powered accountability platform that transforms personal commitments into competitive games with real financial stakes. Users create or join "commitment pools" where they stake SOL or USDC on achieving specific goals over 7-30 days. An AI agent monitors participants 24/7, autonomously verifying goal completion and executing trustless reward distribution via smart contracts.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- Rust & Cargo
- Solana CLI
- Anchor Framework
- Node.js & npm
- Python 3.8+

See [docs/SETUP.md](docs/SETUP.md) for complete installation instructions.

> **Windows users**
> - Recommended: install **WSL2 + Ubuntu** and run all Rust/Solana/Anchor commands from the Linux shell, following `docs/SETUP.md` as-is.  
> - If you stay on native Windows, `docs/SETUP.md` includes **Windows-specific notes** for Python venv activation, Node installation, PATH configuration, and running shell scripts with `bash`.

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/commitment-agent.git
cd commitment-agent
```

2. **Verify your development environment**

```bash
chmod +x scripts/verify-install.sh
./scripts/verify-install.sh
```

3. **Setup Python environment**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
pip install -r agent/requirements.txt
```

4. **Setup Smart Contracts**

```bash
cd programs/commitment-pool
anchor build
anchor deploy
```

5. **Setup Backend**

```bash
cd ../../backend
cp .env.example .env
# Edit .env with your configuration
uvicorn main:app --reload
```

6. **Setup Agent**

```bash
cd ../agent
cp .env.example .env
# Edit .env with your configuration
python src/main.py
```

## 📖 Documentation

- [Setup Guide](docs/SETUP.md) - Complete development environment setup
- [Architecture](docs/ARCHITECTURE.md) - System architecture and design
- [API Reference](docs/API.md) - FastAPI endpoint documentation
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions

## 🏗️ Tech Stack

- **Smart Contracts:** Anchor (Rust) on Solana
- **Backend:** FastAPI (Python) with Supabase
- **Frontend:** Next.js 14, TypeScript, Tailwind
- **AI Agent:** Python with solana-py and anchorpy
- **Database:** PostgreSQL (Supabase)

## 📁 Project Structure

```
commitment-agent/
├── programs/commitment-pool/    # Anchor smart contracts
├── backend/                     # FastAPI backend
├── agent/                       # Python AI monitoring agent
├── app/                         # Next.js frontend
├── docs/                        # Documentation
└── scripts/                     # Utility scripts
```

## 🎯 Core Features

- **Pool Creation & Discovery** - Create or join commitment pools with custom goals
- **Staking System** - Stake SOL/USDC on your commitments
- **Autonomous Monitoring** - AI agent verifies goal completion 24/7
- **Trustless Distribution** - Automatic reward distribution via smart contracts
- **Multiple Challenge Types** - DCA challenges, HODL challenges, lifestyle habits
- **Social Features** - Twitter Blinks integration for viral growth

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

API will be available at `http://localhost:8000`

Interactive API docs: `http://localhost:8000/docs`

### Agent

```bash
cd agent
source ../venv/bin/activate
python src/main.py
```

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

## 📝 Environment Variables

See `.env.example` files in each directory for required environment variables:

- `backend/.env.example` - Backend configuration
- `agent/.env.example` - Agent configuration
- `app/.env.local.example` - Frontend configuration

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

---

**Built with ❤️ for accountability and positive behavior change**
