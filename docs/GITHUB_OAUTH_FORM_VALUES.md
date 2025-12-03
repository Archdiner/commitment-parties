# GitHub OAuth App Registration - Form Values

## Fill in the GitHub OAuth App Registration Form

When you see the "Register a new OAuth app" form, use these values:

### 1. Application name *
**Value:** `Commitment Agent`

**Why:** Something users will recognize and trust. This is what appears when users authorize your app.

---

### 2. Homepage URL *
**For Development:**
```
http://localhost:3000
```

**For Production:**
```
https://your-production-domain.com
```
(Replace with your actual production URL when deploying)

**Why:** The main URL of your application. Users can visit this to learn about your app.

---

### 3. Application description
**Value (Optional):**
```
AI-powered commitment pools for accountability challenges. Track GitHub commits, HODL tokens, and lifestyle habits with on-chain verification.
```

**Why:** Optional but helpful. This description appears to users during authorization.

---

### 4. Authorization callback URL * ⚠️ **MOST IMPORTANT**
**For Development:**
```
http://localhost:3000/verify-github/callback
```

**For Production:**
```
https://your-production-domain.com/verify-github/callback
```
(Replace with your actual production URL when deploying)

**Why:** This is where GitHub redirects users after they authorize your app. **Must match exactly** what you set in `GITHUB_REDIRECT_URI` in your backend `.env` file.

---

### 5. Enable Device Flow
**Value:** Leave **unchecked** (default)

**Why:** Not needed for web OAuth flow. Only enable if you plan to support device authorization flow.

---

## After Registration

1. **Copy the Client ID** - You'll see it immediately after registration
2. **Generate Client Secret** - Click "Generate a new client secret" button
3. **Copy the Client Secret** - Save it immediately (you can only see it once!)

## Add to Backend Config

Add these to your `backend/.env`:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=paste_your_client_id_here
GITHUB_CLIENT_SECRET=paste_your_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/verify-github/callback
```

**Important:** 
- For production, update `GITHUB_REDIRECT_URI` to your production URL
- Also update the callback URL in your GitHub OAuth app settings to match

## Quick Reference

| Field | Development Value | Production Value |
|-------|------------------|-----------------|
| Application name | `Commitment Agent` | `Commitment Agent` |
| Homepage URL | `http://localhost:3000` | `https://your-domain.com` |
| Callback URL | `http://localhost:3000/verify-github/callback` | `https://your-domain.com/verify-github/callback` |

## Testing

After setup:
1. Start your backend with the new env vars
2. Go to `/verify-github` in your frontend
3. Click "Connect GitHub"
4. Should redirect to GitHub authorization
5. After authorizing, should redirect back and show verified status

