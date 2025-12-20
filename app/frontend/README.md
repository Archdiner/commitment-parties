# Frontend

Next.js 14 frontend application for Commitment Parties.

## Overview

User-facing web application for creating, joining, and managing commitment pools. Features modern authentication, wallet integration, pool browsing, recruitment tracking, and comprehensive check-in interfaces.

## Setup

### Prerequisites

- Node.js 18+ and npm
- Environment variables configured

### Installation

```bash
cd app/frontend
npm install
```

### Configuration

Copy the example environment file:

```bash
cp docs/env-templates/frontend.env.example .env.local
```

Required environment variables:

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=your_program_id_here
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_API_URL=https://your-backend-url

# Privy Authentication (for email/Google sign-in)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

## Development

```bash
npm run dev
```

Frontend available at `http://localhost:3000`

## Build

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Set root directory to `app/frontend`
3. Framework: Next.js (auto-detected)
4. Configure environment variables
5. Deploy

Vercel will automatically:
- Detect Next.js framework
- Run `npm run build`
- Deploy on every git push

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## Features

### Authentication & Wallets
- **Privy Integration**: Sign in with email or Google account
- **Embedded Wallets**: Automatic wallet creation for non-crypto users
- **External Wallets**: Connect Phantom, Solflare, and other Solana wallets
- **Seamless Switching**: Switch between embedded and external wallets
- **Auto-Airdrop**: Automatic devnet SOL airdrop for testing (devnet only)

### Pool Management
- **Pool Browsing**: Discover and filter active pools by type, status, and more
- **Pool Creation**: Intuitive form with AI-assisted challenge generation
- **Recruitment Tracking**: Real-time display of participant recruitment status
- **Countdown Timers**: Visual countdowns for recruitment deadlines and start times
- **Join Pools**: One-click join with automatic balance checking

### Verification & Check-ins
- **GitHub Commits**: Automatic daily verification (no manual check-in needed)
- **Screen Time**: Upload screenshots for AI-powered verification
- **Custom Check-ins**: Photo/GPS-based verification for custom habits
- **Verification History**: View all past verifications and results
- **Progress Visualization**: Circular progress indicators and day tracking

### User Experience
- **Dashboard**: Personal challenge tracking with detailed progress
- **Leaderboards**: See how you compare to other participants
- **Responsive Design**: Mobile-first design works on all devices
- **Dark Theme**: Modern dark UI with emerald accent colors
- **Twitter Blinks**: Share pools on Twitter with one-click join

## Project Structure

```
app/frontend/
├── app/                    # Next.js app directory
│   ├── page.tsx            # Home page
│   ├── create/             # Pool creation with AI assistance
│   ├── pools/              # Pool browsing and details
│   ├── dashboard/          # User dashboard with progress tracking
│   ├── verify-github/      # GitHub verification page
│   ├── leaderboard/        # Challenge leaderboards
│   ├── faq/                # FAQ page
│   └── contact/            # Contact page
├── components/             # React components
│   ├── Navbar.tsx          # Navigation with wallet connection
│   ├── Footer.tsx
│   ├── DevBanner.tsx       # Development mode banner
│   ├── RecruitmentStatus.tsx  # Recruitment tracking component
│   ├── InsufficientBalanceModal.tsx  # Balance checking modal
│   └── ui/                 # Reusable UI components
├── components/providers/   # Context providers
│   └── PrivyProvider.tsx   # Privy authentication provider
├── hooks/                  # Custom React hooks
│   ├── useWallet.ts        # Unified wallet hook
│   └── useSolanaWallet.ts  # Solana wallet hook
└── lib/                    # Utilities
    ├── solana.ts           # Solana client
    ├── wallet.ts           # Wallet adapter
    └── api.ts              # Backend API client
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Privy (@privy-io/react-auth)
- **Blockchain**: @solana/web3.js, @solana/wallet-adapter
- **UI Components**: Custom components with Tailwind CSS
- **Icons**: Lucide React

## Future Features (Mainnet)

### MoonPay + Apple Pay Integration
- **On-Ramp**: Buy SOL directly with credit/debit cards or Apple Pay
- **Off-Ramp**: Withdraw winnings directly to bank accounts
- **Seamless Flow**: Integrated into join/create flows
- **Multi-Currency**: Support for USD, EUR, and other fiat currencies

This will replace the devnet auto-airdrop with real payment processing for mainnet deployment.

## Troubleshooting

### Wallet connection issues
- Ensure wallet extension is installed
- Check network matches (devnet/mainnet)
- Verify RPC endpoint is accessible

### API connection errors
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify backend is running and accessible
- Check CORS settings in backend

### Build errors
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version matches requirements
