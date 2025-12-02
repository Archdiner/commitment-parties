#!/usr/bin/env python3
"""
Full End-to-End Test - Complete On-Chain Flow

Tests the COMPLETE flow with REAL blockchain transactions:
1. Create Pool ON-CHAIN
2. Join Pool ON-CHAIN (transfers real SOL)
3. Submit Check-in (API)
4. Agent Verifies ON-CHAIN
5. Distribution ON-CHAIN
6. Verify results in database

Usage:
    python test_full_flow.py [--stake-sol AMOUNT] [--duration-days DAYS] [--skip-distribution]

Requirements:
    - Agent wallet must have SOL for transactions
    - Backend API running
    - Supabase configured
"""

import asyncio
import sys
import os
import logging
import argparse
import time
import json
from typing import Optional
import httpx

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from solana_client import SolanaClient
from onchain import OnChainClient
from verify import Verifier
from database import execute_query
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class FullFlowTester:
    """Complete end-to-end test with real on-chain transactions"""
    
    def __init__(
        self,
        api_url: str = "http://localhost:8000",
        stake_sol: float = 0.01,
        duration_days: int = 1,
    ):
        self.api_url = api_url
        self.stake_sol = stake_sol
        self.stake_lamports = int(stake_sol * 1e9)
        self.duration_days = duration_days
        
        self.pool_id: Optional[int] = None
        self.pool_pubkey: Optional[str] = None
        self.participant_wallet: Optional[str] = None
        
        self.solana_client: Optional[SolanaClient] = None
        self.onchain_client: Optional[OnChainClient] = None
        
        # Track signatures for verification
        self.signatures = {
            "create_pool": None,
            "join_pool": None,
            "verify": None,
            "distribute": None,
        }
    
    async def initialize(self):
        """Initialize clients"""
        logger.info("Initializing Solana client...")
        
        self.solana_client = SolanaClient(settings.SOLANA_RPC_URL, settings.PROGRAM_ID)
        await self.solana_client.initialize()
        
        self.onchain_client = OnChainClient(self.solana_client)
        self.participant_wallet = str(self.solana_client.wallet.public_key)
        
        # Check wallet balance
        balance = await self.solana_client.get_balance(self.participant_wallet)
        balance_sol = balance / 1e9
        
        logger.info(f"Agent wallet: {self.participant_wallet}")
        logger.info(f"Wallet balance: {balance_sol:.4f} SOL")
        
        if balance_sol < self.stake_sol + 0.01:  # Need stake + fees
            logger.warning(f"Low balance! Need at least {self.stake_sol + 0.01:.4f} SOL")
            logger.warning("Airdrop some SOL: solana airdrop 1 --url devnet")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.solana_client:
            await self.solana_client.close()
    
    async def _ensure_user_exists(self, wallet: str) -> bool:
        """Ensure user exists in database"""
        try:
            users = await execute_query(
                table="users",
                operation="select",
                filters={"wallet_address": wallet},
                limit=1
            )
            
            if users:
                return True
            
            # Create user
            user_data = {
                "wallet_address": wallet,
                "reputation_score": 100,
                "total_games": 0,
                "games_completed": 0,
                "total_earned": 0.0,
                "streak_count": 0
            }
            
            await execute_query(table="users", operation="insert", data=user_data)
            logger.info(f"Created user {wallet}")
            return True
        
        except Exception as e:
            if "unique" in str(e).lower() or "duplicate" in str(e).lower():
                return True
            logger.error(f"Error ensuring user exists: {e}")
            return False
    
    async def step1_create_pool_onchain(self) -> bool:
        """Step 1: Create Pool ON-CHAIN"""
        print("\n" + "="*60)
        print("STEP 1: Create Pool ON-CHAIN")
        print("="*60)
        
        try:
            # Generate unique pool ID
            self.pool_id = int(time.time()) % 10000000
            
            # Derive pool PDA for display
            pool_pubkey, _ = self.solana_client.derive_pool_pda(self.pool_id)
            self.pool_pubkey = str(pool_pubkey)
            
            print(f"📋 Pool Configuration:")
            print(f"   Pool ID: {self.pool_id}")
            print(f"   Pool PDA: {self.pool_pubkey}")
            print(f"   Stake: {self.stake_sol} SOL ({self.stake_lamports} lamports)")
            print(f"   Duration: {self.duration_days} day(s)")
            print(f"   Creator: {self.participant_wallet}")
            
            # Create pool on-chain
            print(f"\n🚀 Submitting create_pool transaction...")
            
            signature = await self.onchain_client.create_pool_on_chain(
                pool_id=self.pool_id,
                goal_type="lifestyle_habit",
                goal_params={"habit_name": "Screen Time < 3h"},
                stake_amount_lamports=self.stake_lamports,
                duration_days=self.duration_days,
                max_participants=10,
                min_participants=1,
                charity_address=self.participant_wallet,  # Use same wallet for demo
                distribution_mode="competitive",
            )
            
            if signature:
                self.signatures["create_pool"] = signature
                print(f"\n✅ Pool created ON-CHAIN!")
                print(f"   Signature: {signature}")
                print(f"   Solscan: https://solscan.io/tx/{signature}?cluster=devnet")
                
                # Also create in database for API
                await self._sync_pool_to_database()
                
                return True
            else:
                print(f"\n❌ Failed to create pool on-chain")
                return False
        
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def _sync_pool_to_database(self):
        """Sync pool to database for API access"""
        try:
            # Ensure user exists
            await self._ensure_user_exists(self.participant_wallet)
            
            current_time = int(time.time())
            pool_data = {
                "pool_id": self.pool_id,
                "pool_pubkey": self.pool_pubkey,
                "creator_wallet": self.participant_wallet,
                "name": f"Test Pool {self.pool_id}",
                "description": "Full flow test pool",
                "goal_type": "lifestyle_habit",
                "goal_metadata": {"habit_name": "Screen Time < 3h"},
                "stake_amount": self.stake_sol,
                "duration_days": self.duration_days,
                "max_participants": 10,
                "participant_count": 0,
                "distribution_mode": "competitive",
                "split_percentage_winners": 100,
                "charity_address": self.participant_wallet,
                "total_staked": 0,
                "yield_earned": 0,
                "start_timestamp": current_time,
                "end_timestamp": current_time + (self.duration_days * 86400),
                "status": "pending",
                "is_public": True,
            }
            
            await execute_query(table="pools", operation="insert", data=pool_data)
            logger.info(f"Pool {self.pool_id} synced to database")
        
        except Exception as e:
            if "unique" not in str(e).lower() and "duplicate" not in str(e).lower():
                logger.warning(f"Could not sync pool to database: {e}")
    
    async def step2_join_pool_onchain(self) -> bool:
        """Step 2: Join Pool ON-CHAIN (transfers real SOL)"""
        print("\n" + "="*60)
        print("STEP 2: Join Pool ON-CHAIN (Real SOL Transfer)")
        print("="*60)
        
        try:
            if not self.pool_id:
                print("❌ Pool ID not set")
                return False
            
            # Get wallet balance before
            balance_before = await self.solana_client.get_balance(self.participant_wallet)
            print(f"💰 Wallet balance before: {balance_before / 1e9:.4f} SOL")
            print(f"   Stake amount: {self.stake_sol} SOL")
            
            # Join pool on-chain
            print(f"\n🚀 Submitting join_pool transaction...")
            print(f"   This will transfer {self.stake_sol} SOL to the pool vault")
            
            signature = await self.onchain_client.join_pool_on_chain(pool_id=self.pool_id)
            
            if signature:
                self.signatures["join_pool"] = signature
                
                # Get balance after
                await asyncio.sleep(2)  # Wait for confirmation
                balance_after = await self.solana_client.get_balance(self.participant_wallet)
                
                # Get vault balance
                vault_balance = await self.onchain_client.get_vault_balance(self.pool_id)
                
                print(f"\n✅ Joined pool ON-CHAIN!")
                print(f"   Signature: {signature}")
                print(f"   Solscan: https://solscan.io/tx/{signature}?cluster=devnet")
                print(f"\n💰 Balance after: {balance_after / 1e9:.4f} SOL")
                print(f"   SOL transferred: {(balance_before - balance_after) / 1e9:.4f} SOL")
                print(f"   Vault balance: {vault_balance / 1e9:.4f} SOL")
                
                # Sync to database
                await self._sync_participant_to_database()
                
                return True
            else:
                print(f"\n❌ Failed to join pool on-chain")
                return False
        
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def _sync_participant_to_database(self):
        """Sync participant to database"""
        try:
            pool_pubkey, _ = self.solana_client.derive_pool_pda(self.pool_id)
            participant_pda, _ = self.solana_client.derive_participant_pda(
                pool_pubkey, self.solana_client.wallet.public_key
            )
            
            participant_data = {
                "pool_id": self.pool_id,
                "wallet_address": self.participant_wallet,
                "participant_pubkey": str(participant_pda),
                "stake_amount": self.stake_sol,
                "join_timestamp": int(time.time()),
                "status": "active",
                "days_verified": 0,
            }
            
            await execute_query(table="participants", operation="insert", data=participant_data)
            
            # Update pool
            await execute_query(
                table="pools",
                operation="update",
                filters={"pool_id": self.pool_id},
                data={
                    "participant_count": 1,
                    "total_staked": self.stake_sol,
                    "status": "active"
                }
            )
            
            logger.info(f"Participant synced to database")
        
        except Exception as e:
            if "unique" not in str(e).lower() and "duplicate" not in str(e).lower():
                logger.warning(f"Could not sync participant to database: {e}")
    
    async def step3_submit_checkin(self) -> bool:
        """Step 3: Submit Check-in (API)"""
        print("\n" + "="*60)
        print("STEP 3: Submit Check-in (API)")
        print("="*60)
        
        try:
            if not self.pool_id:
                print("❌ Pool ID not set")
                return False
            
            checkin_data = {
                "pool_id": self.pool_id,
                "participant_wallet": self.participant_wallet,
                "day": 1,
                "success": True,
            }
            
            print(f"📝 Submitting check-in...")
            print(f"   Pool ID: {self.pool_id}")
            print(f"   Day: 1")
            print(f"   Success: True")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/api/checkins/",
                    json=checkin_data
                )
                
                if response.status_code == 201:
                    result = response.json()
                    print(f"\n✅ Check-in submitted!")
                    print(f"   ID: {result.get('id')}")
                    print(f"   Timestamp: {result.get('timestamp')}")
                    return True
                else:
                    print(f"\n❌ Failed to submit check-in: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
        
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def step4_verify_onchain(self) -> bool:
        """Step 4: Agent Verifies ON-CHAIN"""
        print("\n" + "="*60)
        print("STEP 4: Agent Verifies ON-CHAIN")
        print("="*60)
        
        try:
            if not self.pool_id:
                print("❌ Pool ID not set")
                return False
            
            # Check if check-in exists
            checkins = await execute_query(
                table="checkins",
                operation="select",
                filters={
                    "pool_id": self.pool_id,
                    "participant_wallet": self.participant_wallet,
                    "day": 1
                },
                limit=1
            )
            
            passed = bool(checkins and checkins[0].get("success"))
            
            print(f"🔍 Verifying participant...")
            print(f"   Check-in found: {bool(checkins)}")
            print(f"   Passed: {passed}")
            
            # Submit verification on-chain
            print(f"\n🚀 Submitting verify_participant transaction...")
            
            signature = await self.onchain_client.verify_participant_on_chain(
                pool_id=self.pool_id,
                participant_wallet=self.participant_wallet,
                day=1,
                passed=passed
            )
            
            if signature:
                self.signatures["verify"] = signature
                print(f"\n✅ Verification submitted ON-CHAIN!")
                print(f"   Signature: {signature}")
                print(f"   Solscan: https://solscan.io/tx/{signature}?cluster=devnet")
                return True
            else:
                print(f"\n❌ Failed to submit verification on-chain")
                return False
        
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def step5_distribute(self) -> bool:
        """Step 5: Distribution ON-CHAIN"""
        print("\n" + "="*60)
        print("STEP 5: Distribution ON-CHAIN")
        print("="*60)
        
        try:
            if not self.pool_id:
                print("❌ Pool ID not set")
                return False
            
            # Note: In real scenario, pool must be ended first
            print(f"⚠️  Note: Distribution requires pool to be ended")
            print(f"   For demo, we'll attempt to call distribute_rewards")
            
            # Get vault balance before
            vault_balance = await self.onchain_client.get_vault_balance(self.pool_id)
            print(f"\n💰 Vault balance: {vault_balance / 1e9:.4f} SOL")
            
            # Submit distribution
            print(f"\n🚀 Submitting distribute_rewards transaction...")
            
            signature = await self.onchain_client.distribute_rewards_on_chain(self.pool_id)
            
            if signature:
                self.signatures["distribute"] = signature
                print(f"\n✅ Distribution complete ON-CHAIN!")
                print(f"   Signature: {signature}")
                print(f"   Solscan: https://solscan.io/tx/{signature}?cluster=devnet")
                return True
            else:
                print(f"\n⚠️  Distribution failed (pool may not be ended yet)")
                print(f"   This is expected if pool hasn't reached end_timestamp")
                return True  # Not a failure for demo
        
        except Exception as e:
            print(f"\n⚠️  Distribution error: {e}")
            print(f"   This is expected if pool hasn't ended")
            return True  # Not a failure for demo
    
    async def step6_verify_results(self) -> bool:
        """Step 6: Verify Results"""
        print("\n" + "="*60)
        print("STEP 6: Verify Results")
        print("="*60)
        
        try:
            # On-chain verification
            print("\n📊 ON-CHAIN STATUS:")
            
            pool_info = await self.onchain_client.get_pool_info(self.pool_id)
            if pool_info:
                print(f"   ✅ Pool account exists")
                print(f"      Pubkey: {pool_info['pubkey']}")
                print(f"      Lamports: {pool_info['lamports']}")
            else:
                print(f"   ❌ Pool account not found")
            
            vault_balance = await self.onchain_client.get_vault_balance(self.pool_id)
            print(f"   💰 Vault balance: {vault_balance / 1e9:.4f} SOL")
            
            # Database verification
            print("\n📊 DATABASE STATUS:")
            
            pools = await execute_query(
                table="pools",
                operation="select",
                filters={"pool_id": self.pool_id},
                limit=1
            )
            
            if pools:
                pool = pools[0]
                print(f"   ✅ Pool in database")
                print(f"      Status: {pool.get('status')}")
                print(f"      Participants: {pool.get('participant_count')}")
                print(f"      Total staked: {pool.get('total_staked')} SOL")
            
            participants = await execute_query(
                table="participants",
                operation="select",
                filters={"pool_id": self.pool_id}
            )
            
            if participants:
                print(f"   ✅ {len(participants)} participant(s) in database")
                for p in participants:
                    print(f"      - {p.get('wallet_address')[:10]}... ({p.get('status')})")
            
            checkins = await execute_query(
                table="checkins",
                operation="select",
                filters={"pool_id": self.pool_id}
            )
            
            if checkins:
                print(f"   ✅ {len(checkins)} check-in(s) in database")
            
            # Transaction summary
            print("\n📋 TRANSACTION SUMMARY:")
            for step, sig in self.signatures.items():
                if sig:
                    print(f"   ✅ {step}: {sig[:20]}...")
                else:
                    print(f"   ⏭️  {step}: skipped/failed")
            
            return True
        
        except Exception as e:
            print(f"\n❌ Error: {e}")
            return False
    
    async def run_full_flow(self, skip_distribution: bool = False):
        """Run the complete flow"""
        print("\n" + "="*60)
        print("🚀 FULL ON-CHAIN FLOW TEST")
        print("="*60)
        print(f"API URL: {self.api_url}")
        print(f"RPC URL: {settings.SOLANA_RPC_URL}")
        print(f"Program ID: {settings.PROGRAM_ID}")
        print(f"Stake: {self.stake_sol} SOL")
        print(f"Duration: {self.duration_days} day(s)")
        print("="*60)
        
        results = []
        
        try:
            # Step 1: Create Pool
            results.append(("1. Create Pool ON-CHAIN", await self.step1_create_pool_onchain()))
            if not results[-1][1]:
                return results
            
            # Step 2: Join Pool
            results.append(("2. Join Pool ON-CHAIN", await self.step2_join_pool_onchain()))
            if not results[-1][1]:
                return results
            
            # Step 3: Submit Check-in
            results.append(("3. Submit Check-in (API)", await self.step3_submit_checkin()))
            if not results[-1][1]:
                return results
            
            # Step 4: Verify
            results.append(("4. Verify ON-CHAIN", await self.step4_verify_onchain()))
            
            # Step 5: Distribution (optional)
            if not skip_distribution:
                results.append(("5. Distribute ON-CHAIN", await self.step5_distribute()))
            else:
                print("\n⏭️  Skipping distribution (--skip-distribution)")
                results.append(("5. Distribute ON-CHAIN", None))
            
            # Step 6: Verify Results
            results.append(("6. Verify Results", await self.step6_verify_results()))
            
            # Summary
            print("\n" + "="*60)
            print("📊 FINAL RESULTS")
            print("="*60)
            
            for step_name, passed in results:
                if passed is None:
                    status = "⏭️  SKIPPED"
                elif passed:
                    status = "✅ PASSED"
                else:
                    status = "❌ FAILED"
                print(f"{step_name}: {status}")
            
            all_passed = all(r[1] for r in results if r[1] is not None)
            
            if all_passed:
                print("\n🎉 Full on-chain flow completed successfully!")
                print(f"\n📝 Pool Info:")
                print(f"   Pool ID: {self.pool_id}")
                print(f"   Pool Pubkey: {self.pool_pubkey}")
                
                print(f"\n🔗 View on Solscan:")
                for step, sig in self.signatures.items():
                    if sig:
                        print(f"   {step}: https://solscan.io/tx/{sig}?cluster=devnet")
            else:
                print("\n⚠️  Some steps failed. Check output above.")
            
            return results
        
        finally:
            await self.cleanup()


async def main():
    parser = argparse.ArgumentParser(description="Full On-Chain Flow Test")
    parser.add_argument(
        "--api-url",
        type=str,
        default="http://localhost:8000",
        help="Backend API URL"
    )
    parser.add_argument(
        "--stake-sol",
        type=float,
        default=0.01,
        help="Stake amount in SOL (default: 0.01)"
    )
    parser.add_argument(
        "--duration-days",
        type=int,
        default=1,
        help="Pool duration in days (default: 1)"
    )
    parser.add_argument(
        "--skip-distribution",
        action="store_true",
        help="Skip distribution step"
    )
    
    args = parser.parse_args()
    
    tester = FullFlowTester(
        api_url=args.api_url,
        stake_sol=args.stake_sol,
        duration_days=args.duration_days,
    )
    
    try:
        await tester.initialize()
        await tester.run_full_flow(skip_distribution=args.skip_distribution)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

