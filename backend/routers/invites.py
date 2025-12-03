"""
Pool invite management endpoints.

Handles creating and checking pool invites for private pools.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, Field
import logging

from database import execute_query

logger = logging.getLogger(__name__)

router = APIRouter()


class InviteCreate(BaseModel):
    """Request model for creating an invite"""
    pool_id: int = Field(..., description="Pool ID")
    invitee_wallet: str = Field(..., description="Wallet address of invitee", max_length=44)


class InviteResponse(BaseModel):
    """Response model for invite data"""
    id: int
    pool_id: int
    invitee_wallet: str
    created_at: str

    class Config:
        from_attributes = True


@router.post(
    "/{pool_id}/invites",
    response_model=InviteResponse,
    status_code=201,
    summary="Create pool invite",
    description="Invite a wallet address to a private pool",
)
async def create_invite(pool_id: int, invite_data: InviteCreate) -> InviteResponse:
    """Create an invite for a private pool."""
    try:
        # Verify pool exists and is private
        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1,
        )
        
        if not pools:
            raise HTTPException(status_code=404, detail="Pool not found")
        
        pool = pools[0]
        if pool.get("is_public", True):
            raise HTTPException(
                status_code=400,
                detail="Cannot create invites for public pools"
            )
        
        # Check if invite already exists
        existing = await execute_query(
            table="pool_invites",
            operation="select",
            filters={
                "pool_id": pool_id,
                "invitee_wallet": invite_data.invitee_wallet,
            },
            limit=1,
        )
        
        if existing:
            return InviteResponse(
                id=existing[0]["id"],
                pool_id=pool_id,
                invitee_wallet=invite_data.invitee_wallet,
                created_at=existing[0]["created_at"].isoformat() if existing[0].get("created_at") else "",
            )
        
        # Create invite
        invite_dict = {
            "pool_id": pool_id,
            "invitee_wallet": invite_data.invitee_wallet,
        }
        
        results = await execute_query(
            table="pool_invites",
            operation="insert",
            data=invite_dict,
        )
        
        if not results:
            raise HTTPException(status_code=500, detail="Failed to create invite")
        
        result = results[0]
        return InviteResponse(
            id=result["id"],
            pool_id=pool_id,
            invitee_wallet=invite_data.invitee_wallet,
            created_at=result["created_at"].isoformat() if result.get("created_at") else "",
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invite: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create invite")


@router.get(
    "/{pool_id}/invites",
    response_model=List[InviteResponse],
    summary="Get pool invites",
    description="Get all invites for a pool, optionally filtered by invitee wallet",
)
async def get_pool_invites(
    pool_id: int,
    invitee_wallet: Optional[str] = Query(None, description="Filter by invitee wallet"),
) -> List[InviteResponse]:
    """Get invites for a pool."""
    try:
        filters = {"pool_id": pool_id}
        if invitee_wallet:
            filters["invitee_wallet"] = invitee_wallet
        
        results = await execute_query(
            table="pool_invites",
            operation="select",
            filters=filters,
        )
        
        return [
            InviteResponse(
                id=r["id"],
                pool_id=r["pool_id"],
                invitee_wallet=r["invitee_wallet"],
                created_at=r["created_at"].isoformat() if r.get("created_at") else "",
            )
            for r in results
        ]
    
    except Exception as e:
        logger.error(f"Error fetching invites: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch invites")


@router.get(
    "/{pool_id}/invites/check",
    summary="Check if wallet has invite",
    description="Check if a specific wallet has an invite to a pool",
)
async def check_invite(
    pool_id: int,
    invitee_wallet: str = Query(..., description="Wallet address to check"),
) -> dict:
    """Check if a wallet has an invite to a pool."""
    try:
        results = await execute_query(
            table="pool_invites",
            operation="select",
            filters={
                "pool_id": pool_id,
                "invitee_wallet": invitee_wallet,
            },
            limit=1,
        )
        
        return {
            "has_invite": len(results) > 0,
            "pool_id": pool_id,
            "invitee_wallet": invitee_wallet,
        }
    
    except Exception as e:
        logger.error(f"Error checking invite: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to check invite")

