# Fix: Render Cold Start (20+ Second Delays)

## The Problem

Your backend on Render's **free tier** spins down after 15 minutes of inactivity. When it receives a request, it takes **20-30 seconds** to "wake up" (cold start). This causes:

1. **Frontend timeouts** - Requests fail before backend responds
2. **Poor user experience** - Users see errors on first load
3. **Client-side exceptions** - Frontend crashes waiting for backend

## Solutions

### Solution 1: Keep Backend Awake (Free - Recommended)

Use a free uptime monitoring service to ping your backend every 5-10 minutes:

**Option A: UptimeRobot (Free)**
1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add a new monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://commitment-backend.onrender.com/health`
   - **Interval**: 5 minutes
3. This will ping your backend every 5 minutes, keeping it awake

**Option B: cron-job.org (Free)**
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create a new cron job:
   - **URL**: `https://commitment-backend.onrender.com/health`
   - **Schedule**: Every 5 minutes (`*/5 * * * *`)
3. Save and activate

**Option C: GitHub Actions (Free)**
Create `.github/workflows/keep-backend-awake.yml`:
```yaml
name: Keep Backend Awake

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Backend
        run: |
          curl -f https://commitment-backend.onrender.com/health || exit 1
```

### Solution 2: Upgrade to Render Paid Tier ($7/month)

Render's **Starter** plan keeps services always-on:
- No cold starts
- Instant responses
- Better for production

**To upgrade:**
1. Render dashboard → Your service
2. Click **"Upgrade"** or **"Change Plan"**
3. Select **Starter** plan ($7/month)
4. Service stays awake 24/7

### Solution 3: Frontend Retry Logic (Already Implemented)

The frontend now has automatic retry logic:
- First attempt: 30 second timeout
- Retries: Up to 2 retries with 45 second timeout
- Exponential backoff between retries

This helps handle cold starts, but users still experience delays.

## Recommended Approach

**For Development/Testing:**
- Use **UptimeRobot** (free) to keep backend awake
- This prevents cold starts without cost

**For Production:**
- Upgrade to **Render Starter** ($7/month)
- Or use **UptimeRobot** + frontend retry logic
- Consider moving to Railway (better free tier) or Fly.io

## Testing

After setting up a keep-alive service:

1. Wait 15+ minutes (let backend sleep)
2. Test: `curl https://commitment-backend.onrender.com/health`
3. Should respond in < 2 seconds (not 20+ seconds)

## Alternative: Move to Railway

Railway has a better free tier:
- Services stay awake longer
- Faster cold starts (~5 seconds vs 20+)
- Better developer experience

**To migrate:**
1. See `docs/DEPLOYMENT_GUIDE.md` → Railway section
2. Deploy backend to Railway
3. Update `NEXT_PUBLIC_API_URL` in Vercel
4. Update `CORS_ORIGINS` in backend

## Current Status

✅ **Backend is working** - Health check returns OK  
⚠️ **Cold start delay** - Takes 20 seconds after inactivity  
✅ **Frontend retry logic** - Added to handle cold starts  
🔧 **Action needed** - Set up keep-alive service or upgrade plan
