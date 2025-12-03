# Environment Variables Setup

Environment variable templates are located in `docs/env-templates/`.

## Setup Instructions

### Backend

1. Copy the template:
   ```bash
   cp docs/env-templates/backend.env.example backend/.env
   ```

2. Edit `backend/.env` with your actual values:
   - Get Supabase credentials from your Supabase project
   - Get PROGRAM_ID after deploying smart contracts
   - Adjust CORS_ORIGINS for your frontend URL

### Agent

1. Copy the template:
   ```bash
   cp docs/env-templates/agent.env.example agent/.env
   ```

2. Edit `agent/.env` with your actual values:
   - Get PROGRAM_ID after deploying smart contracts
   - Set AGENT_KEYPAIR_PATH to your agent wallet keypair
   - Get Supabase credentials
   - Optionally configure Twitter API for social features

### Frontend

1. Copy the template:
   ```bash
   cp docs/env-templates/frontend.env.example app/.env.local
   ```

2. Edit `app/.env.local` with your actual values:
   - Get PROGRAM_ID after deploying smart contracts
   - Set NEXT_PUBLIC_API_URL to your backend URL

## Important Notes

- Never commit `.env` files to git (they're in .gitignore)
- All `NEXT_PUBLIC_*` variables are exposed to the browser
- Keep `AGENT_PRIVATE_KEY` and keypair files secure
- Use different credentials for development and production


