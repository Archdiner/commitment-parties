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
    description="Submit a daily check-in for a lifestyle challenge pool",
)
async def submit_checkin(checkin_data: CheckInCreate) -> CheckInResponse:
    """Submit a daily check-in."""
    try:
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

