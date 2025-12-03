"""
Test Twitter API Keys

Run this to check if your Twitter API keys are working.
"""

import sys
from pathlib import Path

# Add src directory to path
agent_dir = Path(__file__).parent
src_dir = agent_dir / "src"
sys.path.insert(0, str(src_dir))

try:
    from social import SocialManager
    import asyncio

    async def test_keys():
        print("🔑 Testing Twitter API Keys...")
        print("=" * 40)

        social = SocialManager()

        if not social.twitter_enabled:
            print("❌ Twitter not configured - check your .env file")
            return

        print("✅ Twitter client initialized")

        try:
            # Test authentication
            response = social.twitter_client.get_me()
            print("✅ Authentication successful!")
            print(f"📝 Account: @{response.data.username}")
            print(f"👤 Name: {response.data.name}")
            print(f"🆔 ID: {response.data.id}")

            print("\n🎉 Your Twitter API keys are working!")
            print("The social agent can now post to Twitter.")

        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            print("\n🔧 Fix needed:")
            print("- Go to https://developer.twitter.com/en/portal/dashboard")
            print("- Get the correct API keys from your app")
            print("- Update your .env file")

    if __name__ == "__main__":
        asyncio.run(test_keys())

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're in the agent directory and dependencies are installed")
    print("Run: pip install -r requirements.txt")
