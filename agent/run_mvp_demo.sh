#!/bin/bash
# Quick script to run MVP demo test

echo "🚀 Starting MVP Demo Test..."
echo ""

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "⚠️  Warning: Backend API not responding at http://localhost:8000"
    echo "   Make sure to start the backend with: cd backend && uvicorn main:app --reload"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run the test
cd "$(dirname "$0")"
python3 test_mvp_demo.py "$@"

