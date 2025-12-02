#!/bin/bash
# Quick script to kill backend server on port 8000

PORT=8000

echo "🔍 Looking for processes on port $PORT..."

# Find processes on port 8000
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ No processes found on port $PORT"
    exit 0
fi

echo "Found processes: $PIDS"
echo "Killing processes on port $PORT..."

# Kill all processes on port 8000
kill -9 $PIDS 2>/dev/null

# Wait a moment and verify
sleep 1
REMAINING=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$REMAINING" ]; then
    echo "✅ Successfully killed all processes on port $PORT"
else
    echo "⚠️  Some processes may still be running: $REMAINING"
fi

