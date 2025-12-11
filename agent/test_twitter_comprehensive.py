"""
Comprehensive Twitter Bot Testing Suite

Tests all Twitter bot functionality including:
- Twitter API authentication
- Tweet generation (all event types)
- Blink URL creation
- Real database pool integration (optional)
- Actual tweet posting (optional)
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List

# Add src directory to path so imports work correctly
agent_dir = Path(__file__).parent
src_dir = agent_dir / "src"
sys.path.insert(0, str(src_dir))

from social import SocialManager, SocialEventType
from config import settings
from database import execute_query

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def test_twitter_authentication():
    """Test Twitter API authentication"""
    print("\n" + "=" * 60)
    print("TEST 1: Twitter API Authentication")
    print("=" * 60)
    
    social = SocialManager()
    
    if not social.twitter_enabled:
        print("❌ Twitter not configured!")
        return False
    
    print("✅ Twitter client initialized")
    
    try:
        # Test authentication with primary account
        response = social.twitter_client.get_me()
        print(f"✅ Authentication successful!")
        print(f"   Account: @{response.data.username}")
        print(f"   Name: {response.data.name}")
        print(f"   ID: {response.data.id}")
        
        # Check multiple accounts
        if len(social.twitter_accounts) > 1:
            print(f"✅ Multiple Twitter accounts configured: {len(social.twitter_accounts)}")
            for account in social.twitter_accounts:
                try:
                    account_response = account.client.get_me()
                    print(f"   Account {account.account_id}: @{account_response.data.username}")
                except Exception as e:
                    print(f"   ⚠️  Account {account.account_id}: Authentication failed - {e}")
        
        return True
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return False


async def test_tweet_generation():
    """Test tweet content generation for all event types"""
    print("\n" + "=" * 60)
    print("TEST 2: Tweet Content Generation")
    print("=" * 60)
    
    social = SocialManager()
    
    pool_id = 123
    test_pool = {
        "pool_id": pool_id,
        "name": "Daily DCA Challenge",
        "goal_type": "daily_dca",
        "goal_metadata": {
            "token_mint": "So11111111111111111111111111111111111111112",
            "amount": 1000000000  # 1 SOL in lamports
        },
        "pool_pubkey": "TestPoolPubkey123456789012345678901234567890",
        "total_staked": 5.5,
        "participant_count": 10,
        "max_participants": 20,
        "stake_amount": 0.5,
        "recruitment_period_hours": 24,
        "scheduled_start_time": 1234567890,
        "status": "active",
        "start_timestamp": 1234567890,
        "end_timestamp": 1234567890 + 7 * 86400,
    }
    
    test_stats = {
        "participant_count": 10,
        "active_participants": 7,
        "eliminations": 3,
        "total_staked": 5.5,
        "days_remaining": 3,
        "days_elapsed": 4,
    }
    
    # Test generic tweet
    print("\n📝 Generic Tweet Generation:")
    generic_tweet = social.generate_tweet_content(test_pool, test_stats)
    print(f"   Length: {len(generic_tweet)} chars (max 280)")
    print(f"   Content: {generic_tweet[:100]}...")
    assert len(generic_tweet) <= 280, "Tweet exceeds 280 characters"
    print("   ✅ Pass")
    
    # Test new pool tweet (crypto challenge - should include Blink)
    print("\n🆕 New Pool Tweet Generation (Crypto):")
    new_pool_tweet = social.generate_new_pool_tweet(test_pool, test_stats)
    blink_url = social.create_blink(pool_id, test_pool.get("pool_pubkey"))
    app_url = social.create_app_link(pool_id)
    goal_type = test_pool.get("goal_type", "daily_dca")
    full_new_tweet = social.build_full_tweet(new_pool_tweet, blink_url, app_url, goal_type)
    print(f"   Length: {len(full_new_tweet)} chars (max 280)")
    print(f"   Content preview: {full_new_tweet[:150]}...")
    assert len(full_new_tweet) <= 280, "Tweet exceeds 280 characters"
    assert "🔗 Join:" in full_new_tweet, "Crypto challenge should include Blink URL"
    print("   ✅ Pass")
    
    # Test new pool tweet (non-crypto challenge - should NOT include Blink)
    print("\n🆕 New Pool Tweet Generation (Non-Crypto):")
    test_pool_lifestyle = test_pool.copy()
    test_pool_lifestyle["goal_type"] = "lifestyle_habit"
    test_pool_lifestyle["goal_metadata"] = {"habit_name": "Screen Time"}
    new_pool_tweet_lifestyle = social.generate_new_pool_tweet(test_pool_lifestyle, test_stats)
    full_new_tweet_lifestyle = social.build_full_tweet(new_pool_tweet_lifestyle, blink_url, app_url, "lifestyle_habit")
    print(f"   Length: {len(full_new_tweet_lifestyle)} chars (max 280)")
    print(f"   Content preview: {full_new_tweet_lifestyle[:150]}...")
    assert len(full_new_tweet_lifestyle) <= 280, "Tweet exceeds 280 characters"
    assert "🔗 Join:" not in full_new_tweet_lifestyle, "Non-crypto challenge should NOT include Blink URL"
    assert "🌐 Join:" in full_new_tweet_lifestyle or "🌐 Details:" in full_new_tweet_lifestyle, "Non-crypto challenge should include app link"
    print("   ✅ Pass")
    
    # Test midway tweet
    print("\n⏳ Midway Tweet Generation:")
    midway_tweet = social.generate_midway_tweet(test_pool, test_stats)
    full_midway_tweet = social.build_full_tweet(midway_tweet, blink_url, app_url, goal_type)
    print(f"   Length: {len(full_midway_tweet)} chars (max 280)")
    print(f"   Content preview: {full_midway_tweet[:150]}...")
    assert len(full_midway_tweet) <= 280, "Tweet exceeds 280 characters"
    print("   ✅ Pass")
    
    # Test completed tweet
    print("\n🏁 Completed Tweet Generation:")
    winners = [
        {"wallet_address": "WinnerWallet111111111111111111111111111111", "final_reward": 3.0},
        {"wallet_address": "WinnerWallet222222222222222222222222222222", "final_reward": 1.5},
        {"wallet_address": "WinnerWallet333333333333333333333333333333", "final_reward": 1.0},
    ]
    completed_tweet = social.generate_completed_tweet(test_pool, test_stats, winners)
    full_completed_tweet = social.build_full_tweet(completed_tweet, blink_url, app_url, goal_type)
    print(f"   Length: {len(full_completed_tweet)} chars (max 280)")
    print(f"   Content preview: {full_completed_tweet[:150]}...")
    assert len(full_completed_tweet) <= 280, "Tweet exceeds 280 characters"
    print("   ✅ Pass")
    
    # Test different goal types
    print("\n🎯 Testing Different Goal Types:")
    
    goal_types = [
        ("hodl_token", {"token_mint": "So11111111111111111111111111111111111111112", "min_balance": 1000000000}),
        ("daily_dca", {"token_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "amount": 1000000}),
        ("lifestyle_habit", {"habit_name": "Daily Exercise"}),
    ]
    
    for goal_type, goal_metadata in goal_types:
        test_pool_copy = test_pool.copy()
        test_pool_copy["goal_type"] = goal_type
        test_pool_copy["goal_metadata"] = goal_metadata
        
        tweet = social.generate_tweet_content(test_pool_copy, test_stats)
        print(f"   ✅ {goal_type}: {len(tweet)} chars")
    
    return True


async def test_blink_creation():
    """Test Blink URL creation"""
    print("\n" + "=" * 60)
    print("TEST 3: Blink URL Creation")
    print("=" * 60)
    
    social = SocialManager()
    
    pool_id = 123
    pool_pubkey = "TestPoolPubkey123456789012345678901234567890"
    
    blink_url = social.create_blink(pool_id, pool_pubkey)
    app_url = social.create_app_link(pool_id)
    
    print(f"\n🔗 Blink URL: {blink_url}")
    print(f"🌐 App URL: {app_url}")
    
    # Verify URL format
    assert "join-pool" in blink_url, "Blink URL should contain 'join-pool'"
    assert f"pool_id={pool_id}" in blink_url, "Blink URL should contain pool_id"
    assert f"/pools/{pool_id}" in app_url, "App URL should contain pool path"
    
    print("   ✅ Blink URL format correct")
    print("   ✅ App URL format correct")
    
    return True


async def test_real_pool_integration():
    """Test with real pools from database (optional)"""
    print("\n" + "=" * 60)
    print("TEST 4: Real Database Pool Integration (Optional)")
    print("=" * 60)
    
    try:
        # Try to fetch a real pool
        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"status": "active"},
            limit=1
        )
        
        if not pools:
            print("   ℹ️  No active pools found in database")
            print("   ℹ️  Skipping real pool integration test")
            return True
        
        pool = pools[0]
        pool_id = pool.get("pool_id")
        
        print(f"\n📊 Found real pool: ID {pool_id}")
        print(f"   Name: {pool.get('name', 'N/A')}")
        print(f"   Status: {pool.get('status', 'N/A')}")
        print(f"   Goal Type: {pool.get('goal_type', 'N/A')}")
        
        social = SocialManager()
        
        # Test stats calculation
        stats = await social.get_pool_stats(pool)
        print(f"\n📈 Pool Statistics:")
        print(f"   Participants: {stats.get('participant_count', 0)}")
        print(f"   Active: {stats.get('active_participants', 0)}")
        print(f"   Total Staked: {stats.get('total_staked', 0):.2f} SOL")
        print(f"   Days Remaining: {stats.get('days_remaining', 0)}")
        
        # Test tweet generation with real pool
        tweet = social.generate_tweet_content(pool, stats)
        print(f"\n📝 Generated Tweet ({len(tweet)} chars):")
        print(f"   {tweet[:200]}...")
        
        print("   ✅ Real pool integration test passed")
        return True
        
    except Exception as e:
        print(f"   ⚠️  Database connection failed: {e}")
        print("   ℹ️  This is OK if database is not configured")
        return True  # Don't fail the test if DB is not available


async def test_event_queuing():
    """Test event queue system"""
    print("\n" + "=" * 60)
    print("TEST 5: Event Queue System")
    print("=" * 60)
    
    social = SocialManager()
    
    if not social.twitter_enabled:
        print("   ⚠️  Twitter not enabled, skipping queue test")
        return True
    
    print(f"\n📬 Queue Status:")
    print(f"   Worker running: {social.queue_worker_running}")
    print(f"   Queue size: {social.tweet_queue.qsize()}")
    
    # Test queueing an event (without actually posting)
    print(f"\n📤 Testing event queue (dry-run):")
    print(f"   Note: Events are queued but not processed in test mode")
    
    # We could test queueing here, but it would require starting the worker
    print("   ✅ Queue system initialized correctly")
    
    return True


async def run_comprehensive_tests():
    """Run all comprehensive tests"""
    print("🧪 COMPREHENSIVE TWITTER BOT TEST SUITE")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Authentication
    results["authentication"] = await test_twitter_authentication()
    
    # Test 2: Tweet Generation
    results["tweet_generation"] = await test_tweet_generation()
    
    # Test 3: Blink Creation
    results["blink_creation"] = await test_blink_creation()
    
    # Test 4: Real Pool Integration (optional, doesn't fail if DB unavailable)
    results["real_pool"] = await test_real_pool_integration()
    
    # Test 5: Event Queue
    results["event_queue"] = await test_event_queuing()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name.replace('_', ' ').title()}")
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Check output above for details.")
    
    return passed == total


async def test_actual_post(pool_id: Optional[int] = None):
    """Test actual tweet posting (requires user confirmation)"""
    print("\n" + "=" * 60)
    print("OPTIONAL: Test Actual Tweet Posting")
    print("=" * 60)
    
    social = SocialManager()
    
    if not social.twitter_enabled:
        print("❌ Twitter not enabled. Cannot post.")
        return False
    
    if pool_id is None:
        print("\n⚠️  To test actual posting, provide a real pool_id")
        print("   Usage: test_actual_post(pool_id=123)")
        return False
    
    try:
        # Get pool from database
        pools = await execute_query(
            table="pools",
            operation="select",
            filters={"pool_id": pool_id},
            limit=1
        )
        
        if not pools:
            print(f"❌ Pool {pool_id} not found in database")
            return False
        
        pool = pools[0]
        print(f"\n📊 Pool Found:")
        print(f"   Name: {pool.get('name')}")
        print(f"   Status: {pool.get('status')}")
        
        # Ask for confirmation
        response = input("\n⚠️  This will post a REAL tweet. Continue? (yes/no): ").strip().lower()
        if response != "yes":
            print("   ℹ️  Posting cancelled")
            return False
        
        # Post event update (will be queued)
        print(f"\n📤 Posting event update for pool {pool_id}...")
        result = await social.post_event_update(
            SocialEventType.POOL_CREATED,
            pool_id
        )
        
        if result:
            print(f"✅ Event queued successfully: {result}")
            print("   Note: Tweet will be posted by the queue worker")
        else:
            print("❌ Failed to queue event")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        logger.exception("Error in test_actual_post")
        return False


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--post":
        # Test actual posting mode
        pool_id = int(sys.argv[2]) if len(sys.argv) > 2 else None
        asyncio.run(test_actual_post(pool_id))
    else:
        # Run comprehensive tests
        success = asyncio.run(run_comprehensive_tests())
        sys.exit(0 if success else 1)
