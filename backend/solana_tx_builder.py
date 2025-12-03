"""
Solana transaction builder for backend.

Builds unsigned transactions for Solana Actions/Blinks.
This module is used by the Action endpoints to create transactions
that wallets can sign and submit.
"""

import logging
import struct
import hashlib
import base64
from typing import Optional, Tuple
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed

from config import settings

logger = logging.getLogger(__name__)


class SolanaTransactionBuilder:
    """Builds unsigned Solana transactions for wallet signing"""
    
    def __init__(self, rpc_url: str, program_id: str):
        self.rpc_url = rpc_url
        self.program_id = program_id
        self.program_pubkey = Pubkey.from_string(program_id)
        self._client: Optional[AsyncClient] = None
    
    async def _get_client(self) -> AsyncClient:
        """Lazy initialization of RPC client"""
        if self._client is None:
            self._client = AsyncClient(self.rpc_url, commitment=Confirmed)
        return self._client
    
    async def close(self):
        """Close RPC client connection"""
        if self._client:
            await self._client.close()
            self._client = None
    
    def _anchor_discriminator(self, instruction_name: str) -> bytes:
        """Generate Anchor instruction discriminator"""
        prefix = f"global:{instruction_name}"
        hash_bytes = hashlib.sha256(prefix.encode()).digest()
        return hash_bytes[:8]
    
    def derive_pool_pda(self, pool_id: int) -> Tuple[Pubkey, int]:
        """Derive the PDA for a commitment pool"""
        pool_id_bytes = pool_id.to_bytes(8, byteorder="little")
        seeds = [b"pool", pool_id_bytes]
        pubkey, bump = Pubkey.find_program_address(seeds, self.program_pubkey)
        return pubkey, bump
    
    def derive_participant_pda(self, pool_pubkey: Pubkey, participant_wallet: Pubkey) -> Tuple[Pubkey, int]:
        """Derive the PDA for a participant account"""
        seeds = [b"participant", bytes(pool_pubkey), bytes(participant_wallet)]
        pubkey, bump = Pubkey.find_program_address(seeds, self.program_pubkey)
        return pubkey, bump
    
    def derive_vault_pda(self, pool_pubkey: Pubkey) -> Tuple[Pubkey, int]:
        """Derive the PDA for a pool vault account"""
        seeds = [b"vault", bytes(pool_pubkey)]
        pubkey, bump = Pubkey.find_program_address(seeds, self.program_pubkey)
        return pubkey, bump
    
    async def build_join_pool_transaction(
        self,
        pool_id: int,
        participant_wallet: str,
    ) -> str:
        """
        Build an unsigned transaction for joining a pool.
        
        Args:
            pool_id: Pool ID to join
            participant_wallet: Wallet address of the participant (will be the fee payer)
        
        Returns:
            Base64-encoded unsigned transaction ready for wallet signing
        """
        try:
            participant_pubkey = Pubkey.from_string(participant_wallet)
            
            # Derive PDAs
            pool_pubkey, _ = self.derive_pool_pda(pool_id)
            vault_pubkey, _ = self.derive_vault_pda(pool_pubkey)
            participant_pda, _ = self.derive_participant_pda(pool_pubkey, participant_pubkey)
            
            # Build instruction data (just discriminator - no args for join_pool)
            discriminator = self._anchor_discriminator("join_pool")
            instruction_data = discriminator
            
            # Build account metas (order matters - must match program's account order!)
            accounts = [
                AccountMeta(pubkey=pool_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=participant_pda, is_signer=False, is_writable=True),
                AccountMeta(pubkey=participant_pubkey, is_signer=True, is_writable=True),
                AccountMeta(pubkey=vault_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            # Create instruction
            instruction = Instruction(
                program_id=self.program_pubkey,
                accounts=accounts,
                data=bytes(instruction_data)
            )
            
            # Get recent blockhash
            client = await self._get_client()
            blockhash_resp = await client.get_latest_blockhash()
            if blockhash_resp.value is None:
                raise RuntimeError("Failed to get latest blockhash")
            
            blockhash = blockhash_resp.value.blockhash
            
            # Build message (unsigned transaction)
            message = Message.new_with_blockhash([instruction], participant_pubkey, blockhash)
            
            # Build unsigned transaction
            transaction = Transaction.new_unsigned(message)
            
            # Serialize transaction to bytes
            tx_bytes = bytes(transaction)
            
            # Encode as base64
            tx_b64 = base64.b64encode(tx_bytes).decode("utf-8")
            
            logger.info(f"Built join_pool transaction for pool {pool_id}, participant {participant_wallet}")
            logger.info(f"  Pool PDA: {pool_pubkey}")
            logger.info(f"  Participant PDA: {participant_pda}")
            logger.info(f"  Vault: {vault_pubkey}")
            
            return tx_b64
        
        except Exception as e:
            logger.error(f"Error building join_pool transaction: {e}", exc_info=True)
            raise


# Global instance (lazy initialization)
_tx_builder: Optional[SolanaTransactionBuilder] = None


def get_tx_builder() -> SolanaTransactionBuilder:
    """Get or create the global transaction builder instance"""
    global _tx_builder
    if _tx_builder is None:
        rpc_url = settings.SOLANA_RPC_URL
        program_id = settings.PROGRAM_ID
        if not program_id:
            raise ValueError("PROGRAM_ID not configured in backend settings")
        _tx_builder = SolanaTransactionBuilder(rpc_url, program_id)
    return _tx_builder


