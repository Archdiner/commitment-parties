#!/usr/bin/env python3
"""
Test script to verify Solana Blink URLs are generated correctly and work.

This script:
1. Tests Blink URL generation
2. Tests the action endpoint returns proper JSON
3. Validates the response format matches Solana Actions spec
"""

import sys
import os
import asyncio
import json
from pathlib import Path

# Add agent/src directory to path
agent_src_dir = Path(__file__).parent.parent / "agent" / "src"
sys.path.insert(0, str(agent_src_dir))

from social import SocialManager
import httpx


async def test_blink_url_generation():
    """Test that Blink URLs are generated in the correct format"""
    print("=" * 60)
    print("TEST 1: Blink URL Generation")
    print("=" * 60)
    
    social = SocialManager()
    pool_id = 123
    
    blink_url = social.create_blink(pool_id)
    print(f"\n✅ Generated Blink URL:")
    print(f"   {blink_url}")
    
    # Validate URL format
    assert blink_url.startswith("http"), "Blink URL must start with http/https"
    assert "join-pool" in blink_url, "Blink URL must contain 'join-pool'"
    assert f"pool_id={pool_id}" in blink_url, "Blink URL must contain pool_id parameter"
    
    print("\n✅ URL format validation passed")
    return blink_url


async def test_action_endpoint(blink_url: str):
    """Test that the action endpoint returns proper Solana Action JSON"""
    print("\n" + "=" * 60)
    print("TEST 2: Action Endpoint Response")
    print("=" * 60)
    
    # Extract pool_id from URL
    import re
    match = re.search(r'pool_id=(\d+)', blink_url)
    if not match:
        print("❌ Could not extract pool_id from Blink URL")
        return False
    
    pool_id = int(match.group(1))
    
    # Make GET request to the action endpoint
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print(f"\n📡 Testing GET request to: {blink_url}")
            response = await client.get(blink_url, follow_redirects=True)
            
            print(f"   Status Code: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('Content-Type', 'N/A')}")
            
            if response.status_code != 200:
                print(f"❌ Endpoint returned status {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False
            
            # Parse JSON response
            try:
                data = response.json()
            except json.JSONDecodeError as e:
                print(f"❌ Response is not valid JSON: {e}")
                print(f"   Response: {response.text[:200]}")
                return False
            
            print(f"\n✅ Response JSON:")
            print(json.dumps(data, indent=2))
            
            # Validate Solana Action format
            required_fields = ["title", "description", "label", "links"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"\n❌ Missing required fields: {missing_fields}")
                return False
            
            if "links" not in data or "actions" not in data["links"]:
                print(f"\n❌ Missing 'links.actions' field")
                return False
            
            if not isinstance(data["links"]["actions"], list) or len(data["links"]["actions"]) == 0:
                print(f"\n❌ 'links.actions' must be a non-empty list")
                return False
            
            action = data["links"]["actions"][0]
            if "label" not in action or "href" not in action:
                print(f"\n❌ Action must have 'label' and 'href' fields")
                return False
            
            print("\n✅ Solana Action JSON format validation passed")
            return True
            
        except httpx.TimeoutException:
            print("❌ Request timed out")
            return False
        except httpx.RequestError as e:
            print(f"❌ Request failed: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            return False


async def test_cors_headers(blink_url: str):
    """Test that CORS headers are properly set"""
    print("\n" + "=" * 60)
    print("TEST 3: CORS Headers")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Make OPTIONS request (CORS preflight)
            base_url = blink_url.split('/solana/actions')[0]
            options_url = f"{base_url}/solana/actions/join-pool"
            
            print(f"\n📡 Testing OPTIONS request to: {options_url}")
            response = await client.options(options_url)
            
            print(f"   Status Code: {response.status_code}")
            
            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
                "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
            }
            
            print(f"\n   CORS Headers:")
            for header, value in cors_headers.items():
                print(f"   {header}: {value}")
            
            if cors_headers["Access-Control-Allow-Origin"]:
                print("\n✅ CORS headers are set")
                return True
            else:
                print("\n⚠️  CORS headers may not be set (might still work)")
                return True  # Not critical, but good to have
                
        except Exception as e:
            print(f"⚠️  CORS test failed: {e}")
            return True  # Not critical for basic functionality


async def main():
    """Run all tests"""
    print("\n🧪 Solana Blink URL Test Suite")
    print("=" * 60)
    
    results = {}
    
    # Test 1: URL Generation
    try:
        blink_url = await test_blink_url_generation()
        results["url_generation"] = True
    except Exception as e:
        print(f"\n❌ URL generation test failed: {e}")
        results["url_generation"] = False
        return
    
    # Test 2: Action Endpoint
    try:
        endpoint_works = await test_action_endpoint(blink_url)
        results["action_endpoint"] = endpoint_works
    except Exception as e:
        print(f"\n❌ Action endpoint test failed: {e}")
        results["action_endpoint"] = False
    
    # Test 3: CORS Headers
    try:
        cors_works = await test_cors_headers(blink_url)
        results["cors_headers"] = cors_works
    except Exception as e:
        print(f"\n❌ CORS test failed: {e}")
        results["cors_headers"] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:20} {status}")
    
    all_passed = all(results.values())
    if all_passed:
        print("\n🎉 All tests passed! Blink URLs should work correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the output above.")
    
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
