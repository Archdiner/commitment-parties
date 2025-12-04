# Hackathon: Deploy Everything on Vercel (Quick Setup)

## Why This Works for Hackathons

✅ **One platform** - Frontend + Backend on Vercel  
✅ **Zero config** - Just connect GitHub and deploy  
✅ **Auto-deploy** - Every push automatically deploys  
✅ **Fast setup** - 5 minutes to deployed  

## Quick Setup (5 Minutes)

### Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your `commitment-parties` repository

### Step 2: Configure Project

Vercel should auto-detect Next.js. Just verify:

- **Framework Preset**: Next.js ✅
- **Root Directory**: `app/frontend` ✅
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)

### Step 3: Set Environment Variables

Go to **Environment Variables** and add:

```bash
# Frontend (Next.js)
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=your_program_id
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_API_URL=https://your-project.vercel.app

# Backend (FastAPI) - These are used by the serverless function
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_KEY=your_supabase_anon_key
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=your_program_id
CORS_ORIGINS=https://your-project.vercel.app
ENVIRONMENT=production
DEBUG=false
```

**Important**: Set `NEXT_PUBLIC_API_URL` to your Vercel URL (you'll get this after first deploy)

### Step 4: Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Your app is live! 🎉

### Step 5: Update API URL

After first deploy:
1. Copy your Vercel URL: `https://your-project.vercel.app`
2. Go to **Settings** → **Environment Variables**
3. Update `NEXT_PUBLIC_API_URL` to: `https://your-project.vercel.app`
4. Redeploy (or wait for next push)

## How It Works

- **Frontend**: Next.js app in `app/frontend/` → Deployed as Next.js
- **Backend**: FastAPI in `backend/` → Wrapped as serverless function in `api/backend.py`
- **Routes**: All `/api/*` and `/solana/*` requests → Routed to FastAPI backend

## File Structure

```
commitment-parties/
├── app/frontend/          # Next.js frontend (auto-detected)
├── backend/               # FastAPI backend
├── api/
│   ├── backend.py        # Serverless wrapper (NEW)
│   └── requirements.txt  # Python deps for Vercel (NEW)
├── vercel.json           # Vercel config (NEW)
└── agent/                # Deploy separately (needs 24/7)
```

## Deploy Agent Separately

The agent still needs to run 24/7, so deploy it separately:

**Option 1: Railway (Easiest)**
1. Go to [railway.app](https://railway.app)
2. New Project → GitHub Repo
3. Add Service → Root Directory: `agent`
4. Set environment variables
5. Done!

**Option 2: Render**
1. Go to [render.com](https://render.com)
2. New → Background Worker
3. Connect repo, set root: `agent`
4. Done!

## Testing

After deployment:

1. **Frontend**: `https://your-project.vercel.app`
2. **Backend API**: `https://your-project.vercel.app/api/pools`
3. **API Docs**: `https://your-project.vercel.app/docs`
4. **Health**: `https://your-project.vercel.app/health`

## Potential Issues & Quick Fixes

### Issue: Timeout on Solana Operations

**Symptom**: Some API calls take >10 seconds and fail

**Fix**: 
- Upgrade to Vercel Pro ($20/month) for 60s timeouts
- OR: Move slow endpoints to a separate service (Railway/Render)
- OR: Optimize Solana operations (use async, batch requests)

### Issue: Cold Starts

**Symptom**: First request after inactivity is slow (2-5 seconds)

**Fix**:
- This is normal for serverless
- Keep a health check endpoint pinged regularly
- Or upgrade to Vercel Pro (better cold start performance)

### Issue: Import Errors

**Symptom**: `ModuleNotFoundError` in serverless function

**Fix**:
- Make sure all dependencies are in `api/requirements.txt`
- Check that `backend/` imports work (they should, we added it to path)

## Hackathon Tips

1. **Start Simple**: Get it working first, optimize later
2. **Use Free Tier**: Vercel free tier is generous for hackathons
3. **Monitor Logs**: Check Vercel dashboard for errors
4. **Test Early**: Deploy as soon as you have basic functionality
5. **Agent Later**: Deploy agent after frontend/backend is working

## Cost

**Free Tier** (Perfect for Hackathons):
- ✅ Frontend: Unlimited
- ✅ Backend API: 100GB bandwidth/month
- ✅ Serverless Functions: 100GB-hours/month
- ⚠️ Function timeout: 10 seconds

**If You Need More**:
- Pro: $20/month (60s timeouts, better performance)

## Next Steps After Hackathon

If you continue the project:
1. Consider moving backend to Railway/Render for better performance
2. Keep frontend on Vercel (it's perfect there)
3. Optimize Solana operations to avoid timeouts

But for the hackathon, this setup is perfect! 🚀

