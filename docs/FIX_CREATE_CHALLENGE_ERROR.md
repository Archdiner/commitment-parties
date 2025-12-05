# Fix: "Failed to fetch" Error When Creating Challenge

## Problem
When clicking "Create Challenge" on your deployed frontend (`https://commitment-parties.vercel.app`), you see:
- **Error:** `Failed to fetch`
- **Status:** `Unknown`
- The request fails before getting a response from the backend

## Root Cause: CORS Configuration Mismatch

The backend's CORS configuration doesn't include your actual Vercel frontend URL. The backend is configured to allow requests from `https://commitment-agent.vercel.app`, but your frontend is deployed at `https://commitment-parties.vercel.app`.

When the browser tries to make a request from `commitment-parties.vercel.app` to your backend, the backend rejects it due to CORS policy, causing "Failed to fetch" with no HTTP status code (hence "Unknown").

## Solution: Update CORS in Render Dashboard

Since your backend is deployed on Render, you need to update the `CORS_ORIGINS` environment variable there. The code has been updated, but Render uses environment variables which override the code defaults.

### Step 1: Update CORS in Render

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Navigate to your backend service

2. **Open Environment Tab**
   - Click on your backend service
   - Go to **Environment** tab (in the left sidebar)

3. **Update CORS_ORIGINS**
   - Find the `CORS_ORIGINS` environment variable
   - Update it to include your actual Vercel URL:
   ```
   https://commitment-parties.vercel.app,http://localhost:3000,http://localhost:3001
   ```
   - Or if you want to keep the old one too:
   ```
   https://commitment-parties.vercel.app,https://commitment-agent.vercel.app,http://localhost:3000,http://localhost:3001
   ```

4. **Save Changes**
   - Click "Save Changes"
   - Render will automatically redeploy (takes 1-2 minutes)

### Step 2: Verify Backend is Running

While waiting for redeploy, verify your backend is accessible:

```bash
curl https://commitment-backend.onrender.com/health
```

**Expected response:**
```json
{"status":"ok","service":"commitment-agent-backend","version":"1.0.0"}
```

**If it takes 20+ seconds:** Backend is waking up from sleep (Render free tier). This is normal for the first request.

**If it fails:** Check Render logs for errors.

### Step 3: Verify Vercel Environment Variables

Make sure your frontend has the correct backend URL:

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Navigate to your project

2. **Check Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Verify `NEXT_PUBLIC_API_URL` is set to:
   ```
   https://commitment-backend.onrender.com
   ```
   - Make sure it's set for **Production** environment
   - No trailing slash!

3. **Redeploy if Needed**
   - If you changed the variable, redeploy:
   - Go to **Deployments** → Click "..." on latest → **Redeploy**

### Step 4: Test

1. **Wait for Render redeploy** (1-2 minutes)
2. **Visit your frontend:** `https://commitment-parties.vercel.app/create`
3. **Try creating a challenge**
4. **Check browser console** (F12) if it still fails

## Additional Checks

### Check Browser Console

Open DevTools (F12) → Console tab, look for:

**CORS Error (most likely):**
```
Access to fetch at 'https://commitment-backend.onrender.com/...' from origin 'https://commitment-parties.vercel.app' has been blocked by CORS policy
```
→ **Fix:** Update `CORS_ORIGINS` in Render (Step 1)

**Network Error:**
```
Failed to fetch
NetworkError when attempting to fetch resource
```
→ Could be:
- Backend not running (check Render logs)
- Backend cold start (wait 30 seconds and retry)
- Wrong API URL (check Vercel env vars)

**Timeout Error:**
```
Request timeout after 30000ms
```
→ Backend is waking up from sleep. The retry logic should handle this, but if it persists, set up a keep-alive service.

### Check Network Tab

DevTools (F12) → Network tab → Look for request to `/solana/actions/create-pool`:

- **Status: (failed) or (pending)**
  - Backend not responding
  - Check if backend is running in Render

- **Status: CORS error**
  - Update CORS configuration (Step 1)

- **Status: 500**
  - Backend error - check Render logs

- **Status: 400**
  - Invalid request - check request payload in Network tab

## Quick Test Script

Test your setup from command line:

```bash
# 1. Test backend health
curl https://commitment-backend.onrender.com/health

# 2. Test CORS (should include your Vercel URL in response headers)
curl -H "Origin: https://commitment-parties.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://commitment-backend.onrender.com/solana/actions/create-pool \
     -v

# Look for: "access-control-allow-origin: https://commitment-parties.vercel.app"
```

## Common Issues

### Issue 1: Backend Cold Start (Render Free Tier)

Render free tier spins down after 15 minutes of inactivity. The first request takes 20-30 seconds.

**Symptoms:**
- First request fails or times out
- Subsequent requests work fine
- Health check takes 20+ seconds

**Fix:**
- Set up keep-alive service (see `RENDER_COLD_START_FIX.md`)
- Or upgrade to Render Starter plan ($7/month) for always-on service

### Issue 2: Wrong API URL in Vercel

Frontend is trying to connect to wrong backend URL.

**Check:**
- Vercel dashboard → Settings → Environment Variables
- `NEXT_PUBLIC_API_URL` should be: `https://commitment-backend.onrender.com`
- No trailing slash!

### Issue 3: Backend Not Running

Backend service crashed or not deployed.

**Check:**
- Render dashboard → Your service → Logs
- Look for startup errors, database connection errors, etc.

## Summary

**Most likely fix (90% of cases):**
1. Update `CORS_ORIGINS` in Render to include `https://commitment-parties.vercel.app`
2. Wait for redeploy (1-2 minutes)
3. Try creating challenge again

**If still failing:**
1. Check browser console for specific error
2. Check Render logs for backend errors
3. Verify `NEXT_PUBLIC_API_URL` is correct in Vercel
4. Test backend health endpoint

## Code Changes Made

The code has been updated to:
1. ✅ Include `https://commitment-parties.vercel.app` in default CORS configuration
2. ✅ Improve error messages to detect CORS errors
3. ✅ Better error logging for debugging

However, **you still need to update the environment variable in Render** because environment variables override code defaults.
