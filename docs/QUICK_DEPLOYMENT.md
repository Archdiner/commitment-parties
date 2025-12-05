# Quick Deployment Guide - Backend on Render ✅

Your backend is live at: `https://commitment-backend.onrender.com`

## Step 1: Update Backend CORS (Important!)

Your backend needs to allow requests from your Vercel frontend.

1. Go to Render dashboard → Your backend service
2. Go to **Environment** tab
3. Find `CORS_ORIGINS` variable
4. Update it to include your Vercel URL (you'll get this after deploying frontend):
   ```
   CORS_ORIGINS=https://your-frontend.vercel.app,https://commitment-backend.onrender.com
   ```
5. Or for development, you can temporarily set:
   ```
   CORS_ORIGINS=*
   ```
6. Render will automatically redeploy when you save

## Step 2: Deploy Frontend to Vercel

### Option A: Simple Deployment (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/Login** with GitHub
3. **Click "Add New Project"**
4. **Import** your `commitment-parties` repository
5. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `app/frontend` ⭐ **IMPORTANT**
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

6. **Set Environment Variables** (click "Environment Variables"):
   ```bash
   NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
   NEXT_PUBLIC_PROGRAM_ID=your_program_id_here
   NEXT_PUBLIC_CLUSTER=devnet
   NEXT_PUBLIC_API_URL=https://commitment-backend.onrender.com
   ```
   ⭐ **Set `NEXT_PUBLIC_API_URL` to your Render backend URL!**

7. **Click "Deploy"**
8. **Wait 2-3 minutes** for build to complete
9. **Copy your Vercel URL**: `https://your-project.vercel.app`

10. **Update Backend CORS** (go back to Render):
    - Update `CORS_ORIGINS` to include your Vercel URL:
    ```
    CORS_ORIGINS=https://your-project.vercel.app,https://commitment-backend.onrender.com
    ```

### Option B: Using Vercel CLI

```bash
cd app/frontend
npm install -g vercel
vercel
# Follow prompts, set root directory to current directory
# Set environment variables when prompted
```

## Step 3: Deploy Agent (Separate Service)

The agent needs to run 24/7, so deploy it separately on Render or Railway.

### Option A: Render (Easiest - Same Platform as Backend)

1. **Go to Render dashboard**
2. **Click "New +"** → **"Background Worker"**
3. **Connect GitHub** (if not already)
4. **Select** your `commitment-parties` repository
5. **Configure**:
   - **Name**: `commitment-agent`
   - **Root Directory**: `agent`
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python src/main.py`

6. **Set Environment Variables**:
   ```bash
   # Solana
   SOLANA_RPC_URL=https://api.devnet.solana.com
   PROGRAM_ID=your_program_id_here
   
   # Agent Wallet (choose one method)
   # Method 1: Private key (easier for hackathon)
   AGENT_PRIVATE_KEY=your_private_key_base58
   # Method 2: Keypair file (more secure)
   # Upload keypair.json file in Render secrets
   # AGENT_KEYPAIR_PATH=/app/keypair.json
   
   # Database
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   SUPABASE_URL=https://[PROJECT].supabase.co
   SUPABASE_KEY=your_supabase_anon_key
   
   # URLs
   ACTION_BASE_URL=https://commitment-backend.onrender.com
   APP_BASE_URL=https://your-frontend.vercel.app
   
   # Environment
   ENVIRONMENT=production
   DEBUG=false
   
   # Twitter (optional)
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret
   TWITTER_ACCESS_TOKEN=your_twitter_access_token
   TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
   
   # OpenAI (optional)
   OPENAI_API_KEY=your_openai_api_key
   ```

7. **Choose Plan**:
   - **Free**: Spins down after 15min (not good for 24/7 agent)
   - **Starter ($7/month)**: Always-on, recommended

8. **Click "Create Background Worker"**
9. **Check logs** to verify it's running

### Option B: Railway (Alternative)

1. **Go to [railway.app](https://railway.app)**
2. **New Project** → **Deploy from GitHub repo**
3. **Add Service** → **Background Worker**
4. **Set Root Directory**: `agent`
5. **Set Environment Variables** (same as above)
6. **Deploy**

## Quick Checklist

### Backend (Render) ✅
- [x] Deployed at: `https://commitment-backend.onrender.com`
- [ ] CORS_ORIGINS updated with Vercel URL
- [ ] All environment variables set

### Frontend (Vercel)
- [ ] Deployed to Vercel
- [ ] Root Directory set to: `app/frontend`
- [ ] Environment variables set:
  - [ ] `NEXT_PUBLIC_API_URL=https://commitment-backend.onrender.com`
  - [ ] `NEXT_PUBLIC_SOLANA_RPC`
  - [ ] `NEXT_PUBLIC_PROGRAM_ID`
  - [ ] `NEXT_PUBLIC_CLUSTER`

### Agent (Render/Railway)
- [ ] Background Worker created
- [ ] Root Directory: `agent`
- [ ] All environment variables set
- [ ] Agent wallet configured
- [ ] Logs show agent is running

## Testing After Deployment

1. **Frontend**: Open `https://your-project.vercel.app`
2. **Backend Health**: `https://commitment-backend.onrender.com/health`
3. **Backend API Docs**: `https://commitment-backend.onrender.com/docs`
4. **Test API Call**: Frontend should be able to fetch pools from backend

## Troubleshooting

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Check backend CORS settings include your Vercel URL
- Check browser console for CORS errors

### Agent not running
- Check Render/Railway logs
- Verify all environment variables are set
- Check agent wallet is configured correctly
- Verify database connection

### Backend errors
- Check Render logs
- Verify all environment variables
- Test backend directly: `curl https://commitment-backend.onrender.com/health`

## Cost Summary

**Free Tier (Hackathon)**:
- Render Backend: Free (spins down after 15min idle)
- Render Agent: Free (spins down after 15min idle) ⚠️ Not good for 24/7
- Vercel Frontend: Free ✅

**Recommended for Production**:
- Render Backend: Starter $7/month (always-on)
- Render Agent: Starter $7/month (always-on)
- Vercel Frontend: Free or Pro $20/month

**Total**: ~$14-20/month for always-on services

