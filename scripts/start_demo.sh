#!/bin/bash
# Commitment Parties - Demo Startup Script
# This script starts all required services for a demo

set -e

echo "🚀 Starting Commitment Parties Demo..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        echo -e "${YELLOW}Killing process on port $1...${NC}"
        kill -9 $(lsof -ti:$1) 2>/dev/null || true
        sleep 1
    fi
}

echo ""
echo "1️⃣  Checking environment..."

# Check for .env files
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo -e "${RED}❌ Missing backend/.env file${NC}"
    echo "   Copy from docs/env-templates/backend.env.example and configure"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/agent/.env" ]; then
    echo -e "${YELLOW}⚠️  Missing agent/.env file${NC}"
    echo "   Creating from template..."
    cp "$PROJECT_DIR/docs/env-templates/agent.env.example" "$PROJECT_DIR/agent/.env" 2>/dev/null || true
fi

echo -e "${GREEN}✅ Environment files found${NC}"

echo ""
echo "2️⃣  Starting Backend API..."

# Kill any existing process on port 8000
kill_port 8000

# Start backend
cd "$PROJECT_DIR/backend"
source "$PROJECT_DIR/venv/bin/activate" 2>/dev/null || source "$PROJECT_DIR/backend/venv/bin/activate" 2>/dev/null || true
nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > "$PROJECT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "   Waiting for backend to start..."
sleep 3

if check_port 8000; then
    echo -e "${GREEN}✅ Backend running on http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Check backend.log${NC}"
    exit 1
fi

echo ""
echo "3️⃣  Checking Solana configuration..."

# Check if solana CLI is available
if command -v solana &> /dev/null; then
    SOLANA_ADDRESS=$(solana address 2>/dev/null || echo "Not configured")
    SOLANA_BALANCE=$(solana balance 2>/dev/null || echo "Unknown")
    echo "   Wallet: $SOLANA_ADDRESS"
    echo "   Balance: $SOLANA_BALANCE"
    
    # Check if on devnet
    SOLANA_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')
    if [[ "$SOLANA_URL" == *"devnet"* ]]; then
        echo -e "${GREEN}✅ Configured for devnet${NC}"
    else
        echo -e "${YELLOW}⚠️  Not on devnet. Run: solana config set --url devnet${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Solana CLI not found${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Demo Environment Ready!${NC}"
echo "=================================================="
echo ""
echo "📋 Quick Commands:"
echo ""
echo "   # Run full demo flow:"
echo "   cd agent && python demo.py full"
echo ""
echo "   # Or step by step:"
echo "   python demo.py create --stake-sol 0.01"
echo "   python demo.py join <pool_id>"
echo "   python demo.py checkin <pool_id>"
echo "   python demo.py verify <pool_id>"
echo "   python demo.py status <pool_id>"
echo ""
echo "   # Full on-chain test:"
echo "   python test_full_flow.py --stake-sol 0.01"
echo ""
echo "📡 Endpoints:"
echo "   API: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo "   Health: http://localhost:8000/health"
echo ""
echo "📝 Logs:"
echo "   Backend: $PROJECT_DIR/backend.log"
echo "   Agent: $PROJECT_DIR/agent/src/agent.log"
echo ""
echo "🛑 To stop:"
echo "   kill -9 \$(lsof -ti:8000)"
echo ""


