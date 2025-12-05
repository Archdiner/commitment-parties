"""
Pool management endpoints.

Handles CRUD operations for commitment pools.
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from typing import Optional, List
import logging
import time
from datetime import datetime, timezone, timedelta
import sys
import os
import base64
from io import BytesIO

from models import PoolCreate, PoolResponse, ErrorResponse, PoolConfirmRequest, JoinPoolConfirmRequest
from database import execute_query
from config import settings
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solders.pubkey import Pubkey

# Initialize logger first before any try/except blocks that use it
logger = logging.getLogger(__name__)

# Add agent src to path for verification logic
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'agent', 'src'))
try:
    from monitor import Monitor
    from solana_client import SolanaClient
    from verify import Verifier
    AGENT_AVAILABLE = True
except ImportError:
    AGENT_AVAILABLE = False
    logger.warning("Agent modules not available, GitHub verification endpoint will be limited")

# Try to import solders for PDA derivation, fallback if not available
try:
    from solders.pubkey import Pubkey
    SOLDERS_AVAILABLE = True
except ImportError:
    SOLDERS_AVAILABLE = False
    logger.warning("solders not available, participant_pubkey will be placeholder")

router = APIRouter()


# Lazy-initialized Solana RPC client for lightweight read-only checks
_solana_client: Optional[AsyncClient] = None


async def get_solana_client() -> AsyncClient:
    """
    Get or create a shared AsyncClient for Solana RPC.
    This is intentionally lightweight compared to the full agent SolanaClient.
    """
    global _solana_client
    if _solana_client is None:
        rpc_url = settings.SOLANA_RPC_URL
        _solana_client = AsyncClient(rpc_url, commitment=Confirmed)
        logger.info(f"Initialized backend Solana AsyncClient for RPC URL: {rpc_url}")
    return _solana_client


@router.get(
    "/",
    response_model=List[PoolResponse],
    summary="List active pools",
    description="Get a list of active commitment pools with optional filtering",
)
async def list_pools(
    status: Optional[str] = Query(None, description="Filter by pool status"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    wallet: Optional[str] = Query(None, description="Wallet address for filtering private pools"),
) -> List[PoolResponse]:
    """
    List all active pools.
    
    Supports filtering by status and pagination.
    For private pools, only shows pools where:
    - wallet is the creator, OR
    - wallet has an invite
    """
    try:
        # Get all pools
        results = await execute_query(
            table="pools",
            operation="select",
            limit=limit * 2,  # Get more to account for filtering
        )
        
        # Filter by status if provided
        if status:
            results = [r for r in results if r.get("status") == status]
        else:
            # Default: only active/pending
            results = [
                r for r in results 
                if r.get("status") in ["pending", "active"]
            ]
        
        # Filter by public/private visibility and exclude pools user already joined
        if wallet:
            # Get pools user is already a participant in
            user_participants = await execute_query(
                table="participants",
                operation="select",
                filters={"wallet_address": wallet},
            )
            joined_pool_ids = {p.get("pool_id") for p in user_participants if p.get("pool_id")}
            
            filtered_results = []
            for pool in results:
                pool_id = pool.get("pool_id")
                
                # Skip pools user is already in
                if pool_id in joined_pool_ids:
                    continue
                
                is_public = pool.get("is_public", True)
                creator_wallet = pool.get("creator_wallet")
                
                if is_public:
                    # Public pools: show to everyone
                    filtered_results.append(pool)
                elif creator_wallet == wallet:
                    # Private pools: show to creator
                    filtered_results.append(pool)
                else:
                    # Private pools: check if wallet has invite
                    from database import execute_query as db_query
                    invites = await db_query(
                        table="pool_invites",
                        operation="select",
                        filters={
                            "pool_id": pool_id,
                            "invitee_wallet": wallet,
                        },
                        limit=1,
                    )
                    if invites:
                        filtered_results.append(pool)
            results = filtered_results
        else:
            # No wallet provided: only show public pools
            results = [r for r in results if r.get("is_public", True)]
        
        # Apply offset and limit
        results = results[offset:offset + limit]
        
        return [PoolResponse(**result) for result in results]
    
    except Exception as e:
        logger.error(f"Error listing pools: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch pools")


@router.get(
    "/{pool_id}",
    response_model=PoolResponse,
    summary="Get pool by ID",
    description="Get detailed information about a specific pool",
    responses={404: {"model": ErrorResponse}},
)
async def get_pool(pool_id: int) -> PoolResponse:
    """Get a specific pool by ID."""
    try:
        results = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1,
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="Pool not found")
        
        return PoolResponse(**results[0])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pool {pool_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch pool")


@router.post(
    "/",
    response_model=PoolResponse,
    status_code=201,
    summary="Create a new pool",
    description="Create a new commitment pool with the specified parameters",
)
async def create_pool(pool_data: PoolCreate) -> PoolResponse:
    """Create a new commitment pool."""
    try:
        # Ensure creator user exists (auto-create if not)
        creator_wallet = pool_data.creator_wallet
        try:
            users = await execute_query(
                table="users",
                operation="select",
                filters={"wallet_address": creator_wallet},
                limit=1
            )
            
            if not users:
                # Auto-create user
                user_data = {
                    "wallet_address": creator_wallet,
                    "username": None,
                    "twitter_handle": None,
                    "reputation_score": 100,
                    "total_games": 0,
                    "games_completed": 0,
                    "total_earned": 0.0,
                    "streak_count": 0
                }
                await execute_query(
                    table="users",
                    operation="insert",
                    data=user_data
                )
                logger.info(f"Auto-created user {creator_wallet}")
        except Exception as e:
            # User might already exist (race condition), continue anyway
            if "unique" not in str(e).lower() and "duplicate" not in str(e).lower():
                logger.warning(f"Error checking/creating user: {e}")
        
        # Convert to dict for database insertion
        pool_dict = pool_data.model_dump()
        pool_dict["status"] = "pending"
        
        # Insert into database
        results = await execute_query(
            table="pools",
            operation="insert",
            data=pool_dict,
        )
        
        if not results:
            raise HTTPException(status_code=500, detail="Failed to create pool")
        
        logger.info(f"Created pool {pool_data.pool_id}")
        return PoolResponse(**results[0])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating pool: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create pool")


@router.post(
    "/create/confirm",
    response_model=PoolResponse,
    status_code=201,
    summary="Confirm pool creation after on-chain transaction",
    description="Stores pool metadata in database after successful on-chain creation",
)
async def confirm_pool_creation(pool_data: PoolConfirmRequest) -> PoolResponse:
    """Confirm pool creation after on-chain transaction."""
    try:
        # Ensure creator user exists (auto-create if not)
        creator_wallet = pool_data.creator_wallet
        try:
            users = await execute_query(
                table="users",
                operation="select",
                filters={"wallet_address": creator_wallet},
                limit=1
            )
            
            if not users:
                # Auto-create user
                user_data = {
                    "wallet_address": creator_wallet,
                    "username": None,
                    "twitter_handle": None,
                    "reputation_score": 100,
                    "total_games": 0,
                    "games_completed": 0,
                    "total_earned": 0.0,
                    "streak_count": 0
                }
                await execute_query(
                    table="users",
                    operation="insert",
                    data=user_data
                )
                logger.info(f"Auto-created user {creator_wallet}")
        except Exception as e:
            # User might already exist (race condition), continue anyway
            if "unique" not in str(e).lower() and "duplicate" not in str(e).lower():
                logger.warning(f"Error checking/creating user: {e}")
        
        # Check if pool already exists
        existing = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_data.pool_id},
            limit=1
        )
        
        if existing:
            logger.warning(f"Pool {pool_data.pool_id} already exists, updating...")
            # Update existing pool with transaction signature
            pool_dict = pool_data.model_dump()
            pool_dict["participant_count"] = 0
            pool_dict["total_staked"] = 0.0
            pool_dict["yield_earned"] = 0.0
            
            # Calculate scheduled_start_time based on recruitment_period_hours
            import time
            recruitment_hours = pool_dict.get("recruitment_period_hours", 24)  # Default to 24 hours
            current_time = int(time.time())
            
            if recruitment_hours > 0:
                # Scheduled start: current time + recruitment period
                pool_dict["scheduled_start_time"] = current_time + (recruitment_hours * 3600)
                pool_dict["start_timestamp"] = pool_dict["scheduled_start_time"]
                pool_dict["end_timestamp"] = pool_dict["start_timestamp"] + (pool_dict["duration_days"] * 86400)
                pool_dict["status"] = "pending"  # Will be activated by agent
            else:
                # Immediate start: activate immediately
                pool_dict["scheduled_start_time"] = None
                pool_dict["start_timestamp"] = current_time
                pool_dict["end_timestamp"] = pool_dict["start_timestamp"] + (pool_dict["duration_days"] * 86400)
                pool_dict["status"] = "active"  # Activate immediately
            
            results = await execute_query(
                table="pools",
                operation="update",
                filters={"pool_id": pool_data.pool_id},
                data=pool_dict
            )
            
            if not results:
                raise HTTPException(status_code=500, detail="Failed to update pool")
            
            return PoolResponse(**results[0])
        
        # Convert to dict for database insertion
        pool_dict = pool_data.model_dump()
        pool_dict["participant_count"] = 0
        pool_dict["total_staked"] = 0.0
        pool_dict["yield_earned"] = 0.0
        
        # Ensure min_participants is set (default to 1 if not provided)
        if "min_participants" not in pool_dict or pool_dict["min_participants"] is None:
            pool_dict["min_participants"] = 1
        
        # Calculate scheduled_start_time based on recruitment_period_hours
        import time
        recruitment_hours = pool_dict.get("recruitment_period_hours", 24)  # Default to 24 hours
        current_time = int(time.time())
        
        if recruitment_hours > 0:
            # Scheduled start: current time + recruitment period
            pool_dict["scheduled_start_time"] = current_time + (recruitment_hours * 3600)
            # Update start_timestamp to scheduled time (for end_timestamp calculation)
            pool_dict["start_timestamp"] = pool_dict["scheduled_start_time"]
            pool_dict["end_timestamp"] = pool_dict["start_timestamp"] + (pool_dict["duration_days"] * 86400)
            pool_dict["status"] = "pending"  # Will be activated by agent at scheduled time
        else:
            # Immediate start: activate immediately
            pool_dict["scheduled_start_time"] = None
            pool_dict["start_timestamp"] = current_time
            pool_dict["end_timestamp"] = pool_dict["start_timestamp"] + (pool_dict["duration_days"] * 86400)
            pool_dict["status"] = "active"  # Activate immediately
            # Activate immediately for immediate start
            pool_dict["status"] = "active"
        
        # Remove transaction_signature from dict (not in database schema)
        pool_dict.pop("transaction_signature", None)
        
        # Insert into database
        results = await execute_query(
            table="pools",
            operation="insert",
            data=pool_dict,
        )
        
        if not results:
            raise HTTPException(status_code=500, detail="Failed to create pool")
        
        logger.info(f"Confirmed pool creation {pool_data.pool_id} with signature {pool_data.transaction_signature}")
        return PoolResponse(**results[0])
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error confirming pool creation: {e}", exc_info=True)
        # Return more detailed error for debugging
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to confirm pool creation: {error_msg}"
        )


@router.get(
    "/{pool_id}/participants/{wallet}/verifications",
    summary="Get participant verification status",
    description="Get all verifications for a participant in a pool",
)
async def get_participant_verifications(
    pool_id: int,
    wallet: str,
) -> dict:
    """Get verification status for a participant."""
    try:
        # Get participant info
        participants = await execute_query(
            table="participants",
            operation="select",
            filters={
                "pool_id": pool_id,
                "wallet_address": wallet
            },
            limit=1
        )
        
        if not participants:
            raise HTTPException(status_code=404, detail="Participant not found in pool")
        
        participant = participants[0]
        
        # Get all verifications
        verifications = await execute_query(
            table="verifications",
            operation="select",
            filters={
                "pool_id": pool_id,
                "participant_wallet": wallet
            }
        )
        
        # Get pool info for context
        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1
        )
        
        pool = pools[0] if pools else {}
        current_time = int(time.time())
        start_timestamp = pool.get("start_timestamp", 0)
        current_day = None
        if start_timestamp and current_time >= start_timestamp:
            days_elapsed = (current_time - start_timestamp) // 86400
            current_day = days_elapsed + 1

        # Calculate next verification window end (approximate daily windows)
        grace_value = pool.get("grace_period_minutes", 5)
        # Respect explicit 0; only default when value is missing/None
        if grace_value is None:
            grace_value = 5
        grace_minutes = int(grace_value)
        grace_seconds = grace_minutes * 60
        next_window_end = None
        if start_timestamp:
            if current_time < start_timestamp:
                # Before pool start: first window ends after first day minus grace
                next_window_end = start_timestamp + 86400 - grace_seconds
            else:
                days_elapsed = (current_time - start_timestamp) // 86400
                window_end = start_timestamp + (days_elapsed + 1) * 86400 - grace_seconds
                if current_time <= window_end:
                    next_window_end = window_end
                else:
                    # Move to next day
                    next_window_end = start_timestamp + (days_elapsed + 2) * 86400 - grace_seconds

        return {
            "pool_id": pool_id,
            "wallet_address": wallet,
            "days_verified": participant.get("days_verified", 0),
            "status": participant.get("status", "active"),
            "current_day": current_day,
            "verifications": [
                {
                    "day": v.get("day"),
                    "passed": v.get("passed"),
                    "verification_type": v.get("verification_type"),
                    "verified_at": v.get("verified_at")
                }
                for v in verifications
            ],
            "total_verifications": len(verifications),
            "passed_verifications": len([v for v in verifications if v.get("passed")]),
            "next_window_end": next_window_end,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching verifications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch verifications: {str(e)}")


@router.get(
    "/{pool_id}/stats",
    summary="Get aggregate pool stats",
    description="Returns simple aggregate stats for a pool (started / remaining participants).",
)
async def get_pool_stats(pool_id: int) -> dict:
    """Get aggregate stats for a pool."""
    try:
        participants = await execute_query(
            table="participants",
            operation="select",
            filters={"pool_id": pool_id},
        )
        started = len(participants)
        remaining = len(
            [
                p
                for p in participants
                if p.get("status") in ("active", "pending", None)
            ]
        )
        return {
            "pool_id": pool_id,
            "started": started,
            "remaining": remaining,
        }
    except Exception as e:
        logger.error(f"Error fetching pool stats for {pool_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch pool stats")


@router.post(
    "/{pool_id}/participants/{wallet}/verify-github",
    summary="Trigger immediate GitHub verification",
    description="Immediately checks GitHub commits for today and verifies the user if sufficient commits are found.",
)
async def trigger_github_verification(pool_id: int, wallet: str) -> dict:
    """
    Trigger immediate GitHub verification for a participant.
    
    This endpoint:
    1. Checks if the pool is a GitHub challenge
    2. Verifies the user's GitHub commits for today
    3. If sufficient commits found, marks them as verified for the day
    4. Flags them as complete so the agent doesn't check them again today
    """
    try:
        # Get pool information
        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1
        )
        
        if not pools:
            raise HTTPException(status_code=404, detail="Pool not found")
        
        pool = pools[0]
        goal_metadata = pool.get("goal_metadata") or {}
        habit_type = goal_metadata.get("habit_type")
        
        # Verify this is a GitHub challenge
        if habit_type != "github_commits":
            raise HTTPException(
                status_code=400,
                detail="This endpoint is only for GitHub commit challenges"
            )
        
        # Get participant
        participants = await execute_query(
            table="participants",
            operation="select",
            filters={
                "pool_id": pool_id,
                "wallet_address": wallet
            },
            limit=1
        )
        
        if not participants:
            raise HTTPException(status_code=404, detail="Participant not found in pool")
        
        participant = participants[0]
        
        # Calculate current day
        start_timestamp = pool.get("start_timestamp") or pool.get("scheduled_start_time")
        if not start_timestamp:
            raise HTTPException(status_code=400, detail="Pool start timestamp not found")
        
        current_time = int(time.time())
        if current_time < start_timestamp:
            raise HTTPException(
                status_code=400,
                detail="Pool has not started yet"
            )
        
        days_elapsed = (current_time - start_timestamp) // 86400
        current_day = days_elapsed + 1
        
        # Check if user is already verified for today
        existing_verifications = await execute_query(
            table="verifications",
            operation="select",
            filters={
                "pool_id": pool_id,
                "participant_wallet": wallet,
                "day": current_day
            },
            limit=1
        )
        
        if existing_verifications:
            existing = existing_verifications[0]
            proof_data = existing.get("proof_data") or {}
            # Check if already verified and flagged as complete for today
            if existing.get("passed") and proof_data.get("daily_complete"):
                return {
                    "verified": True,
                    "message": "Already verified for today",
                    "day": current_day
                }
        
        # Use agent's verification logic if available
        if AGENT_AVAILABLE:
            try:
                # Initialize minimal Monitor for verification
                solana_client = SolanaClient(
                    rpc_url=settings.SOLANA_RPC_URL,
                    program_id=settings.PROGRAM_ID,
                )
                await solana_client.initialize()
                verifier = Verifier(solana_client)
                monitor = Monitor(solana_client, verifier)
                
                # Verify GitHub commits
                passed, checked_commit_shas = await monitor.verify_github_commits(
                    pool, participant, current_day
                )
                
                if passed is True:
                    # User has sufficient commits - verify them
                    proof_data = {
                        "verified_at": datetime.now(timezone.utc).isoformat(),
                        "habit_type": "github_commits",
                        "checked_commit_shas": checked_commit_shas,
                        "daily_complete": True,  # Flag as complete for today
                        "triggered_manually": True
                    }
                    
                    # Store or update verification
                    if existing_verifications:
                        await execute_query(
                            table="verifications",
                            operation="update",
                            filters={
                                "pool_id": pool_id,
                                "participant_wallet": wallet,
                                "day": current_day
                            },
                            data={
                                "passed": True,
                                "proof_data": proof_data
                            }
                        )
                    else:
                        await execute_query(
                            table="verifications",
                            operation="insert",
                            data={
                                "pool_id": pool_id,
                                "participant_wallet": wallet,
                                "day": current_day,
                                "passed": True,
                                "verification_type": "github_commits",
                                "proof_data": proof_data
                            }
                        )
                    
                    # Update days_verified count
                    all_verifications = await execute_query(
                        table="verifications",
                        operation="select",
                        filters={
                            "pool_id": pool_id,
                            "participant_wallet": wallet,
                            "passed": True
                        }
                    )
                    days_verified = len(all_verifications)
                    
                    await execute_query(
                        table="participants",
                        operation="update",
                        filters={
                            "pool_id": pool_id,
                            "wallet_address": wallet
                        },
                        data={"days_verified": days_verified}
                    )
                    
                    logger.info(
                        f"Immediate GitHub verification successful: pool={pool_id}, "
                        f"wallet={wallet}, day={current_day}"
                    )
                    
                    return {
                        "verified": True,
                        "message": "Successfully verified GitHub commits for today",
                        "day": current_day
                    }
                elif passed is False:
                    return {
                        "verified": False,
                        "message": "Insufficient commits found for today. Please make commits and try again.",
                        "day": current_day
                    }
                else:
                    # None - day still active, no commits yet
                    return {
                        "verified": False,
                        "message": "No commits found yet for today. Please make commits and try again.",
                        "day": current_day
                    }
            
            except Exception as e:
                logger.error(f"Error in agent verification: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"Verification failed: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=503,
                detail="Agent verification system not available"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering GitHub verification: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trigger verification: {str(e)}"
        )


@router.post(
    "/{pool_id}/participants/{wallet}/verify-screen-time",
    summary="Verify screen time challenge with screenshot",
    description="Upload a screenshot of mobile screen time data. AI will verify the date matches today and screen time is below the limit.",
)
async def verify_screen_time(
    pool_id: int,
    wallet: str,
    file: UploadFile = File(...)
) -> dict:
    """
    Verify screen time challenge by analyzing uploaded screenshot.
    
    This endpoint:
    1. Validates the pool is a screen_time challenge
    2. Uses OpenAI vision API to analyze the screenshot
    3. Checks if date matches today
    4. Checks if screen time is below max_hours
    5. Creates verification record if valid
    """
    try:
        # Get pool information
        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1
        )
        
        if not pools:
            raise HTTPException(status_code=404, detail="Pool not found")
        
        pool = pools[0]
        goal_metadata = pool.get("goal_metadata") or {}
        habit_type = goal_metadata.get("habit_type")
        max_hours = goal_metadata.get("max_hours")
        
        # Verify this is a screen_time challenge
        if habit_type != "screen_time":
            raise HTTPException(
                status_code=400,
                detail="This endpoint is only for screen time challenges"
            )
        
        if not max_hours or not isinstance(max_hours, (int, float)) or max_hours < 0 or max_hours > 12:
            raise HTTPException(
                status_code=400,
                detail="Invalid max_hours in goal_metadata. Must be between 0 and 12."
            )
        
        # Get participant
        participants = await execute_query(
            table="participants",
            operation="select",
            filters={
                "pool_id": pool_id,
                "wallet_address": wallet
            },
            limit=1
        )
        
        if not participants:
            raise HTTPException(status_code=404, detail="Participant not found in pool")
        
        participant = participants[0]
        
        # Calculate current day
        start_timestamp = pool.get("start_timestamp") or pool.get("scheduled_start_time")
        if not start_timestamp:
            raise HTTPException(status_code=400, detail="Pool start timestamp not found")
        
        current_time = int(time.time())
        if current_time < start_timestamp:
            raise HTTPException(
                status_code=400,
                detail="Pool has not started yet"
            )
        
        days_elapsed = (current_time - start_timestamp) // 86400
        current_day = days_elapsed + 1
        
        # Check if user is already verified for today
        existing_verifications = await execute_query(
            table="verifications",
            operation="select",
            filters={
                "pool_id": pool_id,
                "participant_wallet": wallet,
                "day": current_day
            },
            limit=1
        )
        
        if existing_verifications and existing_verifications[0].get("passed"):
            return {
                "verified": True,
                "message": "Already verified for today",
                "day": current_day
            }
        
        # Read and encode image file
        try:
            image_data = await file.read()
            # Validate it's an image
            if not file.content_type or not file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail="File must be an image (PNG, JPEG, etc.)"
                )
            
            # Encode to base64 for OpenAI API
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            image_data_url = f"data:{file.content_type};base64,{image_base64}"
        except Exception as e:
            logger.error(f"Error reading image file: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to read image file: {str(e)}"
            )
        
        # Use OpenAI vision API to verify
        try:
            from openai import OpenAI
            
            if not settings.OPENAI_API_KEY:
                raise HTTPException(
                    status_code=503,
                    detail="OpenAI API key not configured"
                )
            
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Get today's date in a format the AI can recognize
            today = datetime.now(timezone.utc)
            today_str = today.strftime("%Y-%m-%d")
            today_readable = today.strftime("%B %d, %Y")
            
            # Create prompt for verification
            prompt = f"""Analyze this mobile screen time screenshot. You need to verify two things:

1. DATE VERIFICATION: Check if the date visible in the screenshot matches today's date: {today_readable} ({today_str}). The date must be clearly visible and match exactly.

2. SCREEN TIME VERIFICATION: Check if the total screen time shown is LESS than {max_hours} hours. Look for the total screen time number (usually displayed prominently).

Respond with ONLY a JSON object in this exact format:
{{
  "date_matches": true/false,
  "screen_time_hours": <number>,
  "screen_time_below_limit": true/false,
  "reason": "brief explanation"
}}

If the date is not visible or unclear, set date_matches to false.
If screen time is not visible or unclear, set screen_time_below_limit to false."""
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_data_url
                                }
                            }
                        ]
                    }
                ],
                max_tokens=200,
                temperature=0.1
            )
            
            # Parse response
            response_text = response.choices[0].message.content.strip()
            
            # Try to extract JSON from response (might be wrapped in markdown)
            import json
            import re
            
            # Remove markdown code blocks if present
            response_text = re.sub(r'```json\s*', '', response_text)
            response_text = re.sub(r'```\s*', '', response_text)
            response_text = response_text.strip()
            
            try:
                verification_result = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON object from text
                json_match = re.search(r'\{[^}]+\}', response_text)
                if json_match:
                    verification_result = json.loads(json_match.group())
                else:
                    raise ValueError("Could not parse AI response as JSON")
            
            date_matches = verification_result.get("date_matches", False)
            screen_time_hours = verification_result.get("screen_time_hours", 0)
            screen_time_below_limit = verification_result.get("screen_time_below_limit", False)
            reason = verification_result.get("reason", "")
            
            # Determine if verification passed
            passed = date_matches and screen_time_below_limit
            
            # Create verification record
            verification_data = {
                "pool_id": pool_id,
                "participant_wallet": wallet,
                "day": current_day,
                "passed": passed,
                "verification_type": "screen_time",
                "proof_data": {
                    "date_matches": date_matches,
                    "screen_time_hours": screen_time_hours,
                    "screen_time_below_limit": screen_time_below_limit,
                    "max_hours_allowed": max_hours,
                    "reason": reason,
                    "verified_at": datetime.now(timezone.utc).isoformat()
                }
            }
            
            # Insert verification (upsert - update if exists)
            try:
                await execute_query(
                    table="verifications",
                    operation="insert",
                    data=verification_data
                )
            except Exception:
                # If insert fails (duplicate), try update
                await execute_query(
                    table="verifications",
                    operation="update",
                    filters={
                        "pool_id": pool_id,
                        "participant_wallet": wallet,
                        "day": current_day
                    },
                    data=verification_data
                )
            
            # Also create a check-in record for compatibility with existing lifestyle verification
            checkin_data = {
                "pool_id": pool_id,
                "participant_wallet": wallet,
                "day": current_day,
                "success": passed,
                "screenshot_url": None  # We don't store the image, just verify it
            }
            
            try:
                await execute_query(
                    table="checkins",
                    operation="insert",
                    data=checkin_data
                )
            except Exception:
                # Update if exists
                await execute_query(
                    table="checkins",
                    operation="update",
                    filters={
                        "pool_id": pool_id,
                        "participant_wallet": wallet,
                        "day": current_day
                    },
                    data=checkin_data
                )
            
            if passed:
                # Update participant days_verified
                days_verified = participant.get("days_verified", 0)
                if current_day > days_verified:
                    await execute_query(
                        table="participants",
                        operation="update",
                        filters={
                            "pool_id": pool_id,
                            "wallet_address": wallet
                        },
                        data={"days_verified": current_day}
                    )
                
                logger.info(
                    f"Screen time verification successful: pool={pool_id}, "
                    f"wallet={wallet}, day={current_day}, screen_time={screen_time_hours}h"
                )
                
                return {
                    "verified": True,
                    "message": f"Verification successful! Screen time: {screen_time_hours:.1f}h (limit: {max_hours}h)",
                    "day": current_day,
                    "screen_time_hours": screen_time_hours
                }
            else:
                error_msg = "Verification failed: "
                if not date_matches:
                    error_msg += "Date does not match today. "
                if not screen_time_below_limit:
                    error_msg += f"Screen time ({screen_time_hours:.1f}h) exceeds limit ({max_hours}h)."
                
                logger.info(
                    f"Screen time verification failed: pool={pool_id}, "
                    f"wallet={wallet}, day={current_day}, reason={reason}"
                )
                
                return {
                    "verified": False,
                    "message": error_msg.strip(),
                    "day": current_day,
                    "screen_time_hours": screen_time_hours,
                    "reason": reason
                }
        
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="OpenAI library not available"
            )
        except Exception as e:
            logger.error(f"Error in OpenAI vision verification: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"AI verification failed: {str(e)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying screen time: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify screen time: {str(e)}"
        )


@router.delete(
    "/",
    summary="Delete all pools (for testing/cleanup)",
    description="⚠️ DANGER: Deletes ALL pools from the database. Use with caution!",
)
async def delete_all_pools() -> dict:
    """
    Delete all pools from the database.
    
    This will cascade delete:
    - All participants
    - All verifications
    - All check-ins
    - All pool invites
    - All payouts
    - All pool events
    """
    try:
        # Get all pools first to return count
        all_pools = await execute_query(
            table="pools",
            operation="select",
        )
        pool_count = len(all_pools)
        
        # Delete all pools (cascade will handle related records)
        # We need to delete each pool individually since Supabase doesn't support DELETE without filters
        deleted_count = 0
        for pool in all_pools:
            pool_id = pool.get("pool_id")
            if pool_id:
                try:
                    await execute_query(
                        table="pools",
                        operation="delete",
                        filters={"pool_id": pool_id},
                    )
                    deleted_count += 1
                except Exception as e:
                    logger.warning(f"Failed to delete pool {pool_id}: {e}")
        
        logger.warning(f"Deleted {deleted_count} pools (requested {pool_count})")
        return {
            "message": f"Deleted {deleted_count} pools",
            "deleted_count": deleted_count,
            "requested_count": pool_count
        }
    
    except Exception as e:
        logger.error(f"Error deleting all pools: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete pools")


@router.post(
    "/{pool_id}/join/confirm",
    response_model=PoolResponse,
    summary="Confirm pool join after on-chain transaction",
    description="Updates participant count after successful join transaction",
)
async def confirm_pool_join(
    pool_id: int,
    join_data: JoinPoolConfirmRequest
) -> PoolResponse:
    """Confirm pool join after on-chain transaction."""
    try:
        # Get existing pool
        results = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="Pool not found")
        
        pool = results[0]
        
        # Check if pool has started (join restrictions)
        current_time = int(time.time())
        scheduled_start = pool.get("scheduled_start_time")
        start_timestamp = pool.get("start_timestamp", 0)
        
        # Determine if pool has actually started
        actual_start_time = scheduled_start if scheduled_start else start_timestamp
        
        if actual_start_time and current_time >= actual_start_time:
            # Pool has started - check if we're still in Day 1 (24 hour grace period)
            day1_end = actual_start_time + 86400  # 24 hours after start
            if current_time >= day1_end:
                raise HTTPException(
                    status_code=400,
                    detail="Registration closed. This challenge has already started and Day 1 has ended."
                )
            # Still in Day 1 - allow join but warn
            logger.info(f"Late join during Day 1 for pool {pool_id} by {join_data.participant_wallet}")
        elif scheduled_start and current_time < scheduled_start:
            # Pool hasn't started yet - allow join
            pass
        elif not scheduled_start and pool.get("status") == "active":
            # Pool is active and has no scheduled start (immediate start) - check if Day 1 has passed
            day1_end = start_timestamp + 86400
            if current_time >= day1_end:
                raise HTTPException(
                    status_code=400,
                    detail="Registration closed. This challenge has already started and Day 1 has ended."
                )
        
        # Ensure participant user exists
        participant_wallet = join_data.participant_wallet

        # HODL-only precondition: participant must already hold the required token balance
        if pool.get("goal_type") == "hodl_token":
            goal_metadata = pool.get("goal_metadata") or {}
            token_mint = goal_metadata.get("token_mint")
            min_balance = goal_metadata.get("min_balance")

            if token_mint and min_balance is not None:
                try:
                    solana_client = await get_solana_client()
                    owner = Pubkey.from_string(participant_wallet)
                    mint = Pubkey.from_string(token_mint)

                    from solana.rpc.types import TokenAccountOpts

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
                                logger.warning(f"Error parsing token account for HODL join check: {parse_err}")

                    has_min_balance = total_balance >= int(min_balance)
                    logger.info(
                        "HODL join check: pool_id=%s wallet=%s mint=%s balance=%s min_required=%s passed=%s",
                        pool_id,
                        participant_wallet,
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
                except HTTPException:
                    # Re-raise explicit HTTP errors (like insufficient balance)
                    raise
                except Exception as e:
                    logger.error(
                        "Error during HODL join balance check for pool_id=%s wallet=%s: %s",
                        pool_id,
                        participant_wallet,
                        e,
                        exc_info=True,
                    )
                    # Fail closed: if we cannot verify balance, reject join to avoid inconsistent state
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to verify token balance for HODL challenge join. Please try again.",
                    )

        try:
            users = await execute_query(
                table="users",
                operation="select",
                filters={"wallet_address": participant_wallet},
                limit=1
            )
            
            if not users:
                # Auto-create user
                user_data = {
                    "wallet_address": participant_wallet,
                    "username": None,
                    "twitter_handle": None,
                    "reputation_score": 100,
                    "total_games": 0,
                    "games_completed": 0,
                    "total_earned": 0.0,
                    "streak_count": 0
                }
                await execute_query(
                    table="users",
                    operation="insert",
                    data=user_data
                )
                logger.info(f"Auto-created user {participant_wallet}")
        except Exception as e:
            if "unique" not in str(e).lower() and "duplicate" not in str(e).lower():
                logger.warning(f"Error checking/creating user: {e}")
        
        # Check if participant already exists
        existing_participants = await execute_query(
            table="participants",
            operation="select",
            filters={
                "pool_id": pool_id,
                "wallet_address": participant_wallet,
            },
            limit=1,
        )
        
        if existing_participants:
            logger.warning(f"Participant {participant_wallet} already exists for pool {pool_id}")
            # Still update pool count if needed, but don't create duplicate participant
        else:
            # Derive participant PDA
            if not SOLDERS_AVAILABLE or not settings.PROGRAM_ID:
                # Use placeholder if solders not available or PROGRAM_ID not configured
                participant_pubkey_str = f"PLACEHOLDER_{pool_id}_{participant_wallet[:8]}"
                logger.info(f"Using placeholder participant_pubkey: {participant_pubkey_str}")
            else:
                try:
                    program_id = Pubkey.from_string(settings.PROGRAM_ID)
                    # Derive pool PDA: seeds = [b"pool", pool_id.to_le_bytes()]
                    pool_id_bytes = pool_id.to_bytes(8, "little")
                    pool_seeds = [b"pool", pool_id_bytes]
                    pool_pubkey, _ = Pubkey.find_program_address(pool_seeds, program_id)
                    
                    # Derive participant PDA: seeds = [b"participant", pool.key(), participant.key()]
                    participant_wallet_pubkey = Pubkey.from_string(participant_wallet)
                    participant_seeds = [b"participant", bytes(pool_pubkey), bytes(participant_wallet_pubkey)]
                    participant_pubkey, _ = Pubkey.find_program_address(participant_seeds, program_id)
                    participant_pubkey_str = str(participant_pubkey)
                    logger.info(f"Derived participant_pubkey: {participant_pubkey_str}")
                except Exception as e:
                    logger.warning(f"Failed to derive participant PDA: {e}, using placeholder")
                    participant_pubkey_str = f"PLACEHOLDER_{pool_id}_{participant_wallet[:8]}"
            
            # Create participant record
            stake_amount = pool.get("stake_amount", 0.0)
            join_timestamp = int(time.time())
            
            participant_data = {
                "pool_id": pool_id,
                "wallet_address": participant_wallet,
                "participant_pubkey": participant_pubkey_str,
                "stake_amount": float(stake_amount),
                "join_timestamp": join_timestamp,
                "status": "active",
                "days_verified": 0,
            }
            
            try:
                await execute_query(
                    table="participants",
                    operation="insert",
                    data=participant_data,
                )
                logger.info(f"Created participant record for {participant_wallet} in pool {pool_id}")
            except Exception as e:
                # Check if it's a duplicate key error (race condition)
                if "unique" in str(e).lower() or "duplicate" in str(e).lower():
                    logger.warning(f"Participant record already exists (race condition): {e}")
                else:
                    logger.error(f"Failed to create participant record: {e}", exc_info=True)
                    # Continue anyway - pool update will still happen
        
        # Update participant count and total staked
        current_participants = pool.get("participant_count", 0)
        stake_amount = pool.get("stake_amount", 0.0)
        current_total_staked = pool.get("total_staked", 0.0)
        
        # Increment participant count and total staked
        update_data = {
            "participant_count": current_participants + 1,
            "total_staked": current_total_staked + stake_amount,
        }
        
        # If pool was pending and now has participants, mark as active
        if pool.get("status") == "pending" and current_participants == 0:
            update_data["status"] = "active"
        
        results = await execute_query(
            table="pools",
            operation="update",
            filters={"pool_id": pool_id},
            data=update_data
        )
        
        if not results:
            raise HTTPException(status_code=500, detail="Failed to update pool")
        
        logger.info(f"Confirmed join for pool {pool_id} by {participant_wallet} with signature {join_data.transaction_signature}")
        return PoolResponse(**results[0])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming pool join: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to confirm pool join")

