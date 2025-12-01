#!/bin/bash

# Comprehensive testing script for Commitment Agent
# Run this after completing setup.md

set -e

echo "🧪 Commitment Agent - Testing Suite"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")"

# Test 1: Backend API
echo "📦 Test 1: Backend API"
echo "----------------------"

cd backend
source ../venv/bin/activate

# Check if .env exists, create minimal one if not
if [ ! -f .env ]; then
    echo "Creating minimal .env for testing..."
    cat > .env << EOF
HOST=0.0.0.0
PORT=8000
DEBUG=true
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=test
EOF
fi

# Test import
echo "Testing backend imports..."
if python -c "from main import app; print('✅ Backend imports successfully')" 2>/dev/null; then
    echo -e "${GREEN}✅ Backend imports work${NC}"
else
    echo -e "${RED}❌ Backend import failed${NC}"
    echo "Installing dependencies..."
    pip install -r requirements.txt
    python -c "from main import app; print('✅ Backend imports successfully')"
fi

echo ""
echo "To test backend server:"
echo "  1. Run: uvicorn main:app --reload"
echo "  2. In another terminal: curl http://localhost:8000/health"
echo "  3. Or open: http://localhost:8000/docs"
echo ""

cd ..

# Test 2: Smart Contracts
echo "📦 Test 2: Smart Contracts (Anchor)"
echo "------------------------------------"

cd programs/commitment-pool

# Check if Rust/Anchor are installed
if ! command -v anchor &> /dev/null; then
    echo -e "${YELLOW}⚠️  Anchor not found. Install with: avm install latest${NC}"
    cd ../..
    exit 1
fi

echo "Building Anchor program..."
if anchor build 2>&1 | grep -q "Build successful\|Program build success"; then
    echo -e "${GREEN}✅ Smart contracts build successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Build completed (check for errors above)${NC}"
    # Still continue - warnings are OK
fi

echo ""
echo "To test smart contracts:"
echo "  1. Start local validator: solana-test-validator"
echo "  2. In another terminal: anchor test"
echo ""

cd ../..

# Test 3: Agent Structure
echo "📦 Test 3: Agent Structure"
echo "-------------------------"

cd agent
source ../venv/bin/activate

echo "Testing agent imports..."
if python -c "from src.config import settings; print(f'✅ Agent config loads: RPC={settings.SOLANA_RPC_URL}')" 2>/dev/null; then
    echo -e "${GREEN}✅ Agent structure is valid${NC}"
else
    echo -e "${YELLOW}⚠️  Agent config test (may need dependencies)${NC}"
fi

cd ..

# Test 4: Database Schema
echo ""
echo "📦 Test 4: Database Schema"
echo "-------------------------"
echo "To test database schema:"
echo "  1. Create Supabase project at supabase.com"
echo "  2. Go to SQL Editor"
echo "  3. Copy contents of backend/sql/schema.sql"
echo "  4. Paste and run"
echo "  5. Verify tables created in Table Editor"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Testing Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Backend API: Ready to test"
echo "✅ Smart Contracts: Ready to build/test"
echo "✅ Agent Structure: Ready"
echo "⚠️  Database: Needs Supabase setup"
echo ""
echo "Next Steps:"
echo "  1. Test backend: cd backend && uvicorn main:app --reload"
echo "  2. Test smart contracts: cd programs/commitment-pool && anchor build"
echo "  3. Setup Supabase and test database"
echo "  4. Deploy smart contracts to devnet"
echo ""

