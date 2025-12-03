#!/usr/bin/env python3
"""
Quick Demo Script - Simplified testing for demos

This script provides quick commands for common demo scenarios:
- Create a demo pool
- Join a pool
- Submit check-in
- Verify a participant
- Show pool status

Usage:
    python demo.py create [--stake-sol 0.01]
    python demo.py join <pool_id>
    python demo.py checkin <pool_id> [--day 1]
    python demo.py verify <pool_id> [--day 1]
    python demo.py status <pool_id>
    python demo.py full [--stake-sol 0.01]
"""

import asyncio
import sys
import os
import argparse
import time
import json

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from solana_client import SolanaClient
from onchain import OnChainClient
from database import execute_query
from config import settings


async def get_clients():
    """Initialize and return clients"""
    solana_client = SolanaClient(settings.SOLANA_RPC_URL, settings.PROGRAM_ID)
    await solana_client.initialize()
    onchain_client = OnChainClient(solana_client)
    return solana_client, onchain_client


async def ensure_user(wallet: str):
    """Ensure user exists in database"""
    try:
        users = await execute_query(
            table="users",
            operation="select",
            filters={"wallet_address": wallet},
            limit=1
        )
        if not users:
            await execute_query(
                table="users",
                operation="insert",
                data={
                    "wallet_address": wallet,
                    "reputation_score": 100,
                    "total_games": 0,
                    "games_completed": 0,
                    "total_earned": 0.0,
                    "streak_count": 0
                }
            )
    except:
        pass


async def cmd_create(args):
    """Create a demo pool"""
    print("\n🆕 Creating Demo Pool...")
    
    solana_client, onchain_client = await get_clients()
    wallet = str(solana_client.wallet.public_key)
    
    try:
        # Generate pool ID
        pool_id = int(time.time()) % 10000000
        stake_lamports = int(args.stake_sol * 1e9)
        
        # Derive PDAs
        pool_pubkey, _ = solana_client.derive_pool_pda(pool_id)
        
        print(f"   Pool ID: {pool_id}")
        print(f"   Pool PDA: {pool_pubkey}")
        print(f"   Stake: {args.stake_sol} SOL")
        print(f"   Creator: {wallet}")
        
        # Create on-chain
        print("\n   Submitting transaction...")
        signature = await onchain_client.create_pool_on_chain(
            pool_id=pool_id,
            goal_type="lifestyle_habit",
            goal_params={"habit_name": "Demo Challenge"},
            stake_amount_lamports=stake_lamports,
            duration_days=1,
            max_participants=10,
            min_participants=1,
            charity_address=wallet,
            distribution_mode="competitive",
        )
        
        if signature:
            print(f"\n✅ Pool Created!")
            print(f"   Pool ID: {pool_id}")
            print(f"   Signature: {signature}")
            print(f"   Solscan: https://solscan.io/tx/{signature}?cluster=devnet")
            
            # Sync to database
            await ensure_user(wallet)
            try:
                current_time = int(time.time())
                await execute_query(
                    table="pools",
                    operation="insert",
                    data={
                        "pool_id": pool_id,
                        "pool_pubkey": str(pool_pubkey),
                        "creator_wallet": wallet,
                        "name": f"Demo Pool {pool_id}",
                        "description": "Demo pool",
                        "goal_type": "lifestyle_habit",
                        "goal_metadata": {"habit_name": "Demo Challenge"},
                        "stake_amount": args.stake_sol,
                        "duration_days": 1,
                        "max_participants": 10,
                        "participant_count": 0,
                        "distribution_mode": "competitive",
                        "split_percentage_winners": 100,
                        "charity_address": wallet,
                        "total_staked": 0,
                        "yield_earned": 0,
                        "start_timestamp": current_time,
                        "end_timestamp": current_time + 86400,
                        "status": "pending",
                        "is_public": True,
                    }
                )
                print(f"   ✅ Synced to database")
            except Exception as e:
                print(f"   ⚠️  Database sync failed: {e}")
            
            # Save pool ID for other commands
            with open(".last_pool_id", "w") as f:
                f.write(str(pool_id))
            
            return pool_id
        else:
            print(f"\n❌ Failed to create pool")
            return None
    
    finally:
        await solana_client.close()


async def cmd_join(args):
    """Join a pool"""
    pool_id = args.pool_id
    print(f"\n🤝 Joining Pool {pool_id}...")
    
    solana_client, onchain_client = await get_clients()
    wallet = str(solana_client.wallet.public_key)
    
    try:
        # Get balance before
        balance_before = await solana_client.get_balance(wallet)
        print(f"   Balance: {balance_before / 1e9:.4f} SOL")
        
        # Join on-chain
        print("\n   Submitting transaction...")
        signature = await onchain_client.join_pool_on_chain(pool_id=pool_id)
        
        if signature:
            # Get balance after
            await asyncio.sleep(2)
            balance_after = await solana_client.get_balance(wallet)
            
            print(f"\n✅ Joined Pool!")
            print(f"   Signature: {signature}")
            print(f"   SOL transferred: {(balance_before - balance_after) / 1e9:.4f} SOL")
            print(f"   Solscan: https://solscan.io/tx/{signature}?cluster=devnet")
            
            # Sync to database
            await ensure_user(wallet)
            try:
                pool_pubkey, _ = solana_client.derive_pool_pda(pool_id)
                participant_pda, _ = solana_client.derive_participant_pda(
                    pool_pubkey, solana_client.wallet.public_key
                )
                
                # Get stake amount from pool
                pools = await execute_query(
                    table="pools",
                    operation="select",
                    filters={"pool_id": pool_id},
                    limit=1
                )
                stake = pools[0].get("stake_amount", 0.01) if pools else 0.01
                
                await execute_query(
                    table="participants",
                    operation="insert",
                    data={
                        "pool_id": pool_id,
                        "wallet_address": wallet,
                        "participant_pubkey": str(participant_pda),
                        "stake_amount": stake,
                        "join_timestamp": int(time.time()),
                        "status": "active",
                        "days_verified": 0,
                    }
                )
                
                # Update pool
                await execute_query(
                    table="pools",
                    operation="update",
                    filters={"pool_id": pool_id},
                    data={"participant_count": 1, "total_staked": stake, "status": "active"}
                )
                print(f"   ✅ Synced to database")
            except Exception as e:
                print(f"   ⚠️  Database sync failed: {e}")
        else:
            print(f"\n❌ Failed to join pool")
    
    finally:
        await solana_client.close()


async def cmd_checkin(args):
    """Submit a check-in"""
    pool_id = args.pool_id
    day = args.day
    print(f"\n📝 Submitting Check-in (Pool {pool_id}, Day {day})...")
    
    import httpx
    
    solana_client, _ = await get_clients()
    wallet = str(solana_client.wallet.public_key)
    
    try:
        await ensure_user(wallet)
        
        # Submit via API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://localhost:8000/api/checkins/",
                json={
                    "pool_id": pool_id,
                    "participant_wallet": wallet,
                    "day": day,
                    "success": True,
                }
            )
            
            if response.status_code == 201:
                result = response.json()
                print(f"\n✅ Check-in Submitted!")
                print(f"   Pool ID: {pool_id}")
                print(f"   Day: {day}")
                print(f"   Success: True")
            else:
                print(f"\n❌ Failed: {response.status_code}")
                print(f"   {response.text}")
    
    finally:
        await solana_client.close()


async def cmd_verify(args):
    """Verify a participant"""
    pool_id = args.pool_id
    day = args.day
    print(f"\n🔍 Verifying Participant (Pool {pool_id}, Day {day})...")
    
    solana_client, onchain_client = await get_clients()
    wallet = str(solana_client.wallet.public_key)
    
    try:
        # Check for check-in
        checkins = await execute_query(
            table="checkins",
            operation="select",
            filters={
                "pool_id": pool_id,
                "participant_wallet": wallet,
                "day": day
            },
            limit=1
        )
        
        passed = bool(checkins and checkins[0].get("success"))
        print(f"   Check-in found: {bool(checkins)}")
        print(f"   Passed: {passed}")
        
        # Submit verification on-chain
        print("\n   Submitting verification transaction...")
        signature = await onchain_client.verify_participant_on_chain(
            pool_id=pool_id,
            participant_wallet=wallet,
            day=day,
            passed=passed
        )
        
        if signature:
            print(f"\n✅ Verification Submitted!")
            print(f"   Day {day}: {'PASSED' if passed else 'FAILED'}")
            print(f"   Signature: {signature}")
            print(f"   Solscan: https://solscan.io/tx/{signature}?cluster=devnet")
        else:
            print(f"\n❌ Verification failed")
    
    finally:
        await solana_client.close()


async def cmd_status(args):
    """Show pool status"""
    pool_id = args.pool_id
    print(f"\n📊 Pool {pool_id} Status...")
    
    solana_client, onchain_client = await get_clients()
    
    try:
        # On-chain status
        pool_info = await onchain_client.get_pool_info(pool_id)
        vault_balance = await onchain_client.get_vault_balance(pool_id)
        
        print(f"\n   ON-CHAIN:")
        if pool_info:
            print(f"   ✅ Pool exists")
            print(f"      PDA: {pool_info['pubkey']}")
            print(f"      Account lamports: {pool_info['lamports']}")
        else:
            print(f"   ❌ Pool not found on-chain")
        
        print(f"   💰 Vault: {vault_balance / 1e9:.4f} SOL")
        
        # Database status
        print(f"\n   DATABASE:")
        try:
            pools = await execute_query(
                table="pools",
                operation="select",
                filters={"pool_id": pool_id},
                limit=1
            )
            
            if pools:
                pool = pools[0]
                print(f"   ✅ Pool in database")
                print(f"      Status: {pool.get('status')}")
                print(f"      Participants: {pool.get('participant_count')}")
                print(f"      Staked: {pool.get('total_staked')} SOL")
            else:
                print(f"   ❌ Pool not in database")
            
            participants = await execute_query(
                table="participants",
                operation="select",
                filters={"pool_id": pool_id}
            )
            
            if participants:
                print(f"\n   PARTICIPANTS ({len(participants)}):")
                for p in participants:
                    print(f"      - {p.get('wallet_address')[:12]}... ({p.get('status')})")
            
            checkins = await execute_query(
                table="checkins",
                operation="select",
                filters={"pool_id": pool_id}
            )
            
            if checkins:
                print(f"\n   CHECK-INS ({len(checkins)}):")
                for c in checkins:
                    status = "✅" if c.get("success") else "❌"
                    print(f"      Day {c.get('day')}: {status}")
        
        except Exception as e:
            print(f"   ⚠️  Database error: {e}")
    
    finally:
        await solana_client.close()


async def cmd_full(args):
    """Run full demo flow"""
    print("\n🚀 Running Full Demo Flow...")
    print("="*50)
    
    # Step 1: Create
    pool_id = await cmd_create(args)
    if not pool_id:
        return
    
    await asyncio.sleep(2)
    
    # Step 2: Join
    class JoinArgs:
        pass
    join_args = JoinArgs()
    join_args.pool_id = pool_id
    await cmd_join(join_args)
    
    await asyncio.sleep(2)
    
    # Step 3: Check-in
    class CheckinArgs:
        pass
    checkin_args = CheckinArgs()
    checkin_args.pool_id = pool_id
    checkin_args.day = 1
    await cmd_checkin(checkin_args)
    
    await asyncio.sleep(2)
    
    # Step 4: Verify
    class VerifyArgs:
        pass
    verify_args = VerifyArgs()
    verify_args.pool_id = pool_id
    verify_args.day = 1
    await cmd_verify(verify_args)
    
    await asyncio.sleep(2)
    
    # Step 5: Status
    class StatusArgs:
        pass
    status_args = StatusArgs()
    status_args.pool_id = pool_id
    await cmd_status(status_args)
    
    print("\n" + "="*50)
    print("🎉 Full Demo Complete!")
    print(f"   Pool ID: {pool_id}")


def main():
    parser = argparse.ArgumentParser(description="Quick Demo Commands")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # create
    create_parser = subparsers.add_parser("create", help="Create a demo pool")
    create_parser.add_argument("--stake-sol", type=float, default=0.01, help="Stake amount in SOL")
    
    # join
    join_parser = subparsers.add_parser("join", help="Join a pool")
    join_parser.add_argument("pool_id", type=int, help="Pool ID to join")
    
    # checkin
    checkin_parser = subparsers.add_parser("checkin", help="Submit check-in")
    checkin_parser.add_argument("pool_id", type=int, help="Pool ID")
    checkin_parser.add_argument("--day", type=int, default=1, help="Day number")
    
    # verify
    verify_parser = subparsers.add_parser("verify", help="Verify participant")
    verify_parser.add_argument("pool_id", type=int, help="Pool ID")
    verify_parser.add_argument("--day", type=int, default=1, help="Day number")
    
    # status
    status_parser = subparsers.add_parser("status", help="Show pool status")
    status_parser.add_argument("pool_id", type=int, help="Pool ID")
    
    # full
    full_parser = subparsers.add_parser("full", help="Run full demo flow")
    full_parser.add_argument("--stake-sol", type=float, default=0.01, help="Stake amount in SOL")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Run the appropriate command
    if args.command == "create":
        asyncio.run(cmd_create(args))
    elif args.command == "join":
        asyncio.run(cmd_join(args))
    elif args.command == "checkin":
        asyncio.run(cmd_checkin(args))
    elif args.command == "verify":
        asyncio.run(cmd_verify(args))
    elif args.command == "status":
        asyncio.run(cmd_status(args))
    elif args.command == "full":
        asyncio.run(cmd_full(args))


if __name__ == "__main__":
    main()


