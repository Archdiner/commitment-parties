"""
Solana RPC client wrapper.

Provides high-level interface for interacting with Solana blockchain
and Anchor programs.
"""

import asyncio
from typing import Optional, List, Dict, Any
import logging
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from anchorpy import Program, Provider, Wallet
from solders.keypair import Keypair
from solders.pubkey import Pubkey

from config import settings

logger = logging.getLogger(__name__)


class SolanaClient:
    """Wrapper for Solana RPC client and Anchor program interaction"""
    
    def __init__(self, rpc_url: str, program_id: str):
        self.rpc_url = rpc_url
        self.program_id = program_id
        self.client: Optional[AsyncClient] = None
        self.program: Optional[Program] = None
        self.wallet: Optional[Wallet] = None
    
    async def initialize(self):
        """Initialize Solana client and load program"""
        try:
            # Initialize RPC client
            self.client = AsyncClient(self.rpc_url, commitment=Confirmed)
            
            # Load agent wallet
            # TODO: Implement wallet loading from keypair file or private key
            # For now, create a placeholder wallet
            # In production, load from AGENT_KEYPAIR_PATH or AGENT_PRIVATE_KEY
            keypair = Keypair()  # Placeholder - replace with actual keypair loading
            self.wallet = Wallet(keypair)
            
            # Create provider
            provider = Provider(self.client, self.wallet)
            
            # Load Anchor program
            # TODO: Load IDL from file or fetch from chain
            # For now, this is a placeholder
            program_id_pubkey = Pubkey.from_string(self.program_id)
            # self.program = await Program.at(program_id_pubkey, provider)
            
            logger.info(f"Solana client initialized: {self.rpc_url}")
            logger.info(f"Program ID: {self.program_id}")
        
        except Exception as e:
            logger.error(f"Failed to initialize Solana client: {e}", exc_info=True)
            raise
    
    async def get_account_info(self, pubkey: str) -> Optional[Dict[str, Any]]:
        """Get account information"""
        try:
            pubkey_obj = Pubkey.from_string(pubkey)
            response = await self.client.get_account_info(pubkey_obj)
            
            if response.value is None:
                return None
            
            return {
                "lamports": response.value.lamports,
                "data": response.value.data,
                "owner": str(response.value.owner),
                "executable": response.value.executable,
            }
        
        except Exception as e:
            logger.error(f"Error fetching account info: {e}", exc_info=True)
            return None
    
    async def get_transactions(self, pubkey: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent transactions for an address"""
        try:
            pubkey_obj = Pubkey.from_string(pubkey)
            response = await self.client.get_signatures_for_address(
                pubkey_obj,
                limit=limit,
            )
            
            transactions = []
            for sig_info in response.value:
                transactions.append({
                    "signature": str(sig_info.signature),
                    "slot": sig_info.slot,
                    "err": sig_info.err,
                    "block_time": sig_info.block_time,
                })
            
            return transactions
        
        except Exception as e:
            logger.error(f"Error fetching transactions: {e}", exc_info=True)
            return []
    
    async def get_balance(self, pubkey: str) -> int:
        """Get SOL balance for an address"""
        try:
            pubkey_obj = Pubkey.from_string(pubkey)
            response = await self.client.get_balance(pubkey_obj)
            return response.value
        
        except Exception as e:
            logger.error(f"Error fetching balance: {e}", exc_info=True)
            return 0
    
    async def close(self):
        """Close the RPC client connection"""
        if self.client:
            await self.client.close()
            logger.info("Solana client closed")

