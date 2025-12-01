#!/bin/bash

# Quick backend test script

echo "🧪 Testing Backend API..."
echo ""

cd "$(dirname "$0")/backend"

# Activate venv
source ../venv/bin/activate

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating minimal .env for testing..."
    cat > .env << EOF
HOST=0.0.0.0
PORT=8000
DEBUG=true
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=test
EOF
    echo "✅ Created minimal .env file"
fi

# Test import
echo "Testing imports..."
python -c "from main import app; print('✅ Backend imports successfully')" || {
    echo "❌ Import failed. Installing dependencies..."
    pip install -r requirements.txt
    python -c "from main import app; print('✅ Backend imports successfully')"
}

echo ""
echo "✅ Backend is ready to test!"
echo ""
echo "To start the server, run:"
echo "  cd backend"
echo "  source ../venv/bin/activate"
echo "  uvicorn main:app --reload"
echo ""
echo "Then test with:"
echo "  curl http://localhost:8000/health"
echo "  # Or open http://localhost:8000/docs in browser"

