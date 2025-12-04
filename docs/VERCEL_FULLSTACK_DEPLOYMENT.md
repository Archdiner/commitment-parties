# Deploying Full Stack on Vercel

## Overview

You can deploy both frontend and backend on Vercel, with the agent running separately. Here's how:

## Option 1: Keep Backend Separate (Recommended)

**Why?**
- Solana operations can be slow (may exceed Vercel's 10s timeout on free tier)
- Database connections work better with persistent servers
- Less refactoring needed
- Agent needs 24/7 runtime anyway

**Architecture:**
- **Frontend**: Vercel (Next.js) ✅
- **Backend**: Railway/Render (FastAPI) ✅
- **Agent**: Railway/Render (24/7 Python service) ✅

This is the current plan and it's the most reliable.

---

## Option 2: Deploy Backend on Vercel (Advanced)

**Pros:**
- Everything in one place
- Automatic deployments
- Global edge network

**Cons:**
- Need to wrap FastAPI in serverless functions
- Cold starts (first request slow)
- Timeout limits (10s free, 60s pro)
- Solana operations might timeout

### How to Deploy FastAPI on Vercel

#### Step 1: Create Vercel Configuration

Create `vercel.json` in your project root:

```json
{
  "builds": [
    {
      "src": "backend/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "backend/main.py"
    }
  ]
}
```

#### Step 2: Create Serverless Handler

Create `backend/api/index.py`:

```python
from mangum import Mangum
from main import app

# Wrap FastAPI app for Vercel serverless
handler = Mangum(app, lifespan="off")
```

#### Step 3: Update vercel.json

```json
{
  "builds": [
    {
      "src": "backend/api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/api/index.py"
    },
    {
      "src": "/solana/(.*)",
      "dest": "backend/api/index.py"
    },
    {
      "src": "/health",
      "dest": "backend/api/index.py"
    },
    {
      "src": "/docs",
      "dest": "backend/api/index.py"
    }
  ]
}
```

#### Step 4: Install Dependencies

Add to `backend/requirements.txt`:
```
mangum==3.4.0
```

#### Step 5: Deploy to Vercel

1. Connect your GitHub repo to Vercel
2. Set root directory to project root (not `app/frontend`)
3. Vercel will detect both Next.js frontend and Python backend
4. Set environment variables in Vercel dashboard

**Limitations:**
- Function timeout: 10s (free) or 60s (pro)
- Cold starts on first request
- Some Solana operations might be too slow

---

## Option 3: Convert Backend to Next.js API Routes

**Pros:**
- Native Vercel support
- No cold starts (better performance)
- TypeScript throughout

**Cons:**
- **Significant refactoring** - Need to rewrite all FastAPI routes as Next.js API routes
- Lose FastAPI's automatic OpenAPI docs
- Need to rewrite database models
- More work upfront

### Example Conversion

**FastAPI (current):**
```python
@router.get("/pools")
async def get_pools():
    return await db.get_pools()
```

**Next.js API Route (converted):**
```typescript
// app/frontend/app/api/pools/route.ts
export async function GET() {
  const pools = await db.getPools();
  return Response.json(pools);
}
```

This would require rewriting:
- All 6 router files
- Database models
- Solana transaction builders
- Error handling

**Estimated time**: 2-3 days of refactoring

---

## My Recommendation

**Stick with Option 1** (separate backend):
- ✅ Less work (no refactoring)
- ✅ More reliable (no timeout issues)
- ✅ Better for Solana operations
- ✅ Agent needs separate deployment anyway
- ✅ Only 2 platforms instead of 1 (but simpler setup)

**Only choose Option 2/3 if:**
- You want everything on one platform (even if it's more complex)
- You're willing to refactor (Option 3) or deal with timeouts (Option 2)
- You have specific requirements that favor Vercel

---

## Final Architecture Recommendation

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │  → Vercel ✅
│   app/frontend  │
└─────────────────┘
        │
        │ API calls
        ▼
┌─────────────────┐
│   Backend       │
│   (FastAPI)     │  → Railway/Render ✅
│   backend/      │
└─────────────────┘
        │
        │ Monitors
        ▼
┌─────────────────┐
│   Agent         │
│   (Python)      │  → Railway/Render ✅
│   agent/        │
└─────────────────┘
```

**Why this works best:**
- Frontend: Vercel (perfect for Next.js)
- Backend: Railway/Render (perfect for FastAPI, no timeouts)
- Agent: Railway/Render (needs 24/7 runtime)

**Total platforms: 2** (Vercel + Railway/Render)
**Total complexity: Low** (each service on its ideal platform)

