"""
Solana Actions (Blinks) endpoints.

Provides Action-compatible endpoints for joining pools from wallets or Blinks.
"""

from fastapi import APIRouter, HTTPException, Query, Request, Response
from typing import Any, Dict, List
import logging
import os

from database import execute_query
from solana_tx_builder import get_tx_builder
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/join-pool",
    summary="Describe join-pool Solana Action",
    description="Solana Action metadata for joining a commitment pool.",
)
async def describe_join_pool(
    request: Request,
    pool_id: int = Query(..., description="Pool ID to join")
) -> Dict[str, Any]:
    """
    GET handler for the join-pool Action.

    Returns metadata describing the action so wallets/Blinks can render UI.
    Follows Solana Actions specification for Twitter/X Blinks.
    """
    try:
        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1,
        )
        if not pools:
            raise HTTPException(status_code=404, detail="Pool not found")
        pool = pools[0]
        if pool.get("status") not in ("pending", "active"):
            raise HTTPException(status_code=400, detail="Pool is not joinable")

        title = f"Join {pool.get('name', 'Challenge')}"
        description = pool.get("description") or "Join this commitment challenge and stake SOL."
        stake_amount = pool.get("stake_amount", 0.0)
        
        # Build full URL for the action endpoint
        # Priority: 1) Environment variable, 2) Request URL, 3) Default
        base_url = None
        
        # Try environment variable first (for Render deployment)
        env_base_url = os.getenv("ACTION_BASE_URL") or os.getenv("BACKEND_URL")
        if env_base_url:
            base_url = env_base_url.rstrip('/')
            # Remove /solana/actions if present (we'll add it)
            if base_url.endswith('/solana/actions'):
                base_url = base_url[:-15]
        
        # Fallback to request URL if no env var
        if not base_url and request:
            base_url = str(request.base_url).rstrip('/')
        
        # Final fallback
        if not base_url:
            base_url = "https://api.commitment-parties.xyz"
        
        # Ensure it starts with http/https
        if not base_url.startswith("http"):
            base_url = f"https://{base_url}"
        
        # Construct the full action URL
        action_href = f"{base_url}/solana/actions/join-pool?pool_id={pool_id}"

        # Solana Actions JSON schema for Twitter/X Blinks
        # Reference: https://docs.solanamobile.com/reference/actions
        action = {
            "type": "action",
            "title": title,
            "description": description,
            "icon": None,  # Optional: can add icon URL later
            "links": {
                "actions": [
                    {
                        "label": f"Join Challenge ({stake_amount:.2f} SOL)",
                        "href": action_href,
                    }
                ]
            },
        }
        
        # Return with proper headers for Twitter/X to recognize as Solana Action
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content=action,
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",  # Allow Twitter/X to fetch
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error describing join-pool action for pool {pool_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to describe join-pool action")


@router.post(
    "/join-pool",
    summary="Build join-pool transaction",
    description="Builds a Solana transaction for joining a commitment pool.",
)
async def build_join_pool_tx(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST handler for the join-pool Action.

    Expects a request body that includes the user's wallet account and pool_id.
    Returns a base64-encoded transaction as per Solana Actions spec.
    """
    try:
        account = request.get("account")
        pool_id = request.get("pool_id")
        if not account or not isinstance(account, str):
            raise HTTPException(status_code=400, detail="Missing or invalid 'account'")
        if pool_id is None:
            raise HTTPException(status_code=400, detail="Missing 'pool_id'")

        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1,
        )
        if not pools:
            raise HTTPException(status_code=404, detail="Pool not found")
        pool = pools[0]
        if pool.get("status") not in ("pending", "active"):
            raise HTTPException(status_code=400, detail="Pool is not joinable")

        # Build real transaction using the transaction builder
        pool_id_int = int(pool_id)  # Ensure it's an int
        try:
            tx_builder = get_tx_builder()
            tx_b64 = await tx_builder.build_join_pool_transaction(
                pool_id=pool_id_int,
                participant_wallet=account,
            )
        except Exception as e:
            logger.error(f"Failed to build join_pool transaction: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to build transaction: {str(e)}"
            )
        
        stake_amount = pool.get("stake_amount", 0.0)
        pool_name = pool.get("name", "Challenge")
        response: Dict[str, Any] = {
            "transaction": tx_b64,
            "message": f"Join {pool_name} with {stake_amount:.2f} SOL",
        }
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building join-pool transaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to build join-pool transaction")


@router.post(
    "/create-pool",
    summary="Build create-pool transaction",
    description="Builds a Solana transaction for creating a commitment pool.",
)
async def build_create_pool_tx(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST handler for the create-pool Action.

    Expects a request body that includes:
      - account: creator wallet address (string)
      - pool_id: unique pool ID (int)
      - goal_type: 'lifestyle_habit' | 'hodl_token'
      - goal_params: dict (see agent OnChainClient.create_pool_on_chain)
      - stake_amount_lamports: int
      - duration_days: int
      - max_participants: int
      - min_participants: int
      - charity_address: string
      - distribution_mode: string (optional, default 'competitive')
      - winner_percent: int (optional, default 100)
    """
    try:
        account = request.get("account")
        pool_id = request.get("pool_id")
        goal_type = request.get("goal_type")
        goal_params = request.get("goal_params") or {}
        stake_amount_lamports = request.get("stake_amount_lamports")
        duration_days = request.get("duration_days")
        max_participants = request.get("max_participants")
        min_participants = request.get("min_participants")
        charity_address = request.get("charity_address")
        distribution_mode = request.get("distribution_mode", "competitive")
        winner_percent = int(request.get("winner_percent", 100))

        if not account or not isinstance(account, str):
            raise HTTPException(status_code=400, detail="Missing or invalid 'account'")
        if pool_id is None:
            raise HTTPException(status_code=400, detail="Missing 'pool_id'")
        if goal_type not in ("lifestyle_habit", "hodl_token"):
            raise HTTPException(status_code=400, detail="Invalid or missing 'goal_type'")
        if stake_amount_lamports is None or duration_days is None:
            raise HTTPException(status_code=400, detail="Missing stake_amount_lamports or duration_days")
        if max_participants is None or min_participants is None:
            raise HTTPException(status_code=400, detail="Missing max_participants or min_participants")
        if not charity_address or not isinstance(charity_address, str):
            raise HTTPException(status_code=400, detail="Missing or invalid 'charity_address'")

        pool_id_int = int(pool_id)
        stake_lamports_int = int(stake_amount_lamports)
        duration_days_int = int(duration_days)
        max_participants_int = int(max_participants)
        min_participants_int = int(min_participants)

        try:
            tx_builder = get_tx_builder()
            tx_b64 = await tx_builder.build_create_pool_transaction(
                pool_id=pool_id_int,
                creator_wallet=account,
                goal_type=goal_type,
                goal_params=goal_params,
                stake_amount_lamports=stake_lamports_int,
                duration_days=duration_days_int,
                max_participants=max_participants_int,
                min_participants=min_participants_int,
                charity_address=charity_address,
                distribution_mode=distribution_mode,
                winner_percent=winner_percent,
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to build create_pool transaction: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to build create-pool transaction: {str(e)}",
            )

        response: Dict[str, Any] = {
            "transaction": tx_b64,
            "message": "Create commitment pool",
        }
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building create-pool transaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to build create-pool transaction")


