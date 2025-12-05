# Continuous Deployment Setup

This guide shows you how to set up automatic deployments so your backend (and frontend) automatically deploy whenever you push to GitHub, just like Vercel does.

## Overview

There are **two main approaches** to continuous deployment:

1. **Platform Auto-Deploy** (Recommended) - Let the platform handle it automatically
2. **GitHub Actions** - Use GitHub Actions to trigger deployments

---

## Option 1: Platform Auto-Deploy (Easiest - Recommended)

Most modern platforms support automatic deployments from GitHub. This is the easiest and most reliable method.

### Railway Auto-Deploy

Railway automatically deploys when you push to your connected branch.

**Setup:**
1. Go to your Railway project
2. Click on your backend service
3. Go to **Settings** → **Source**
4. Make sure **Auto-Deploy** is enabled
5. Select your branch (usually `main`)
6. Railway will automatically deploy on every push!

**That's it!** Railway watches your GitHub repo and deploys automatically.

### Render Auto-Deploy

Render also supports automatic deployments.

**Setup:**
1. Go to your Render dashboard
2. Click on your web service
3. Go to **Settings**
4. Under **Build & Deploy**, ensure:
   - **Auto-Deploy** is set to `Yes`
   - **Branch** is set to `main` (or your default branch)
5. Render will automatically deploy on every push!

### Fly.io Auto-Deploy

Fly.io uses GitHub integration for auto-deploy.

**Setup:**
1. Install Fly.io GitHub app: https://github.com/apps/fly-io
2. Authorize it for your repository
3. Go to your Fly.io app dashboard
4. Enable **GitHub Deploy** in settings
5. Fly.io will automatically deploy on every push!

---

## Option 2: GitHub Actions (More Control)

If you want more control or your platform doesn't support auto-deploy, use GitHub Actions.

### Setup GitHub Actions

We've created workflow files for you:

- `.github/workflows/deploy-backend.yml` - Deploys backend
- `.github/workflows/deploy-frontend.yml` - Deploys frontend

### Configure Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add the following secrets based on your platform:

#### For Railway:
- `RAILWAY_TOKEN` - Get from Railway dashboard → Account Settings → Tokens
- `RAILWAY_SERVICE_ID` - Get from your service settings → General → Service ID

#### For Render:
- `RENDER_API_KEY` - Get from Render dashboard → Account → API Keys
- `RENDER_SERVICE_ID` - Get from your service settings → Info → Service ID

#### For Fly.io:
- `FLY_API_TOKEN` - Get by running: `flyctl auth token`

#### For Vercel (Frontend):
- `VERCEL_TOKEN` - Get from Vercel dashboard → Settings → Tokens
- `VERCEL_ORG_ID` - Get from Vercel dashboard → Settings → General
- `VERCEL_PROJECT_ID` - Get from your project settings

### How It Works

1. **Push to GitHub** → Triggers workflow
2. **Workflow runs** → Installs dependencies, runs tests (optional)
3. **Deploys** → Uses platform API to trigger deployment

---

## Recommended Setup

### For Most Users: Platform Auto-Deploy

**Backend (Railway/Render/Fly.io):**
1. Connect your GitHub repo to the platform
2. Enable auto-deploy in platform settings
3. Done! Every push automatically deploys

**Frontend (Vercel):**
1. Connect your GitHub repo to Vercel
2. Vercel automatically deploys on every push
3. Done!

### For Advanced Users: GitHub Actions

Use GitHub Actions if you need:
- Custom deployment logic
- Multi-platform deployments
- Deployment notifications
- Custom build steps

---

## Testing Your Setup

### Test Auto-Deploy

1. Make a small change to your backend (e.g., add a comment)
2. Commit and push:
   ```bash
   git add backend/main.py
   git commit -m "test: Trigger auto-deploy"
   git push
   ```
3. Check your platform dashboard - you should see a new deployment starting
4. Wait 1-2 minutes for deployment to complete
5. Test your API endpoint to verify it's live

### Monitor Deployments

**Railway:**
- Go to your service → **Deployments** tab
- See deployment history and logs

**Render:**
- Go to your service → **Events** tab
- See deployment events and logs

**Vercel:**
- Go to your project → **Deployments** tab
- See all deployments with preview URLs

---

## Troubleshooting

### Deployments Not Triggering

1. **Check branch name** - Make sure you're pushing to the branch configured in your platform
2. **Check auto-deploy settings** - Ensure auto-deploy is enabled
3. **Check file paths** - Some platforms only deploy when specific paths change
4. **Check platform status** - Platform might be experiencing issues

### GitHub Actions Not Running

1. **Check workflow file** - Ensure `.github/workflows/*.yml` files exist
2. **Check secrets** - Verify all required secrets are set
3. **Check workflow logs** - Go to Actions tab to see error messages
4. **Check permissions** - Ensure GitHub Actions has permission to deploy

### Deployment Fails

1. **Check build logs** - Look for error messages in platform dashboard
2. **Check environment variables** - Ensure all required env vars are set
3. **Check dependencies** - Verify `requirements.txt` or `package.json` is correct
4. **Check platform limits** - Free tiers have resource limits

---

## Best Practices

1. **Use platform auto-deploy** for simplicity
2. **Test locally first** before pushing
3. **Use feature branches** - Deploy main branch only
4. **Monitor deployments** - Check logs after each deploy
5. **Set up notifications** - Get alerts for failed deployments
6. **Use staging environment** - Test changes before production

---

## Quick Reference

### Enable Auto-Deploy on Platforms

**Railway:**
```
Service → Settings → Source → Auto-Deploy: ON
```

**Render:**
```
Service → Settings → Build & Deploy → Auto-Deploy: Yes
```

**Fly.io:**
```
Install GitHub app → Enable in dashboard
```

**Vercel:**
```
Project → Settings → Git → Auto-deploy: Enabled (default)
```

---

## Summary

✅ **Easiest**: Use platform auto-deploy (Railway, Render, Vercel)
✅ **Most Control**: Use GitHub Actions
✅ **Recommended**: Platform auto-deploy for backend, Vercel auto-deploy for frontend

Once set up, you'll never have to manually deploy again - just push to GitHub and your changes go live automatically! 🚀

