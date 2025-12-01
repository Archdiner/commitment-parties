"""
Pool management endpoints.

Handles CRUD operations for commitment pools.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import logging

from models import PoolCreate, PoolResponse, ErrorResponse
from database import execute_query

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
) -> List[PoolResponse]:
    """
    List all active pools.
    
    Supports filtering by status and pagination.
    """
    try:
        filters = {}
        if status:
            filters["status"] = status
        else:
            # Default to active/pending pools
            filters = None  # Will need custom query for IN clause
        
        # For now, get all pools and filter in Python
        # In production, use Supabase's .in_() method
        results = await execute_query(
            table="pools",
            operation="select",
            limit=limit,
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
        
        # Apply offset
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

