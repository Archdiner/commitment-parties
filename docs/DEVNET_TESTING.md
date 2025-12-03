# Devnet Testing Guide

This guide explains how to test the Commitment Parties frontend using Solana devnet (testnet) without needing real SOL or an SSN.

## Prerequisites

1. **Phantom Wallet** installed in your browser
2. **Backend API** running on `http://localhost:8000`
3. **Smart contracts** deployed to devnet (already done)

## Step 1: Configure Phantom Wallet for Devnet

1. Open Phantom wallet extension
2. Click the settings gear icon (top right)
3. Go to **Developer Settings**
4. Enable **Testnet Mode** or switch network to **Devnet**
5. Your wallet will now connect to Solana devnet

## Step 2: Get Devnet SOL (Free Test Tokens)

You need devnet SOL to pay for transaction fees. Get free test SOL:

### Option A: Using Solana CLI (Recommended)
```bash
# Make sure you're on devnet
solana config set --url https://api.devnet.solana.com

# Get your wallet address
solana address

# Request airdrop (you can do this multiple times)
solana airdrop 2
```

### Option B: Using Phantom Wallet
1. Connect Phantom to devnet (see Step 1)
2. Copy your wallet address
3. Visit: https://faucet.solana.com/
4. Paste your address and request SOL
5. You can request 2 SOL every 24 hours

### Option C: Using Solana Web3.js (Programmatic)
```bash
# In your terminal, run:
curl -X POST https://api.devnet.solana.com -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"requestAirdrop","params":["YOUR_WALLET_ADDRESS", 2000000000]}'
```

## Step 3: Configure Frontend Environment

Make sure your `app/frontend/.env.local` file has:

```env
# Solana Configuration (Devnet)
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=GSvoKxVHbtAY2mAAU4RM3PVQC3buLSjRm24N7QhAoieH
NEXT_PUBLIC_CLUSTER=devnet

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase (if needed)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Step 4: Start the Application

1. **Start Backend:**
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
```

2. **Start Frontend:**
```bash
cd app/frontend
npm run dev
```

3. Open `http://localhost:3000` in your browser

## Step 5: Test the Application

### Test 1: Connect Wallet
1. Click "Connect Wallet" button
2. Phantom should prompt you to connect
3. Approve the connection
4. Your wallet address and balance should appear

### Test 2: Create a Pool
1. Navigate to "Create Pool" page
2. Fill in the form:
   - Challenge name
   - Description
   - Stake amount (e.g., 0.1 SOL)
   - Duration (e.g., 7 days)
   - Max participants
3. Click "Create Challenge & Stake"
4. Phantom will prompt you to sign the transaction
5. Approve the transaction
6. Wait for confirmation
7. You should see a success message with a Solscan link

### Test 3: Join a Pool
1. Navigate to a pool page
2. Click "Join Pool"
3. Phantom will prompt you to sign the transaction
4. Approve the transaction (this transfers SOL to the pool vault)
5. Wait for confirmation
6. Participant count should update

## Verifying Transactions

All transactions are on **devnet**, so you can verify them:

1. **Solscan (Devnet):**
   - https://solscan.io/tx/{SIGNATURE}?cluster=devnet

2. **Solana Explorer (Devnet):**
   - https://explorer.solana.com/tx/{SIGNATURE}?cluster=devnet

3. **Pool Address:**
   - https://explorer.solana.com/address/{POOL_ADDRESS}?cluster=devnet

## Troubleshooting

### "Insufficient funds" error
- Request more devnet SOL from the faucet
- Make sure you're on devnet, not mainnet

### "Transaction failed" error
- Check that your backend is running
- Verify the program ID matches your devnet deployment
- Check browser console for detailed error messages

### "Phantom wallet not found"
- Make sure Phantom extension is installed
- Refresh the page
- Check that Phantom is enabled for the site

### "Network mismatch" error
- Make sure Phantom is set to Devnet mode
- Check that `NEXT_PUBLIC_SOLANA_RPC` points to devnet

## Important Notes

- **Devnet SOL has no real value** - it's only for testing
- **Devnet resets periodically** - your transactions may be lost
- **Transaction fees are very low** on devnet (usually free or < 0.001 SOL)
- **All transactions are public** on devnet explorer

## Getting More Devnet SOL

If you run out of devnet SOL:
1. Use the Solana CLI: `solana airdrop 2`
2. Use the web faucet: https://faucet.solana.com/
3. Use the programmatic API (see Option C above)

## Next Steps

Once testing is complete on devnet:
- Fix any bugs found
- Test all user flows
- Prepare for mainnet deployment (when ready)


