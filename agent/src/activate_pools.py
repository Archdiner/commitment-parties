"""
Pool activation task for scheduled start times.

Monitors pending pools and activates them when their scheduled start time arrives.
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional

from database import execute_query
from config import settings

logger = logging.getLogger(__name__)

# Import SocialManager for automatic tweeting (circular import handled via Optional)
_social_manager: Optional[Any] = None


def set_social_manager(social_manager):
    """Set the social manager instance for automatic tweeting"""
    global _social_manager
    _social_manager = social_manager


class PoolActivator:
    """Handles activation of pools at their scheduled start times"""
    
    async def activate_scheduled_pools(self):
        """
        Check for pending pools that should be activated and activate them.
        Runs every minute to ensure timely activation.
        """
        logger.info("Starting pool activation monitoring...")
        
        while True:
            try:
                current_time = int(time.time())
                
                # Find pending pools that should be activated
                pools = await execute_query(
                    table="pools",
                    operation="select",
                    filters={
                        "status": "pending"
                    }
                )
                
                activated_count = 0
                for pool in pools:
                    scheduled_start = pool.get("scheduled_start_time")
                    if not scheduled_start:
                        # Immediate start pools should already be active (handled by backend)
                        # But check if somehow they're still pending and activate them
                        recruitment_hours = pool.get("recruitment_period_hours", 0)
                        if recruitment_hours == 0:
                            # This is an immediate start pool that's still pending - activate it
                            pool_id = pool.get("pool_id")
                            logger.info(f"Activating immediate start pool {pool_id}")
                            await execute_query(
                                table="pools",
                                operation="update",
                                filters={"pool_id": pool_id},
                                data={"status": "active"}
                            )
                            activated_count += 1
                        continue
                    
                    # Check if it's time to activate
                    if current_time >= scheduled_start:
                        pool_id = pool.get("pool_id")
                        require_min = pool.get("require_min_participants", False)
                        min_participants = pool.get("min_participants", 1)
                        participant_count = pool.get("participant_count", 0)
                        
                        # Check minimum participants requirement
                        if require_min and participant_count < min_participants:
                            logger.info(
                                f"Pool {pool_id} scheduled to start but minimum participants not met "
                                f"({participant_count}/{min_participants}). Extending recruitment by 24 hours."
                            )
                            # Extend recruitment by 24 hours
                            new_scheduled_start = scheduled_start + 86400
                            await execute_query(
                                table="pools",
                                operation="update",
                                filters={"pool_id": pool_id},
                                data={"scheduled_start_time": new_scheduled_start}
                            )
                            continue
                        
                        # Activate the pool
                        logger.info(f"Activating pool {pool_id} (scheduled start: {scheduled_start})")
                        await execute_query(
                            table="pools",
                            operation="update",
                            filters={"pool_id": pool_id},
                            data={"status": "active"}
                        )
                        activated_count += 1
                        
                        # Post tweet about new pool (only for scheduled pools, not immediate start)
                        if _social_manager:
                            try:
                                from social import SocialEventType
                                # Only tweet if pool is public and has a scheduled start (not immediate)
                                if pool.get("is_public", True) and scheduled_start:
                                    await _social_manager.post_event_update(
                                        SocialEventType.POOL_CREATED,
                                        pool_id
                                    )
                                    logger.info(f"Posted new pool tweet for pool {pool_id}")
                            except Exception as e:
                                logger.warning(f"Failed to post tweet for new pool {pool_id}: {e}")
                
                if activated_count > 0:
                    logger.info(f"Activated {activated_count} pool(s)")
                
                # Check every minute
                await asyncio.sleep(60)
            
            except Exception as e:
                logger.error(f"Error in pool activation monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying

