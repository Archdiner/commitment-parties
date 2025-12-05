"""
Check-in management endpoints.

Handles submission and retrieval of daily check-ins for lifestyle challenges.
"""

from fastapi import APIRouter, HTTPException
from typing import List
import logging

from models import CheckInCreate, CheckInResponse, ErrorResponse
from database import execute_query
from utils.timezone import (
    get_eastern_now, get_eastern_timestamp, get_challenge_day_window
)

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
        
        # Calculate the end of the challenge day for the submitted day (using Eastern Time)
        challenge_day_start, challenge_day_end = get_challenge_day_window(start_timestamp, checkin_data.day)
        
        # Check if the day has ended (no grace period for submissions)
        current_time = get_eastern_now()
        if current_time >= challenge_day_end:
            raise HTTPException(
                status_code=400,
                detail=f"Day {checkin_data.day} has ended. Check-ins must be submitted before the day ends. "
                       f"Day ended at {challenge_day_end.isoformat()} (Eastern Time)."
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

