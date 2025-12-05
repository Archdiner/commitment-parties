"""
Twitter API Diagnostic Tool

This script helps diagnose Twitter API authentication issues.
It tests credentials and provides specific guidance based on errors.
"""

import sys
import os
from pathlib import Path

# Add src directory to path
agent_dir = Path(__file__).parent
src_dir = agent_dir / "src"
sys.path.insert(0, str(src_dir))

try:
    import tweepy
except ImportError:
    print("❌ ERROR: tweepy is not installed")
    print("   Install it with: pip install tweepy")
    sys.exit(1)

from config import settings


def check_credentials(account_num: int = 1):
    """Check if credentials are configured"""
    if account_num == 1:
        key = settings.TWITTER_API_KEY
        secret = settings.TWITTER_API_SECRET
        token = settings.TWITTER_ACCESS_TOKEN
        token_secret = settings.TWITTER_ACCESS_TOKEN_SECRET
        account_name = "Account 1"
    else:
        key = getattr(settings, 'TWITTER_API_KEY_2', None)
        secret = getattr(settings, 'TWITTER_API_SECRET_2', None)
        token = getattr(settings, 'TWITTER_ACCESS_TOKEN_2', None)
        token_secret = getattr(settings, 'TWITTER_ACCESS_TOKEN_SECRET_2', None)
        account_name = f"Account {account_num}"
    
    print(f"\n{'='*60}")
    print(f"Checking {account_name} Credentials")
    print(f"{'='*60}")
    
    # Check if credentials exist
    missing = []
    if not key:
        missing.append("TWITTER_API_KEY")
    if not secret:
        missing.append("TWITTER_API_SECRET")
    if not token:
        missing.append("TWITTER_ACCESS_TOKEN")
    if not token_secret:
        missing.append("TWITTER_ACCESS_TOKEN_SECRET")
    
    if missing:
        print(f"❌ Missing credentials: {', '.join(missing)}")
        print(f"   Make sure these are set in agent/.env")
        return None, None
    
    # Check credential format (basic validation)
    issues = []
    if len(key) < 20:
        issues.append("TWITTER_API_KEY seems too short")
    if len(secret) < 20:
        issues.append("TWITTER_API_SECRET seems too short")
    if len(token) < 20:
        issues.append("TWITTER_ACCESS_TOKEN seems too short")
    if len(token_secret) < 20:
        issues.append("TWITTER_ACCESS_TOKEN_SECRET seems too short")
    
    if issues:
        print(f"⚠️  Credential format warnings:")
        for issue in issues:
            print(f"   - {issue}")
    
    print(f"✅ All credentials present")
    print(f"   API Key: {key[:10]}...{key[-4:]}")
    print(f"   Access Token: {token[:10]}...{token[-4:]}")
    
    return {
        'consumer_key': key,
        'consumer_secret': secret,
        'access_token': token,
        'access_token_secret': token_secret
    }, account_name


def test_authentication(credentials: dict, account_name: str):
    """Test Twitter API authentication"""
    print(f"\n{'='*60}")
    print(f"Testing {account_name} Authentication")
    print(f"{'='*60}")
    
    try:
        # Create client
        client = tweepy.Client(
            consumer_key=credentials['consumer_key'],
            consumer_secret=credentials['consumer_secret'],
            access_token=credentials['access_token'],
            access_token_secret=credentials['access_token_secret'],
            wait_on_rate_limit=False
        )
        
        print("✅ Client created successfully")
        
        # Test authentication with get_me()
        print("\n📡 Testing API connection...")
        try:
            response = client.get_me()
            
            if response and response.data:
                print(f"✅ Authentication SUCCESSFUL!")
                print(f"   Username: @{response.data.username}")
                print(f"   Name: {response.data.name}")
                print(f"   ID: {response.data.id}")
                return True, None
            else:
                print("⚠️  Authentication returned no data")
                return False, "No data returned"
                
        except tweepy.Unauthorized as e:
            print(f"❌ Authentication FAILED: 401 Unauthorized")
            print(f"\n🔍 Error Details:")
            print(f"   {str(e)}")
            print(f"\n💡 Possible Causes:")
            print(f"   1. Invalid or expired credentials")
            print(f"   2. Credentials don't match the app")
            print(f"   3. Access token was revoked")
            print(f"\n🔧 Solutions:")
            print(f"   1. Verify credentials in agent/.env match your Twitter Developer Portal")
            print(f"   2. Regenerate Access Token and Secret in the Developer Portal")
            print(f"   3. Make sure you're using the correct app's credentials")
            return False, "401 Unauthorized"
            
        except tweepy.Forbidden as e:
            error_str = str(e).lower()
            print(f"❌ Authentication FAILED: 403 Forbidden")
            print(f"\n🔍 Error Details:")
            print(f"   {str(e)}")
            
            if "oauth1 app permissions" in error_str or "permissions" in error_str:
                print(f"\n💡 Root Cause: OAuth App Permissions Issue")
                print(f"\n🔧 SOLUTION:")
                print(f"   1. Go to https://developer.twitter.com/en/portal/dashboard")
                print(f"   2. Select your app (CommitAgentDos)")
                print(f"   3. Go to 'Settings' tab")
                print(f"   4. Scroll to 'User authentication settings'")
                print(f"   5. Click 'Set up' (if not already set up)")
                print(f"   6. Set 'App permissions' to 'Read and Write'")
                print(f"   7. Set 'Type of App' to 'Web App, Automated App or Bot'")
                print(f"   8. Add your callback URL (can be http://localhost for testing)")
                print(f"   9. Save changes")
                print(f"   10. Go to 'Keys and tokens' tab")
                print(f"   11. Regenerate 'Access Token and Secret'")
                print(f"   12. Update agent/.env with new tokens")
                print(f"\n⚠️  IMPORTANT: After changing permissions, you MUST regenerate")
                print(f"   the Access Token and Secret for the changes to take effect!")
            else:
                print(f"\n💡 Possible Causes:")
                print(f"   1. App doesn't have 'Read and Write' permissions")
                print(f"   2. User authentication not set up")
                print(f"   3. Access token doesn't have required permissions")
                print(f"\n🔧 Solutions:")
                print(f"   1. Check app permissions in Developer Portal")
                print(f"   2. Ensure 'User authentication settings' is configured")
                print(f"   3. Regenerate Access Token and Secret after changing permissions")
            
            return False, "403 Forbidden"
            
        except tweepy.TooManyRequests as e:
            print(f"⚠️  Rate limit exceeded (429)")
            print(f"   Wait a few minutes and try again")
            return False, "429 Rate Limit"
            
        except Exception as e:
            print(f"❌ Authentication FAILED: Unexpected error")
            print(f"\n🔍 Error Details:")
            print(f"   Type: {type(e).__name__}")
            print(f"   Message: {str(e)}")
            print(f"\n💡 This might indicate:")
            print(f"   1. Network connectivity issues")
            print(f"   2. Twitter API is down")
            print(f"   3. Invalid API version or endpoint")
            return False, f"Unexpected: {type(e).__name__}"
            
    except Exception as e:
        print(f"❌ Failed to create client: {e}")
        return False, f"Client creation failed: {e}"


def test_tweet_creation(credentials: dict, account_name: str):
    """Test if we can create a tweet (dry run)"""
    print(f"\n{'='*60}")
    print(f"Testing {account_name} Tweet Creation (Dry Run)")
    print(f"{'='*60}")
    
    try:
        client = tweepy.Client(
            consumer_key=credentials['consumer_key'],
            consumer_secret=credentials['consumer_secret'],
            access_token=credentials['access_token'],
            access_token_secret=credentials['access_token_secret'],
            wait_on_rate_limit=False
        )
        
        # Try to create a test tweet (this will fail if permissions are wrong)
        # But we'll catch the error to provide guidance
        test_tweet = "🧪 Test tweet - please ignore"
        
        print(f"📝 Attempting to create test tweet...")
        print(f"   (This is a dry run - tweet will be created)")
        
        response = input(f"\n⚠️  This will create a REAL tweet. Continue? (yes/no): ").strip().lower()
        if response != "yes":
            print("   ℹ️  Skipping tweet creation test")
            return None
        
        try:
            response = client.create_tweet(text=test_tweet)
            if response and response.data:
                print(f"✅ Tweet created successfully!")
                print(f"   Tweet ID: {response.data.get('id')}")
                print(f"   This confirms your app has 'Write' permissions")
                return True
        except tweepy.Forbidden as e:
            error_str = str(e).lower()
            if "oauth1 app permissions" in error_str or "permissions" in error_str or "write" in error_str:
                print(f"❌ Cannot create tweet: Missing 'Write' permission")
                print(f"\n🔧 SOLUTION:")
                print(f"   1. Go to Twitter Developer Portal")
                print(f"   2. App Settings > User authentication settings")
                print(f"   3. Set 'App permissions' to 'Read and Write'")
                print(f"   4. Regenerate Access Token and Secret")
                return False
            else:
                print(f"❌ Cannot create tweet: {e}")
                return False
        except Exception as e:
            print(f"❌ Error creating tweet: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Main diagnostic function"""
    print("="*60)
    print("Twitter API Diagnostic Tool")
    print("="*60)
    print("\nThis tool will help diagnose Twitter API authentication issues.")
    print("It will check credentials and test API connectivity.\n")
    
    # Check Account 1
    creds1, name1 = check_credentials(1)
    if creds1:
        auth1_success, error1 = test_authentication(creds1, name1)
        if auth1_success:
            print(f"\n✅ {name1} is working correctly!")
        else:
            print(f"\n❌ {name1} has issues. See solutions above.")
    
    # Check Account 2 if configured
    creds2, name2 = check_credentials(2)
    if creds2:
        auth2_success, error2 = test_authentication(creds2, name2)
        if auth2_success:
            print(f"\n✅ {name2} is working correctly!")
        else:
            print(f"\n❌ {name2} has issues. See solutions above.")
    elif creds1 is None:
        print("\n⚠️  Account 2 not configured (this is optional)")
    
    # Summary
    print(f"\n{'='*60}")
    print("Diagnostic Summary")
    print(f"{'='*60}")
    
    if creds1:
        if auth1_success:
            print(f"✅ {name1}: Working")
        else:
            print(f"❌ {name1}: {error1}")
            print(f"\n📋 Most Common Fix:")
            print(f"   The image shows 'User authentication not set up'")
            print(f"   This is the #1 cause of verification failures.")
            print(f"   Follow the steps above to set up user authentication.")
    
    if creds2:
        if auth2_success:
            print(f"✅ {name2}: Working")
        else:
            print(f"❌ {name2}: {error2}")
    
    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
