# Troubleshooting API 404 Errors

## Quick Fix Checklist

### 1. ✅ Is the Backend Running?

**Check:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# Should return: {"status":"ok","service":"commitment-agent-backend","version":"1.0.0"}
```

**If not running, start it:**

**Option A: Use the startup script (recommended):**
```bash
cd backend
./start_backend.sh
```

**Option B: Manual start:**
```bash
cd backend
source ../venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**⚠️ Port Conflict?**
If port 8000 is already in use (you'll see "Address already in use" error):
1. **Option 1:** Stop the other service using port 8000
2. **Option 2:** Use a different port:
   ```bash
   # Set PORT in backend/.env
   echo "PORT=8001" >> backend/.env
   
   # Update frontend .env.local
   echo "NEXT_PUBLIC_API_URL=http://localhost:8001" >> app/frontend/.env.local
   
   # Start backend
   cd backend
   PORT=8001 python3 -m uvicorn main:app --reload
   ```

### 2. ✅ Is the API URL Correct?

**Frontend expects:** `http://localhost:8000` (default)

**Check your frontend `.env.local` or environment:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Verify in browser console:**
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
```

### 3. ✅ Are the Endpoints Actually Available?

**Test each endpoint manually:**

```bash
# Test pools endpoint
curl http://localhost:8000/api/pools

# Test user participations (replace WALLET with actual wallet)
curl http://localhost:8000/api/users/WALLET/participations

# Test GitHub username (replace WALLET with actual wallet)
curl http://localhost:8000/api/users/WALLET/github

# Test health endpoint
curl http://localhost:8000/health
```

### 4. ✅ Check Backend Logs

Look for errors in the backend terminal:
- Database connection errors
- Missing environment variables
- Route not found errors

### 5. ✅ CORS Issues?

If you see CORS errors in browser console, check `backend/config.py`:
```python
CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,..."
```

Make sure your frontend URL is in the list.

## Common Issues

### Issue 1: Backend Not Running

**Symptoms:**
- All API calls return 404
- Network tab shows "Failed to fetch" or connection refused

**Solution:**
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
```

### Issue 2: Wrong Port

**Symptoms:**
- 404 errors
- Backend running on different port

**Solution:**
- Check backend is on port 8000: `lsof -i :8000`
- Or update frontend `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:YOUR_PORT`

### Issue 3: Database Connection Failed

**Symptoms:**
- Backend starts but endpoints return 404 or 500
- Backend logs show database errors

**Solution:**
- Check `backend/.env` has correct `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`
- Test database connection

### Issue 4: Endpoint Path Mismatch

**Symptoms:**
- Specific endpoints return 404
- Other endpoints work

**Check:**
- Frontend calls: `/api/pools`, `/api/users/{wallet}/participations`
- Backend routes: Should match exactly

## Testing Endpoints

### Test Script

Create `test_endpoints.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:8000"

echo "Testing API endpoints..."
echo ""

# Health check
echo "1. Health check:"
curl -s "$API_URL/health" | jq .
echo ""

# Pools
echo "2. Pools list:"
curl -s "$API_URL/api/pools?limit=5" | jq .
echo ""

# User participations (replace with real wallet)
echo "3. User participations:"
WALLET="YOUR_WALLET_ADDRESS"
curl -s "$API_URL/api/users/$WALLET/participations" | jq .
echo ""

# GitHub username
echo "4. GitHub username:"
curl -s "$API_URL/api/users/$WALLET/github" | jq .
echo ""
```

## Expected Responses

### ✅ Success Responses

**Health:**
```json
{"status":"ok","service":"commitment-agent-backend","version":"1.0.0"}
```

**Pools (empty if no pools):**
```json
[]
```

**User Participations (empty if no participations):**
```json
[]
```

**GitHub Username (null if not verified):**
```json
{"verified_github_username": null}
```

### ❌ Error Responses

**404 Not Found:**
- Backend not running
- Wrong URL
- Endpoint doesn't exist

**500 Internal Server Error:**
- Database connection issue
- Missing environment variables
- Backend code error

## Next Steps

1. **Start backend** if not running
2. **Check API URL** in frontend
3. **Test endpoints** manually with curl
4. **Check backend logs** for errors
5. **Verify database** connection

