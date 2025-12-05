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

                    pool_id = pool.get("pool_id")

                    # For scheduled (non-immediate) public pools, queue a "new pool" tweet
                    # soon after creation so people can see and join during recruitment.
                    # We only do this for pools with a scheduled_start_time (future or past) and rely
                    # on SocialManager's internal tracking to avoid duplicate tweets.
                    # Queue the tweet for ALL pending pools with scheduled_start_time, not just future ones,
                    # to catch pools that were created while the activator wasn't running.
                    # Note: Immediate start pools (recruitment_period_hours == 0) have scheduled_start_time = None
                    # and are set to "active" status immediately, so they won't appear in pending pools list.
                    # Even if they did, the check for scheduled_start would skip them.
                    if _social_manager:
                        is_public = pool.get("is_public", True)
                        # Only queue tweets for pools with scheduled_start_time (skips immediate start pools)
                        if is_public and scheduled_start:
                            try:
                                from social import SocialEventType

                                # Only queue if we haven't posted a POOL_CREATED event for this pool
                                last_events = getattr(_social_manager, "last_event_post_time", {})
                                key = (pool_id, SocialEventType.POOL_CREATED)
                                if not last_events.get(key):
                                    result = await _social_manager.post_event_update(
                                        SocialEventType.POOL_CREATED,
                                        pool_id,
                                    )
                                    if result:
                                        logger.info(
                                            f"Queued POOL_CREATED tweet for newly created scheduled pool {pool_id}"
                                        )
                                    else:
                                        logger.warning(
                                            f"Failed to queue POOL_CREATED tweet for pool {pool_id} "
                                            f"(post_event_update returned None)"
                                        )
                                else:
                                    logger.debug(
                                        f"Skipping POOL_CREATED tweet for pool {pool_id} "
                                        f"(already queued/posted at {last_events.get(key)})"
                                    )
                            except Exception as e:
                                logger.error(
                                    f"Failed to queue POOL_CREATED tweet for pool {pool_id}: {e}",
                                    exc_info=True
                                )
                        elif not is_public:
                            logger.debug(f"Skipping tweet for pool {pool_id} (not public)")
                        elif not scheduled_start:
                            logger.debug(f"Skipping tweet for pool {pool_id} (no scheduled_start_time)")
                    else:
                        logger.debug("Social manager not available, skipping tweet queue")
                    
                    # Check if it's time to activate
                    if current_time >= scheduled_start:
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
                        
                        # Note: POOL_CREATED tweet should have been queued earlier when pool was pending.
                        # We don't queue it here at activation time because:
                        # 1. It's too late - recruitment period is over
                        # 2. It would be redundant - should have been posted during recruitment
                        # 3. The tweet should go out when the pool is created, not when it starts
                
                if activated_count > 0:
                    logger.info(f"Activated {activated_count} pool(s)")
                
                # Check every minute
                await asyncio.sleep(60)
            
            except Exception as e:
                logger.error(f"Error in pool activation monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying

