# GitHub Verification System

## Overview

The GitHub verification system ensures that only the actual owner of a GitHub account can participate in GitHub commit challenges. This prevents the security flaw where anyone could claim any GitHub username.

## How It Works

### 1. Verification Process (OAuth - Recommended)

**Simple OAuth Flow:**
1. User clicks "Connect GitHub" button
2. Redirected to GitHub OAuth authorization
3. User authorizes the app
4. Backend receives OAuth callback
5. Backend fetches user info from GitHub API
6. Backend stores verified GitHub username

**Verification Flow:**
```
User → Click "Connect GitHub" → GitHub OAuth → Authorize → Backend Verifies → Stored in DB
```

### 2. Legacy Gist Method (Still Available)

The Gist method is still available but not recommended for new users:
1. User signs a message with their Solana wallet
2. User creates a GitHub Gist with signature
3. Backend verifies Gist ownership and content
4. Stores verified GitHub username

See `POST /api/users/verify-github` for Gist method details.

### 3. Usage in Challenges

When a participant joins a GitHub commit challenge:
- System checks if they have a verified GitHub username
- If not, prompts them to verify
- Verification uses participant's verified GitHub username (not pool metadata)
- Only commits from verified account count

## Security

**Why Gist verification is secure:**
- Only the account owner can create Gists on their account
- Gist ownership is verified via GitHub API
- Wallet address in Gist proves wallet-to-GitHub link
- Signature provides additional proof (can be enhanced later)

**Attack prevention:**
- ❌ Can't claim someone else's GitHub account (can't create Gist on their account)
- ❌ Can't use fake GitHub username (Gist must exist and be owned by that user)
- ✅ Only real GitHub account owners can verify

## API Endpoints

### GET `/api/users/github/oauth/initiate?wallet_address=...`
Initiates GitHub OAuth flow (recommended method).

**Response:**
```json
{
  "auth_url": "https://github.com/login/oauth/authorize?...",
  "state": "state_token"
}
```

### GET `/api/users/github/oauth/callback?code=...&state=...`
Handles OAuth callback and verifies account.

**Response:**
```json
{
  "verified": true,
  "message": "GitHub account verified successfully via OAuth",
  "github_username": "alice"
}
```

### POST `/api/users/verify-github` (Legacy Gist Method)
Legacy Gist-based verification (still available but not recommended).

**Request:**
```json
{
  "wallet_address": "ABC123...",
  "github_username": "alice",
  "gist_id": "abc123def456",
  "signature": "base64_signature"
}
```

**Response:**
```json
{
  "verified": true,
  "message": "GitHub username verified successfully",
  "github_username": "alice"
}
```

### GET `/api/users/{wallet}/github`
Get verified GitHub username for a wallet.

**Response:**
```json
{
  "verified_github_username": "alice"
}
```

## Frontend

### Verification Page
- Route: `/verify-github`
- Allows users to:
  1. Sign message with Phantom wallet
  2. Create GitHub Gist with signature
  3. Submit Gist ID for verification

### Pool Join Flow
- Checks for GitHub verification when joining GitHub commit pools
- Redirects to verification page if not verified
- Blocks joining until verified

## Database

### Migration
Run migration to add `verified_github_username` to users table:
```bash
# Migration file: backend/sql/migration_add_github_verification.sql
```

### Schema
```sql
ALTER TABLE users ADD COLUMN verified_github_username VARCHAR(100);
```

## Monitoring Agent

The monitoring agent (`agent/src/monitor.py`) now:
- Fetches verified GitHub username from users table
- Uses participant's verified username (not pool metadata)
- Only verifies commits from verified accounts
- Logs verification status for debugging

## Testing

### Manual Test Flow

1. **Create GitHub Gist:**
   - Go to https://gist.github.com
   - Create new Gist with content:
     ```
     Verifying wallet YOUR_WALLET for Commitment Agent
     Signature: YOUR_SIGNATURE
     ```
   - Copy Gist ID from URL

2. **Verify via API:**
   ```bash
   curl -X POST http://localhost:8000/api/users/verify-github \
     -H "Content-Type: application/json" \
     -d '{
       "wallet_address": "YOUR_WALLET",
       "github_username": "your-username",
       "gist_id": "gist-id",
       "signature": "signature"
     }'
   ```

3. **Check verification:**
   ```bash
   curl http://localhost:8000/api/users/YOUR_WALLET/github
   ```

## Future Enhancements

1. **Enhanced Signature Verification:**
   - Proper Solana message signing format
   - Ed25519 signature verification
   - Message format standardization

2. **OAuth Alternative:**
   - GitHub OAuth flow
   - Automatic verification
   - Better UX

3. **Profile Bio Method:**
   - Check GitHub profile bio for wallet address
   - Simpler for users
   - Less secure but acceptable for some use cases

## Status

✅ **Production Ready**
- **OAuth-based verification** (recommended - simple UX)
- Legacy Gist method still available
- Frontend UI complete
- Backend endpoints working
- Monitoring agent updated
- Pool join flow enforces verification

## Setup

See [GITHUB_OAUTH_SETUP.md](./GITHUB_OAUTH_SETUP.md) for detailed setup instructions.

