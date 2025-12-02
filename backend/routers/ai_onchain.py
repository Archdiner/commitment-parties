"""
AI On-Chain Action Builder.

Takes natural language descriptions and generates Solana program instructions.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel, Field
import logging
import httpx
import json

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class OnChainActionRequest(BaseModel):
    """Request model for AI on-chain action generation"""
    description: str = Field(..., min_length=1, max_length=2000, description="Natural language description of the on-chain action")
    action_type: str = Field(default="create_pool", description="Type of action: create_pool, join_pool, etc.")


class InstructionData(BaseModel):
    """Generated instruction data"""
    instruction_type: str
    accounts: List[Dict[str, str]]
    data: Dict[str, Any]
    description: str


class OnChainActionResponse(BaseModel):
    """Response model for generated on-chain action"""
    instruction: InstructionData
    estimated_fee: float
    required_signer: str
    warnings: List[str] = []


async def _call_llm(prompt: str) -> str:
    """Call LLM API to generate instruction data"""
    api_url = getattr(settings, "LLM_API_URL", None)
    api_key = getattr(settings, "LLM_API_KEY", None)

    if not api_url or not api_key:
        raise HTTPException(
            status_code=500,
            detail="LLM_API_URL and LLM_API_KEY must be configured for AI on-chain actions"
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": getattr(settings, "LLM_MODEL", "gpt-4o-mini"),
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert Solana developer. Generate exact instruction data for Solana program calls. "
                    "Respond with STRICT JSON ONLY, no explanations."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,  # Low temperature for deterministic output
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(api_url, json=payload, headers=headers)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"LLM API error: status={resp.status_code}, body={resp.text}"
            )

        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return content.strip()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="LLM API timeout")
    except Exception as e:
        logger.error(f"LLM call error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to call LLM: {str(e)}")


def _build_prompt(description: str, action_type: str) -> str:
    """Build prompt for LLM to generate Solana instruction"""
    return f"""
Generate a Solana program instruction for a commitment pool application.

User request: "{description}"
Action type: {action_type}

Available instruction types:
1. create_pool - Create a new commitment pool
   Required accounts:
     - pool_pubkey (PDA, derived from pool_id)
     - creator (signer)
     - system_program
   Data fields:
     - pool_id: int
     - name: string
     - stake_amount: float (in SOL)
     - duration_days: int
     - max_participants: int
     - goal_type: string (e.g., "hodl_token", "lifestyle_habit")
     - goal_metadata: object

2. join_pool - Join an existing pool
   Required accounts:
     - pool_pubkey
     - participant_pubkey (PDA, derived from pool + wallet)
     - participant_wallet (signer)
     - system_program
   Data fields:
     - pool_id: int
     - stake_amount: float

3. verify_participant - Verify participant progress (agent only)
   Required accounts:
     - pool_pubkey
     - participant_pubkey
     - verifier (signer)
   Data fields:
     - pool_id: int
     - participant_wallet: string
     - day: int
     - passed: boolean

4. distribute_rewards - Distribute pool rewards (agent only)
   Required accounts:
     - pool_pubkey
     - creator
     - system_program
   Data fields:
     - pool_id: int

Return JSON in this exact format:
{{
  "instruction_type": "create_pool",
  "accounts": [
    {{"name": "pool_pubkey", "pubkey": "PDA", "is_signer": false, "is_writable": true}},
    {{"name": "creator", "pubkey": "USER_WALLET", "is_signer": true, "is_writable": true}},
    {{"name": "system_program", "pubkey": "11111111111111111111111111111111", "is_signer": false, "is_writable": false}}
  ],
  "data": {{
    "pool_id": 1234567890,
    "name": "30-Day HODL Challenge",
    "stake_amount": 0.5,
    "duration_days": 30,
    "max_participants": 10,
    "goal_type": "hodl_token",
    "goal_metadata": {{"token_mint": "So11111111111111111111111111111111111111112", "min_balance": 1000000000}}
  }},
  "description": "Creates a 30-day HODL challenge for 0.5 SOL"
}}

Rules:
- Use realistic values based on the user's description
- For PDAs, use "PDA" as the pubkey (will be derived on-chain)
- For user wallet, use "USER_WALLET" (will be replaced with actual wallet)
- Ensure all required accounts are included
- Data fields must match the instruction type
- Return JSON ONLY, no markdown, no explanations
"""


@router.post(
    "/generate",
    response_model=OnChainActionResponse,
    summary="Generate on-chain action from natural language",
    description="Convert natural language description into Solana program instruction data",
)
async def generate_onchain_action(body: OnChainActionRequest) -> OnChainActionResponse:
    """Generate Solana instruction from natural language description"""
    try:
        prompt = _build_prompt(body.description, body.action_type)
        raw = await _call_llm(prompt)

        # Parse JSON response
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`")
            brace_index = text.find("{")
            if brace_index != -1:
                text = text[brace_index:]

        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON: {raw}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse LLM response as JSON: {e}"
            )

        # Validate instruction structure
        if "instruction_type" not in data or "accounts" not in data or "data" not in data:
            raise HTTPException(
                status_code=500,
                detail="Invalid instruction structure from LLM"
            )

        instruction = InstructionData(
            instruction_type=data["instruction_type"],
            accounts=data["accounts"],
            data=data["data"],
            description=data.get("description", body.description),
        )

        # Estimate fee (base transaction fee + compute units)
        estimated_fee = 0.000005  # ~5000 lamports base fee

        # Determine required signer
        required_signer = "USER_WALLET"
        for acc in instruction.accounts:
            if acc.get("is_signer") and acc.get("name") != "system_program":
                required_signer = acc.get("pubkey", "USER_WALLET")
                break

        warnings = []
        if body.action_type == "create_pool" and instruction.data.get("stake_amount", 0) > 10:
            warnings.append("Stake amount exceeds recommended maximum (10 SOL)")
        if instruction.data.get("duration_days", 0) > 90:
            warnings.append("Duration exceeds recommended maximum (90 days)")

        return OnChainActionResponse(
            instruction=instruction,
            estimated_fee=estimated_fee,
            required_signer=required_signer,
            warnings=warnings,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating on-chain action: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate on-chain action: {str(e)}"
        )

