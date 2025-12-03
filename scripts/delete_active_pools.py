#!/usr/bin/env python3
"""
Script to delete only active pools from the database.

⚠️ WARNING: This will delete all ACTIVE pools and cascade delete:
- All participants
- All verifications
- All check-ins
- All pool invites
- All payouts
- All pool events

Usage:
    python scripts/delete_active_pools.py
"""

import asyncio
import sys
import os
from pathlib import Path

# Add project root and backend to path
project_root = Path(__file__).parent.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(backend_dir))

# Change to backend directory for relative imports
os.chdir(backend_dir)

from database import execute_query, get_supabase_client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def delete_active_pools():
    """Delete all active pools from the database."""
    try:
        # Get all active pools
        active_pools = await execute_query(
            table="pools",
            operation="select",
            filters={"status": "active"}
        )
        
        if not active_pools:
            print("✅ No active pools found. Nothing to delete.")
            return
        
        pool_count = len(active_pools)
        print(f"⚠️  Found {pool_count} active pool(s) to delete:")
        for pool in active_pools:
            pool_id = pool.get("pool_id")
            name = pool.get("name", "Unknown")
            print(f"   - Pool {pool_id}: {name}")
        
        # Confirm deletion
        response = input(f"\n⚠️  Delete {pool_count} active pool(s)? (yes/no): ")
        if response.lower() != "yes":
            print("❌ Deletion cancelled.")
            return
        
        # Delete each pool (cascade will handle related records)
        deleted_count = 0
        for pool in active_pools:
            pool_id = pool.get("pool_id")
            if pool_id:
                try:
                    await execute_query(
                        table="pools",
                        operation="delete",
                        filters={"pool_id": pool_id},
                    )
                    deleted_count += 1
                    print(f"✅ Deleted pool {pool_id}")
                except Exception as e:
                    logger.error(f"Failed to delete pool {pool_id}: {e}")
                    print(f"❌ Failed to delete pool {pool_id}: {e}")
        
        print(f"\n✅ Deleted {deleted_count} of {pool_count} active pool(s)")
        
    except Exception as e:
        logger.error(f"Error deleting active pools: {e}", exc_info=True)
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(delete_active_pools())

