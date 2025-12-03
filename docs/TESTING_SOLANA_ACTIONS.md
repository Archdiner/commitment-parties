# Testing Solana Actions (Blinks) Guide

This guide explains how to test Solana Actions/Blinks before deploying to production.

## The Challenge

**Twitter/X needs to crawl your Action URL** when a tweet is posted. This means:
- ❌ `http://localhost:8000` won't work - Twitter can't access your local machine
- ✅ You need a **publicly accessible URL** for Twitter to crawl

## Testing Options

### Option 1: Direct API Testing (No Twitter Required) ✅ Recommended for Development

Test the Action endpoints directly without Twitter. This verifies the JSON format and transaction building work correctly.

#### Test the GET Endpoint (Action Description)

```bash
# Start your backend locally
cd backend
source ../venv/bin/activate
uvicorn main:app --reload

# In another terminal, test the Action endpoint
curl "http://localhost:8000/solana/actions/join-pool?pool_id=123" \
  -H "Accept: application/json"

# Expected response:
# {
#   "type": "action",
#   "title": "Join Challenge Name",
#   "description": "...",
#   "links": {
#     "actions": [{
#       "label": "Join Challenge (0.10 SOL)",
#       "href": "http://localhost:8000/solana/actions/join-pool?pool_id=123"
#     }]
#   }
# }
```

#### Test the POST Endpoint (Transaction Building)

```bash
curl -X POST "http://localhost:8000/solana/actions/join-pool" \
  -H "Content-Type: application/json" \
  -d '{
    "account": "YOUR_WALLET_ADDRESS",
    "pool_id": 123
  }'

# Expected response:
# {
#   "transaction": "base64_encoded_transaction...",
#   "message": "Join Challenge Name with 0.10 SOL"
# }
```

#### Test in Browser

1. Start backend: `uvicorn main:app --reload`
2. Open browser: `http://localhost:8000/solana/actions/join-pool?pool_id=123`
3. You should see the Action JSON

**✅ This verifies:**
- Action JSON format is correct
- Transaction building works
- Endpoints are accessible

**❌ This doesn't test:**
- Twitter/X Blink rendering
- Wallet integration via Blink

---

### Option 2: Local Tunnel (ngrok/localtunnel) ✅ Best for Twitter Testing

Expose your local backend publicly so Twitter can access it.

#### Using ngrok

```bash
# Install ngrok (if not installed)
# macOS: brew install ngrok
# Or download from: https://ngrok.com/download

# Start your backend locally
cd backend
source ../venv/bin/activate
uvicorn main:app --reload

# In another terminal, create tunnel
ngrok http 8000

# You'll get a public URL like:
# https://abc123.ngrok.io -> http://localhost:8000
```

**Configure Agent to Use Tunnel URL:**

```bash
# In agent/.env
ACTION_BASE_URL=https://abc123.ngrok.io/solana/actions
```

**⚠️ Important Notes:**
- Free ngrok URLs change each time you restart (unless you have a paid plan)
- Update `ACTION_BASE_URL` in agent config each time
- Twitter will be able to crawl the URL
- You can test full Blink flow end-to-end

#### Using localtunnel (Alternative)

```bash
# Install
npm install -g localtunnel

# Start backend
uvicorn main:app --reload

# Create tunnel
lt --port 8000

# You'll get a URL like: https://random-name.loca.lt
```

---

### Option 3: Staging/Test Environment ✅ Best for Pre-Production

Deploy to a staging environment with a permanent URL.

#### Quick Deploy Options

**Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Render:**
- Connect GitHub repo
- Set build command: `pip install -r requirements.txt && uvicorn main:app`
- Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Fly.io:**
```bash
fly launch
fly deploy
```

**Configure Agent:**
```bash
# In agent/.env
ACTION_BASE_URL=https://your-staging-url.railway.app/solana/actions
```

**✅ Benefits:**
- Permanent URL (doesn't change)
- Can test full Twitter Blink flow
- Closer to production environment
- Can keep running for extended testing

---

### Option 4: Manual Wallet Testing (Without Twitter)

Test the transaction building and signing flow directly with a wallet.

#### Using Solana Wallet Adapter (Frontend)

1. Add a test page to your frontend:
```typescript
// app/frontend/app/test-blink/page.tsx
'use client'
import { useWallet } from '@solana/wallet-adapter-react'
import { useState } from 'react'

export default function TestBlinkPage() {
  const { publicKey, signTransaction } = useWallet()
  const [result, setResult] = useState<string>('')

  const testBlink = async () => {
    if (!publicKey) {
      setResult('Connect wallet first')
      return
    }

    // 1. Get Action description
    const actionRes = await fetch(
      'http://localhost:8000/solana/actions/join-pool?pool_id=123'
    )
    const action = await actionRes.json()
    console.log('Action:', action)

    // 2. Build transaction
    const txRes = await fetch(
      'http://localhost:8000/solana/actions/join-pool',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: publicKey.toBase58(),
          pool_id: 123
        })
      }
    )
    const { transaction: txB64 } = await txRes.json()

    // 3. Deserialize and sign
    const tx = Transaction.from(Buffer.from(txB64, 'base64'))
    const signed = await signTransaction(tx)

    // 4. Send to network
    // ... (use your Solana connection)
    
    setResult('Transaction signed!')
  }

  return (
    <div>
      <button onClick={testBlink}>Test Blink Flow</button>
      <pre>{result}</pre>
    </div>
  )
}
```

2. Navigate to `/test-blink` in your frontend
3. Connect wallet and click "Test Blink Flow"
4. Verify transaction is built and can be signed

**✅ This verifies:**
- Transaction building works
- Wallet can deserialize transaction
- Transaction can be signed
- All the pieces work together

---

## Testing Checklist

### ✅ Phase 1: Local API Testing (No Deployment Needed)

- [ ] Backend starts without errors
- [ ] GET `/solana/actions/join-pool?pool_id=123` returns valid Action JSON
- [ ] Action JSON has correct structure (`type`, `title`, `description`, `links`)
- [ ] `href` in Action JSON is a full URL (not relative)
- [ ] POST `/solana/actions/join-pool` builds valid transaction
- [ ] Transaction can be deserialized from base64
- [ ] Transaction has correct instruction data

### ✅ Phase 2: Tunnel/Staging Testing (Twitter Testing)

- [ ] Backend accessible via public URL (tunnel or staging)
- [ ] Action endpoint returns correct JSON via public URL
- [ ] Agent configured with `ACTION_BASE_URL` pointing to public URL
- [ ] Agent posts tweet with Blink URL
- [ ] Twitter/X can crawl the URL (check Twitter's link preview)
- [ ] Blink renders as button in Twitter (may take a few minutes)
- [ ] Clicking Blink opens wallet
- [ ] Wallet shows correct transaction details
- [ ] Transaction can be signed and submitted
- [ ] On-chain transaction confirms successfully

### ✅ Phase 3: Production Testing

- [ ] Production backend deployed and accessible
- [ ] `ACTION_BASE_URL` updated in agent config
- [ ] Test tweet posted with production Blink URL
- [ ] Blink works for multiple users
- [ ] Transactions succeed on mainnet/devnet

---

## Troubleshooting

### Issue: Twitter doesn't render Blink as button

**Possible causes:**
1. URL not publicly accessible (localhost won't work)
2. Action JSON format incorrect
3. Twitter hasn't crawled the URL yet (can take 5-10 minutes)
4. Domain not registered with Solana Actions (may not be required)

**Solutions:**
- Verify URL is publicly accessible: `curl https://your-url.com/solana/actions/join-pool?pool_id=123`
- Check Action JSON format matches spec
- Wait a few minutes and check again
- Try posting a new tweet (Twitter may cache old URLs)

### Issue: Wallet doesn't open when clicking Blink

**Possible causes:**
1. Wallet extension not installed
2. Wallet doesn't support Solana Actions
3. Browser blocking wallet connection
4. Action JSON `href` is incorrect

**Solutions:**
- Install Phantom or Backpack wallet
- Enable "Experimental Features" in Phantom settings
- Try different browser (Brave may block)
- Verify `href` in Action JSON is full URL

### Issue: Transaction building fails

**Possible causes:**
1. Pool doesn't exist in database
2. Pool status is not "pending" or "active"
3. Solana RPC connection issue
4. Program ID incorrect

**Solutions:**
- Check database for pool existence
- Verify pool status
- Check `SOLANA_RPC_URL` in backend config
- Verify `PROGRAM_ID` matches deployed program

---

## Quick Test Script

Create `test_action_endpoint.sh`:

```bash
#!/bin/bash

# Test Action endpoint
POOL_ID=123
BASE_URL="${1:-http://localhost:8000}"

echo "Testing Action endpoint at $BASE_URL"
echo ""

# Test GET (Action description)
echo "1. Testing GET endpoint..."
curl -s "$BASE_URL/solana/actions/join-pool?pool_id=$POOL_ID" | jq '.'
echo ""

# Test POST (Transaction building)
echo "2. Testing POST endpoint..."
curl -s -X POST "$BASE_URL/solana/actions/join-pool" \
  -H "Content-Type: application/json" \
  -d "{\"account\": \"11111111111111111111111111111111\", \"pool_id\": $POOL_ID}" | jq '.'
echo ""

echo "✅ Tests complete!"
```

Usage:
```bash
chmod +x test_action_endpoint.sh
./test_action_endpoint.sh                    # Test localhost
./test_action_endpoint.sh https://your-url.com  # Test production
```

---

## Summary

**For Development:**
- ✅ Use **Option 1** (Direct API testing) - Fastest, no setup needed
- ✅ Test transaction building and JSON format

**For Twitter Testing:**
- ✅ Use **Option 2** (ngrok tunnel) - Quick setup, good for one-off tests
- ✅ Or **Option 3** (Staging) - Better for extended testing

**For Production:**
- ✅ Deploy to production URL
- ✅ Update agent config
- ✅ Test with real tweets

The key is: **Twitter needs a publicly accessible URL** to crawl your Action endpoint. Localhost won't work for Blinks in tweets, but you can test everything else locally!

