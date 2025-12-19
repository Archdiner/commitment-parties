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
        NEW RECRUITMENT SYSTEM: Monitor pending pools for:
        1. Early activation when filled (auto_start_time reached)
        2. Expiration handling (recruitment_deadline passed, not filled) - refund participants
        3. Twitter posting at start and end of recruitment period
        
        Runs every minute to ensure timely activation and expiration handling.
        """
        logger.info("Starting pool activation monitoring (recruitment system)...")
        
        while True:
            try:
                current_time = int(time.time())
                
                # Find pending pools (in recruiting phase)
                pools = await execute_query(
                    table="pools",
                    operation="select",
                    filters={
                        "status": "pending"
                    }
                )
                
                activated_count = 0
                expired_count = 0
                
                for pool in pools:
                    pool_id = pool.get("pool_id")
                    recruitment_deadline = pool.get("recruitment_deadline")
                    filled_at = pool.get("filled_at")
                    auto_start_time = pool.get("auto_start_time")
                    is_public = pool.get("is_public", True)
                    
                    # Twitter posting: Post at start of recruitment period
                    if _social_manager and is_public:
                        try:
                            from social import SocialEventType
                            
                            # Post POOL_CREATED tweet at start of recruitment period
                            # Check if pool was created recently (within last 5 minutes) and hasn't been tweeted
                            created_at = pool.get("created_at")
                            if created_at:
                                # Parse created_at timestamp (could be string or timestamp)
                                if isinstance(created_at, str):
                                    from datetime import datetime
                                    try:
                                        created_ts = int(datetime.fromisoformat(created_at.replace('Z', '+00:00')).timestamp())
                                    except:
                                        created_ts = None
                                else:
                                    created_ts = created_at
                                
                                if created_ts and (current_time - created_ts) < 300:  # Within 5 minutes
                                    last_events = getattr(_social_manager, "last_event_post_time", {})
                                    key = (pool_id, SocialEventType.POOL_CREATED)
                                    if not last_events.get(key):
                                        result = await _social_manager.post_event_update(
                                            SocialEventType.POOL_CREATED,
                                            pool_id,
                                        )
                                        if result:
                                            logger.info(f"Posted POOL_CREATED tweet for new pool {pool_id} (start of recruitment)")
                        except Exception as e:
                            logger.error(f"Error posting start-of-recruitment tweet for pool {pool_id}: {e}", exc_info=True)
                    
                    # Twitter posting: Post towards end of recruitment period (24h before deadline)
                    if _social_manager and is_public and recruitment_deadline:
                        try:
                            from social import SocialEventType
                            
                            # Post reminder tweet 24 hours before deadline
                            reminder_time = recruitment_deadline - 86400  # 24 hours before
                            if current_time >= reminder_time and current_time < recruitment_deadline:
                                # Check if we've already posted this reminder
                                last_events = getattr(_social_manager, "last_event_post_time", {})
                                key = (pool_id, "recruitment_ending_soon")
                                if not last_events.get(key):
                                    # Use POOL_CREATED event type but with custom message
                                    result = await _social_manager.post_event_update(
                                        SocialEventType.POOL_CREATED,
                                        pool_id,
                                    )
                                    if result:
                                        last_events[key] = current_time
                                        logger.info(f"Posted recruitment ending soon tweet for pool {pool_id}")
                        except Exception as e:
                            logger.error(f"Error posting end-of-recruitment tweet for pool {pool_id}: {e}", exc_info=True)
                    
                    # Priority 1: Check if pool filled and auto_start_time reached
                    if filled_at and auto_start_time and current_time >= auto_start_time:
                        # Pool filled and it's time to start!
                        logger.info(
                            f"Activating pool {pool_id} - filled at {filled_at}, starting at {auto_start_time}"
                        )
                        await execute_query(
                            table="pools",
                            operation="update",
                            filters={"pool_id": pool_id},
                            data={"status": "active"}
                        )
                        activated_count += 1
                        
                        # Mark forfeited participants as failed when challenge starts
                        forfeited_participants = await execute_query(
                            table="participants",
                            operation="select",
                            filters={
                                "pool_id": pool_id,
                                "status": "forfeit"
                            }
                        )
                        if forfeited_participants:
                            logger.info(
                                f"Marking {len(forfeited_participants)} forfeited participants as failed "
                                f"for pool {pool_id} (challenge starting)"
                            )
                            for participant in forfeited_participants:
                                await execute_query(
                                    table="participants",
                                    operation="update",
                                    filters={
                                        "pool_id": pool_id,
                                        "wallet_address": participant.get("wallet_address")
                                    },
                                    data={"status": "failed"}
                                )
                        continue
                    
                    # Priority 2: Check if recruitment deadline passed and pool not filled
                    if recruitment_deadline and current_time >= recruitment_deadline and not filled_at:
                        # Pool expired without filling - refund all participants
                        logger.warning(
                            f"Pool {pool_id} expired without filling. Refunding all participants."
                        )
                        
                        # Get all participants
                        participants = await execute_query(
                            table="participants",
                            operation="select",
                            filters={"pool_id": pool_id}
                        )
                        
                        if participants:
                            # Refund each participant
                            refunded_count = 0
                            for participant in participants:
                                wallet_address = participant.get("wallet_address")
                                stake_amount = participant.get("stake_amount", 0.0)
                                
                                try:
                                    # Call refund function (will be implemented)
                                    refund_success = await self._refund_participant(
                                        pool_id, wallet_address, stake_amount
                                    )
                                    if refund_success:
                                        refunded_count += 1
                                    else:
                                        logger.error(
                                            f"Failed to refund participant {wallet_address} "
                                            f"for expired pool {pool_id}"
                                        )
                                except Exception as e:
                                    logger.error(
                                        f"Error refunding participant {wallet_address} "
                                        f"for expired pool {pool_id}: {e}",
                                        exc_info=True
                                    )
                            
                            logger.info(
                                f"Refunded {refunded_count}/{len(participants)} participants "
                                f"for expired pool {pool_id}"
                            )
                        
                        # Mark pool as expired
                        await execute_query(
                            table="pools",
                            operation="update",
                            filters={"pool_id": pool_id},
                            data={"status": "expired"}
                        )
                        expired_count += 1
                        continue
                
                if activated_count > 0:
                    logger.info(f"Activated {activated_count} pool(s)")
                if expired_count > 0:
                    logger.info(f"Expired and refunded {expired_count} pool(s)")
                
                # Check every minute
                await asyncio.sleep(60)
            
            except Exception as e:
                logger.error(f"Error in pool activation monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _refund_participant(
        self, pool_id: int, wallet_address: str, stake_amount: float
    ) -> bool:
        """
        Refund a participant's stake for an expired pool.
        
        NOTE: This requires a refund instruction in the smart contract.
        For now, we'll call a backend endpoint that handles the refund.
        The backend can use the agent's authority to create refund transactions.
        
        Args:
            pool_id: Pool ID
            wallet_address: Participant wallet address
            stake_amount: Amount to refund (in SOL)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            import aiohttp
            
            # Call backend refund endpoint
            backend_url = getattr(settings, "BACKEND_URL", None)
            if not backend_url:
                # Fallback: try to construct from common deployment patterns
                backend_url = "http://localhost:8000"
                logger.warning(f"BACKEND_URL not set, using default: {backend_url}")
            
            refund_url = f"{backend_url}/api/pools/{pool_id}/refund"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    refund_url,
                    json={
                        "wallet_address": wallet_address,
                        "stake_amount": stake_amount,
                    },
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        signature = result.get("transaction_signature")
                        if signature:
                            logger.info(
                                f"Refunded {stake_amount} SOL to {wallet_address} "
                                f"for expired pool {pool_id}. Signature: {signature}"
                            )
                            return True
                        else:
                            logger.error(f"Backend refund succeeded but no signature returned")
                            return False
                    else:
                        error_text = await response.text()
                        logger.error(
                            f"Backend refund failed for pool {pool_id}, "
                            f"wallet {wallet_address}: {response.status} - {error_text}"
                        )
                        return False
        
        except Exception as e:
            logger.error(
                f"Error refunding participant {wallet_address} for pool {pool_id}: {e}",
                exc_info=True
            )
            return False

