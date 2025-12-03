"""
Pool management endpoints.

Handles CRUD operations for commitment pools.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging
import time

from models import PoolCreate, PoolResponse, ErrorResponse, PoolConfirmRequest, JoinPoolConfirmRequest
from database import execute_query
from config import settings

# Try to import solders for PDA derivation, fallback if not available
try:
    from solders.pubkey import Pubkey
    SOLDERS_AVAILABLE = True
except ImportError:
    SOLDERS_AVAILABLE = False
    logger.warning("solders not available, participant_pubkey will be placeholder")

logger = logging.getLogger(__name__)

router = APIRouter()


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
        logger.error(f"Error confirming pool creation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to confirm pool creation")


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
            "passed_verifications": len([v for v in verifications if v.get("passed")])
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching verifications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch verifications: {str(e)}")


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
        import time
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

