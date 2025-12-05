# Fix: "Failed to fetch" When Creating Challenge

## The Problem

When clicking "Create Challenge", you see:
- Error: `Failed to fetch`
- Status: `Unknown`
- The request fails before getting a response

## Root Causes

### 1. Backend Cold Start (Most Likely)

Render free tier spins down after 15 minutes. The first request takes 20-30 seconds to wake up, causing timeouts.

**Symptoms:**
- Error happens immediately or after ~30 seconds
- Backend health check works but takes 20+ seconds
- Works fine after first successful request

**Fix:**
- Set up keep-alive service (see `RENDER_COLD_START_FIX.md`)
- Or upgrade to Render Starter plan ($7/month)

### 2. CORS Not Configured

Backend doesn't allow requests from your Vercel frontend.

**Symptoms:**
- Error in browser console: "CORS policy blocked"
- Network tab shows CORS error

**Fix:**
1. Render dashboard → Backend service → Environment
2. Update `CORS_ORIGINS`:
   ```
   https://commitment-parties.vercel.app,http://localhost:3000
   ```
3. Save and wait for redeploy

### 3. Backend Not Running

Backend service crashed or not deployed.

**Check:**
```bash
curl https://commitment-backend.onrender.com/health
```

**If it fails:**
- Check Render logs for errors
- Verify all environment variables are set
- Check database connection

### 4. Network/Timeout Issues

Request times out before backend responds.

**Fix:**
- Already implemented: Retry logic with 30s timeout, up to 2 retries
- If still failing, backend might be taking > 45 seconds (unlikely)

## Quick Diagnosis

### Step 1: Check Backend Health
```bash
curl https://commitment-backend.onrender.com/health
```

**Expected:** `{"status":"ok",...}` in < 2 seconds  
**If 20+ seconds:** Cold start issue - set up keep-alive  
**If fails:** Backend not running - check Render logs

### Step 2: Check Browser Console

Open DevTools (F12) → Console tab, look for:

**CORS Error:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
→ Fix: Update `CORS_ORIGINS` in Render

**Network Error:**
```
Failed to fetch
NetworkError when attempting to fetch resource
```
→ Could be cold start, network issue, or backend down

**Timeout Error:**
```
Request timeout after 30000ms
```
→ Backend is waking up, retry logic should handle this

### Step 3: Check Network Tab

DevTools → Network tab → Look for request to `/solana/actions/create-pool`:

**Status: (failed) or (pending)**
- Backend not responding
- Check if backend is running

**Status: CORS error**
- Update CORS configuration

**Status: 500**
- Backend error - check Render logs

**Status: 400**
- Invalid request - check request payload

## Solutions

### Immediate Fix: Set Up Keep-Alive

**Option 1: GitHub Actions (Free)**
1. The workflow is already created: `.github/workflows/keep-backend-awake.yml`
2. Commit and push it
3. GitHub will ping backend every 5 minutes automatically

**Option 2: UptimeRobot (Free)**
1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: `https://commitment-backend.onrender.com/health`
3. Set interval: 5 minutes

### Fix CORS

1. Render dashboard → Backend service
2. Environment tab → `CORS_ORIGINS`
3. Set to: `https://commitment-parties.vercel.app,http://localhost:3000`
4. Save (auto-redeploys)

### Upgrade Render Plan

For production, upgrade to Starter plan ($7/month):
- No cold starts
- Always-on service
- Better reliability

## Testing After Fix

1. **Wait 15+ minutes** (let backend sleep)
2. **Try creating a challenge**
3. **Should work** (retry logic handles cold start)

If still failing:
1. Check browser console for specific error
2. Check Render logs for backend errors
3. Verify `NEXT_PUBLIC_API_URL` is correct in Vercel

## Common Error Messages

### "Failed to fetch"
- **Cause:** Network error, timeout, or CORS
- **Fix:** Check backend is running, update CORS, set up keep-alive

### "Backend is taking too long to respond"
- **Cause:** Backend cold start taking > 45 seconds
- **Fix:** Set up keep-alive service

### "CORS policy blocked"
- **Cause:** Backend CORS not configured for your frontend URL
- **Fix:** Update `CORS_ORIGINS` in Render

### "Pool not found" or other API errors
- **Cause:** Backend is working but request/response issue
- **Fix:** Check request payload, check backend logs

## Next Steps

1. ✅ **Set up keep-alive** (GitHub Actions or UptimeRobot)
2. ✅ **Verify CORS** is configured correctly
3. ✅ **Test** creating a challenge
4. ⚠️ **If still failing**, check browser console and Render logs for specific errors
