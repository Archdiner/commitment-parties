"""
Verification logic for submitting verifications to smart contracts.

Handles on-chain verification submissions.
"""

import logging
import struct
from typing import Optional
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta

from solana_client import SolanaClient

logger = logging.getLogger(__name__)


class Verifier:
    """Handles verification submissions to smart contracts"""
    
    def __init__(self, solana_client: SolanaClient):
        self.solana_client = solana_client
    
    def _anchor_instruction_discriminator(self, instruction_name: str) -> bytes:
        """Generate Anchor instruction discriminator (first 8 bytes of sha256("global:{name}"))"""
        import hashlib
        prefix = f"global:{instruction_name}"
        hash_bytes = hashlib.sha256(prefix.encode()).digest()
        return hash_bytes[:8]
    
    async def submit_verification(
        self,
        pool_id: int,
        participant_wallet: str,
        day: int,
        passed: bool,
    ) -> Optional[str]:
        """
        Submit a verification to the smart contract.
        
        Args:
            pool_id: The pool ID (u64)
            participant_wallet: Wallet address of the participant
            day: Day number being verified
            passed: Whether the participant passed for this day
        
        Returns:
            Transaction signature if successful, None otherwise
        """
        try:
            program_id = Pubkey.from_string(self.solana_client.program_id)
            participant_wallet_pubkey = Pubkey.from_string(participant_wallet)
            
            # Derive PDAs
            pool_pubkey, pool_bump = self.solana_client.derive_pool_pda(pool_id)
            participant_pubkey, participant_bump = self.solana_client.derive_participant_pda(
                pool_pubkey, participant_wallet_pubkey
            )
            
            # Build instruction discriminator for verify_participant
            discriminator = self._anchor_instruction_discriminator("verify_participant")
            
            # Build instruction data: discriminator (8) + day (1) + passed (1)
            instruction_data = discriminator + struct.pack("<B", day) + struct.pack("<?", passed)
            
            # Build account metas
            accounts = [
                AccountMeta(pubkey=pool_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=participant_pubkey, is_signer=False, is_writable=True),
                AccountMeta(
                    pubkey=self.solana_client.wallet.public_key,
                    is_signer=True,
                    is_writable=False
                ),
            ]
            
            # Create instruction
            instruction = Instruction(
                program_id=program_id,
                accounts=accounts,
                data=bytes(instruction_data)
            )
            
            logger.info(
                f"Submitting verification: pool_id={pool_id}, pool={pool_pubkey}, "
                f"participant={participant_wallet}, day={day}, passed={passed}"
            )
            
            # Simulate transaction first to catch errors early
            try:
                if self.solana_client.client is None:
                    raise RuntimeError("SolanaClient not initialized")
                
                # Build transaction for simulation
                from solders.transaction import Transaction
                from solders.message import Message
                
                blockhash_resp = await self.solana_client.client.get_latest_blockhash()
                if blockhash_resp.value is None:
                    raise RuntimeError("Failed to get latest blockhash")
                
                blockhash = blockhash_resp.value.blockhash
                message = Message.new_with_blockhash(
                    [instruction], 
                    self.solana_client.wallet.public_key, 
                    blockhash
                )
                tx = Transaction.new_unsigned(message)
                
                # Simulate transaction
                sim_resp = await self.solana_client.client.simulate_transaction(tx)
                
                if sim_resp.value and sim_resp.value.err:
                    error_msg = str(sim_resp.value.err)
                    # Check if it's a PoolNotActive error (6000) - this means pool hasn't been activated on-chain yet
                    # Pools activate on-chain when first participant joins, so this is expected for pools with no participants
                    if "6000" in error_msg or "PoolNotActive" in error_msg:
                        logger.warning(
                            f"Pool {pool_id} not active on-chain yet (likely no participants have joined). "
                            f"Skipping verification. pool_id={pool_id}, participant={participant_wallet}, day={day}"
                        )
                        return None
                    
                    logger.error(
                        f"Transaction simulation failed: {error_msg}. "
                        f"pool_id={pool_id}, participant={participant_wallet}, day={day}"
                    )
                    return None
                
                logger.debug("Transaction simulation successful")
            
            except Exception as e:
                logger.warning(
                    f"Transaction simulation error (proceeding anyway): {e}. "
                    f"This may be due to network issues or missing accounts."
                )
                # Continue with actual transaction - simulation failures don't always mean the tx will fail
            
            # Send transaction
            signature = await self.solana_client.send_instruction(instruction)
            
            if signature:
                logger.info(
                    f"Verification submitted successfully: {signature}. "
                    f"pool_id={pool_id}, participant={participant_wallet}, day={day}, passed={passed}"
                )
            else:
                logger.error(
                    f"Failed to submit verification. "
                    f"pool_id={pool_id}, participant={participant_wallet}, day={day}"
                )
            
            return signature
        
        except Exception as e:
            logger.error(f"Error submitting verification: {e}", exc_info=True)
            return None

