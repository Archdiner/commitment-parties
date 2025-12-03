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
        # Use request URL base if available, otherwise fall back to config
        if request:
            base_url = str(request.base_url).rstrip('/')
        else:
            # Fallback: construct from common patterns
            base_url = os.getenv("ACTION_BASE_URL", "https://api.commitment-parties.xyz")
            if not base_url.startswith("http"):
                base_url = f"https://{base_url}"
        
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


