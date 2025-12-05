# Fix: Vercel Client-Side Exception

## Problem
Your frontend on Vercel (`commitment-parties.vercel.app`) is showing a client-side exception even though `NEXT_PUBLIC_API_URL` is set.

## Root Causes & Fixes

### Issue 1: CORS Configuration (Most Likely)

Your backend CORS is configured for `https://commitment-agent.vercel.app`, but your frontend is at `https://commitment-parties.vercel.app`.

**Fix:**
1. Go to your Render dashboard → Backend service
2. Go to **Environment** tab
3. Find `CORS_ORIGINS` variable
4. Update it to include your actual Vercel URL:
   ```
   CORS_ORIGINS=https://commitment-parties.vercel.app,http://localhost:3000,http://localhost:3001
   ```
5. Save and wait for Render to redeploy (usually 1-2 minutes)

**Or temporarily allow all origins (for testing only):**
```
CORS_ORIGINS=*
```

### Issue 2: Backend Not Accessible

Test if your backend is actually running:

```bash
curl https://commitment-backend.onrender.com/health
```

**Expected response:**
```json
{"status":"ok","service":"commitment-agent-backend","version":"1.0.0"}
```

**If it fails:**
- Check Render dashboard → Logs for errors
- Verify backend service is running (not sleeping)
- Check if all environment variables are set correctly

### Issue 3: Missing Environment Variables

Verify all required variables are set in Vercel:

**Required in Vercel:**
- ✅ `NEXT_PUBLIC_API_URL` → `https://commitment-backend.onrender.com`
- ✅ `NEXT_PUBLIC_SOLANA_RPC` → `https://api.devnet.solana.com`
- ✅ `NEXT_PUBLIC_PROGRAM_ID` → Your program ID
- ✅ `NEXT_PUBLIC_CLUSTER` → `devnet` or `mainnet-beta`

**To check in Vercel:**
1. Go to your project → Settings → Environment Variables
2. Verify all `NEXT_PUBLIC_*` variables are set
3. Make sure they're set for **Production** environment

### Issue 4: Backend URL Truncated

The image shows `NEXT_PUBLIC_API_URL` as `https://commitment-backend.onrende...` - make sure the full URL is:
```
https://commitment-backend.onrender.com
```

(No trailing slash, complete URL)

## Step-by-Step Fix

### Step 1: Verify Backend is Running
```bash
curl https://commitment-backend.onrender.com/health
```

If this works, proceed to Step 2. If not, check Render logs.

### Step 2: Update CORS in Render
1. Render dashboard → Your backend service
2. Environment tab
3. Update `CORS_ORIGINS`:
   ```
   https://commitment-parties.vercel.app,http://localhost:3000,http://localhost:3001
   ```
4. Save (auto-redeploys)

### Step 3: Verify Vercel Environment Variables
1. Vercel dashboard → Your project → Settings → Environment Variables
2. Check `NEXT_PUBLIC_API_URL` is exactly:
   ```
   https://commitment-backend.onrender.com
   ```
3. Verify all other `NEXT_PUBLIC_*` variables are set

### Step 4: Redeploy Frontend
1. Vercel dashboard → Deployments
2. Click "..." on latest deployment → Redeploy
3. Or push a commit to trigger auto-deploy

### Step 5: Test
1. Open browser console (F12)
2. Visit `https://commitment-parties.vercel.app`
3. Check console for errors
4. Look for CORS errors or network errors

## Debugging in Browser Console

Open browser console (F12) and check:

1. **Network Tab:**
   - Look for failed requests to `https://commitment-backend.onrender.com`
   - Check if they're blocked by CORS (you'll see CORS error)
   - Check if they're 404/500 errors

2. **Console Tab:**
   - Look for JavaScript errors
   - Check if environment variables are undefined
   - Look for API errors

3. **Common Errors:**

   **CORS Error:**
   ```
   Access to fetch at 'https://commitment-backend.onrender.com/...' from origin 'https://commitment-parties.vercel.app' has been blocked by CORS policy
   ```
   → Fix: Update `CORS_ORIGINS` in Render

   **Network Error:**
   ```
   Failed to fetch
   NetworkError when attempting to fetch resource
   ```
   → Fix: Check if backend is running, check URL is correct

   **404 Error:**
   ```
   404 Not Found
   ```
   → Fix: Check backend URL is correct, check endpoint exists

## Quick Test Script

Test your setup:

```bash
# 1. Test backend health
curl https://commitment-backend.onrender.com/health

# 2. Test CORS (should include your Vercel URL in response headers)
curl -H "Origin: https://commitment-parties.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://commitment-backend.onrender.com/health

# 3. Test API endpoint
curl https://commitment-backend.onrender.com/api/pools
```

## Still Not Working?

1. **Check Render Logs:**
   - Render dashboard → Your service → Logs
   - Look for startup errors, database connection errors, etc.

2. **Check Vercel Build Logs:**
   - Vercel dashboard → Your deployment → Build Logs
   - Look for build errors or missing environment variables

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Check Console and Network tabs
   - Share specific error messages

4. **Verify Environment Variables:**
   - In Vercel, make sure variables are set for **Production**
   - Variables must start with `NEXT_PUBLIC_` to be available in browser
   - Redeploy after adding/changing variables

## Most Common Fix

**90% of the time, it's CORS.** Update `CORS_ORIGINS` in Render to include your Vercel URL:

```
CORS_ORIGINS=https://commitment-parties.vercel.app,http://localhost:3000
```

Then redeploy both backend (Render) and frontend (Vercel).
