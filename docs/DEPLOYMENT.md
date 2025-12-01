# Deployment Guide

Complete guide for deploying Commitment Agent to production.

## Prerequisites

- All development environment tools installed (see [SETUP.md](SETUP.md))
- Supabase project created
- Solana devnet/mainnet wallet with sufficient SOL
- Domain name (optional, for production frontend)

## Deployment Steps

### 1. Deploy Smart Contracts

#### Build and Deploy to Devnet

```bash
cd programs/commitment-pool

# Build the program
anchor build

# Get the program ID
solana address -k target/deploy/commitment_pool-keypair.json

# Update Anchor.toml with the program ID
# Update src/lib.rs declare_id! with the program ID

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Save the program ID for use in other components
export PROGRAM_ID=$(solana address -k target/deploy/commitment_pool-keypair.json)
```

#### Verify Deployment

```bash
# Check program on Solscan
# https://solscan.io/account/$PROGRAM_ID?cluster=devnet

# Run tests
anchor test
```

### 2. Setup Supabase Database

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for provisioning (2-3 minutes)

2. **Run Database Schema**
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `backend/sql/schema.sql`
   - Paste and execute

3. **Get Connection Details**
   - Go to Project Settings → Database
   - Copy connection string
   - Copy API URL and anon key

### 3. Deploy Backend API

#### Option A: Railway

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your repository

3. **Configure Service**
   - Add new service → GitHub repo
   - Select `backend/` directory
   - Set root directory to `backend`

4. **Set Environment Variables**
   ```
   HOST=0.0.0.0
   PORT=8000
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://...
   SUPABASE_KEY=...
   SOLANA_RPC_URL=https://api.devnet.solana.com
   PROGRAM_ID=...
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```

5. **Deploy**
   - Railway will auto-detect Python
   - Install dependencies and start with uvicorn

#### Option B: Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repository
   - Set root directory to `backend`

3. **Configure**
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables** (same as Railway)

### 4. Deploy AI Agent

The agent should run on a persistent server (not serverless).

#### Option A: Railway (Background Worker)

1. **Add Background Worker Service**
   - In Railway project, add new service
   - Select "Background Worker"
   - Set root directory to `agent`

2. **Configure**
   - Build command: `pip install -r requirements.txt`
   - Start command: `python src/main.py`

3. **Set Environment Variables**
   ```
   SOLANA_RPC_URL=https://api.devnet.solana.com
   PROGRAM_ID=...
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://...
   SUPABASE_KEY=...
   AGENT_KEYPAIR_PATH=/app/keypair.json
   ```

4. **Upload Keypair**
   - Add keypair file as secret/file in Railway
   - Or use environment variable for private key

#### Option B: VPS (DigitalOcean, AWS EC2, etc.)

1. **Setup Server**
   - Create Ubuntu 22.04 instance
   - SSH into server

2. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv git
   ```

3. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/commitment-agent.git
   cd commitment-agent/agent
   ```

4. **Setup Python Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

5. **Configure**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

6. **Run as Service**
   ```bash
   # Create systemd service
   sudo nano /etc/systemd/system/commitment-agent.service
   ```

   Service file:
   ```ini
   [Unit]
   Description=Commitment Agent
   After=network.target

   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/commitment-agent/agent
   Environment="PATH=/home/ubuntu/commitment-agent/agent/venv/bin"
   ExecStart=/home/ubuntu/commitment-agent/agent/venv/bin/python src/main.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable commitment-agent
   sudo systemctl start commitment-agent
   sudo systemctl status commitment-agent
   ```

### 5. Deploy Frontend

#### Vercel (Recommended)

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Import GitHub repository
   - Set root directory to `app`

3. **Configure**
   - Framework: Next.js
   - Build command: `npm run build`
   - Output directory: `.next`

4. **Set Environment Variables**
   ```
   NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
   NEXT_PUBLIC_PROGRAM_ID=...
   NEXT_PUBLIC_CLUSTER=devnet
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

5. **Deploy**
   - Vercel will auto-detect Next.js
   - Deploy automatically on git push

## Environment Variables Summary

### Backend

```bash
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=...
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Agent

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=...
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
AGENT_KEYPAIR_PATH=/path/to/keypair.json
# OR
AGENT_PRIVATE_KEY=...
```

### Frontend

```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=...
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## Post-Deployment Checklist

- [ ] Smart contract deployed and verified on Solscan
- [ ] Database schema applied to Supabase
- [ ] Backend API deployed and accessible
- [ ] Agent running and monitoring pools
- [ ] Frontend deployed and connecting to backend
- [ ] Environment variables configured correctly
- [ ] CORS configured for frontend domain
- [ ] Health checks passing
- [ ] Logs monitored for errors

## Monitoring

### Backend Logs

- Railway: View logs in dashboard
- Render: View logs in dashboard
- VPS: `journalctl -u commitment-agent -f`

### Agent Logs

- Check `agent.log` file
- Or view service logs: `sudo journalctl -u commitment-agent -f`

### Database Monitoring

- Supabase dashboard → Database → Logs
- Monitor query performance
- Set up alerts for errors

## Troubleshooting

### Backend Not Starting

- Check environment variables are set
- Verify database connection string
- Check logs for specific errors
- Ensure port is not already in use

### Agent Not Running

- Verify keypair file exists and is readable
- Check Solana RPC URL is accessible
- Verify program ID is correct
- Check database connection

### Frontend Connection Issues

- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is accessible from frontend domain

## Security Considerations

1. **Never commit private keys or keypairs to git**
2. **Use environment variables for all secrets**
3. **Enable HTTPS for all services**
4. **Implement rate limiting on API**
5. **Monitor for suspicious activity**
6. **Regularly update dependencies**

## Scaling

### Backend

- Use connection pooling for database
- Implement caching (Redis) for frequently accessed data
- Use CDN for static assets

### Agent

- Run multiple agent instances for redundancy
- Use message queue for task distribution
- Monitor and scale based on pool count

### Database

- Upgrade Supabase plan for higher limits
- Optimize queries with proper indexes
- Consider read replicas for heavy read workloads

