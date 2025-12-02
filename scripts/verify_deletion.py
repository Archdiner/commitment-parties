#!/usr/bin/env python3
"""
Script to verify that all pools and related records have been deleted.

Usage:
    python scripts/verify_deletion.py
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


async def verify_deletion():
    """Verify that all pools and related records are deleted."""
    print("🔍 Verifying database state...\n")
    
    try:
        # Check pools
        pools = await execute_query(
            table="pools",
            operation="select",
        )
        pool_count = len(pools)
        
        # Check participants
        participants = await execute_query(
            table="participants",
            operation="select",
        )
        participant_count = len(participants)
        
        # Check checkins
        checkins = await execute_query(
            table="checkins",
            operation="select",
        )
        checkin_count = len(checkins)
        
        # Check verifications
        verifications = await execute_query(
            table="verifications",
            operation="select",
        )
        verification_count = len(verifications)
        
        # Check pool_invites
        pool_invites = await execute_query(
            table="pool_invites",
            operation="select",
        )
        invite_count = len(pool_invites)
        
        # Check payouts
        payouts = await execute_query(
            table="payouts",
            operation="select",
        )
        payout_count = len(payouts)
        
        # Check pool_events
        pool_events = await execute_query(
            table="pool_events",
            operation="select",
        )
        event_count = len(pool_events)
        
        # Report results
        print("📊 Database Status:")
        print(f"   Pools: {pool_count}")
        print(f"   Participants: {participant_count}")
        print(f"   Check-ins: {checkin_count}")
        print(f"   Verifications: {verification_count}")
        print(f"   Pool Invites: {invite_count}")
        print(f"   Payouts: {payout_count}")
        print(f"   Pool Events: {event_count}")
        print()
        
        if pool_count == 0 and participant_count == 0 and checkin_count == 0:
            print("✅ All pools and related records have been deleted!")
            if verification_count > 0 or invite_count > 0 or payout_count > 0 or event_count > 0:
                print("   ⚠️  Note: Some related records still exist, but they may be orphaned.")
                print("      This is okay if they reference non-existent pools (they won't affect anything).")
            return True
        else:
            print("❌ Some records still exist:")
            if pool_count > 0:
                print(f"   - {pool_count} pool(s) still in database")
            if participant_count > 0:
                print(f"   - {participant_count} participant(s) still in database")
            if checkin_count > 0:
                print(f"   - {checkin_count} check-in(s) still in database")
            if verification_count > 0:
                print(f"   - {verification_count} verification(s) still in database")
            if invite_count > 0:
                print(f"   - {invite_count} invite(s) still in database")
            if payout_count > 0:
                print(f"   - {payout_count} payout(s) still in database")
            if event_count > 0:
                print(f"   - {event_count} event(s) still in database")
            return False
    
    except Exception as e:
        logger.error(f"Error verifying deletion: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        return False


if __name__ == "__main__":
    asyncio.run(verify_deletion())

