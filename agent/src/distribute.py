"""
Reward distribution logic.

Handles settlement and distribution when pools end.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import time

from solana_client import SolanaClient
from database import execute_query
from config import settings

logger = logging.getLogger(__name__)


class Distributor:
    """Handles reward distribution for ended pools"""
    
    def __init__(self, solana_client: SolanaClient):
        self.solana_client = solana_client
    
    async def check_and_distribute(self):
        """
        Check for ended pools and distribute rewards.
        
        Runs periodically to check for pools that have ended
        and need reward distribution.
        """
        logger.info("Starting distribution monitoring...")
        
        while True:
            try:
                logger.info("Checking for pools to distribute...")
                
                # Get pools that have ended but not settled
                current_time = int(time.time())
                
                try:
                    pools = await execute_query(
                        table="pools",
                        operation="select",
                        filters={"status": "active"}
                    )
                    
                    # Check for ended pools
                    ended_pools = [
                        p for p in pools
                        if p.get("end_timestamp", float("inf")) <= current_time
                    ]
                    
                    if ended_pools:
                        logger.info(f"Found {len(ended_pools)} ended pools to process")
                        
                        for pool in ended_pools:
                            pool_id = pool.get("pool_id")
                            try:
                                success = await self.distribute_pool(pool_id)
                                if success:
                                    logger.info(f"Successfully distributed pool {pool_id}")
                                else:
                                    logger.warning(f"Distribution failed for pool {pool_id}")
                            except Exception as e:
                                logger.error(f"Error distributing pool {pool_id}: {e}")
                    else:
                        logger.info("No ended pools found")
                
                except Exception as e:
                    if "SUPABASE" in str(e).upper():
                        logger.warning("Database not configured, skipping distribution check")
                    else:
                        logger.error(f"Error checking pools: {e}")
                
                # Sleep for the configured interval before next check
                await asyncio.sleep(settings.DISTRIBUTION_CHECK_INTERVAL)
            
            except Exception as e:
                logger.error(f"Error in distribution: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying
    
    async def distribute_pool(self, pool_id: int) -> bool:
        """
        Distribute rewards for a specific pool.
        
        This function:
        1. Gets all participants
        2. Determines winners (status = success) and losers
        3. Calculates distribution amounts
        4. Calls distribute_rewards on-chain
        5. Updates database
        
        Args:
            pool_id: ID of the pool to distribute
        
        Returns:
            True if successful, False otherwise
        """
        try:
            from solders.pubkey import Pubkey
            from solders.instruction import Instruction, AccountMeta
            from solders.system_program import ID as SYSTEM_PROGRAM_ID
            import hashlib
            
            logger.info(f"Starting distribution for pool {pool_id}")
            
            # Get pool info
            pools = await execute_query(
                table="pools",
                operation="select",
                filters={"pool_id": pool_id},
                limit=1
            )
            
            if not pools:
                logger.error(f"Pool {pool_id} not found in database")
                return False
            
            pool = pools[0]
            
            # Get participants
            participants = await execute_query(
                table="participants",
                operation="select",
                filters={"pool_id": pool_id}
            )
            
            if not participants:
                logger.warning(f"No participants found for pool {pool_id}")
                return False
            
            # Calculate winners and losers
            winners = [p for p in participants if p.get("status") == "success"]
            losers = [p for p in participants if p.get("status") == "failed"]
            active = [p for p in participants if p.get("status") == "active"]
            
            logger.info(
                f"Pool {pool_id} distribution: "
                f"{len(winners)} winners, {len(losers)} losers, {len(active)} still active"
            )
            
            # Get distribution mode and calculate amounts
            distribution_mode = pool.get("distribution_mode", "competitive")
            total_staked = float(pool.get("total_staked", 0))
            winner_percent = pool.get("split_percentage_winners", 100)
            
            if winners:
                # Calculate winner payout
                loser_stakes = len(losers) * float(pool.get("stake_amount", 0))
                
                if distribution_mode == "competitive":
                    # Winners split loser stakes
                    bonus_per_winner = loser_stakes / len(winners) if winners else 0
                elif distribution_mode == "split":
                    # Winners get percentage, rest to charity
                    winner_share = loser_stakes * (winner_percent / 100)
                    bonus_per_winner = winner_share / len(winners) if winners else 0
                else:  # charity
                    bonus_per_winner = 0
                
                stake_amount = float(pool.get("stake_amount", 0))
                payout_per_winner = stake_amount + bonus_per_winner
                
                logger.info(
                    f"Winner payout: {payout_per_winner:.4f} SOL each "
                    f"({stake_amount:.4f} stake + {bonus_per_winner:.4f} bonus)"
                )
            
            # Call distribute_rewards on-chain
            program_id = Pubkey.from_string(self.solana_client.program_id)
            
            # Derive PDAs
            pool_pubkey, pool_bump = self.solana_client.derive_pool_pda(pool_id)
            vault_pubkey, vault_bump = self.solana_client.derive_vault_pda(pool_pubkey)
            
            # Build instruction discriminator for distribute_rewards
            prefix = "global:distribute_rewards"
            hash_bytes = hashlib.sha256(prefix.encode()).digest()
            discriminator = hash_bytes[:8]
            
            # Build instruction data: just discriminator (no args for distribute_rewards)
            instruction_data = discriminator
            
            # Build account metas
            accounts = [
                AccountMeta(pubkey=pool_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=vault_pubkey, is_signer=False, is_writable=True),
                AccountMeta(
                    pubkey=self.solana_client.wallet.public_key,
                    is_signer=True,
                    is_writable=False
                ),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            # Create instruction
            instruction = Instruction(
                program_id=program_id,
                accounts=accounts,
                data=bytes(instruction_data)
            )
            
            logger.info(f"Submitting distribute_rewards for pool {pool_id}")
            
            # Send transaction
            signature = await self.solana_client.send_instruction(instruction)
            
            if signature:
                logger.info(f"Distribution transaction submitted: {signature}")
                
                # Update database
                await execute_query(
                    table="pools",
                    operation="update",
                    filters={"pool_id": pool_id},
                    data={"status": "settled"}
                )
                
                # Record payouts in database
                for winner in winners:
                    try:
                        payout_data = {
                            "pool_id": pool_id,
                            "recipient_wallet": winner.get("wallet_address"),
                            "amount": payout_per_winner if winners else 0,
                            "payout_type": "winner",
                            "transaction_hash": signature,
                        }
                        await execute_query(
                            table="payouts",
                            operation="insert",
                            data=payout_data
                        )
                    except Exception as e:
                        logger.warning(f"Could not record payout: {e}")
                
                return True
            else:
                logger.error(f"Failed to submit distribution transaction for pool {pool_id}")
                return False
        
        except Exception as e:
            logger.error(f"Error distributing pool {pool_id}: {e}", exc_info=True)
            return False
    
    async def get_pool_summary(self, pool_id: int) -> Optional[Dict[str, Any]]:
        """
        Get distribution summary for a pool.
        
        Args:
            pool_id: Pool ID
        
        Returns:
            Summary dict or None
        """
        try:
            # Get pool
            pools = await execute_query(
                table="pools",
                operation="select",
                filters={"pool_id": pool_id},
                limit=1
            )
            
            if not pools:
                return None
            
            pool = pools[0]
            
            # Get participants
            participants = await execute_query(
                table="participants",
                operation="select",
                filters={"pool_id": pool_id}
            )
            
            # Calculate stats
            winners = len([p for p in participants if p.get("status") == "success"])
            losers = len([p for p in participants if p.get("status") == "failed"])
            active = len([p for p in participants if p.get("status") == "active"])
            
            stake_amount = float(pool.get("stake_amount", 0))
            total_staked = float(pool.get("total_staked", 0))
            
            return {
                "pool_id": pool_id,
                "status": pool.get("status"),
                "total_participants": len(participants),
                "winners": winners,
                "losers": losers,
                "active": active,
                "stake_amount": stake_amount,
                "total_staked": total_staked,
                "distribution_mode": pool.get("distribution_mode"),
                "end_timestamp": pool.get("end_timestamp"),
            }
        
        except Exception as e:
            logger.error(f"Error getting pool summary: {e}")
            return None
