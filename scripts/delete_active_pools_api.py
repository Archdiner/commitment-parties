#!/usr/bin/env python3
"""
Script to delete only active pools via the API.

⚠️ WARNING: This will delete all ACTIVE pools and cascade delete:
- All participants
- All verifications
- All check-ins
- All pool invites
- All payouts
- All pool events

Usage:
    python scripts/delete_active_pools_api.py
"""

import requests
import json
import sys

API_URL = "http://localhost:8000"


def get_active_pools():
    """Get all active pools from the API."""
    try:
        response = requests.get(f"{API_URL}/api/pools?status=active")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to backend API.")
        print(f"   Make sure the backend is running at {API_URL}")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"❌ Error fetching pools: {e}")
        sys.exit(1)


def delete_pool(pool_id: int):
    """Delete a single pool by ID."""
    try:
        response = requests.delete(f"{API_URL}/api/pools/{pool_id}")
        response.raise_for_status()
        return True
    except requests.exceptions.HTTPError as e:
        print(f"❌ Failed to delete pool {pool_id}: {e}")
        return False


def main():
    """Main function to delete active pools."""
    print("🔍 Fetching active pools...")
    
    active_pools = get_active_pools()
    
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
    
    # Delete each pool
    deleted_count = 0
    for pool in active_pools:
        pool_id = pool.get("pool_id")
        if pool_id:
            if delete_pool(pool_id):
                deleted_count += 1
                print(f"✅ Deleted pool {pool_id}")
            else:
                print(f"❌ Failed to delete pool {pool_id}")
    
    print(f"\n✅ Deleted {deleted_count} of {pool_count} active pool(s)")


if __name__ == "__main__":
    main()

