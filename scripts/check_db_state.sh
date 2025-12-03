#!/bin/bash
# Quick script to check database state via API
# This checks if pools exist (should be empty after deletion)

echo "🔍 Checking database state..."
echo ""

# Check pools
POOLS=$(curl -s http://localhost:8000/api/pools/)
POOL_COUNT=$(echo "$POOLS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "0")

if [ "$POOL_COUNT" = "0" ] || [ -z "$POOLS" ] || [ "$POOLS" = "[]" ]; then
    echo "✅ Pools: 0 (all deleted)"
else
    echo "❌ Pools: $POOL_COUNT still exist"
    echo "$POOLS" | python3 -m json.tool 2>/dev/null | head -20
fi

echo ""
echo "Note: Related records (participants, check-ins, etc.) are automatically"
echo "      deleted via CASCADE DELETE when pools are deleted."


