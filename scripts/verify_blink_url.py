#!/usr/bin/env python3
"""
Simple script to verify Blink URL generation and format.

Usage:
    python3 scripts/verify_blink_url.py [pool_id]
"""

import sys
from pathlib import Path

# Add agent/src directory to path
agent_src_dir = Path(__file__).parent.parent / "agent" / "src"
sys.path.insert(0, str(agent_src_dir))

from social import SocialManager


def main():
    pool_id = int(sys.argv[1]) if len(sys.argv) > 1 else 123
    
    print("=" * 60)
    print("Solana Blink URL Verification")
    print("=" * 60)
    
    social = SocialManager()
    
    # Generate Blink URL
    blink_url = social.create_blink(pool_id)
    app_url = social.create_app_link(pool_id)
    
    print(f"\n📋 Configuration:")
    print(f"   Action Base URL: {social.action_base_url}")
    print(f"   App Base URL: {social.app_base_url}")
    
    print(f"\n🔗 Generated URLs:")
    print(f"   Blink URL: {blink_url}")
    print(f"   App URL: {app_url}")
    
    print(f"\n✅ URL Format Check:")
    checks = [
        ("Starts with https://", blink_url.startswith("https://")),
        ("Contains 'join-pool'", "join-pool" in blink_url),
        ("Contains pool_id parameter", f"pool_id={pool_id}" in blink_url),
        ("No trailing slashes", not blink_url.endswith("/")),
    ]
    
    all_passed = True
    for check_name, passed in checks:
        status = "✅" if passed else "❌"
        print(f"   {status} {check_name}")
        if not passed:
            all_passed = False
    
    print(f"\n📝 Testing Instructions:")
    print(f"   1. Copy the Blink URL above")
    print(f"   2. Post it on Twitter/X")
    print(f"   3. Twitter should automatically convert it to a Blink button")
    print(f"   4. Users can click the button to join the pool")
    
    print(f"\n🔍 Verification:")
    print(f"   - Ensure the backend is running and accessible")
    print(f"   - Check that /actions.json is accessible at the root domain")
    print(f"   - Verify the action endpoint returns proper JSON")
    print(f"   - Test with: curl '{blink_url}'")
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
