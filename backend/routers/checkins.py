"""
Check-in management endpoints.

Handles submission and retrieval of daily check-ins for lifestyle challenges.
"""

from fastapi import APIRouter, HTTPException
from typing import List
import logging

from models import CheckInCreate, CheckInResponse, ErrorResponse
from database import execute_query

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/",
    response_model=CheckInResponse,
    status_code=201,
    summary="Submit a check-in",
    description="Submit a daily check-in for a lifestyle challenge pool. Must be submitted before the day ends.",
)
async def submit_checkin(checkin_data: CheckInCreate) -> CheckInResponse:
    """Submit a daily check-in. Must be submitted before the challenge day ends."""
    try:
        import time
        from datetime import datetime, timezone, timedelta
        
        # Get pool information to validate timing
        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": checkin_data.pool_id},
            limit=1
        )
        
        if not pools:
            raise HTTPException(status_code=404, detail="Pool not found")
        
        pool = pools[0]
        start_timestamp = pool.get("scheduled_start_time") or pool.get("start_timestamp")
        
        if not start_timestamp:
            raise HTTPException(status_code=400, detail="Pool start timestamp not found")
        
        # Calculate the end of the challenge day for the submitted day
        start_datetime = datetime.fromtimestamp(start_timestamp, tz=timezone.utc)
        challenge_day_start = start_datetime + timedelta(days=checkin_data.day - 1)
        challenge_day_end = challenge_day_start + timedelta(days=1)
        
        # Check if the day has ended (no grace period for submissions)
        current_time = datetime.now(timezone.utc)
        if current_time >= challenge_day_end:
            raise HTTPException(
                status_code=400,
                detail=f"Day {checkin_data.day} has ended. Check-ins must be submitted before the day ends. "
                       f"Day ended at {challenge_day_end.isoformat()} (UTC)."
            )
        
        # Convert to dict for database insertion
        checkin_dict = checkin_data.model_dump()
        
        # Insert or update check-in (handles duplicate day submissions)
        # Supabase will handle the UNIQUE constraint
        results = await execute_query(
            table="checkins",
            operation="insert",
            data=checkin_dict,
        )
        
        if not results:
            # If insert fails due to unique constraint, try update
            # In production, use upsert
            try:
                results = await execute_query(
                    table="checkins",
                    operation="update",
                    filters={
                        "pool_id": checkin_data.pool_id,
                        "participant_wallet": checkin_data.participant_wallet,
                        "day": checkin_data.day,
                    },
                    data=checkin_dict,
                )
            except:
                pass
        
        if not results:
            raise HTTPException(status_code=500, detail="Failed to submit check-in")
        
        logger.info(
            f"Check-in submitted: pool={checkin_data.pool_id}, "
            f"wallet={checkin_data.participant_wallet}, day={checkin_data.day}"
        )
        return CheckInResponse(**results[0])
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting check-in: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to submit check-in")


@router.get(
    "/{pool_id}/{wallet}",
    response_model=List[CheckInResponse],
    summary="Get user's check-ins",
    description="Get all check-ins for a specific user in a specific pool",
)
async def get_user_checkins(pool_id: int, wallet: str) -> List[CheckInResponse]:
    """Get all check-ins for a user in a pool."""
    try:
        results = await execute_query(
            table="checkins",
            operation="select",
            filters={
                "pool_id": pool_id,
                "participant_wallet": wallet,
            },
        )
        
        # Sort by day
        results.sort(key=lambda x: x.get("day", 0))
        
        return [CheckInResponse(**result) for result in results]
    
    except Exception as e:
        logger.error(f"Error fetching check-ins: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch check-ins")

