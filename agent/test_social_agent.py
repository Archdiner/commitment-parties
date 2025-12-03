"""
Test script for the Twitter/Blinks social agent.

This script demonstrates how to use the social media agent to post updates
about commitment pools to Twitter with Blinks integration.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add src directory to path so imports work correctly
agent_dir = Path(__file__).parent
src_dir = agent_dir / "src"
sys.path.insert(0, str(src_dir))

from social import SocialManager, SocialEventType
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def test_social_agent():
    """Test the social media agent"""
    
    print("🤖 Testing Twitter/Blinks Social Agent")
    print("=" * 50)
    
    # Initialize social manager
    social = SocialManager()
    
    if not social.twitter_enabled:
        print("❌ Twitter not configured!")
        print("\nTo enable Twitter posting, set these environment variables:")
        print("  - TWITTER_API_KEY")
        print("  - TWITTER_API_SECRET")
        print("  - TWITTER_ACCESS_TOKEN")
        print("  - TWITTER_ACCESS_TOKEN_SECRET")
        print("\nGet these from: https://developer.twitter.com/")
        return
    
    print("✅ Twitter client initialized")
    
    if social.ai_client:
        print("✅ OpenAI client initialized (AI-powered tweets enabled)")
    else:
        print("ℹ️  OpenAI not configured (using template-based tweets)")
    
    # Test Blink creation
    print("\n🔗 Testing Blink creation...")
    pool_id = 123
    pool_pubkey = "TestPoolPubkey123456789012345678901234567890"
    blink_url = social.create_blink(pool_id, pool_pubkey)
    print(f"   Blink URL: {blink_url}")
    
    # Test tweet generation (without actually posting)
    print("\n📝 Testing generic tweet generation...")
    test_pool = {
        "pool_id": pool_id,
        "name": "Daily DCA Challenge",
        "goal_type": "daily_dca",
        "pool_pubkey": pool_pubkey,
        "total_staked": 5.5,
        "participant_count": 10,
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
    
    tweet = social.generate_tweet_content(test_pool, test_stats)
    print(f"   Generic tweet ({len(tweet)} chars):")
    print(f"   {tweet}")
    
    # Test new-pool event tweet body
    print("\n🆕 Testing new-pool event tweet...")
    new_body = social.generate_new_pool_tweet(test_pool, test_stats)
    app_url = social.create_app_link(pool_id)
    full_new = social.build_full_tweet(new_body, blink_url, app_url)
    print(f"   New-pool tweet ({len(full_new)} chars):")
    print(f"   {full_new}")
    
    # Test midway tweet body
    print("\n⏳ Testing midway event tweet...")
    midway_body = social.generate_midway_tweet(test_pool, test_stats)
    full_midway = social.build_full_tweet(midway_body, blink_url, app_url)
    print(f"   Midway tweet ({len(full_midway)} chars):")
    print(f"   {full_midway}")
    
    # Test completed tweet body
    print("\n🏁 Testing completed event tweet...")
    winners = [
        {"wallet_address": "WinnerWallet111111111111111111111111111111", "final_reward": 3.0},
        {"wallet_address": "WinnerWallet222222222222222222222222222222", "final_reward": 1.5},
        {"wallet_address": "WinnerWallet333333333333333333333333333333", "final_reward": 1.0},
    ]
    completed_body = social.generate_completed_tweet(test_pool, test_stats, winners)
    full_completed = social.build_full_tweet(completed_body, blink_url, app_url)
    print(f"   Completed tweet ({len(full_completed)} chars):")
    print(f"   {full_completed}")
    
    # Ask if user wants to post a test tweet
    print("\n" + "=" * 50)
    response = input("Post a test tweet? (y/n): ").strip().lower()
    
    if response == 'y':
        print("\n📤 Posting test tweet...")
        # You would need a real pool_id from your database
        # tweet_id = await social.post_pool_update(pool_id, test_pool)
        # if tweet_id:
        #     print(f"✅ Tweet posted! ID: {tweet_id}")
        # else:
        #     print("❌ Failed to post tweet")
        print("⚠️  Skipping actual post (use a real pool_id from your database)")
    else:
        print("ℹ️  Skipping tweet post")
    
    print("\n✅ Social agent test complete!")
    print("\nTo run the agent continuously:")
    print("  python src/main.py")
    print("\nThe agent will automatically post updates about active pools.")


if __name__ == "__main__":
    asyncio.run(test_social_agent())

