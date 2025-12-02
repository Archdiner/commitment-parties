# GitHub OAuth Setup Guide

## Overview

The GitHub verification system now uses **OAuth** instead of manual Gist creation, making it much simpler for users:

**Old Flow (Gist):**
1. Sign message with wallet
2. Create GitHub Gist manually
3. Copy Gist ID
4. Submit for verification

**New Flow (OAuth):**
1. Click "Connect GitHub"
2. Authorize on GitHub
3. Done! ✅

## Setup Instructions

### 1. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Commitment Agent (or your app name)
   - **Homepage URL**: Your app URL (e.g., `http://localhost:3000` for dev)
   - **Authorization callback URL**: 
     - Dev: `http://localhost:3000/verify-github/callback`
     - Production: `https://yourdomain.com/verify-github/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### 2. Configure Backend

Add to `backend/.env`:

```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/verify-github/callback
```

For production, update `GITHUB_REDIRECT_URI` to your production URL.

### 3. Update GitHub OAuth App Settings

Make sure the callback URL in your GitHub OAuth app matches `GITHUB_REDIRECT_URI` in your backend config.

## How It Works

### User Flow

1. User goes to `/verify-github`
2. Clicks "Connect GitHub" button
3. Redirected to GitHub authorization page
4. User authorizes the app
5. GitHub redirects back to `/verify-github/callback`
6. Backend exchanges code for access token
7. Backend fetches user info from GitHub API
8. Backend stores verified GitHub username
9. User is redirected back to verification page (now verified)

### Security

- **OAuth state token**: Prevents CSRF attacks
- **Access token**: Only used to fetch user info, then discarded
- **Scope**: Only requests `read:user` (minimal permissions)
- **State storage**: Currently in-memory (fine for MVP, use Redis for production)

### API Endpoints

#### `GET /api/users/github/oauth/initiate?wallet_address=...`
Initiates OAuth flow, returns authorization URL.

#### `GET /api/users/github/oauth/callback?code=...&state=...`
Handles OAuth callback, verifies account, stores GitHub username.

## Testing

1. Start backend with GitHub OAuth configured
2. Go to `/verify-github` in frontend
3. Enter wallet address
4. Click "Connect GitHub"
5. Authorize on GitHub
6. Should redirect back and show verified status

## Production Considerations

1. **State Storage**: Currently in-memory. For production, use Redis:
   ```python
   # In backend/routers/users.py
   import redis
   redis_client = redis.Redis(host='localhost', port=6379, db=0)
   
   # Store state
   redis_client.setex(f"oauth_state:{state}", 300, json.dumps({"wallet": wallet}))
   
   # Retrieve state
   state_data = json.loads(redis_client.get(f"oauth_state:{state}"))
   ```

2. **HTTPS**: OAuth requires HTTPS in production (GitHub requirement)

3. **Error Handling**: Add better error messages for common issues:
   - OAuth app not configured
   - Invalid callback URL
   - State token expired

## Benefits Over Gist Method

✅ **Much simpler UX** - One click instead of multiple steps
✅ **No manual steps** - No Gist creation needed
✅ **More secure** - OAuth is industry standard
✅ **Better error handling** - Clear error messages
✅ **Automatic** - No copy/paste of IDs or signatures

## Legacy Gist Method

The Gist method is still available at `POST /api/users/verify-github` for backwards compatibility, but OAuth is recommended for all new integrations.

