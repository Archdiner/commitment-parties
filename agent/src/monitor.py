"""
Monitoring functions for different challenge types.

Monitors pools and participants to verify goal completion.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import time

from solana_client import SolanaClient
from verify import Verifier
from distribute import Distributor
from database import execute_query
from config import settings

logger = logging.getLogger(__name__)


class Monitor:
    """Monitors commitment pools for goal completion"""
    
    def __init__(self, solana_client: SolanaClient, verifier: Verifier = None, distributor: Distributor = None):
        self.solana_client = solana_client
        self.verifier = verifier
        self.distributor = distributor
        self.db = None  # Database module reference
    
    def _calculate_current_day(self, start_timestamp: int) -> Optional[int]:
        """
        Calculate the current day number based on pool start timestamp.
        
        Args:
            start_timestamp: Unix timestamp when pool started
        
        Returns:
            Current day number (1-indexed), or None if pool hasn't started yet
        """
        try:
            current_time = int(time.time())
            if current_time < start_timestamp:
                return None  # Pool hasn't started yet
            
            # Calculate days elapsed (0-indexed, then add 1 for 1-indexed day)
            seconds_elapsed = current_time - start_timestamp
            days_elapsed = seconds_elapsed // 86400  # 86400 seconds per day
            current_day = days_elapsed + 1
            
            return current_day
        except Exception as e:
            logger.error(f"Error calculating current day: {e}", exc_info=True)
            return None
    
    async def verify_hodl_participant(self, wallet: str, token_mint: str, min_balance: int) -> bool:
        """
        Check if wallet holds minimum token balance.
        
        Args:
            wallet: Participant wallet address
            token_mint: Token mint address to check
            min_balance: Minimum balance required (in smallest unit)
        
        Returns:
            True if balance >= min_balance, False otherwise
        """
        try:
            balance = await self.solana_client.get_token_balance(wallet, token_mint)
            passed = balance >= min_balance
            
            logger.info(
                f"HODL verification: wallet={wallet}, mint={token_mint}, "
                f"balance={balance}, min_required={min_balance}, passed={passed}"
            )
            
            return passed
        
        except Exception as e:
            logger.error(f"Error checking HODL balance: {e}", exc_info=True)
            return False
    
    async def verify_lifestyle_participant(self, pool_id: int, wallet: str, day: int) -> bool:
        """
        Check if participant submitted check-in for the specified day.
        
        Args:
            pool_id: Pool ID
            wallet: Participant wallet address
            day: Day number to check
        
        Returns:
            True if check-in exists and is successful, False otherwise
        """
        try:
            # Query database for check-in
            results = await execute_query(
                table="checkins",
                operation="select",
                filters={
                    "pool_id": pool_id,
                    "participant_wallet": wallet,
                    "day": day
                },
                limit=1
            )
            
            if not results:
                logger.info(
                    f"Lifestyle verification: No check-in found for "
                    f"pool={pool_id}, wallet={wallet}, day={day}"
                )
                return False
            
            checkin = results[0]
            success = checkin.get("success", False)
            
            logger.info(
                f"Lifestyle verification: pool={pool_id}, wallet={wallet}, "
                f"day={day}, success={success}"
            )
            
            return success
        
        except Exception as e:
            logger.error(f"Error checking lifestyle check-in: {e}", exc_info=True)
            return False
    
    async def get_active_pools(self, goal_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get active pools from database.
        
        Args:
            goal_type: Optional filter by goal type (e.g., 'hodl_token', 'lifestyle_habit')
        
        Returns:
            List of pool dictionaries
        """
        try:
            filters = {"status": "active"}
            if goal_type:
                filters["goal_type"] = goal_type
            
            pools = await execute_query(
                table="pools",
                operation="select",
                filters=filters
            )
            
            return pools
        
        except Exception as e:
            logger.error(f"Error fetching active pools: {e}", exc_info=True)
            return []
    
    async def get_pool_participants(self, pool_id: int) -> List[Dict[str, Any]]:
        """
        Get all active participants for a pool.
        
        Args:
            pool_id: Pool ID
        
        Returns:
            List of participant dictionaries
        """
        try:
            participants = await execute_query(
                table="participants",
                operation="select",
                filters={
                    "pool_id": pool_id,
                    "status": "active"
                }
            )
            
            return participants
        
        except Exception as e:
            logger.error(f"Error fetching pool participants: {e}", exc_info=True)
            return []
    
    async def monitor_dca_pools(self):
        """
        Monitor Daily DCA pools.
        
        Checks if participants made required DCA swaps daily.
        Runs every 24 hours.
        """
        logger.info("Starting DCA pool monitoring...")
        
        while True:
            try:
                # TODO: Implement DCA monitoring logic
                # 1. Query database for active DCA pools
                # 2. For each participant, check their wallet transactions
                # 3. Verify if they made a swap today via Jupiter/Raydium
                # 4. Check if swap amount >= required amount
                # 5. Submit verification to smart contract
                
                logger.info("Checking DCA pools...")
                
                # Placeholder: Sleep for interval
                await asyncio.sleep(settings.DCA_CHECK_INTERVAL)
            
            except Exception as e:
                logger.error(f"Error in DCA monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying
    
    async def monitor_hodl_pools(self):
        """
        Monitor HODL token pools.
        
        Checks if participants maintained minimum token balance.
        Runs every hour.
        """
        logger.info("Starting HODL pool monitoring...")
        
        while True:
            try:
                logger.info("Checking HODL pools...")
                
                # Get active HODL pools from database
                pools = await self.get_active_pools(goal_type="hodl_token")
                
                if not pools:
                    logger.info("No active HODL pools found")
                else:
                    logger.info(f"Found {len(pools)} active HODL pools")
                    
                    for pool in pools:
                        try:
                            pool_id = pool.get("pool_id")
                            goal_metadata = pool.get("goal_metadata", {})
                            start_timestamp = pool.get("start_timestamp")
                            
                            if not pool_id or not goal_metadata:
                                logger.warning(f"Invalid pool data: {pool}")
                                continue
                            
                            # Extract HODL requirements from goal_metadata
                            token_mint = goal_metadata.get("token_mint")
                            min_balance = goal_metadata.get("min_balance")
                            
                            if not token_mint or min_balance is None:
                                logger.warning(f"Pool {pool_id} missing HODL requirements")
                                continue
                            
                            # Calculate current day
                            current_day = self._calculate_current_day(start_timestamp)
                            if current_day is None:
                                logger.info(f"Pool {pool_id} hasn't started yet")
                                continue
                            
                            # Get all active participants
                            participants = await self.get_pool_participants(pool_id)
                            
                            if not participants:
                                logger.info(f"Pool {pool_id} has no active participants")
                                continue
                            
                            logger.info(
                                f"Verifying {len(participants)} participants for pool {pool_id}, day {current_day}"
                            )
                            
                            # Verify each participant
                            for participant in participants:
                                wallet = participant.get("wallet_address")
                                if not wallet:
                                    continue
                                
                                # Check token balance
                                passed = await self.verify_hodl_participant(
                                    wallet, token_mint, min_balance
                                )
                                
                                # Submit verification to smart contract
                                if self.verifier:
                                    pool_pubkey = pool.get("pool_pubkey")
                                    if pool_pubkey:
                                        signature = await self.verifier.submit_verification(
                                            pool_id=pool_id,
                                            participant_wallet=wallet,
                                            day=current_day,
                                            passed=passed
                                        )
                                        if signature:
                                            logger.info(
                                                f"Verification submitted for pool={pool_id}, "
                                                f"wallet={wallet}, day={current_day}, passed={passed}"
                                            )
                                else:
                                    logger.warning("Verifier not available, skipping on-chain submission")
                        
                        except Exception as e:
                            logger.error(f"Error processing pool {pool.get('pool_id')}: {e}", exc_info=True)
                            continue
                
                # Sleep for the configured interval before next check
                await asyncio.sleep(settings.HODL_CHECK_INTERVAL)
            
            except Exception as e:
                logger.error(f"Error in HODL monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying
    
    async def monitor_lifestyle_pools(self):
        """
        Monitor lifestyle habit pools.
        
        Checks for daily check-ins from participants.
        Runs every 5 minutes.
        """
        logger.info("Starting lifestyle pool monitoring...")
        
        while True:
            try:
                logger.info("Checking lifestyle pools...")
                
                # Get active lifestyle pools from database
                pools = await self.get_active_pools(goal_type="lifestyle_habit")
                
                if not pools:
                    logger.info("No active lifestyle pools found")
                else:
                    logger.info(f"Found {len(pools)} active lifestyle pools")
                    
                    for pool in pools:
                        try:
                            pool_id = pool.get("pool_id")
                            start_timestamp = pool.get("start_timestamp")
                            
                            if not pool_id:
                                logger.warning(f"Invalid pool data: {pool}")
                                continue
                            
                            # Calculate current day
                            current_day = self._calculate_current_day(start_timestamp)
                            if current_day is None:
                                logger.info(f"Pool {pool_id} hasn't started yet")
                                continue
                            
                            # Get all active participants
                            participants = await self.get_pool_participants(pool_id)
                            
                            if not participants:
                                logger.info(f"Pool {pool_id} has no active participants")
                                continue
                            
                            logger.info(
                                f"Verifying {len(participants)} participants for pool {pool_id}, day {current_day}"
                            )
                            
                            # Verify each participant
                            for participant in participants:
                                wallet = participant.get("wallet_address")
                                if not wallet:
                                    continue
                                
                                # Check if check-in exists for today
                                passed = await self.verify_lifestyle_participant(
                                    pool_id, wallet, current_day
                                )
                                
                                # Submit verification to smart contract
                                if self.verifier:
                                    pool_pubkey = pool.get("pool_pubkey")
                                    if pool_pubkey:
                                        signature = await self.verifier.submit_verification(
                                            pool_id=pool_id,
                                            participant_wallet=wallet,
                                            day=current_day,
                                            passed=passed
                                        )
                                        if signature:
                                            logger.info(
                                                f"Verification submitted for pool={pool_id}, "
                                                f"wallet={wallet}, day={current_day}, passed={passed}"
                                            )
                                else:
                                    logger.warning("Verifier not available, skipping on-chain submission")
                        
                        except Exception as e:
                            logger.error(f"Error processing pool {pool.get('pool_id')}: {e}", exc_info=True)
                            continue
                
                # Sleep for the configured interval before next check
                await asyncio.sleep(settings.LIFESTYLE_CHECK_INTERVAL)
            
            except Exception as e:
                logger.error(f"Error in lifestyle monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying

