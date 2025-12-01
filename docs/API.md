# Commitment Agent API Documentation

FastAPI backend API for Commitment Agent.

Base URL: `http://localhost:8000` (development)

Interactive API documentation available at: `/docs` (Swagger UI) or `/redoc` (ReDoc)

## Authentication

Currently, the API does not require authentication. In production, implement wallet signature verification.

## Endpoints

### Health Check

#### `GET /health`

Check API health status.

**Response**:
```json
{
  "status": "ok",
  "service": "commitment-agent-backend",
  "version": "1.0.0"
}
```

---

### Pools

#### `GET /api/pools`

List active commitment pools.

**Query Parameters**:
- `status` (optional): Filter by pool status (`pending`, `active`, `ended`, `settled`)
- `limit` (optional): Maximum number of results (default: 50, max: 100)
- `offset` (optional): Number of results to skip (default: 0)

**Response**:
```json
[
  {
    "pool_id": 1234567890,
    "pool_pubkey": "ABC123...",
    "creator_wallet": "XYZ789...",
    "name": "Daily DCA Challenge",
    "description": "DCA $10 daily for 7 days",
    "goal_type": "DailyDCA",
    "goal_metadata": {
      "amount": 10000000,
      "token_mint": "So11111111111111111111111111111111111111112"
    },
    "stake_amount": 0.5,
    "duration_days": 7,
    "max_participants": 10,
    "participant_count": 3,
    "charity_address": "CHARITY123...",
    "status": "active",
    "start_timestamp": 1704067200,
    "end_timestamp": 1704672000,
    "is_public": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `GET /api/pools/{pool_id}`

Get detailed information about a specific pool.

**Path Parameters**:
- `pool_id`: Pool ID (integer)

**Response**: Same as pool object in list endpoint

**Errors**:
- `404`: Pool not found

#### `POST /api/pools`

Create a new commitment pool.

**Request Body**:
```json
{
  "pool_id": 1234567890,
  "pool_pubkey": "ABC123...",
  "creator_wallet": "XYZ789...",
  "name": "Daily DCA Challenge",
  "description": "DCA $10 daily for 7 days",
  "goal_type": "DailyDCA",
  "goal_metadata": {
    "amount": 10000000,
    "token_mint": "So11111111111111111111111111111111111111112"
  },
  "stake_amount": 0.5,
  "duration_days": 7,
  "max_participants": 10,
  "charity_address": "CHARITY123...",
  "start_timestamp": 1704067200,
  "end_timestamp": 1704672000,
  "is_public": true
}
```

**Response**: Created pool object (same format as GET response)

**Status Code**: `201 Created`

---

### Check-ins

#### `POST /api/checkins`

Submit a daily check-in for a lifestyle challenge.

**Request Body**:
```json
{
  "pool_id": 1234567890,
  "participant_wallet": "XYZ789...",
  "day": 3,
  "success": true,
  "screenshot_url": "https://example.com/screenshot.png"
}
```

**Response**:
```json
{
  "id": 1,
  "pool_id": 1234567890,
  "participant_wallet": "XYZ789...",
  "day": 3,
  "success": true,
  "screenshot_url": "https://example.com/screenshot.png",
  "timestamp": "2024-01-03T12:00:00Z"
}
```

**Status Code**: `201 Created`

**Notes**:
- If a check-in already exists for the same pool/wallet/day, it will be updated
- `screenshot_url` is optional

#### `GET /api/checkins/{pool_id}/{wallet}`

Get all check-ins for a specific user in a pool.

**Path Parameters**:
- `pool_id`: Pool ID (integer)
- `wallet`: Participant wallet address (string)

**Response**:
```json
[
  {
    "id": 1,
    "pool_id": 1234567890,
    "participant_wallet": "XYZ789...",
    "day": 1,
    "success": true,
    "screenshot_url": null,
    "timestamp": "2024-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "pool_id": 1234567890,
    "participant_wallet": "XYZ789...",
    "day": 2,
    "success": true,
    "screenshot_url": null,
    "timestamp": "2024-01-02T12:00:00Z"
  }
]
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "detail": "Additional error details (optional)"
}
```

**Common Status Codes**:
- `400`: Bad Request (invalid input)
- `404`: Not Found
- `500`: Internal Server Error

---

## Example cURL Requests

### List Pools

```bash
curl http://localhost:8000/api/pools
```

### Get Specific Pool

```bash
curl http://localhost:8000/api/pools/1234567890
```

### Create Pool

```bash
curl -X POST http://localhost:8000/api/pools \
  -H "Content-Type: application/json" \
  -d '{
    "pool_id": 1234567890,
    "pool_pubkey": "ABC123...",
    "creator_wallet": "XYZ789...",
    "name": "Daily DCA Challenge",
    "goal_type": "DailyDCA",
    "goal_metadata": {"amount": 10000000},
    "stake_amount": 0.5,
    "duration_days": 7,
    "max_participants": 10,
    "charity_address": "CHARITY123...",
    "start_timestamp": 1704067200,
    "end_timestamp": 1704672000
  }'
```

### Submit Check-in

```bash
curl -X POST http://localhost:8000/api/checkins \
  -H "Content-Type: application/json" \
  -d '{
    "pool_id": 1234567890,
    "participant_wallet": "XYZ789...",
    "day": 3,
    "success": true
  }'
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. In production, implement rate limiting to prevent abuse.

## CORS

CORS is configured to allow requests from:
- `http://localhost:3000` (development frontend)
- `http://localhost:3001` (alternative port)
- `https://commitment-agent.vercel.app` (production frontend)

Configure additional origins in `backend/config.py`.

