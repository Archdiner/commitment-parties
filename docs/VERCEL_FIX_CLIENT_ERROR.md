# Fix: Vercel Client-Side Exception

## Problem
Your frontend on Vercel is showing: "Application error: a client-side exception has occurred"

This happens because `NEXT_PUBLIC_API_URL` is not set in Vercel, so the frontend tries to connect to `http://localhost:8000` (which doesn't exist in production).

## Solution: Set Environment Variables in Vercel

### Step 1: Get Your Render Backend URL
1. Go to your Render dashboard
2. Find your backend service
3. Copy the service URL (should look like: `https://your-service-name.onrender.com`)

### Step 2: Add Environment Variables in Vercel
1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add the following variables:

```bash
# Required: Your Render backend URL
NEXT_PUBLIC_API_URL=https://your-service-name.onrender.com

# Solana Configuration (if not already set)
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=your_program_id_here
NEXT_PUBLIC_CLUSTER=devnet
```

**Important**: Replace `https://your-service-name.onrender.com` with your actual Render backend URL!

### Step 3: Redeploy
After adding the environment variables:
1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger auto-deploy

### Step 4: Verify
1. Wait for deployment to complete
2. Visit your Vercel URL
3. Open browser console (F12) and check for errors
4. The API calls should now go to your Render backend instead of localhost

## Quick Check: Is Your Backend Running?

Test your Render backend:
```bash
curl https://your-service-name.onrender.com/health
```

Should return:
```json
{"status":"ok","service":"commitment-agent-backend","version":"1.0.0"}
```

If this fails, your backend might not be running or accessible. Check Render logs.

## Common Issues

### Issue 1: CORS Errors
If you see CORS errors after fixing the API URL:
1. Go to Render dashboard → Your backend service
2. Find `CORS_ORIGINS` environment variable
3. Add your Vercel frontend URL: `https://your-frontend.vercel.app`
4. Redeploy backend

### Issue 2: Backend Not Responding
- Check Render service is running (not sleeping)
- Check Render logs for errors
- Verify `DATABASE_URL` and other env vars are set correctly

### Issue 3: Still Getting Errors
1. Check browser console (F12) for specific error messages
2. Check Vercel deployment logs
3. Verify all environment variables are set correctly
4. Make sure you redeployed after adding env vars

## Environment Variables Checklist

Make sure these are set in Vercel:

- [ ] `NEXT_PUBLIC_API_URL` → Your Render backend URL
- [ ] `NEXT_PUBLIC_SOLANA_RPC` → Solana RPC endpoint
- [ ] `NEXT_PUBLIC_PROGRAM_ID` → Your deployed program ID
- [ ] `NEXT_PUBLIC_CLUSTER` → `devnet` or `mainnet`

And in Render backend:

- [ ] `CORS_ORIGINS` → Your Vercel frontend URL
- [ ] `DATABASE_URL` → Your Supabase database URL
- [ ] `SUPABASE_URL` → Your Supabase project URL
- [ ] `SUPABASE_KEY` → Your Supabase anon key
- [ ] `SOLANA_RPC_URL` → Solana RPC endpoint
- [ ] `PROGRAM_ID` → Your deployed program ID
