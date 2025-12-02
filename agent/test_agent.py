#!/usr/bin/env python3
"""
Test script for Commitment Agent verification and distribution functionality.

This script tests:
1. SolanaClient initialization and PDA derivation
2. Program account reading
3. Verification submission (requires existing pool and participant)
4. Distribution (requires ended pool)

Usage:
    python test_agent.py [--pool-id POOL_ID] [--participant-wallet WALLET] [--day DAY] [--test-distribution]
"""

import asyncio
import sys
import os
import logging
import argparse
from typing import Optional

# Add src directory to path so imports work from agent/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from solana_client import SolanaClient
from verify import Verifier
from distribute import Distributor
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def test_solana_client():
    """Test 1: SolanaClient initialization and basic functionality"""
    print("\n" + "="*60)
    print("TEST 1: SolanaClient Initialization")
    print("="*60)
    
    try:
        client = SolanaClient(settings.SOLANA_RPC_URL, settings.PROGRAM_ID)
        await client.initialize()
        
        print(f"✅ SolanaClient initialized successfully")
        print(f"   RPC URL: {settings.SOLANA_RPC_URL}")
        print(f"   Program ID: {settings.PROGRAM_ID}")
        print(f"   Agent wallet: {client.wallet.public_key}")
        
        # Test PDA derivation
        test_pool_id = 123
        pool_pubkey, pool_bump = client.derive_pool_pda(test_pool_id)
        print(f"\n✅ PDA derivation test:")
        print(f"   Pool ID: {test_pool_id}")
        print(f"   Pool PDA: {pool_pubkey}")
        print(f"   Bump: {pool_bump}")
        
        vault_pubkey, vault_bump = client.derive_vault_pda(pool_pubkey)
        print(f"   Vault PDA: {vault_pubkey}")
        print(f"   Vault Bump: {vault_bump}")
        
        # Test program accounts
        print(f"\n📡 Fetching program accounts...")
        accounts = await client.get_program_accounts()
        print(f"   Found {len(accounts)} accounts owned by program")
        
        if accounts:
            print(f"\n   Sample accounts:")
            for acc in accounts[:3]:  # Show first 3
                print(f"     - {acc['pubkey']} ({acc['lamports']} lamports)")
        
        await client.close()
        return True
        
    except Exception as e:
        print(f"❌ Test 1 failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_verification(pool_id: int, participant_wallet: str, day: int = 1):
    """Test 2: Verification submission"""
    print("\n" + "="*60)
    print("TEST 2: Verification Submission")
    print("="*60)
    
    try:
        client = SolanaClient(settings.SOLANA_RPC_URL, settings.PROGRAM_ID)
        await client.initialize()
        
        verifier = Verifier(client)
        
        print(f"📋 Verification details:")
        print(f"   Pool ID: {pool_id}")
        print(f"   Participant wallet: {participant_wallet}")
        print(f"   Day: {day}")
        print(f"   Passed: True (test)")
        
        # Derive PDAs to verify they're correct
        from solders.pubkey import Pubkey
        pool_pubkey, _ = client.derive_pool_pda(pool_id)
        participant_wallet_pubkey = Pubkey.from_string(participant_wallet)
        participant_pubkey, _ = client.derive_participant_pda(
            pool_pubkey, participant_wallet_pubkey
        )
        
        print(f"\n🔑 Derived PDAs:")
        print(f"   Pool PDA: {pool_pubkey}")
        print(f"   Participant PDA: {participant_pubkey}")
        
        # Check if pool account exists
        pool_account = await client.get_account_info(str(pool_pubkey))
        if pool_account is None:
            print(f"\n⚠️  WARNING: Pool account not found at {pool_pubkey}")
            print(f"   Make sure pool {pool_id} exists on-chain before testing verification")
            print(f"   Skipping actual verification submission...")
            await client.close()
            return False
        
        print(f"\n✅ Pool account found ({pool_account['lamports']} lamports)")
        
        # Submit verification
        print(f"\n🚀 Submitting verification transaction...")
        signature = await verifier.submit_verification(
            pool_id=pool_id,
            participant_wallet=participant_wallet,
            day=day,
            passed=True
        )
        
        if signature:
            print(f"\n✅ Verification submitted successfully!")
            print(f"   Transaction signature: {signature}")
            print(f"   View on Solscan: https://solscan.io/tx/{signature}?cluster=devnet")
            await client.close()
            return True
        else:
            print(f"\n❌ Verification submission failed (returned None)")
            await client.close()
            return False
            
    except Exception as e:
        print(f"❌ Test 2 failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_distribution(pool_id: int):
    """Test 3: Distribution"""
    print("\n" + "="*60)
    print("TEST 3: Distribution")
    print("="*60)
    
    try:
        client = SolanaClient(settings.SOLANA_RPC_URL, settings.PROGRAM_ID)
        await client.initialize()
        
        distributor = Distributor(client)
        
        print(f"📋 Distribution details:")
        print(f"   Pool ID: {pool_id}")
        
        # Derive pool PDA
        pool_pubkey, _ = client.derive_pool_pda(pool_id)
        vault_pubkey, _ = client.derive_vault_pda(pool_pubkey)
        
        print(f"\n🔑 Derived PDAs:")
        print(f"   Pool PDA: {pool_pubkey}")
        print(f"   Vault PDA: {vault_pubkey}")
        
        # Check if pool account exists
        pool_account = await client.get_account_info(str(pool_pubkey))
        if pool_account is None:
            print(f"\n⚠️  WARNING: Pool account not found at {pool_pubkey}")
            print(f"   Make sure pool {pool_id} exists on-chain before testing distribution")
            print(f"   Skipping actual distribution submission...")
            await client.close()
            return False
        
        print(f"\n✅ Pool account found ({pool_account['lamports']} lamports)")
        
        # Check vault account
        vault_account = await client.get_account_info(str(vault_pubkey))
        if vault_account:
            print(f"✅ Vault account found ({vault_account['lamports']} lamports)")
        else:
            print(f"⚠️  Vault account not found (might not be initialized yet)")
        
        # Submit distribution
        print(f"\n🚀 Submitting distribution transaction...")
        success = await distributor.distribute_pool(pool_id)
        
        if success:
            print(f"\n✅ Distribution submitted successfully!")
            print(f"   Pool {pool_id} should now be marked as settled")
            await client.close()
            return True
        else:
            print(f"\n❌ Distribution submission failed")
            await client.close()
            return False
            
    except Exception as e:
        print(f"❌ Test 3 failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_all():
    """Run all tests in sequence"""
    print("\n" + "="*60)
    print("COMMITMENT AGENT TEST SUITE")
    print("="*60)
    print(f"Program ID: {settings.PROGRAM_ID}")
    print(f"RPC URL: {settings.SOLANA_RPC_URL}")
    
    results = []
    
    # Test 1: Always run
    results.append(("SolanaClient", await test_solana_client()))
    
    return results


async def main():
    parser = argparse.ArgumentParser(description="Test Commitment Agent functionality")
    parser.add_argument("--pool-id", type=int, help="Pool ID to test with")
    parser.add_argument("--participant-wallet", type=str, help="Participant wallet address")
    parser.add_argument("--day", type=int, default=1, help="Day number for verification (default: 1)")
    parser.add_argument("--test-verification", action="store_true", help="Test verification submission")
    parser.add_argument("--test-distribution", action="store_true", help="Test distribution")
    parser.add_argument("--all", action="store_true", help="Run all basic tests (no on-chain transactions)")
    
    args = parser.parse_args()
    
    if args.all:
        results = await test_all()
        print("\n" + "="*60)
        print("TEST RESULTS")
        print("="*60)
        for test_name, passed in results:
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{test_name}: {status}")
        return
    
    # Run basic tests first
    results = await test_all()
    
    # Test verification if requested
    if args.test_verification:
        if not args.pool_id:
            print("\n❌ Error: --pool-id required for verification test")
            print("   Example: python test_agent.py --test-verification --pool-id 1 --participant-wallet <WALLET>")
            return
        
        if not args.participant_wallet:
            print("\n⚠️  Warning: --participant-wallet not provided, using agent wallet")
            client = SolanaClient(settings.SOLANA_RPC_URL, settings.PROGRAM_ID)
            await client.initialize()
            participant_wallet = str(client.wallet.public_key)
            await client.close()
        else:
            participant_wallet = args.participant_wallet
        
        results.append(("Verification", await test_verification(
            args.pool_id, participant_wallet, args.day
        )))
    
    # Test distribution if requested
    if args.test_distribution:
        if not args.pool_id:
            print("\n❌ Error: --pool-id required for distribution test")
            print("   Example: python test_agent.py --test-distribution --pool-id 1")
            return
        
        results.append(("Distribution", await test_distribution(args.pool_id)))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST RESULTS")
    print("="*60)
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    if all_passed:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
