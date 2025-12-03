#!/bin/bash

# Start the Commitment Agent Backend API

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "../venv" ]; then
    source ../venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in backend directory"
    echo "   Make sure you have configured your environment variables"
    echo ""
fi

# Check if port 8000 is available
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8000 is already in use!"
    echo "   Another service is running on port 8000"
    echo "   Options:"
    echo "   1. Stop the other service and restart this script"
    echo "   2. Set PORT=8001 in backend/.env to use a different port"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 Starting Commitment Agent Backend API..."
echo "   API will be available at: http://localhost:${PORT:-8000}"
echo "   API docs: http://localhost:${PORT:-8000}/docs"
echo ""

# Start the server
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port ${PORT:-8000}

