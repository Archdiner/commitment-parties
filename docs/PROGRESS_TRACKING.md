# Progress Tracking System

## How Progress is Tracked

### 1. Agent Monitoring (Background Service)

The agent (`agent/src/monitor.py`) runs continuously and:

1. **Checks every 5 minutes** for lifestyle pools (including GitHub challenges)
2. **Verifies GitHub commits** by:
   - Fetching the participant's verified GitHub username from the `users` table
   - Querying GitHub API for commits made today (UTC)
   - If repo is specified: checks commits in that specific repo
   - If repo is empty: checks all commits across user's repositories
   - Verifies minimum commits per day requirement

3. **Stores verification results**:
   - Creates/updates record in `verifications` table
   - Updates `days_verified` in `participants` table (counts all passed verifications)
   - Submits verification to smart contract (on-chain)

### 2. Database Schema

**Participants Table:**
- `days_verified`: Integer count of days that passed verification
- Updated automatically by agent after each verification

**Verifications Table:**
- Stores individual day verifications
- Fields: `pool_id`, `participant_wallet`, `day`, `passed`, `verification_type`, `proof_data`
- One record per day per participant

### 3. Frontend Display

The frontend reads progress from:
- `GET /api/users/{wallet}/participations` - Returns `days_verified` and calculated `progress`
- `GET /api/pools/{pool_id}/participants/{wallet}/verifications` - Returns detailed verification history

Progress calculation:
```javascript
progress = (days_verified / duration_days) * 100
```

## Why Progress Might Not Update

### Common Issues:

1. **Agent not running**
   - Check if agent is running: `ps aux | grep python | grep monitor`
   - Start agent: `cd agent && python -m src.main`

2. **GitHub username not verified**
   - User must connect GitHub via OAuth
   - Check: `GET /api/users/{wallet}/github`
   - Should return `verified_github_username`

3. **No commits detected**
   - Commits must be made on the current UTC day
   - Check GitHub API directly: `https://api.github.com/users/{username}/events`
   - Verify commit author matches verified username

4. **Agent check interval**
   - Agent checks every 5 minutes (LIFESTYLE_CHECK_INTERVAL)
   - Commits made just now may not be detected until next check

5. **Database not updated**
   - Agent should update `verifications` and `participants` tables
   - Check database directly for verification records

## Verification Flow

```
1. User pushes commit to GitHub
   ↓
2. Agent runs (every 5 min)
   ↓
3. Agent queries GitHub API for today's commits
   ↓
4. Agent verifies commit count >= min_commits_per_day
   ↓
5. Agent stores verification in database:
   - INSERT/UPDATE verifications table
   - UPDATE participants.days_verified
   ↓
6. Agent submits to smart contract (optional)
   ↓
7. Frontend fetches updated progress
   ↓
8. Progress bar updates
```

## Debugging Steps

### 1. Check Agent Logs
```bash
cd agent
tail -f agent.log
# Look for:
# - "Verifying GitHub commits for pool=..."
# - "GitHub verification: pool=..., commits_today=..."
# - "Stored verification in database"
# - "Updated days_verified for participant"
```

### 2. Check Database Directly
```sql
-- Check participant's days_verified
SELECT pool_id, wallet_address, days_verified, status 
FROM participants 
WHERE wallet_address = 'YOUR_WALLET';

-- Check verifications
SELECT * FROM verifications 
WHERE pool_id = POOL_ID 
  AND participant_wallet = 'YOUR_WALLET'
ORDER BY day DESC;

-- Count passed verifications
SELECT COUNT(*) FROM verifications 
WHERE pool_id = POOL_ID 
  AND participant_wallet = 'YOUR_WALLET'
  AND passed = true;
```

### 3. Check GitHub API Directly
```bash
# For specific repo
curl "https://api.github.com/repos/OWNER/REPO/commits?author=USERNAME&since=2025-12-02T00:00:00Z"

# For all repos (events)
curl "https://api.github.com/users/USERNAME/events"
```

### 4. Check Backend API
```bash
# Get participation data
curl "http://localhost:8000/api/users/YOUR_WALLET/participations"

# Get verification details
curl "http://localhost:8000/api/pools/POOL_ID/participants/YOUR_WALLET/verifications"
```

## Manual Verification (For Testing)

You can manually trigger verification by:

1. **Using the agent's demo script:**
```bash
cd agent
python demo.py verify --pool-id POOL_ID --day DAY_NUMBER
```

2. **Directly updating database** (not recommended, but for testing):
```sql
-- Insert verification
INSERT INTO verifications (pool_id, participant_wallet, day, passed, verification_type)
VALUES (POOL_ID, 'WALLET', DAY, true, 'github_commits');

-- Update days_verified
UPDATE participants 
SET days_verified = (
  SELECT COUNT(*) FROM verifications 
  WHERE pool_id = participants.pool_id 
    AND participant_wallet = participants.wallet_address 
    AND passed = true
)
WHERE pool_id = POOL_ID AND wallet_address = 'WALLET';
```

## Expected Behavior

- **Progress updates within 5 minutes** of making a commit (agent check interval)
- **Progress bar shows**: `(days_verified / duration_days) * 100`
- **Days Verified shows**: Count of days that passed verification
- **Verification history**: Shows each day's verification status

## Troubleshooting Checklist

- [ ] Agent is running (`ps aux | grep monitor`)
- [ ] GitHub username is verified (`GET /api/users/{wallet}/github`)
- [ ] Commits were made today (UTC timezone)
- [ ] Commits match verified GitHub username
- [ ] Agent logs show verification attempts
- [ ] Database has verification records
- [ ] Frontend is fetching latest data (check network tab)


