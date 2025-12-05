# Frontend

Next.js 14 frontend application for Commitment Parties.

## Overview

User-facing web application for creating, joining, and managing commitment pools. Features wallet integration, pool browsing, and check-in interfaces.

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

- **Wallet Connection**: Phantom, Solflare, and other Solana wallets
- **Pool Browsing**: Discover and filter active pools
- **Pool Creation**: Create new commitment pools with custom goals
- **Join Pools**: Connect wallet and stake SOL to join
- **Check-ins**: Submit daily check-ins for lifestyle challenges
- **Progress Tracking**: View your progress and leaderboards
- **Twitter Blinks**: Share pools on Twitter with one-click join

## Project Structure

```
app/frontend/
├── app/                    # Next.js app directory
│   ├── page.tsx            # Home page
│   ├── create/             # Pool creation
│   ├── pools/              # Pool browsing and details
│   └── dashboard/          # User dashboard
├── components/             # React components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── ui/                 # UI components
└── lib/                    # Utilities
    ├── solana.ts           # Solana client
    ├── wallet.ts           # Wallet adapter
    └── api.ts              # Backend API client
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: @solana/web3.js, @solana/wallet-adapter
- **UI Components**: Custom components with Tailwind

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
