# Render Setup Guide - Step by Step

## Quick Answer: Dockerfile Path

**If Render asks for Dockerfile path:**

- **Option 1 (Recommended)**: Use **Python Runtime** instead of Docker
  - Set **Runtime** to: `Python 3`
  - Leave Dockerfile path **empty** or ignore it
  - This is simpler and works perfectly!

- **Option 2**: If you want to use Docker
  - Set **Root Directory** to: `backend`
  - Set **Dockerfile Path** to: `Dockerfile` (just `Dockerfile`, not `backend/Dockerfile`)
  - This tells Render: "The Dockerfile is in the backend folder, and it's called Dockerfile"

## Step-by-Step Render Setup

### Step 1: Sign Up
1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended)

### Step 2: Create Web Service
1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Connect GitHub if prompted
4. Select your `commitment-parties` repository

### Step 3: Configure Settings

Fill in these fields:

**Name**: `commitment-backend` (or whatever you want)

**Region**: Choose closest to you (e.g., `Oregon (US West)`)

**Branch**: `main` (or your default branch)

**Root Directory**: `backend` ⭐ **THIS IS IMPORTANT!**

**Runtime**: Select **"Python 3"** (NOT Docker)

**Build Command**: `pip install -r requirements.txt`

**Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Dockerfile Path**: Leave this **EMPTY** (since you're using Python runtime)

### Step 4: Set Environment Variables

Scroll down to **"Environment Variables"** section and click **"Add Environment Variable"** for each:

```
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=your_program_id_from_step_1
CORS_ORIGINS=https://your-frontend.vercel.app
```

(Add all the other variables from the deployment guide)

### Step 5: Choose Plan

- **Free**: Spins down after 15min idle (not good for API)
- **Starter ($7/month)**: Always-on, recommended

### Step 6: Deploy

1. Click **"Create Web Service"** at the bottom
2. Watch the build logs
3. Wait for "Your service is live" message
4. Your URL will be: `https://commitment-backend.onrender.com`

## What is Dockerfile Path?

The Dockerfile path tells Render where to find your Dockerfile (if you're using Docker).

- If **Root Directory** = `backend` and Dockerfile is in `backend/Dockerfile`
  - Then **Dockerfile Path** = `Dockerfile` (relative to the root directory)

- If **Root Directory** = `/` (root) and Dockerfile is in `backend/Dockerfile`
  - Then **Dockerfile Path** = `backend/Dockerfile`

**But you don't need Docker!** Just use Python runtime - it's much simpler.

## Troubleshooting

**Build fails?**
- Make sure Root Directory is set to `backend`
- Check that `requirements.txt` exists in `backend/` folder
- Verify Build Command is: `pip install -r requirements.txt`

**Service won't start?**
- Check Start Command is: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Verify all environment variables are set
- Check the logs in Render dashboard

**Can't find Root Directory setting?**
- It's in the service creation form, under "Advanced" or in the main settings
- If you already created the service, go to Settings → scroll down to find it

