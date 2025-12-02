#!/usr/bin/env python3
"""
Script to delete all pools from the database.

⚠️ WARNING: This will delete ALL pools and cascade delete:
- All participants
- All verifications
- All check-ins
- All pool invites
- All payouts
- All pool events

Usage:
    python scripts/delete_all_pools.py
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.database import execute_query
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def delete_all_pools():
    """Delete all pools from the database."""
    try:
        # Get all pools first to return count
        all_pools = await execute_query(
            table="pools",
            operation="select",
        )
        pool_count = len(all_pools)
        
        if pool_count == 0:
            print("No pools found in database.")
            return
        
        print(f"Found {pool_count} pools. Deleting...")
        
        # Delete all pools (cascade will handle related records)
        deleted_count = 0
        for pool in all_pools:
            pool_id = pool.get("pool_id")
            pool_name = pool.get("name", "Unknown")
            if pool_id:
                try:
                    await execute_query(
                        table="pools",
                        operation="delete",
                        filters={"pool_id": pool_id},
                    )
                    deleted_count += 1
                    print(f"  ✓ Deleted pool {pool_id}: {pool_name}")
                except Exception as e:
                    logger.warning(f"Failed to delete pool {pool_id}: {e}")
                    print(f"  ✗ Failed to delete pool {pool_id}: {e}")
        
        print(f"\n✅ Successfully deleted {deleted_count} out of {pool_count} pools.")
        print("   (Related records like participants, check-ins, etc. were cascade deleted)")
    
    except Exception as e:
        logger.error(f"Error deleting pools: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Confirm before deleting
    print("⚠️  WARNING: This will delete ALL pools from the database!")
    print("   This action cannot be undone.")
    response = input("\nType 'DELETE ALL POOLS' to confirm: ")
    
    if response != "DELETE ALL POOLS":
        print("Cancelled.")
        sys.exit(0)
    
    asyncio.run(delete_all_pools())

