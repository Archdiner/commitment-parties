"""
Solana RPC client wrapper.

Provides high-level interface for interacting with Solana blockchain
and Anchor programs.
"""

import asyncio
from typing import Optional, List, Dict, Any, Tuple
import json
import logging
import os
import struct
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from anchorpy import Program, Provider, Wallet
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.transaction import Transaction
from solders.message import MessageV0
from solders.address_lookup_table_account import AddressLookupTableAccount
import hashlib

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
        self._keypair: Optional[Keypair] = None
    
    async def initialize(self):
        """Initialize Solana client and load program"""
        try:
            # Initialize RPC client
            self.client = AsyncClient(self.rpc_url, commitment=Confirmed)
            
            # Load agent wallet from environment configuration
            if settings.AGENT_KEYPAIR_PATH:
                expanded = os.path.expanduser(settings.AGENT_KEYPAIR_PATH)
                with open(expanded, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if not isinstance(data, list):
                    raise ValueError("Keypair file must contain a JSON array of integers")
                self._keypair = Keypair.from_bytes(bytes(data))
                logger.info(f"Loaded agent keypair from file: {expanded}")
            elif settings.AGENT_PRIVATE_KEY:
                try:
                    data = json.loads(settings.AGENT_PRIVATE_KEY)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        "AGENT_PRIVATE_KEY must be a JSON array string of 64 integers"
                    ) from exc
                if not isinstance(data, list):
                    raise ValueError("AGENT_PRIVATE_KEY must be a JSON array of integers")
                self._keypair = Keypair.from_bytes(bytes(data))
                logger.info("Loaded agent keypair from AGENT_PRIVATE_KEY")
            else:
                raise ValueError(
                    "Agent wallet not configured. "
                    "Set AGENT_KEYPAIR_PATH or AGENT_PRIVATE_KEY in the environment."
                )

            self.wallet = Wallet(self._keypair)
            
            # Create provider (kept for potential future Anchor Program usage)
            provider = Provider(self.client, self.wallet)
            _ = provider  # avoid unused variable warning
            
            logger.info(f"Solana client initialized: {self.rpc_url}")
            logger.info(f"Program ID: {self.program_id}")
            logger.info(f"Agent public key: {self.wallet.public_key}")
        
        except Exception as e:
            logger.error(f"Failed to initialize Solana client: {e}", exc_info=True)
            raise
    
    async def get_account_info(self, pubkey: str) -> Optional[Dict[str, Any]]:
        """Get account information"""
        try:
            if self.client is None:
                raise RuntimeError("SolanaClient not initialized")

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

    async def get_program_accounts(self) -> List[Dict[str, Any]]:
        """
        Fetch all accounts owned by the Commitment Pool program.

        This lets the agent discover pool-related accounts and log them.
        """
        try:
            if self.client is None:
                raise RuntimeError("SolanaClient not initialized")

            program_pubkey = Pubkey.from_string(self.program_id)
            response = await self.client.get_program_accounts(program_pubkey)

            accounts: List[Dict[str, Any]] = []
            for acc in response.value:
                accounts.append(
                    {
                        "pubkey": str(acc.pubkey),
                        "lamports": acc.account.lamports,
                        "owner": str(acc.account.owner),
                        "executable": acc.account.executable,
                        "data_len": len(acc.account.data),
                    }
                )

            logger.info(
                "Found %d accounts owned by program %s",
                len(accounts),
                self.program_id,
            )
            return accounts

        except Exception as e:
            logger.error(f"Error fetching program accounts: {e}", exc_info=True)
            return []
    
    async def get_transactions(self, pubkey: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent transactions for an address"""
        try:
            if self.client is None:
                raise RuntimeError("SolanaClient not initialized")

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
            if self.client is None:
                raise RuntimeError("SolanaClient not initialized")

            pubkey_obj = Pubkey.from_string(pubkey)
            response = await self.client.get_balance(pubkey_obj)
            return response.value
        
        except Exception as e:
            logger.error(f"Error fetching balance: {e}", exc_info=True)
            return 0
    
    async def get_token_balance(self, wallet_pubkey: str, token_mint: str) -> int:
        """
        Get SPL token balance for a wallet.
        
        Args:
            wallet_pubkey: Wallet address
            token_mint: Token mint address
        
        Returns:
            Token balance (in smallest unit), or 0 if error/not found
        """
        try:
            if self.client is None:
                raise RuntimeError("SolanaClient not initialized")
            
            wallet = Pubkey.from_string(wallet_pubkey)
            mint = Pubkey.from_string(token_mint)
            
            # Use get_token_accounts_by_owner with mint filter
            from solana.rpc.types import TokenAccountOpts
            
            response = await self.client.get_token_accounts_by_owner(
                wallet,
                TokenAccountOpts(mint=mint),
                commitment=Confirmed
            )
            
            if not response.value:
                return 0  # No token accounts found
            
            # Sum balances across all token accounts for this mint
            total_balance = 0
            for account_info in response.value:
                try:
                    # Parse the account data
                    account_data = account_info.account.data
                    if isinstance(account_data, dict) and 'parsed' in account_data:
                        # JSON parsed format
                        parsed = account_data['parsed']
                        if 'info' in parsed and 'tokenAmount' in parsed['info']:
                            amount = parsed['info']['tokenAmount']['amount']
                            total_balance += int(amount)
                    elif isinstance(account_data, bytes):
                        # Binary format - would need spl-token library to parse
                        # For now, try to extract from base64 if available
                        logger.warning("Binary token account data format not fully supported")
                except Exception as e:
                    logger.warning(f"Error parsing token account: {e}")
                    continue
            
            return total_balance
        
        except Exception as e:
            logger.error(f"Error fetching token balance: {e}", exc_info=True)
            return 0
    
    def derive_pool_pda(self, pool_id: int) -> Tuple[Pubkey, int]:
        """
        Derive the PDA for a commitment pool.
        
        Args:
            pool_id: The pool ID (u64)
        
        Returns:
            Tuple of (pool_pubkey, bump)
        """
        program_id = Pubkey.from_string(self.program_id)
        pool_id_bytes = pool_id.to_bytes(8, byteorder="little")
        seeds = [b"pool", pool_id_bytes]
        
        pubkey, bump = Pubkey.find_program_address(seeds, program_id)
        return pubkey, bump
    
    def derive_participant_pda(self, pool_pubkey: Pubkey, participant_wallet: Pubkey) -> Tuple[Pubkey, int]:
        """
        Derive the PDA for a participant account.
        
        Args:
            pool_pubkey: The pool's PDA pubkey
            participant_wallet: The participant's wallet pubkey
        
        Returns:
            Tuple of (participant_pubkey, bump)
        """
        program_id = Pubkey.from_string(self.program_id)
        seeds = [b"participant", bytes(pool_pubkey), bytes(participant_wallet)]
        
        pubkey, bump = Pubkey.find_program_address(seeds, program_id)
        return pubkey, bump
    
    def derive_vault_pda(self, pool_pubkey: Pubkey) -> Tuple[Pubkey, int]:
        """
        Derive the PDA for a pool vault account.
        
        Args:
            pool_pubkey: The pool's PDA pubkey
        
        Returns:
            Tuple of (vault_pubkey, bump)
        """
        program_id = Pubkey.from_string(self.program_id)
        seeds = [b"vault", bytes(pool_pubkey)]
        
        pubkey, bump = Pubkey.find_program_address(seeds, program_id)
        return pubkey, bump
    
    def _anchor_instruction_discriminator(self, instruction_name: str) -> bytes:
        """Generate Anchor instruction discriminator (first 8 bytes of sha256("global:{name}"))"""
        prefix = f"global:{instruction_name}"
        hash_bytes = hashlib.sha256(prefix.encode()).digest()
        return hash_bytes[:8]
    
    async def send_instruction(self, instruction: Instruction) -> Optional[str]:
        """
        Build, sign and send a transaction with a single instruction.
        
        Args:
            instruction: The instruction to send
        
        Returns:
            Transaction signature if successful, None otherwise
        """
        try:
            if self.client is None or self._keypair is None:
                raise RuntimeError("SolanaClient not initialized")
            
            # Get recent blockhash
            blockhash_resp = await self.client.get_latest_blockhash()
            if blockhash_resp.value is None:
                raise RuntimeError("Failed to get latest blockhash")
            
            blockhash = blockhash_resp.value.blockhash
            
            # Build message
            from solders.message import Message
            message = Message.new_with_blockhash([instruction], self._keypair.pubkey(), blockhash)
            
            # Build transaction
            transaction = Transaction.new_unsigned(message)
            
            # Sign transaction
            transaction.sign([self._keypair], blockhash)
            
            # Send transaction
            resp = await self.client.send_transaction(transaction)
            
            if resp.value is None:
                logger.error("Transaction send returned None")
                return None
            
            signature = str(resp.value)
            logger.info(f"Transaction sent: {signature}")
            
            # Wait for confirmation
            await self.client.confirm_transaction(resp.value, commitment=Confirmed)
            logger.info(f"Transaction confirmed: {signature}")
            
            return signature
        
        except Exception as e:
            logger.error(f"Error sending transaction: {e}", exc_info=True)
            return None
    
    async def close(self):
        """Close the RPC client connection"""
        if self.client:
            await self.client.close()
            logger.info("Solana client closed")

