#!/bin/bash

# Test Solana Action endpoint
# Usage: ./test_action_endpoint.sh [BASE_URL] [POOL_ID]
# Example: ./test_action_endpoint.sh http://localhost:8000 123

BASE_URL="${1:-http://localhost:8000}"
POOL_ID="${2:-123}"

echo "🧪 Testing Solana Action Endpoint"
echo "=================================="
echo "Base URL: $BASE_URL"
echo "Pool ID: $POOL_ID"
echo ""

# Test GET endpoint (Action description)
echo "1️⃣  Testing GET /solana/actions/join-pool?pool_id=$POOL_ID"
echo "------------------------------------------------------------"
GET_RESPONSE=$(curl -s "$BASE_URL/solana/actions/join-pool?pool_id=$POOL_ID")
echo "$GET_RESPONSE" | jq '.' 2>/dev/null || echo "$GET_RESPONSE"
echo ""

# Check if response is valid JSON
if echo "$GET_RESPONSE" | jq -e '.type == "action"' > /dev/null 2>&1; then
    echo "✅ GET endpoint: Valid Action JSON"
else
    echo "❌ GET endpoint: Invalid or missing Action JSON"
fi
echo ""

# Test POST endpoint (Transaction building)
echo "2️⃣  Testing POST /solana/actions/join-pool"
echo "------------------------------------------------------------"
echo "Using test wallet: 11111111111111111111111111111111"
POST_RESPONSE=$(curl -s -X POST "$BASE_URL/solana/actions/join-pool" \
  -H "Content-Type: application/json" \
  -d "{\"account\": \"11111111111111111111111111111111\", \"pool_id\": $POOL_ID}")
echo "$POST_RESPONSE" | jq '.' 2>/dev/null || echo "$POST_RESPONSE"
echo ""

# Check if response has transaction
if echo "$POST_RESPONSE" | jq -e '.transaction' > /dev/null 2>&1; then
    echo "✅ POST endpoint: Transaction built successfully"
    TX_LENGTH=$(echo "$POST_RESPONSE" | jq -r '.transaction | length')
    echo "   Transaction length: $TX_LENGTH characters"
else
    echo "❌ POST endpoint: Failed to build transaction"
fi
echo ""

echo "=================================="
echo "✅ Tests complete!"
echo ""
echo "💡 Tips:"
echo "   - If using ngrok: Set ACTION_BASE_URL=https://your-ngrok-url.ngrok.io/solana/actions"
echo "   - For Twitter testing: URL must be publicly accessible"
echo "   - Check docs/TESTING_SOLANA_ACTIONS.md for full testing guide"

