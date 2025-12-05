#!/bin/bash
# Stop all demo services

echo "🛑 Stopping Commitment Parties Demo..."

# Kill backend
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "   Stopping backend on port 8000..."
    kill -9 $(lsof -ti:8000) 2>/dev/null || true
    echo "   ✅ Backend stopped"
else
    echo "   ℹ️  Backend not running"
fi

# Kill any agent processes
pkill -f "python.*main.py" 2>/dev/null && echo "   ✅ Agent stopped" || echo "   ℹ️  Agent not running"

echo ""
echo "✅ All services stopped"


