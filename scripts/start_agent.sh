#!/bin/bash
# Start the Commitment Agent

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENT_DIR="$PROJECT_ROOT/agent"

cd "$AGENT_DIR" || exit 1

echo "🚀 Starting Commitment Agent..."
echo "   Working directory: $(pwd)"
echo ""

# Check if virtual environment exists
if [ ! -d "$PROJECT_ROOT/venv" ]; then
    echo "❌ Virtual environment not found. Please set up the environment first."
    exit 1
fi

# Activate virtual environment
source "$PROJECT_ROOT/venv/bin/activate"

# Check if .env file exists
if [ ! -f "$AGENT_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found in agent/ directory"
    echo "   Make sure to create agent/.env with required configuration"
    echo ""
fi

# Add src directory to PYTHONPATH so imports work
export PYTHONPATH="$AGENT_DIR/src:$PYTHONPATH"

# Start the agent
echo "📡 Starting agent monitoring..."
cd "$AGENT_DIR/src" || exit 1
python main.py

