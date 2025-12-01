#!/bin/bash

# Deployment script for Commitment Agent smart contracts
# Builds and deploys the Anchor program to Solana devnet

set -e  # Exit on error

echo "🚀 Deploying Commitment Agent Smart Contracts..."
echo ""

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "❌ Error: Anchor.toml not found. Run this script from programs/commitment-pool/"
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Error: Anchor not found. Install with: avm install latest"
    exit 1
fi

# Check if Solana CLI is configured
echo "📋 Checking Solana configuration..."
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')

if [[ "$CLUSTER" != *"devnet"* ]] && [[ "$CLUSTER" != *"mainnet"* ]]; then
    echo "⚠️  Warning: Not configured for devnet or mainnet"
    echo "   Current cluster: $CLUSTER"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the program
echo ""
echo "🔨 Building program..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/commitment_pool-keypair.json)
echo ""
echo "📝 Program ID: $PROGRAM_ID"

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Current balance: $BALANCE SOL"

# Estimate deployment cost
echo ""
echo "💸 Estimated deployment cost: ~2-3 SOL"
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Deploy
echo ""
echo "🚀 Deploying to $CLUSTER..."
anchor deploy

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📝 Next steps:"
echo "   1. Update PROGRAM_ID in backend/.env"
echo "   2. Update PROGRAM_ID in agent/.env"
echo "   3. Update NEXT_PUBLIC_PROGRAM_ID in app/.env.local"
echo "   4. Update declare_id! in src/lib.rs"
echo ""
echo "🔍 Verify on Solscan:"
echo "   https://solscan.io/account/$PROGRAM_ID?cluster=$(echo $CLUSTER | grep -o 'devnet\|mainnet')"
echo ""

