"""
Solana Actions (Blinks) endpoints.

Provides Action-compatible endpoints for joining pools from wallets or Blinks.
"""

from fastapi import APIRouter, HTTPException, Query, Request, Response, Body
from typing import Any, Dict, List
import logging
import os

from database import execute_query
from solana_tx_builder import get_tx_builder
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.options("/join-pool")
async def options_join_pool(request: Request):
    """Handle CORS preflight requests for join-pool action"""
    from fastapi.responses import Response
    origin = request.headers.get("origin")
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
        "Access-Control-Max-Age": "3600",
    }
    if origin and origin in settings.cors_origins_list:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return Response(status_code=200, headers=headers)


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
            base_url = "https://commitment-backend.onrender.com"
        
        # Ensure it starts with http/https
        if not base_url.startswith("http"):
            base_url = f"https://{base_url}"
        
        # Construct the full action URL
        action_href = f"{base_url}/solana/actions/join-pool?pool_id={pool_id}"

        # Get icon URL - use a default icon or pool-specific icon if available
        # Icon must be an absolute HTTP/HTTPS URL to SVG, PNG, or WebP
        icon_url = os.getenv("ACTION_ICON_URL", "https://commitment-backend.onrender.com/static/icon.png")
        # If pool has a custom icon, use it (future enhancement)
        # For now, use default icon

        # Solana Actions JSON schema for Twitter/X Blinks
        # Reference: https://docs.solana.com/developers/actions-and-blinks
        # Spec requires: type, icon, title, description, label, links.actions
        # Following Solana Actions specification for proper Blink recognition
        action = {
            "type": "action",  # Required: type of action
            "icon": icon_url,  # Required: absolute URL to icon image (SVG, PNG, or WebP)
            "title": title,
            "description": description,
            "label": f"Join Challenge ({stake_amount:.2f} SOL)",  # Button text at root level
            "links": {
                "actions": [
                    {
                        "type": "action",  # Type of linked action
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
                "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
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
async def build_join_pool_tx(
    request_body: Dict[str, Any] = Body(...),
    pool_id: int = Query(..., description="Pool ID to join")
) -> Dict[str, Any]:
    """
    POST handler for the join-pool Action.

    According to Solana Actions spec, POST request body should only contain:
    {"account": "<account>"}
    
    Parameters like pool_id should come from the URL query string.
    Returns a base64-encoded transaction as per Solana Actions spec.
    """
    try:
        # Validate pool_id is provided
        if pool_id is None:
            raise HTTPException(status_code=422, detail="Missing required query parameter: pool_id")
        
        account = request_body.get("account")
        if not account or not isinstance(account, str):
            raise HTTPException(status_code=400, detail="Missing or invalid 'account' in request body")

        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1,
        )
        if not pools:
            raise HTTPException(status_code=404, detail=f"Pool {pool_id} not found")
        pool = pools[0]
        if pool.get("status") not in ("pending", "active"):
            raise HTTPException(
                status_code=400, 
                detail=f"Pool {pool_id} is not joinable (status: {pool.get('status')})"
            )

        # Pre-check: For HODL challenges, verify wallet has required token balance BEFORE building transaction
        if pool.get("goal_type") == "hodl_token":
            goal_metadata = pool.get("goal_metadata") or {}
            token_mint = goal_metadata.get("token_mint")
            min_balance = goal_metadata.get("min_balance")

            if token_mint and min_balance is not None:
                try:
                    from solana.rpc.async_api import AsyncClient
                    from solana.rpc.commitment import Confirmed
                    from solders.pubkey import Pubkey
                    from solana.rpc.types import TokenAccountOpts
                    from config import settings

                    # SOL mint address (native SOL, not an SPL token)
                    SOL_MINT = "So11111111111111111111111111111111111111112"

                    # Get Solana client
                    rpc_url = settings.SOLANA_RPC_URL
                    solana_client = AsyncClient(rpc_url, commitment=Confirmed)
                    
                    try:
                        owner = Pubkey.from_string(account)
                        
                        # Handle native SOL specially
                        if token_mint == SOL_MINT:
                            balance = await solana_client.get_balance(owner, commitment=Confirmed)
                            total_balance = balance.value  # Already in lamports
                        else:
                            # For SPL tokens, use get_token_accounts_by_owner
                            mint = Pubkey.from_string(token_mint)
                            resp = await solana_client.get_token_accounts_by_owner(
                                owner,
                                TokenAccountOpts(mint=mint),
                                commitment=Confirmed,
                            )

                            total_balance = 0
                            if resp.value:
                                for acc in resp.value:
                                    try:
                                        data = acc.account.data
                                        if isinstance(data, dict) and "parsed" in data:
                                            parsed = data["parsed"]
                                            info = parsed.get("info", {})
                                            token_amt = info.get("tokenAmount", {})
                                            amount_str = token_amt.get("amount")
                                            if amount_str is not None:
                                                total_balance += int(amount_str)
                                    except Exception as parse_err:
                                        logger.warning(f"Error parsing token account for HODL pre-check: {parse_err}")

                        has_min_balance = total_balance >= int(min_balance)
                        logger.info(
                            "HODL pre-check: pool_id=%s wallet=%s mint=%s balance=%s min_required=%s passed=%s",
                            pool_id,
                            account,
                            token_mint,
                            total_balance,
                            min_balance,
                            has_min_balance,
                        )

                        if not has_min_balance:
                            # Assume 9 decimals (SOL / most SPL tokens) for human-friendly message
                            try:
                                human_min = int(min_balance) / 10**9
                            except Exception:
                                human_min = min_balance
                            raise HTTPException(
                                status_code=400,
                                detail=(
                                    f"You must already hold at least {human_min} tokens of this asset "
                                    "in your wallet to join this HODL challenge."
                                ),
                            )
                    finally:
                        await solana_client.close()
                except HTTPException:
                    # Re-raise explicit HTTP errors (like insufficient balance)
                    raise
                except Exception as e:
                    logger.error(
                        "Error during HODL pre-check for pool_id=%s wallet=%s: %s",
                        pool_id,
                        account,
                        e,
                        exc_info=True,
                    )
                    # Fail closed: if we cannot verify balance, reject join to avoid inconsistent state
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to verify token balance for HODL challenge join. Please try again.",
                    )

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
        
        # Return with proper headers for Solana Actions
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content=response,
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building join-pool transaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to build join-pool transaction")


@router.options("/create-pool")
async def options_create_pool(request: Request):
    """Handle CORS preflight requests for create-pool action"""
    from fastapi.responses import Response
    origin = request.headers.get("origin")
    headers = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
        "Access-Control-Max-Age": "3600",
    }
    # Only set origin if it's in allowed origins (CORS middleware should handle this, but be explicit)
    if origin and origin in settings.cors_origins_list:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return Response(status_code=200, headers=headers)


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


@router.options("/forfeit-pool")
async def options_forfeit_pool(request: Request):
    """Handle CORS preflight requests for forfeit-pool action"""
    from fastapi.responses import Response
    origin = request.headers.get("origin")
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
        "Access-Control-Max-Age": "3600",
    }
    if origin and origin in settings.cors_origins_list:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return Response(status_code=200, headers=headers)


@router.get(
    "/forfeit-pool",
    summary="Describe forfeit-pool Solana Action",
    description="Solana Action metadata for forfeiting a commitment pool.",
)
async def describe_forfeit_pool(
    pool_id: int = Query(..., description="Pool ID to forfeit")
) -> Dict[str, Any]:
    """
    GET handler for the forfeit-pool Action.
    
    Returns metadata about the forfeit action for Solana Actions/Blinks.
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
        
        title = f"Forfeit {pool.get('name', 'Challenge')}"
        description = f"Forfeit your participation in this challenge. You will lose your stake."
        
        base_url = settings.BASE_URL or "http://localhost:8000"
        action_href = f"{base_url}/solana/actions/forfeit-pool?pool_id={pool_id}"
        
        return {
            "type": "action",
            "title": title,
            "description": description,
            "icon": "🚪",
            "label": "Forfeit Challenge",
            "links": {
                "action": {
                    "href": action_href,
                    "method": "POST",
                }
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error describing forfeit-pool action for pool {pool_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to describe forfeit-pool action")


@router.post(
    "/forfeit-pool",
    summary="Build forfeit-pool transaction",
    description="Builds a Solana transaction for forfeiting a commitment pool.",
)
async def build_forfeit_pool_tx(
    request_body: Dict[str, Any] = Body(...),
    pool_id: int = Query(..., description="Pool ID to forfeit")
) -> Dict[str, Any]:
    """
    POST handler for the forfeit-pool Action.
    
    According to Solana Actions spec, POST request body should only contain:
    {"account": "<account>"}
    
    Parameters like pool_id should come from the URL query string.
    Returns a base64-encoded transaction as per Solana Actions spec.
    """
    try:
        account = request_body.get("account")
        if not account or not isinstance(account, str):
            raise HTTPException(status_code=400, detail="Missing or invalid 'account'")

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
            raise HTTPException(status_code=400, detail="Pool must be pending or active to forfeit")
        
        # Check if participant exists and is active
        participants = await execute_query(
            table="participants",
            operation="select",
            filters={
                "pool_id": pool_id,
                "wallet_address": account
            },
            limit=1
        )
        if not participants:
            raise HTTPException(status_code=404, detail="Participant not found in pool")
        
        participant = participants[0]
        if participant.get("status") != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Participant is not active (status: {participant.get('status')}). Cannot forfeit."
            )

        # Build real transaction using the transaction builder
        pool_id_int = int(pool_id)  # Ensure it's an int
        try:
            tx_builder = get_tx_builder()
            tx_b64 = await tx_builder.build_forfeit_pool_transaction(
                pool_id=pool_id_int,
                participant_wallet=account,
            )
        except Exception as e:
            logger.error(f"Failed to build forfeit_pool transaction: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to build transaction: {str(e)}"
            )
        
        pool_name = pool.get("name", "Challenge")
        response: Dict[str, Any] = {
            "transaction": tx_b64,
            "message": f"Forfeit {pool_name} - You will lose your stake",
        }
        
        # Return with proper headers for Solana Actions
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content=response,
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building forfeit-pool transaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to build forfeit-pool transaction")


