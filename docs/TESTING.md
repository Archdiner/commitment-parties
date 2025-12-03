# Testing Guide

Complete guide for testing Commitment Agent components.

## Testing Strategy

### 1. Smart Contract Tests (Anchor)

**Location**: `programs/commitment-pool/tests/`

#### Setup

```bash
cd programs/commitment-pool

# Start local validator (in separate terminal)
solana-test-validator

# In another terminal, configure for local
solana config set --url http://localhost:8899

# Airdrop SOL for testing
solana airdrop 2

# Run tests
anchor test
```

#### Test Structure

```typescript
describe("commitment-pool", () => {
  // Setup provider and program
  
  it("Creates a pool", async () => {
    // Test pool creation
  });
  
  it("Allows joining a pool", async () => {
    // Test joining with stake transfer
  });
  
  it("Verifies participant", async () => {
    // Test verification submission
  });
  
  it("Distributes rewards", async () => {
    // Test reward distribution
  });
});
```

#### Manual Testing on Devnet

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Test with Solana CLI
solana program show <PROGRAM_ID>

# Use Solscan to verify transactions
# https://solscan.io/account/<PROGRAM_ID>?cluster=devnet
```

### 2. Backend API Tests

**Location**: `backend/` (create `tests/` directory)

#### Setup

```bash
cd backend
source ../venv/bin/activate

# Install test dependencies
pip install pytest pytest-asyncio httpx
```

#### Create Test File

```python
# backend/tests/test_pools.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_list_pools():
    response = client.get("/api/pools")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_pool():
    pool_data = {
        "pool_id": 1234567890,
        "pool_pubkey": "TestPubkey1111111111111111111111111111111",
        "creator_wallet": "TestWallet111111111111111111111111111111",
        "name": "Test Pool",
        "goal_type": "DailyDCA",
        "goal_metadata": {"amount": 1000000},
        "stake_amount": 0.1,
        "duration_days": 7,
        "max_participants": 10,
        "charity_address": "Charity1111111111111111111111111111111",
        "start_timestamp": 1704067200,
        "end_timestamp": 1704672000
    }
    response = client.post("/api/pools", json=pool_data)
    assert response.status_code == 201
    assert response.json()["pool_id"] == 1234567890
```

#### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest tests/test_pools.py

# Run with verbose output
pytest -v
```

#### Manual API Testing

```bash
# Start backend
uvicorn main:app --reload

# Test endpoints with curl
curl http://localhost:8000/health
curl http://localhost:8000/api/pools
curl http://localhost:8000/docs  # Interactive API docs
```

### 3. Agent Tests

**Location**: `agent/tests/` (create directory)

#### Setup

```bash
cd agent
source ../venv/bin/activate

# Install test dependencies
pip install pytest pytest-asyncio pytest-mock
```

#### Create Test File

```python
# agent/tests/test_monitor.py
import pytest
from unittest.mock import Mock, AsyncMock
from src.monitor import Monitor
from src.solana_client import SolanaClient

@pytest.fixture
def mock_solana_client():
    client = Mock(spec=SolanaClient)
    client.get_transactions = AsyncMock(return_value=[])
    client.get_balance = AsyncMock(return_value=1000000000)
    return client

@pytest.mark.asyncio
async def test_monitor_initialization(mock_solana_client):
    monitor = Monitor(mock_solana_client)
    assert monitor.solana_client is not None
```

#### Run Tests

```bash
pytest tests/
```

### 4. Integration Tests

#### End-to-End Flow

1. **Create Pool**
   ```bash
   # Via API
   curl -X POST http://localhost:8000/api/pools -H "Content-Type: application/json" -d '{...}'
   
   # Verify on-chain
   solana account <POOL_PDA>
   ```

2. **Join Pool**
   ```bash
   # Via frontend or direct Anchor call
   # Verify stake transferred to vault
   solana account <VAULT_PDA>
   ```

3. **Submit Check-in**
   ```bash
   curl -X POST http://localhost:8000/api/checkins \
     -H "Content-Type: application/json" \
     -d '{"pool_id": 123, "participant_wallet": "...", "day": 1, "success": true}'
   ```

4. **Agent Verification**
   ```bash
   # Run agent
   python src/main.py
   
   # Check logs for verification submissions
   tail -f agent.log
   ```

## Testing Checklist

### Smart Contracts
- [ ] Pool creation works
- [ ] Join pool transfers SOL correctly
- [ ] Participant account created
- [ ] Verification updates status
- [ ] Distribution calculates correctly
- [ ] Error cases handled (pool full, invalid amounts, etc.)

### Backend API
- [ ] Health check responds
- [ ] List pools returns data
- [ ] Create pool stores in database
- [ ] Check-in submission works
- [ ] Error handling returns proper status codes
- [ ] CORS configured correctly

### Agent
- [ ] Connects to Solana RPC
- [ ] Loads program correctly
- [ ] Monitoring loops run
- [ ] Verification submissions work
- [ ] Error handling and retries

### Database
- [ ] Schema applied correctly
- [ ] Indexes created
- [ ] Triggers work (updated_at)
- [ ] Foreign keys enforced
- [ ] Unique constraints work

## Debugging Tips

### Smart Contracts

```bash
# View program logs
solana logs

# Check account data
anchor account <ACCOUNT_PUBKEY>

# View transaction details
solana confirm <TX_SIGNATURE>
```

### Backend

```python
# Add debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Use FastAPI's interactive docs
# http://localhost:8000/docs
```

### Agent

```python
# Enable debug mode in config
DEBUG=true

# Check logs
tail -f agent.log

# Test individual functions
python -c "from src.monitor import Monitor; ..."
```

## Performance Testing

### Load Testing (Backend)

```bash
# Install Apache Bench
brew install httpd  # macOS

# Test endpoint
ab -n 1000 -c 10 http://localhost:8000/api/pools
```

### RPC Rate Limits

- Solana devnet: ~40 requests/second
- Use connection pooling
- Implement retry logic with backoff

## Test Data

Use `scripts/seed-data.sql` to populate test data:

```bash
# In Supabase SQL Editor
# Copy and paste seed-data.sql
# Run to create test users and pools
```


