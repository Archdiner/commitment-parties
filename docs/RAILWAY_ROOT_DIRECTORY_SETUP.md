# How to Set Root Directory in Railway - Step by Step

## Quick Fix: Delete and Recreate Service

If you can't find the Root Directory setting, the easiest way is to delete and recreate the service:

### Step 1: Delete Current Service

1. Go to your Railway project: `selfless-balance`
2. Click on the `commitment-parties` service
3. Click the **Settings** tab (gear icon at the top)
4. Scroll down to the bottom
5. Click **Delete Service** (red button)
6. Confirm deletion

### Step 2: Create New Service with Root Directory

1. In your Railway project, click **"New"** button (top right)
2. Select **"GitHub Repo"**
3. Choose your `commitment-parties` repository
4. **BEFORE clicking "Deploy"**, look for a field called **"Root Directory"** or **"Working Directory"**
   - It might be in a dropdown or text field
   - Type: `backend` (no slash, no quotes)
5. If you don't see Root Directory option immediately:
   - Click **"Advanced"** or **"Configure"** button
   - Look for **"Root Directory"** field
   - Enter: `backend`
6. Click **"Deploy"** or **"Add Service"**

### Step 3: Verify Root Directory is Set

After the service is created:

1. Click on your new service
2. Go to **Settings** tab
3. Click on **"Source"** or **"Deploy"** section
4. Verify **"Root Directory"** shows: `backend`
5. If it's empty or shows `/`, change it to `backend` and save

## Alternative: Using Railway CLI

If the UI is confusing, you can use Railway CLI:

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set root directory
railway variables set RAILWAY_SERVICE_ROOT_DIRECTORY=backend
```

## Visual Guide

The Root Directory setting is typically found in one of these places:

1. **When creating service**: Look for "Root Directory" field in the service creation form
2. **In Settings → Source**: After service is created, Settings tab → Source section
3. **In Settings → Deploy**: Sometimes it's in the Deploy section instead

## What Root Directory Does

- **Without Root Directory** (or set to `/`): Railway looks at the repository root
  - It sees: `app/`, `backend/`, `docs/`, etc.
  - Can't find `requirements.txt` or `main.py` in root → Build fails

- **With Root Directory = `backend`**: Railway looks only in `backend/` folder
  - It sees: `requirements.txt`, `main.py`, `Dockerfile`, etc.
  - Finds everything it needs → Build succeeds

## Still Can't Find It?

If you absolutely cannot find the Root Directory setting:

1. **Use the Dockerfile approach** - The Dockerfile I created should work even if Root Directory isn't set correctly
2. **Contact Railway Support** - They can help you set it via their backend
3. **Try a different deployment method** - Render or Fly.io might be easier for you

