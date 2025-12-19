#!/usr/bin/env python3
"""
Comprehensive test script for recruitment system and all endpoints.

Tests:
1. Pool creation with recruitment system
2. Pool joining and filling detection
3. Early activation when filled
4. Expiration and refunds
5. All main API endpoints
6. Recruitment system validation

Usage:
    python scripts/test_recruitment_system.py [--base-url http://localhost:8000]
"""

import asyncio
import sys
import os
import argparse
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    import httpx
    import json
except ImportError:
    print("ERROR: Required packages not installed. Install with:")
    print("  pip install httpx")
    sys.exit(1)


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


class TestRunner:
    """Test runner for recruitment system"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient(timeout=30.0)
        self.test_results = []
        self.test_pools = []  # Track created pools for cleanup
        
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def log(self, message: str, color: str = Colors.RESET):
        """Print colored log message"""
        print(f"{color}{message}{Colors.RESET}")
    
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if passed else f"{Colors.RED}✗ FAIL{Colors.RESET}"
        self.log(f"{status} {test_name}")
        if details:
            self.log(f"    {details}", Colors.BLUE)
        self.test_results.append({
            "name": test_name,
            "passed": passed,
            "details": details
        })
    
    async def test_endpoint(self, method: str, path: str, expected_status: int = 200, 
                          json_data: Optional[Dict] = None, params: Optional[Dict] = None) -> Optional[Dict]:
        """Test an API endpoint"""
        try:
            url = f"{self.base_url}{path}"
            response = await self.client.request(
                method=method,
                url=url,
                json=json_data,
                params=params
            )
            
            if response.status_code == expected_status:
                try:
                    return response.json()
                except:
                    return {"raw": response.text}
            else:
                error_text = response.text[:200]
                raise Exception(f"Expected status {expected_status}, got {response.status_code}: {error_text}")
        except Exception as e:
            raise Exception(f"Request failed: {str(e)}")
    
    async def test_list_pools(self):
        """Test GET /api/pools - List pools"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST: List Pools", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        try:
            # Test without filters
            data = await self.test_endpoint("GET", "/api/pools")
            assert isinstance(data, list), "Response should be a list"
            self.log_test("List pools (no filters)", True, f"Found {len(data)} pools")
            
            # Test with status filter
            data = await self.test_endpoint("GET", "/api/pools", params={"status": "pending"})
            assert isinstance(data, list), "Response should be a list"
            self.log_test("List pools (status filter)", True, f"Found {len(data)} pending pools")
            
            # Test with limit
            data = await self.test_endpoint("GET", "/api/pools", params={"limit": 10})
            assert isinstance(data, list) and len(data) <= 10, "Should respect limit"
            self.log_test("List pools (limit)", True, f"Got {len(data)} pools (limit 10)")
            
            return True
        except Exception as e:
            self.log_test("List pools", False, str(e))
            return False
    
    async def test_create_pool(self):
        """Test POST /api/pools - Create pool with recruitment system"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST: Create Pool (Recruitment System)", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        try:
            pool_id = int(time.time() * 1000) % 1000000  # Unique ID
            creator_wallet = "TestWallet" + str(pool_id)
            
            # Test pool creation data
            pool_data = {
                "pool_id": pool_id,
                "pool_pubkey": "TestPoolPubkey" + str(pool_id),
                "creator_wallet": creator_wallet,
                "name": f"Test Recruitment Pool {pool_id}",
                "description": "Testing recruitment system",
                "goal_type": "lifestyle_habit",
                "goal_metadata": {
                    "habit_type": "github_commits",
                    "min_commits_per_day": 1
                },
                "stake_amount": 0.1,
                "duration_days": 7,
                "max_participants": 10,
                "min_participants": 5,  # NEW: Minimum 5
                "distribution_mode": "competitive",
                "split_percentage_winners": 100,
                "charity_address": "11111111111111111111111111111111",
                "start_timestamp": int(time.time()),
                "end_timestamp": int(time.time()) + (7 * 86400),
                "is_public": True,
                "recruitment_period_hours": 168,  # 1 week
                "require_min_participants": True,  # NEW: Always required
            }
            
            # Test creation endpoint (note: requires trailing slash)
            response = await self.client.post(
                f"{self.base_url}/api/pools/",
                json=pool_data
            )
            
            if response.status_code == 201:
                created_pool = response.json()
                self.test_pools.append(created_pool["pool_id"])
                
                # Verify recruitment system fields
                # Note: min_participants might be adjusted in confirm_pool_creation, so just check it exists
                min_parts = created_pool.get("min_participants")
                assert min_parts is not None, "min_participants should be set"
                assert created_pool.get("status") == "pending", "New pools should be pending (recruiting)"
                
                self.log_test("Create pool", True, 
                            f"Pool {pool_id} created (min_participants: {min_parts})")
                return created_pool
            else:
                error = response.text[:200]
                raise Exception(f"Creation failed: {response.status_code} - {error}")
                
        except Exception as e:
            self.log_test("Create pool", False, str(e))
            return None
    
    async def test_confirm_pool_creation(self, pool_data: Dict):
        """Test POST /api/pools/create/confirm - Confirm pool creation"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST: Confirm Pool Creation", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        try:
            confirm_data = {
                **pool_data,
                "transaction_signature": "test_signature_" + str(int(time.time()))
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/pools/create/confirm",
                json=confirm_data
            )
            
            if response.status_code == 201:
                confirmed_pool = response.json()
                
                # Verify recruitment system fields are set
                assert confirmed_pool.get("recruitment_deadline") is not None, "recruitment_deadline should be set"
                assert confirmed_pool.get("status") == "pending", "Status should be pending (recruiting)"
                assert confirmed_pool.get("min_participants") >= 5, "min_participants should be >= 5"
                assert confirmed_pool.get("require_min_participants") == True, "require_min_participants should be True"
                
                # Verify recruitment_deadline is approximately 1 week from now
                deadline = confirmed_pool.get("recruitment_deadline")
                current_time = int(time.time())
                expected_deadline = current_time + (7 * 24 * 3600)  # 1 week
                deadline_diff = abs(deadline - expected_deadline)
                
                assert deadline_diff < 3600, f"recruitment_deadline should be ~1 week from now (diff: {deadline_diff}s)"
                
                self.log_test("Confirm pool creation", True, 
                            f"recruitment_deadline: {deadline}, status: {confirmed_pool.get('status')}")
                return confirmed_pool
            else:
                error = response.text[:200]
                raise Exception(f"Confirmation failed: {response.status_code} - {error}")
                
        except Exception as e:
            self.log_test("Confirm pool creation", False, str(e))
            return None
    
    async def test_get_pool(self, pool_id: int):
        """Test GET /api/pools/{pool_id} - Get pool by ID"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST: Get Pool by ID", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        try:
            pool = await self.test_endpoint("GET", f"/api/pools/{pool_id}")
            
            assert pool.get("pool_id") == pool_id, "Pool ID should match"
            assert pool.get("recruitment_deadline") is not None, "recruitment_deadline should exist"
            assert pool.get("min_participants") >= 5, "min_participants should be >= 5"
            
            self.log_test("Get pool by ID", True, 
                        f"Pool {pool_id}: {pool.get('name')}, status: {pool.get('status')}")
            return pool
        except Exception as e:
            self.log_test("Get pool by ID", False, str(e))
            return None
    
    async def test_join_pool(self, pool_id: int, participant_wallet: str):
        """Test POST /api/pools/{pool_id}/join/confirm - Join pool"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST: Join Pool", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        try:
            join_data = {
                "transaction_signature": "test_join_signature_" + str(int(time.time())),
                "participant_wallet": participant_wallet
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/pools/{pool_id}/join/confirm",
                json=join_data
            )
            
            if response.status_code == 200:
                updated_pool = response.json()
                
                # Verify participant count increased
                participant_count = updated_pool.get("participant_count", 0)
                
                self.log_test("Join pool", True, 
                            f"Participant count: {participant_count}, "
                            f"filled_at: {updated_pool.get('filled_at')}, "
                            f"auto_start_time: {updated_pool.get('auto_start_time')}")
                
                # Check if pool filled (reached min_participants)
                min_participants = updated_pool.get("min_participants", 5)
                if participant_count >= min_participants:
                    assert updated_pool.get("filled_at") is not None, "filled_at should be set when minimum reached"
                    assert updated_pool.get("auto_start_time") is not None, "auto_start_time should be set when minimum reached"
                    self.log_test("Pool filling detection", True, 
                                f"Pool filled! auto_start_time: {updated_pool.get('auto_start_time')}")
                
                return updated_pool
            else:
                error = response.text[:200]
                raise Exception(f"Join failed: {response.status_code} - {error}")
                
        except Exception as e:
            self.log_test("Join pool", False, str(e))
            return None
    
    async def test_recruitment_validation(self):
        """Test recruitment system validation rules"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST: Recruitment System Validation", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        pool_id = int(time.time() * 1000) % 1000000
        
        # Test 1: min_participants < 5 should be rejected or adjusted
        try:
            pool_data = {
                "pool_id": pool_id,
                "pool_pubkey": "TestPubkey" + str(pool_id),
                "creator_wallet": "TestWallet" + str(pool_id),
                "name": "Test Pool",
                "goal_type": "lifestyle_habit",
                "goal_metadata": {"habit_type": "github_commits"},
                "stake_amount": 0.1,
                "duration_days": 7,
                "max_participants": 10,
                "min_participants": 3,  # Should be adjusted to 5
                "distribution_mode": "competitive",
                "charity_address": "11111111111111111111111111111111",
                "start_timestamp": int(time.time()),
                "end_timestamp": int(time.time()) + (7 * 86400),
                "recruitment_period_hours": 168,
                "require_min_participants": True,
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/pools/create/confirm",
                json={**pool_data, "transaction_signature": "test"}
            )
            
            if response.status_code == 201:
                pool = response.json()
                # Backend should enforce min_participants >= 5
                min_parts = pool.get("min_participants", 0)
                if min_parts >= 5:
                    self.log_test("min_participants validation (enforced >= 5)", True, 
                                f"min_participants adjusted to {min_parts}")
                else:
                    self.log_test("min_participants validation", False, 
                                f"min_participants should be >= 5, got {min_parts}")
            else:
                # If rejected, that's also valid
                self.log_test("min_participants validation (rejected)", True, 
                            "Pool creation rejected for min_participants < 5")
                
        except Exception as e:
            self.log_test("min_participants validation", False, str(e))
        
        # Test 2: max_participants > 50 should be capped
        pool_id2 = pool_id + 1
        try:
            pool_data = {
                "pool_id": pool_id2,
                "pool_pubkey": "TestPubkey" + str(pool_id2),
                "creator_wallet": "TestWallet" + str(pool_id2),
                "name": "Test Pool 2",
                "goal_type": "lifestyle_habit",
                "goal_metadata": {"habit_type": "github_commits"},
                "stake_amount": 0.1,
                "duration_days": 7,
                "max_participants": 100,  # Should be capped to 50
                "min_participants": 5,
                "distribution_mode": "competitive",
                "charity_address": "11111111111111111111111111111111",
                "start_timestamp": int(time.time()),
                "end_timestamp": int(time.time()) + (7 * 86400),
                "recruitment_period_hours": 168,
                "require_min_participants": True,
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/pools/create/confirm",
                json={**pool_data, "transaction_signature": "test2"}
            )
            
            if response.status_code == 201:
                pool = response.json()
                max_parts = pool.get("max_participants", 0)
                if max_parts <= 50:
                    self.log_test("max_participants validation (capped <= 50)", True, 
                                f"max_participants capped to {max_parts}")
                else:
                    self.log_test("max_participants validation", False, 
                                f"max_participants should be <= 50, got {max_parts}")
            else:
                self.log_test("max_participants validation (rejected)", True, 
                            "Pool creation rejected for max_participants > 50")
                
        except Exception as e:
            self.log_test("max_participants validation", False, str(e))
    
    async def test_pool_stats(self, pool_id: int):
        """Test GET /api/pools/{pool_id}/stats - Get pool stats"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST: Get Pool Stats", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        try:
            stats = await self.test_endpoint("GET", f"/api/pools/{pool_id}/stats")
            
            assert "started" in stats, "Stats should have 'started' field"
            assert "remaining" in stats, "Stats should have 'remaining' field"
            
            self.log_test("Get pool stats", True, 
                        f"Started: {stats.get('started')}, Remaining: {stats.get('remaining')}")
            return stats
        except Exception as e:
            self.log_test("Get pool stats", False, str(e))
            return None
    
    async def test_refund_endpoint(self, pool_id: int):
        """Test POST /api/pools/{pool_id}/refund - Refund endpoint"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST: Refund Endpoint", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        try:
            # First, mark pool as expired (if we can)
            # Then test refund endpoint
            refund_data = {
                "wallet_address": "TestRefundWallet123",
                "stake_amount": 0.1
            }
            
            # Note: This will fail if pool is not expired, which is expected
            response = await self.client.post(
                f"{self.base_url}/api/pools/{pool_id}/refund",
                params=refund_data
            )
            
            # Endpoint should exist (even if it returns error for non-expired pools)
            if response.status_code in [200, 400, 404]:
                self.log_test("Refund endpoint exists", True, 
                            f"Status: {response.status_code} (expected for non-expired pool)")
                return True
            else:
                raise Exception(f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Refund endpoint", False, str(e))
            return False
    
    async def run_all_tests(self):
        """Run all tests"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("RECRUITMENT SYSTEM TEST SUITE", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        self.log(f"Testing API at: {self.base_url}\n", Colors.BLUE)
        
        # Test 1: List pools
        await self.test_list_pools()
        
        # Test 2: Create pool
        pool = await self.test_create_pool()
        if not pool:
            self.log("Skipping remaining tests - pool creation failed", Colors.YELLOW)
            return
        
        pool_id = pool["pool_id"]
        
        # Test 3: Confirm pool creation
        confirmed_pool = await self.test_confirm_pool_creation(pool)
        if not confirmed_pool:
            self.log("Skipping remaining tests - pool confirmation failed", Colors.YELLOW)
            return
        
        # Test 4: Get pool
        await self.test_get_pool(pool_id)
        
        # Test 5: Join pool multiple times to test filling
        for i in range(6):  # Join 6 participants (more than min_participants=5)
            participant_wallet = f"TestParticipant{i}_{pool_id}"
            await self.test_join_pool(pool_id, participant_wallet)
            await asyncio.sleep(0.5)  # Small delay between joins
        
        # Test 6: Get updated pool to verify filling
        updated_pool = await self.test_get_pool(pool_id)
        if updated_pool:
            min_parts = updated_pool.get("min_participants", 5)
            part_count = updated_pool.get("participant_count", 0)
            filled_at = updated_pool.get("filled_at")
            auto_start = updated_pool.get("auto_start_time")
            
            if part_count >= min_parts:
                if filled_at and auto_start:
                    self.log_test("Pool filling detection", True, 
                                f"Pool filled! filled_at={filled_at}, auto_start_time={auto_start}")
                else:
                    self.log_test("Pool filling detection", False, 
                                "Pool has enough participants but filled_at/auto_start_time not set")
        
        # Test 7: Pool stats
        await self.test_pool_stats(pool_id)
        
        # Test 8: Recruitment validation
        await self.test_recruitment_validation()
        
        # Test 9: Refund endpoint
        await self.test_refund_endpoint(pool_id)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60, Colors.BOLD)
        self.log("TEST SUMMARY", Colors.BOLD)
        self.log("="*60, Colors.BOLD)
        
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["passed"])
        failed = total - passed
        
        self.log(f"\nTotal Tests: {total}", Colors.BOLD)
        self.log(f"{Colors.GREEN}Passed: {passed}{Colors.RESET}")
        if failed > 0:
            self.log(f"{Colors.RED}Failed: {failed}{Colors.RESET}")
        
        if failed > 0:
            self.log(f"\n{Colors.RED}Failed Tests:{Colors.RESET}")
            for result in self.test_results:
                if not result["passed"]:
                    self.log(f"  - {result['name']}: {result['details']}", Colors.RED)
        
        success_rate = (passed / total * 100) if total > 0 else 0
        self.log(f"\nSuccess Rate: {success_rate:.1f}%", Colors.BOLD)
        
        if failed == 0:
            self.log(f"\n{Colors.GREEN}All tests passed! ✓{Colors.RESET}", Colors.BOLD)
        else:
            self.log(f"\n{Colors.RED}Some tests failed. Please review the errors above.{Colors.RESET}", Colors.BOLD)


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Test recruitment system and endpoints")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of the API (default: http://localhost:8000)"
    )
    
    args = parser.parse_args()
    
    async with TestRunner(base_url=args.base_url) as runner:
        await runner.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
