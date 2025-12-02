"""
On-chain transaction builders for Commitment Pool program.

Handles creating and submitting transactions for:
- create_pool
- join_pool
- verify_participant
- distribute_rewards
"""

import logging
import struct
import hashlib
from typing import Optional, Tuple
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYSTEM_PROGRAM_ID

from solana_client import SolanaClient

logger = logging.getLogger(__name__)


class OnChainClient:
    """Handles on-chain transactions for the Commitment Pool program"""
    
    def __init__(self, solana_client: SolanaClient):
        self.solana_client = solana_client
        self.program_id = Pubkey.from_string(solana_client.program_id)
    
    def _anchor_discriminator(self, instruction_name: str) -> bytes:
        """Generate Anchor instruction discriminator"""
        prefix = f"global:{instruction_name}"
        hash_bytes = hashlib.sha256(prefix.encode()).digest()
        return hash_bytes[:8]
    
    def _encode_goal_type_lifestyle(self, habit_name: str) -> bytes:
        """
        Encode LifestyleHabit goal type for Anchor.
        
        GoalType::LifestyleHabit { habit_name: String }
        - 1 byte: variant index (2 for LifestyleHabit)
        - 4 bytes: string length (little-endian u32)
        - N bytes: string data
        """
        habit_bytes = habit_name.encode('utf-8')
        return struct.pack('<B', 2) + struct.pack('<I', len(habit_bytes)) + habit_bytes
    
    def _encode_goal_type_hodl(self, token_mint: str, min_balance: int) -> bytes:
        """
        Encode HodlToken goal type for Anchor.
        
        GoalType::HodlToken { token_mint: Pubkey, min_balance: u64 }
        - 1 byte: variant index (1 for HodlToken)
        - 32 bytes: token_mint pubkey
        - 8 bytes: min_balance (little-endian u64)
        """
        mint_pubkey = Pubkey.from_string(token_mint)
        return struct.pack('<B', 1) + bytes(mint_pubkey) + struct.pack('<Q', min_balance)
    
    def _encode_distribution_mode(self, mode: str, winner_percent: int = 100) -> bytes:
        """
        Encode DistributionMode for Anchor.
        
        Competitive = 0
        Charity = 1
        Split { winner_percent: u8 } = 2
        """
        if mode == "competitive":
            return struct.pack('<B', 0)
        elif mode == "charity":
            return struct.pack('<B', 1)
        elif mode == "split":
            return struct.pack('<BB', 2, winner_percent)
        else:
            return struct.pack('<B', 0)  # Default to competitive
    
    async def create_pool_on_chain(
        self,
        pool_id: int,
        goal_type: str,
        goal_params: dict,
        stake_amount_lamports: int,
        duration_days: int,
        max_participants: int,
        min_participants: int,
        charity_address: str,
        distribution_mode: str = "competitive",
        winner_percent: int = 100,
    ) -> Optional[str]:
        """
        Create a pool on-chain.
        
        Args:
            pool_id: Unique pool ID
            goal_type: "lifestyle_habit" or "hodl_token"
            goal_params: {"habit_name": "..."} or {"token_mint": "...", "min_balance": ...}
            stake_amount_lamports: Stake amount in lamports
            duration_days: Duration in days (1-30)
            max_participants: Max participants (1-100)
            min_participants: Min participants (1-max)
            charity_address: Charity wallet address
            distribution_mode: "competitive", "charity", or "split"
            winner_percent: If split mode, percentage to winners (0-100)
        
        Returns:
            Transaction signature if successful, None otherwise
        """
        try:
            # Derive pool PDA
            pool_pubkey, _ = self.solana_client.derive_pool_pda(pool_id)
            
            # Encode goal type
            if goal_type == "lifestyle_habit":
                habit_name = goal_params.get("habit_name", "Daily Habit")
                goal_type_bytes = self._encode_goal_type_lifestyle(habit_name)
            elif goal_type == "hodl_token":
                token_mint = goal_params.get("token_mint")
                min_balance = goal_params.get("min_balance", 0)
                goal_type_bytes = self._encode_goal_type_hodl(token_mint, min_balance)
            else:
                raise ValueError(f"Unknown goal type: {goal_type}")
            
            # Encode distribution mode
            dist_mode_bytes = self._encode_distribution_mode(distribution_mode, winner_percent)
            
            # Build instruction data
            discriminator = self._anchor_discriminator("create_pool")
            charity_pubkey = Pubkey.from_string(charity_address)
            
            instruction_data = (
                discriminator +
                struct.pack('<Q', pool_id) +           # pool_id: u64
                goal_type_bytes +                       # goal_type: GoalType
                struct.pack('<Q', stake_amount_lamports) +  # stake_amount: u64
                struct.pack('<B', duration_days) +     # duration_days: u8
                struct.pack('<H', max_participants) +  # max_participants: u16
                struct.pack('<H', min_participants) +  # min_participants: u16
                bytes(charity_pubkey) +                # charity_address: Pubkey
                dist_mode_bytes                        # distribution_mode: DistributionMode
            )
            
            # Build account metas
            accounts = [
                AccountMeta(pubkey=pool_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=self.solana_client.wallet.public_key, is_signer=True, is_writable=True),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            # Create instruction
            instruction = Instruction(
                program_id=self.program_id,
                accounts=accounts,
                data=bytes(instruction_data)
            )
            
            logger.info(f"Creating pool {pool_id} on-chain...")
            logger.info(f"  Pool PDA: {pool_pubkey}")
            logger.info(f"  Stake: {stake_amount_lamports} lamports ({stake_amount_lamports / 1e9:.4f} SOL)")
            logger.info(f"  Duration: {duration_days} days")
            
            # Send transaction
            signature = await self.solana_client.send_instruction(instruction)
            
            if signature:
                logger.info(f"Pool created on-chain! Signature: {signature}")
                return signature
            else:
                logger.error("Failed to create pool on-chain")
                return None
        
        except Exception as e:
            logger.error(f"Error creating pool on-chain: {e}", exc_info=True)
            return None
    
    async def join_pool_on_chain(
        self,
        pool_id: int,
        participant_wallet: Optional[Pubkey] = None,
    ) -> Optional[str]:
        """
        Join a pool on-chain (transfers SOL to vault).
        
        Args:
            pool_id: Pool ID to join
            participant_wallet: Wallet joining (defaults to agent wallet)
        
        Returns:
            Transaction signature if successful, None otherwise
        """
        try:
            if participant_wallet is None:
                participant_wallet = self.solana_client.wallet.public_key
            
            # Derive PDAs
            pool_pubkey, _ = self.solana_client.derive_pool_pda(pool_id)
            vault_pubkey, _ = self.solana_client.derive_vault_pda(pool_pubkey)
            participant_pda, _ = self.solana_client.derive_participant_pda(pool_pubkey, participant_wallet)
            
            # Build instruction data (just discriminator - no args)
            discriminator = self._anchor_discriminator("join_pool")
            instruction_data = discriminator
            
            # Build account metas (order matters!)
            accounts = [
                AccountMeta(pubkey=pool_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=participant_pda, is_signer=False, is_writable=True),
                AccountMeta(pubkey=participant_wallet, is_signer=True, is_writable=True),
                AccountMeta(pubkey=vault_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            # Create instruction
            instruction = Instruction(
                program_id=self.program_id,
                accounts=accounts,
                data=bytes(instruction_data)
            )
            
            logger.info(f"Joining pool {pool_id} on-chain...")
            logger.info(f"  Pool PDA: {pool_pubkey}")
            logger.info(f"  Participant: {participant_wallet}")
            logger.info(f"  Vault: {vault_pubkey}")
            
            # Send transaction
            signature = await self.solana_client.send_instruction(instruction)
            
            if signature:
                logger.info(f"Joined pool on-chain! Signature: {signature}")
                return signature
            else:
                logger.error("Failed to join pool on-chain")
                return None
        
        except Exception as e:
            logger.error(f"Error joining pool on-chain: {e}", exc_info=True)
            return None
    
    async def verify_participant_on_chain(
        self,
        pool_id: int,
        participant_wallet: str,
        day: int,
        passed: bool,
    ) -> Optional[str]:
        """
        Submit verification to smart contract.
        
        Args:
            pool_id: Pool ID
            participant_wallet: Participant wallet address
            day: Day number being verified (1-indexed)
            passed: Whether participant passed
        
        Returns:
            Transaction signature if successful, None otherwise
        """
        try:
            participant_wallet_pubkey = Pubkey.from_string(participant_wallet)
            
            # Derive PDAs
            pool_pubkey, _ = self.solana_client.derive_pool_pda(pool_id)
            participant_pda, _ = self.solana_client.derive_participant_pda(
                pool_pubkey, participant_wallet_pubkey
            )
            
            # Build instruction data
            discriminator = self._anchor_discriminator("verify_participant")
            instruction_data = discriminator + struct.pack('<B', day) + struct.pack('<?', passed)
            
            # Build account metas
            accounts = [
                AccountMeta(pubkey=pool_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=participant_pda, is_signer=False, is_writable=True),
                AccountMeta(pubkey=self.solana_client.wallet.public_key, is_signer=True, is_writable=False),
            ]
            
            # Create instruction
            instruction = Instruction(
                program_id=self.program_id,
                accounts=accounts,
                data=bytes(instruction_data)
            )
            
            logger.info(f"Verifying participant on-chain...")
            logger.info(f"  Pool: {pool_pubkey}")
            logger.info(f"  Participant: {participant_wallet}")
            logger.info(f"  Day {day}: {'PASSED' if passed else 'FAILED'}")
            
            # Send transaction
            signature = await self.solana_client.send_instruction(instruction)
            
            if signature:
                logger.info(f"Verification submitted! Signature: {signature}")
                return signature
            else:
                logger.error("Failed to submit verification")
                return None
        
        except Exception as e:
            logger.error(f"Error verifying participant: {e}", exc_info=True)
            return None
    
    async def distribute_rewards_on_chain(self, pool_id: int) -> Optional[str]:
        """
        Call distribute_rewards instruction to mark pool as settled.
        
        Args:
            pool_id: Pool ID
        
        Returns:
            Transaction signature if successful, None otherwise
        """
        try:
            # Derive PDAs
            pool_pubkey, _ = self.solana_client.derive_pool_pda(pool_id)
            vault_pubkey, _ = self.solana_client.derive_vault_pda(pool_pubkey)
            
            # Build instruction data (just discriminator)
            discriminator = self._anchor_discriminator("distribute_rewards")
            instruction_data = discriminator
            
            # Build account metas
            accounts = [
                AccountMeta(pubkey=pool_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=vault_pubkey, is_signer=False, is_writable=True),
                AccountMeta(pubkey=self.solana_client.wallet.public_key, is_signer=True, is_writable=False),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
            ]
            
            # Create instruction
            instruction = Instruction(
                program_id=self.program_id,
                accounts=accounts,
                data=bytes(instruction_data)
            )
            
            logger.info(f"Distributing rewards for pool {pool_id}...")
            logger.info(f"  Pool: {pool_pubkey}")
            logger.info(f"  Vault: {vault_pubkey}")
            
            # Send transaction
            signature = await self.solana_client.send_instruction(instruction)
            
            if signature:
                logger.info(f"Distribution complete! Signature: {signature}")
                return signature
            else:
                logger.error("Failed to distribute rewards")
                return None
        
        except Exception as e:
            logger.error(f"Error distributing rewards: {e}", exc_info=True)
            return None
    
    async def get_pool_info(self, pool_id: int) -> Optional[dict]:
        """
        Get pool account info from chain.
        
        Args:
            pool_id: Pool ID
        
        Returns:
            Account info dict or None if not found
        """
        try:
            pool_pubkey, _ = self.solana_client.derive_pool_pda(pool_id)
            account_info = await self.solana_client.get_account_info(str(pool_pubkey))
            
            if account_info:
                return {
                    "pubkey": str(pool_pubkey),
                    "lamports": account_info.get("lamports", 0),
                    "owner": account_info.get("owner"),
                    "data_len": len(account_info.get("data", b"")),
                    "exists": True
                }
            return None
        
        except Exception as e:
            logger.error(f"Error getting pool info: {e}")
            return None
    
    async def get_vault_balance(self, pool_id: int) -> int:
        """
        Get vault balance for a pool.
        
        Args:
            pool_id: Pool ID
        
        Returns:
            Vault balance in lamports (0 if not found)
        """
        try:
            pool_pubkey, _ = self.solana_client.derive_pool_pda(pool_id)
            vault_pubkey, _ = self.solana_client.derive_vault_pda(pool_pubkey)
            
            balance = await self.solana_client.get_balance(str(vault_pubkey))
            return balance
        
        except Exception as e:
            logger.error(f"Error getting vault balance: {e}")
            return 0

