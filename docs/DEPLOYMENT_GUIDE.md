# Complete Deployment Guide - Commitment Parties

This guide provides step-by-step instructions for deploying all components of the Commitment Parties system to production.

## System Components Overview

Your system consists of **4 main components** that need to be deployed:

1. **Smart Contracts** (Anchor/Rust) - Solana blockchain program
2. **Backend API** (FastAPI/Python) - REST API and Solana Actions endpoints
3. **AI Agent** (Python) - 24/7 monitoring and automation service
4. **Frontend** (Next.js/TypeScript) - User-facing web application

**Additional Infrastructure:**
- **Database** - Supabase (PostgreSQL) - Managed service
- **Blockchain** - Solana devnet/mainnet - Public blockchain

---

## Prerequisites

Before starting deployment, ensure you have:

- [ ] GitHub repository with your code
- [ ] Supabase account and project created
- [ ] Solana wallet with sufficient SOL for deployment (~5-10 SOL for devnet, more for mainnet)
- [ ] Domain name (optional, for production)
- [ ] Twitter Developer account (optional, for social features)
- [ ] OpenAI API key (optional, for AI features)

---

## Deployment Order

Deploy components in this order:

1. **Smart Contracts** → Get PROGRAM_ID
2. **Database Setup** → Get connection strings
3. **Backend API** → Get API URL
4. **Frontend** → Connect to backend
5. **AI Agent** → Connect to everything

---

## Step 1: Deploy Smart Contracts

### 1.1 Prepare Deployment Environment

```bash
# Navigate to program directory
cd programs/commitment-pool

# Ensure Anchor is installed
anchor --version

# Ensure Solana CLI is configured
solana config get

# Set to devnet (or mainnet for production)
solana config set --url https://api.devnet.solana.com

# Check wallet balance
solana balance

# Airdrop if needed (devnet only)
solana airdrop 2
```

### 1.2 Build and Deploy

**Option A: Using the deployment script**

```bash
cd programs/commitment-pool
chmod +x ../../scripts/deploy.sh
../../scripts/deploy.sh
```

**Option B: Manual deployment**

```bash
cd programs/commitment-pool

# Build the program
anchor build

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/commitment_pool-keypair.json)
echo "Program ID: $PROGRAM_ID"

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Or deploy to mainnet (production)
# anchor deploy --provider.cluster mainnet
```

### 1.3 Verify Deployment

```bash
# Get your program ID
PROGRAM_ID=$(solana address -k target/deploy/commitment_pool-keypair.json)

# View on Solscan
# Devnet: https://solscan.io/account/$PROGRAM_ID?cluster=devnet
# Mainnet: https://solscan.io/account/$PROGRAM_ID

# Test the program
anchor test
```

### 1.4 Update Program ID

After deployment, update the program ID in your source code:

```bash
# Update src/lib.rs
# Change: declare_id!("old_program_id");
# To: declare_id!("$PROGRAM_ID");
```

**Save the PROGRAM_ID** - you'll need it for all other components!

---

## Step 2: Setup Database (Supabase)

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: commitment-parties
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to your users
5. Wait 2-3 minutes for provisioning

### 2.2 Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open `backend/sql/schema.sql` from your project
4. Copy and paste the entire schema
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify tables were created in **Table Editor**

### 2.3 Get Connection Details

1. Go to **Project Settings** → **Database**
2. Copy the following:
   - **Connection string** (URI format)
   - **Connection pooler** (for serverless)
3. Go to **Project Settings** → **API**
4. Copy:
   - **Project URL** (SUPABASE_URL)
   - **anon public** key (SUPABASE_KEY)

**Save these values** - you'll need them for backend and agent!

---

## Step 3: Deploy Backend API

The backend needs to be accessible 24/7 and handle HTTP requests. Below is a comprehensive comparison of deployment options to help you choose the best fit.

### Backend Deployment Platform Comparison

| Platform | GitHub Auto-Deploy | Ease of Setup | Free Tier | Pricing (Paid) | Best For |
|----------|-------------------|---------------|-----------|----------------|----------|
| **Railway** | ✅ Native (automatic) | ⭐⭐⭐⭐⭐ Very Easy | $5 credit/month | Usage-based (~$5-20/month) | **Recommended** - Simplest setup, great DX |
| **Render** | ✅ Native (automatic) | ⭐⭐⭐⭐⭐ Very Easy | Free tier (spins down after 15min idle) | $7/month (Starter) | Good free tier, reliable |
| **Fly.io** | ⚠️ Via GitHub Actions | ⭐⭐⭐ Moderate | 3 shared VMs free | ~$2-5/month per VM | Global edge, Docker-based |
| **Heroku** | ✅ Native (automatic) | ⭐⭐⭐⭐ Easy | No free tier | $7/month (Eco) | Classic, mature platform |
| **VPS** | ❌ Manual setup | ⭐⭐ Complex | N/A | $5-12/month | Full control, requires DevOps |

#### Detailed Comparison

**Railway** ⭐ **RECOMMENDED**
- ✅ **GitHub Integration**: Native, automatic deployments on every push
- ✅ **Ease of Use**: Zero-config Python detection, intuitive UI
- ✅ **Setup Time**: ~5 minutes from signup to deployed
- ✅ **Features**: Built-in database provisioning, team collaboration, great logs
- ✅ **Pricing**: $5 free credit/month, then usage-based (very reasonable)
- ✅ **Reliability**: Excellent uptime, automatic SSL, zero-downtime deploys
- ⚠️ **Limitations**: Free tier limited, but paid tier is affordable

**Render**
- ✅ **GitHub Integration**: Native, automatic deployments
- ✅ **Ease of Use**: Zero-config, similar to Railway
- ✅ **Free Tier**: Generous free tier (spins down after 15min idle - not ideal for 24/7)
- ✅ **Pricing**: $7/month for always-on service
- ⚠️ **Limitations**: Free tier spins down, slower cold starts

**Fly.io**
- ⚠️ **GitHub Integration**: Requires GitHub Actions setup (not native)
- ⚠️ **Ease of Use**: Requires CLI, Docker knowledge, more configuration
- ✅ **Features**: Global edge deployment, excellent for low-latency
- ✅ **Pricing**: Generous free tier (3 shared VMs)
- ⚠️ **Limitations**: More complex setup, requires Docker knowledge

**Heroku**
- ✅ **GitHub Integration**: Native, automatic deployments
- ✅ **Ease of Use**: Very easy, classic platform
- ❌ **Free Tier**: Removed in 2022
- ⚠️ **Pricing**: $7/month minimum (Eco dyno)
- ✅ **Features**: Mature, extensive add-ons, great documentation

**VPS (DigitalOcean, AWS, etc.)**
- ❌ **GitHub Integration**: Manual setup required (webhooks, scripts)
- ❌ **Ease of Use**: Requires DevOps knowledge, server management
- ✅ **Control**: Full control over environment
- ✅ **Pricing**: $5-12/month for basic VPS
- ⚠️ **Limitations**: You manage everything (updates, security, monitoring)

### Recommendation: Railway

**Why Railway is the best choice for your needs:**

1. **Easiest GitHub Integration**: Connect repo → auto-deploys on every push (zero config)
2. **Fastest Setup**: 5 minutes from signup to deployed backend
3. **Perfect for Python/FastAPI**: Auto-detects Python, handles dependencies automatically
4. **Great Developer Experience**: Intuitive UI, excellent logs, easy debugging
5. **Affordable**: $5 free credit/month, then pay-as-you-go (typically $5-15/month)
6. **Reliable**: Excellent uptime, automatic SSL, zero-downtime deployments
7. **No Cold Starts**: Unlike serverless, always warm for 24/7 API needs

**When to choose alternatives:**
- **Render**: If you want a free tier for testing (but remember it spins down)
- **Fly.io**: If you need global edge deployment and low latency worldwide
- **VPS**: If you need full control and have DevOps expertise

---

### Deployment Instructions: Railway (Recommended)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Sign up with GitHub (recommended for seamless integration)

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub
   - Choose your `commitment-parties` repository

3. **Add Backend Service**
   - In your Railway project, click "New" → "Service"
   - Select "GitHub Repo" (or "Empty Service" if you want to configure manually)
   - Choose your repository
   - **IMPORTANT**: Set **Root Directory** to: `backend`
     - This tells Railway to look in the `backend/` folder, not the repo root
     - If you already created the service, go to **Settings** → **Source** → **Root Directory** and set it to `backend`
   - Railway will auto-detect Python and create a service

4. **Configure Build Settings** (usually auto-detected)
   - Railway auto-detects Python from `requirements.txt` in the `backend/` directory
   - **Build Command**: (auto-detected, usually `pip install -r requirements.txt`)
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - If not auto-detected, go to **Settings** → **Deploy** and set:
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Note**: A `railway.json` file has been created in the `backend/` directory to help Railway detect the correct build settings

5. **Set Environment Variables**
   
   Go to your service → **Variables** tab and add all required variables:
   
   ```bash
   HOST=0.0.0.0
   PORT=8000
   ENVIRONMENT=production
   DEBUG=false
   
   # Database (from Step 2)
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   SUPABASE_URL=https://[PROJECT].supabase.co
   SUPABASE_KEY=your_supabase_anon_key_here
   
   # Solana (from Step 1)
   SOLANA_RPC_URL=https://api.devnet.solana.com
   PROGRAM_ID=your_program_id_from_step_1
   
   # CORS (update after frontend deployment in Step 4)
   CORS_ORIGINS=https://your-frontend.vercel.app
   
   # GitHub OAuth (if using)
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_REDIRECT_URI=https://your-frontend.vercel.app/verify-github/callback
   
   # LLM (optional)
   LLM_API_URL=https://api.openai.com/v1/chat/completions
   LLM_API_KEY=your_openai_api_key
   LLM_MODEL=gpt-4o-mini
   ```

6. **Deploy**
   - Railway automatically deploys when you push to your connected branch (usually `main`)
   - Or click **Deploy** in the Railway dashboard to trigger manually
   - Watch the deployment logs in real-time
   - Wait for deployment to complete (usually 2-3 minutes)

7. **Get Backend URL**
   - Railway automatically generates a URL: `https://your-service-name.up.railway.app`
   - You can customize the domain in **Settings** → **Networking**
   - Copy this URL - you'll need it for frontend and agent configuration!

8. **Verify Deployment**
   ```bash
   # Test health endpoint
   curl https://your-service-name.up.railway.app/health
   
   # Should return: {"status":"ok","service":"commitment-agent-backend","version":"1.0.0"}
   
   # Test API docs (open in browser)
   # https://your-service-name.up.railway.app/docs
   ```

**GitHub Auto-Deploy Setup:**
- Railway automatically deploys on every push to your main branch
- To configure which branch to deploy from: **Settings** → **Deploy** → **Source**
- You can also set up preview deployments for pull requests

---

### Alternative: Render (If you prefer Render)

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select your `commitment-parties` repository
   - Set **Root Directory** to: `backend`

3. **Configure**
   - **Name**: `commitment-backend` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables** (same as Railway above)
   - Go to **Environment** tab
   - Add all variables from the Railway section above

5. **Deploy**
   - Render will automatically deploy on every push to main branch
   - Get your URL: `https://commitment-backend.onrender.com`
   - **Note**: Free tier spins down after 15min idle. Upgrade to Starter ($7/month) for always-on.

---

### Alternative: Fly.io (If you need global edge deployment)

**Note**: Fly.io requires more setup and uses GitHub Actions for auto-deploy (not native).

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   # Or on macOS: brew install flyctl
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Initialize App**
   ```bash
   cd backend
   fly launch
   ```
   - Follow prompts to create app
   - Choose region(s) for deployment
   - Don't deploy yet (we'll set up GitHub Actions first)

4. **Create Dockerfile** (if not exists)
   ```dockerfile
   FROM python:3.11-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY . .
   
   EXPOSE 8080
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
   ```

5. **Set Secrets**
   ```bash
   fly secrets set DATABASE_URL="postgresql://..."
   fly secrets set SUPABASE_URL="https://..."
   # ... set all other secrets
   ```

6. **Setup GitHub Actions for Auto-Deploy**
   Create `.github/workflows/fly-deploy.yml`:
   ```yaml
   name: Fly Deploy
   on:
     push:
       branches: [main]
       paths:
         - 'backend/**'
   jobs:
     deploy:
       name: Deploy app
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: superfly/flyctl-actions/setup-flyctl@master
         - run: flyctl deploy --remote-only -c backend/fly.toml
           env:
             FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
   ```
   - Get your Fly API token: `fly auth token`
   - Add to GitHub Secrets: Settings → Secrets → New secret: `FLY_API_TOKEN`

7. **Deploy**
   ```bash
   fly deploy
   # Or push to GitHub to trigger auto-deploy
   ```

---

### Alternative: VPS (DigitalOcean, AWS EC2, etc.)

1. **Create Server**
   - Ubuntu 22.04 LTS
   - Minimum: 1GB RAM, 1 vCPU
   - Recommended: 2GB RAM, 2 vCPU

2. **SSH into Server**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install -y python3-pip python3-venv nginx git
   ```

4. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/commitment-parties.git
   cd commitment-parties/backend
   ```

5. **Setup Python Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

6. **Create .env File**
   ```bash
   nano .env
   # Paste all environment variables
   ```

7. **Create Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/commitment-backend.service
   ```
   
   Content:
   ```ini
   [Unit]
   Description=Commitment Parties Backend API
   After=network.target
   
   [Service]
   Type=simple
   User=root
   WorkingDirectory=/root/commitment-parties/backend
   Environment="PATH=/root/commitment-parties/backend/venv/bin"
   ExecStart=/root/commitment-parties/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

8. **Start Service**
   ```bash
   sudo systemctl enable commitment-backend
   sudo systemctl start commitment-backend
   sudo systemctl status commitment-backend
   ```

9. **Setup Nginx Reverse Proxy**
   ```bash
   sudo nano /etc/nginx/sites-available/commitment-backend
   ```
   
   Content:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
   
   ```bash
   sudo ln -s /etc/nginx/sites-available/commitment-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

10. **Setup SSL (Let's Encrypt)**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d api.yourdomain.com
    ```

### Verify Backend Deployment

```bash
# Test health endpoint
curl https://your-backend-url/health

# Test API docs
# Open in browser: https://your-backend-url/docs
```

**Update CORS_ORIGINS** in backend environment variables after frontend is deployed!

---

## Step 4: Deploy Frontend

### Option A: Vercel (Recommended)

**Pros**: Perfect for Next.js, automatic deployments, free tier

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Set **Root Directory** to: `app/frontend`

3. **Configure Build Settings**
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install` (auto-detected)

4. **Set Environment Variables**
   
   Go to **Environment Variables** and add:
   
   ```bash
   # Solana Configuration
   NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
   NEXT_PUBLIC_PROGRAM_ID=your_program_id_from_step_1
   NEXT_PUBLIC_CLUSTER=devnet
   
   # Backend API URL (from Step 3)
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   
   # Supabase (if needed)
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Vercel provides URL: `https://your-project.vercel.app`

6. **Custom Domain (Optional)**
   - Go to **Settings** → **Domains**
   - Add your domain
   - Follow DNS configuration instructions

### Option B: Netlify

1. **Create Netlify Account**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub repository

3. **Configure Build**
   - Base directory: `app/frontend`
   - Build command: `npm run build`
   - Publish directory: `app/frontend/.next`

4. **Set Environment Variables** (same as Vercel)

5. **Deploy**
   - Netlify will deploy automatically

### Option C: Self-Hosted (VPS)

1. **Build Locally**
   ```bash
   cd app/frontend
   npm install
   npm run build
   ```

2. **Copy to Server**
   ```bash
   scp -r .next package.json node_modules user@server:/var/www/commitment-frontend
   ```

3. **Setup PM2 or Systemd**
   ```bash
   npm install -g pm2
   pm2 start npm --name "commitment-frontend" -- start
   pm2 save
   pm2 startup
   ```

4. **Setup Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Verify Frontend Deployment

1. Open your frontend URL in browser
2. Check browser console for errors
3. Test wallet connection
4. Test API connection

**Update CORS_ORIGINS in backend** to include your frontend URL!

---

## Step 5: Deploy AI Agent

The agent must run 24/7 as a persistent service. It cannot be serverless.

### Option A: Railway (Background Worker)

1. **In Railway Project**
   - Click "New" → "Service"
   - Select "Background Worker"
   - Set **Root Directory** to: `agent`

2. **Configure**
   - Build command: `pip install -r requirements.txt`
   - Start command: `python src/main.py`

3. **Set Environment Variables**
   
   ```bash
   # Solana Configuration
   SOLANA_RPC_URL=https://api.devnet.solana.com
   PROGRAM_ID=your_program_id_from_step_1
   
   # Agent Wallet
   # Option 1: Upload keypair file as secret
   AGENT_KEYPAIR_PATH=/app/keypair.json
   # Then upload keypair.json file in Railway secrets
   
   # Option 2: Use private key (less secure)
   # AGENT_PRIVATE_KEY=your_private_key_base58
   
   # Database
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   SUPABASE_URL=https://[PROJECT].supabase.co
   SUPABASE_KEY=your_supabase_anon_key
   
   # Twitter API (optional)
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret
   TWITTER_ACCESS_TOKEN=your_twitter_access_token
   TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
   
   # OpenAI (optional)
   OPENAI_API_KEY=your_openai_api_key
   
   # URLs (from previous steps)
   ACTION_BASE_URL=https://your-backend.railway.app
   APP_BASE_URL=https://your-frontend.vercel.app
   
   # Environment
   ENVIRONMENT=production
   DEBUG=false
   ```

4. **Upload Keypair**
   - Go to **Variables** tab
   - Click "New Variable" → "File"
   - Name: `keypair.json`
   - Upload your agent wallet keypair file
   - Reference it as: `AGENT_KEYPAIR_PATH=/app/keypair.json`

5. **Deploy**
   - Railway will deploy and keep running
   - Check logs to verify it's working

### Option B: VPS (Recommended for Production)

1. **Create VPS**
   - DigitalOcean, AWS EC2, Linode, etc.
   - Ubuntu 22.04 LTS
   - Minimum: 1GB RAM, 1 vCPU
   - Recommended: 2GB RAM, 2 vCPU

2. **SSH into Server**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install -y python3-pip python3-venv git
   ```

4. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/commitment-parties.git
   cd commitment-parties/agent
   ```

5. **Setup Python Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

6. **Setup Agent Wallet**
   ```bash
   # Option 1: Copy keypair file
   mkdir -p ~/.config/solana
   # Copy your keypair.json to ~/.config/solana/id.json
   # Use scp from local machine:
   # scp ~/.config/solana/id.json root@your-server-ip:~/.config/solana/id.json
   
   # Option 2: Generate new wallet (not recommended - loses existing pools)
   # solana-keygen new -o ~/.config/solana/id.json
   ```

7. **Create .env File**
   ```bash
   cp docs/env-templates/agent.env.example .env
   nano .env
   # Edit with all your values
   ```

8. **Create Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/commitment-agent.service
   ```
   
   Content:
   ```ini
   [Unit]
   Description=Commitment Parties AI Agent
   After=network.target
   
   [Service]
   Type=simple
   User=root
   WorkingDirectory=/root/commitment-parties/agent
   Environment="PATH=/root/commitment-parties/agent/venv/bin"
   EnvironmentFile=/root/commitment-parties/agent/.env
   ExecStart=/root/commitment-parties/agent/venv/bin/python src/main.py
   Restart=always
   RestartSec=10
   StandardOutput=journal
   StandardError=journal
   
   [Install]
   WantedBy=multi-user.target
   ```

9. **Start Service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable commitment-agent
   sudo systemctl start commitment-agent
   sudo systemctl status commitment-agent
   ```

10. **View Logs**
    ```bash
    # System logs
    sudo journalctl -u commitment-agent -f
    
    # Or application logs
    tail -f agent.log
    ```

### Option C: Docker (Alternative)

1. **Create Dockerfile**
   ```dockerfile
   FROM python:3.11-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY . .
   
   CMD ["python", "src/main.py"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     agent:
       build: .
       env_file: .env
       volumes:
         - ./keypair.json:/app/keypair.json:ro
       restart: always
   ```

3. **Run**
   ```bash
   docker-compose up -d
   ```

### Verify Agent Deployment

1. **Check Logs**
   ```bash
   # Railway: View in dashboard
   # VPS: sudo journalctl -u commitment-agent -f
   ```

2. **Check Database**
   - Agent should be creating verification records
   - Check `verifications` table in Supabase

3. **Check Twitter** (if configured)
   - Agent should be posting tweets
   - Check your Twitter account

---

## Post-Deployment Checklist

After deploying all components, verify everything works:

### ✅ Smart Contracts
- [ ] Program deployed and verified on Solscan
- [ ] PROGRAM_ID saved and updated in all components
- [ ] Can create pools on-chain
- [ ] Can join pools on-chain

### ✅ Database
- [ ] Schema applied successfully
- [ ] Can connect from backend
- [ ] Can connect from agent
- [ ] Test queries work

### ✅ Backend API
- [ ] API accessible at deployed URL
- [ ] `/docs` endpoint works (Swagger UI)
- [ ] `/health` endpoint returns 200
- [ ] Can create pools via API
- [ ] Can submit check-ins
- [ ] Solana Actions endpoints work (`/solana/actions/join-pool`)

### ✅ Frontend
- [ ] Frontend accessible at deployed URL
- [ ] Wallet connection works
- [ ] Can browse pools
- [ ] Can create pools
- [ ] Can join pools
- [ ] API calls to backend work
- [ ] No console errors

### ✅ AI Agent
- [ ] Agent is running (check logs)
- [ ] Agent can connect to database
- [ ] Agent can connect to Solana RPC
- [ ] Agent is monitoring pools
- [ ] Agent is submitting verifications
- [ ] Twitter posting works (if configured)

### ✅ Integration Tests
- [ ] Create pool from frontend → appears in backend
- [ ] Join pool from frontend → on-chain transaction succeeds
- [ ] Submit check-in → agent verifies it
- [ ] Agent distributes rewards when pool ends
- [ ] Twitter Blink → user can join pool from tweet

---

## Environment Variables Summary

### Backend
```bash
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=...
CORS_ORIGINS=https://your-frontend.vercel.app
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=https://your-frontend.vercel.app/verify-github/callback
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=...
LLM_MODEL=gpt-4o-mini
```

### Agent
```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=...
AGENT_KEYPAIR_PATH=/app/keypair.json
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_TOKEN_SECRET=...
OPENAI_API_KEY=...
ACTION_BASE_URL=https://your-backend.railway.app
APP_BASE_URL=https://your-frontend.vercel.app
ENVIRONMENT=production
DEBUG=false
```

### Frontend
```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=...
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Monitoring & Maintenance

### Backend Monitoring

**Railway/Render:**
- View logs in dashboard
- Set up alerts for errors
- Monitor resource usage

**VPS:**
```bash
# View logs
sudo journalctl -u commitment-backend -f

# Check status
sudo systemctl status commitment-backend

# Restart
sudo systemctl restart commitment-backend
```

### Agent Monitoring

**Railway:**
- View logs in dashboard
- Monitor for crashes

**VPS:**
```bash
# View logs
sudo journalctl -u commitment-agent -f
tail -f agent.log

# Check status
sudo systemctl status commitment-agent

# Restart
sudo systemctl restart commitment-agent
```

### Database Monitoring

- Supabase dashboard → Database → Logs
- Monitor query performance
- Set up alerts for errors
- Check connection pool usage

### Health Checks

Set up monitoring for:
- Backend API health endpoint
- Agent process status
- Database connectivity
- Solana RPC connectivity

---

## Troubleshooting

### Railway Build Error: "Railpack could not determine how to build the app"

**Error Message**: `✖ Railpack could not determine how to build the app`

**Cause**: Railway is trying to build from the repository root instead of the `backend/` directory.

**Solution**:
1. Go to your Railway service → **Settings** → **Source**
2. Set **Root Directory** to: `backend`
3. Save the changes
4. Railway will automatically trigger a new deployment
5. The build should now succeed as it will find `requirements.txt` and `main.py` in the `backend/` directory

**Alternative**: If the Root Directory setting doesn't appear:
- Delete the current service
- Create a new service
- When connecting the GitHub repo, immediately set **Root Directory** to `backend` before Railway tries to build

**Note**: Configuration files have been added to the `backend/` directory to help Railway detect the correct build settings.

### Railway Build Error: "pip: command not found"

**Error Message**: `/bin/bash: line 1: pip: command not found`

**Cause**: Nixpacks (Railway's build system) is not detecting or installing Python properly.

**Solution**:
The following configuration files have been created in the `backend/` directory to fix this:

1. **`runtime.txt`** - Specifies Python 3.11
2. **`nixpacks.toml`** - Explicitly configures Nixpacks to use Python 3.11 and pip
3. **`Procfile`** - Alternative format Railway can use
4. **`railway.json`** - Railway-specific configuration

**Steps to fix**:
1. Commit and push these new files to your repository:
   ```bash
   git add backend/runtime.txt backend/nixpacks.toml backend/Procfile backend/railway.json
   git commit -m "Add Railway configuration files"
   git push
   ```
2. Railway will automatically detect the new deployment
3. The build should now succeed as Nixpacks will properly detect Python

**If the issue persists**:
- Verify Root Directory is set to `backend` in Settings → Source
- Check that `requirements.txt` exists in the `backend/` directory
- Ensure `main.py` exists in the `backend/` directory
- Try redeploying manually from the Railway dashboard

### Backend Not Starting

1. Check environment variables are set correctly
2. Verify database connection string
3. Check logs for specific errors
4. Ensure port is not already in use
5. Verify PROGRAM_ID is correct
6. **For Railway**: Verify Root Directory is set to `backend` in Settings → Source

### Agent Not Running

1. Verify keypair file exists and is readable
2. Check Solana RPC URL is accessible
3. Verify PROGRAM_ID is correct
4. Check database connection
5. Verify all environment variables are set
6. Check logs for specific errors

### Frontend Connection Issues

1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check CORS settings in backend
3. Ensure backend is accessible from frontend domain
4. Check browser console for errors
5. Verify PROGRAM_ID is correct

### Database Connection Issues

1. Verify connection string format
2. Check Supabase project is active
3. Verify IP whitelist (if enabled)
4. Check database password is correct
5. Test connection from local machine

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.gitignore` for `.env` files
   - Use environment variables in deployment platforms

2. **Use HTTPS everywhere**
   - Enable SSL for all services
   - Use Let's Encrypt for free certificates

3. **Secure agent wallet**
   - Store keypair securely
   - Use file permissions: `chmod 600 keypair.json`
   - Consider using hardware wallet for mainnet

4. **Database security**
   - Use connection pooling
   - Enable IP whitelist if possible
   - Use strong passwords
   - Regularly rotate credentials

5. **API security**
   - Implement rate limiting
   - Validate all inputs
   - Use CORS properly
   - Monitor for suspicious activity

6. **Regular updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

---

## Scaling Considerations

### Backend Scaling

- Use connection pooling for database
- Implement caching (Redis) for frequently accessed data
- Use CDN for static assets
- Consider load balancing for high traffic

### Agent Scaling

- Run multiple agent instances for redundancy
- Use message queue for task distribution
- Monitor and scale based on pool count
- Consider sharding by pool type

### Database Scaling

- Upgrade Supabase plan for higher limits
- Optimize queries with proper indexes
- Consider read replicas for heavy read workloads
- Monitor query performance

---

## Cost Estimates

### Development (Devnet)

- **Supabase**: Free tier (500MB database)
- **Railway**: Free tier (500 hours/month)
- **Vercel**: Free tier (100GB bandwidth)
- **VPS**: $5-10/month (DigitalOcean droplet)
- **Total**: ~$5-10/month

### Production (Mainnet)

- **Supabase**: $25/month (Pro plan)
- **Railway**: $20/month (Hobby plan)
- **Vercel**: $20/month (Pro plan)
- **VPS**: $12-24/month (2GB RAM)
- **Solana RPC**: Free (public) or $50+/month (private)
- **Total**: ~$100-150/month

---

## Next Steps After Deployment

1. **Test end-to-end flow**
   - Create pool → Join pool → Submit check-ins → Verify → Distribute

2. **Monitor for 24-48 hours**
   - Check all logs
   - Verify agent is working
   - Test all features

3. **Set up alerts**
   - Backend errors
   - Agent crashes
   - Database issues

4. **Document your deployment**
   - Save all URLs and credentials securely
   - Document any custom configurations

5. **Plan for mainnet**
   - Test thoroughly on devnet first
   - Secure agent wallet properly
   - Consider using private RPC endpoint
   - Plan for higher costs

---

## Quick Reference: Deployment URLs

After deployment, save these URLs:

- **Smart Contract**: `https://solscan.io/account/[PROGRAM_ID]?cluster=devnet`
- **Backend API**: `https://your-backend.railway.app`
- **Frontend**: `https://your-frontend.vercel.app`
- **API Docs**: `https://your-backend.railway.app/docs`
- **Database**: Supabase dashboard

---

**Need Help?** Check the troubleshooting section or review component-specific documentation in the `docs/` directory.

