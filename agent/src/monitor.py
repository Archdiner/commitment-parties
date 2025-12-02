"""
Monitoring functions for different challenge types.

Monitors pools and participants to verify goal completion.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import time

import httpx

from solana_client import SolanaClient
from verify import Verifier
from distribute import Distributor
from database import execute_query
from config import settings

logger = logging.getLogger(__name__)


class Monitor:
    """Monitors commitment pools for goal completion"""
    
    def __init__(self, solana_client: SolanaClient, verifier: Verifier = None, distributor: Distributor = None):
        self.solana_client = solana_client
        self.verifier = verifier
        self.distributor = distributor
        self.db = None  # Database module reference
    
    def _calculate_current_day(self, start_timestamp: int) -> Optional[int]:
        """
        Calculate the current day number based on pool start timestamp.
        
        Args:
            start_timestamp: Unix timestamp when pool started
        
        Returns:
            Current day number (1-indexed), or None if pool hasn't started yet
        """
        try:
            current_time = int(time.time())
            if current_time < start_timestamp:
                return None  # Pool hasn't started yet
            
            # Calculate days elapsed (0-indexed, then add 1 for 1-indexed day)
            seconds_elapsed = current_time - start_timestamp
            days_elapsed = seconds_elapsed // 86400  # 86400 seconds per day
            current_day = days_elapsed + 1
            
            return current_day
        except Exception as e:
            logger.error(f"Error calculating current day: {e}", exc_info=True)
            return None

    async def verify_github_commits(self, pool: Dict[str, Any], participant: Dict[str, Any]) -> bool:
        """
        Verify that a participant has made enough GitHub commits for the current UTC day.

        Uses the participant's VERIFIED GitHub username (from users table), not pool metadata.
        This ensures only the actual GitHub account owner can participate.

        Expects the following shape in pool['goal_metadata']:
        {
            "habit_type": "github_commits",
            "repo": "alice/commitment-parties",  # optional
            "min_commits_per_day": 1
        }

        The participant's verified GitHub username is fetched from the users table
        based on their wallet_address.

        If "repo" is provided, we count commits by this author to that repo.
        If "repo" is omitted/empty, we fall back to counting PushEvent commits
        across all public repos for this user for the current day.
        """
        try:
            goal_metadata = pool.get("goal_metadata") or {}
            habit_type = goal_metadata.get("habit_type")
            if habit_type != "github_commits":
                logger.warning(f"verify_github_commits called for non-github pool {pool.get('pool_id')}")
                return False

            # Get participant's wallet address
            participant_wallet = participant.get("wallet_address")
            if not participant_wallet:
                logger.warning(
                    "Participant missing wallet_address for pool %s",
                    pool.get("pool_id")
                )
                return False

            # Fetch verified GitHub username from users table
            users = await execute_query(
                table="users",
                operation="select",
                filters={"wallet_address": participant_wallet},
                limit=1
            )

            if not users or not users[0].get("verified_github_username"):
                logger.warning(
                    "Participant %s has not verified their GitHub username for pool %s",
                    participant_wallet,
                    pool.get("pool_id")
                )
                return False

            github_username = users[0].get("verified_github_username")
            repo = (goal_metadata.get("repo") or "").strip()
            min_commits_per_day = int(goal_metadata.get("min_commits_per_day", 1))

            logger.info(
                "Verifying GitHub commits for pool=%s, wallet=%s, verified_github=%s",
                pool.get("pool_id"),
                participant_wallet,
                github_username
            )

            # Compute current UTC day window
            now_utc = datetime.now(timezone.utc)
            start_of_day = datetime(
                now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc
            )
            end_of_day = start_of_day + timedelta(days=1)

            # If a specific repo is configured, count commits in that repo only
            if repo:
                owner, _, repo_name = repo.partition("/")
                if not owner or not repo_name:
                    logger.warning(
                        "Invalid GitHub repo format for pool %s: %s",
                        pool.get("pool_id"),
                        repo,
                    )
                    return False

                url = f"https://api.github.com/repos/{owner}/{repo_name}/commits"
                params = {
                    "author": github_username,
                    "since": start_of_day.isoformat(),
                    "until": end_of_day.isoformat(),
                }

                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.get(
                        url,
                        params=params,
                        headers={
                            "Accept": "application/vnd.github+json",
                        },
                    )

                if response.status_code != 200:
                    logger.warning(
                        "GitHub API error for pool %s, user=%s, repo=%s: "
                        "status=%s, body=%s",
                        pool.get("pool_id"),
                        github_username,
                        repo,
                        response.status_code,
                        response.text,
                    )
                    return False

                commits = response.json() or []
                commit_count = len(commits)
            else:
                # No repo specified: use user events API and count PushEvent commits
                events_url = f"https://api.github.com/users/{github_username}/events"
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.get(
                        events_url,
                        headers={
                            "Accept": "application/vnd.github+json",
                        },
                    )

                if response.status_code != 200:
                    logger.warning(
                        "GitHub events API error for pool %s, user=%s: "
                        "status=%s, body=%s",
                        pool.get("pool_id"),
                        github_username,
                        response.status_code,
                        response.text,
                    )
                    return False

                events = response.json() or []
                start_str = start_of_day.isoformat()
                end_str = end_of_day.isoformat()

                commit_count = 0
                for event in events:
                    try:
                        if event.get("type") != "PushEvent":
                            continue
                        created_at = event.get("created_at")
                        if not created_at:
                            continue
                        # created_at is ISO 8601 string; simple range check
                        if not (start_str <= created_at <= end_str):
                            continue
                        payload = event.get("payload") or {}
                        commits = payload.get("commits") or []
                        # Light anti-gamification: count only commits with non-trivial messages
                        for commit in commits:
                            msg = (commit.get("message") or "").strip()
                            if len(msg) >= 5:
                                commit_count += 1
                    except Exception as parse_err:
                        logger.debug("Error parsing GitHub event: %s", parse_err)

            passed = commit_count >= min_commits_per_day

            logger.info(
                "GitHub verification: pool=%s, wallet=%s, user=%s, repo=%s, "
                "commits_today=%s, min_required=%s, passed=%s",
                pool.get("pool_id"),
                participant.get("wallet_address"),
                github_username,
                repo or "*any*",
                commit_count,
                min_commits_per_day,
                passed,
            )

            return passed

        except Exception as e:
            logger.error(f"Error verifying GitHub commits: {e}", exc_info=True)
            return False

    async def verify_screentime(self, pool_id: int, wallet: str, day: int) -> bool:
        """
        Verify that a participant submitted a successful screen-time check-in
        for the specified day with a non-empty screenshot URL.
        """
        try:
            results = await execute_query(
                table="checkins",
                operation="select",
                filters={
                    "pool_id": pool_id,
                    "participant_wallet": wallet,
                    "day": day,
                    "success": True,
                },
                limit=1,
            )

            if not results:
                logger.info(
                    "Screen-time verification: no successful check-in found for "
                    "pool=%s, wallet=%s, day=%s",
                    pool_id,
                    wallet,
                    day,
                )
                return False

            checkin = results[0]
            screenshot_url = (checkin.get("screenshot_url") or "").strip()
            passed = bool(screenshot_url)

            logger.info(
                "Screen-time verification: pool=%s, wallet=%s, day=%s, "
                "success=%s, screenshot_url_present=%s",
                pool_id,
                wallet,
                day,
                checkin.get("success"),
                bool(screenshot_url),
            )

            return passed

        except Exception as e:
            logger.error(f"Error verifying screen-time check-in: {e}", exc_info=True)
            return False

    async def verify_dca_participant(
        self, pool: Dict[str, Any], participant: Dict[str, Any], current_day: int
    ) -> bool:
        """
        Approximate DCA verification for a participant.

        For hackathon MVP, we treat "DCA" as making at least N on-chain
        transactions per UTC day from the participant wallet. This is a
        proxy for daily trading activity rather than a strict swap parser.

        Expected metadata (optional, for clarity):
        {
            "goal_type": "DailyDCA",
            "goal_metadata": {
                "token_mint": "So111...1112",
                "min_trades_per_day": 1
            }
        }
        """
        try:
            goal_metadata = pool.get("goal_metadata") or {}
            min_trades_per_day = int(goal_metadata.get("min_trades_per_day", 1))

            wallet = participant.get("wallet_address")
            if not wallet:
                return False

            # Compute current UTC day window
            now_utc = datetime.now(timezone.utc)
            start_of_day = datetime(
                now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc
            )
            end_of_day = start_of_day + timedelta(days=1)

            start_ts = int(start_of_day.timestamp())
            end_ts = int(end_of_day.timestamp())

            # Fetch recent transactions for the wallet
            txs = await self.solana_client.get_transactions(wallet, limit=100)
            todays_txs = [
                tx
                for tx in txs
                if tx.get("block_time") is not None
                and start_ts <= int(tx["block_time"]) < end_ts
            ]

            trades_today = len(todays_txs)
            passed = trades_today >= min_trades_per_day

            logger.info(
                "DCA verification: pool=%s, wallet=%s, day=%s, "
                "trades_today=%s, min_required=%s, passed=%s",
                pool.get("pool_id"),
                wallet,
                current_day,
                trades_today,
                min_trades_per_day,
                passed,
            )

            return passed

        except Exception as e:
            logger.error(f"Error verifying DCA participant: {e}", exc_info=True)
            return False

    async def verify_hodl_participant(self, wallet: str, token_mint: str, min_balance: int) -> bool:
        """
        Check if wallet holds minimum token balance.
        
        Args:
            wallet: Participant wallet address
            token_mint: Token mint address to check
            min_balance: Minimum balance required (in smallest unit)
        
        Returns:
            True if balance >= min_balance, False otherwise
        """
        try:
            balance = await self.solana_client.get_token_balance(wallet, token_mint)
            passed = balance >= min_balance
            
            logger.info(
                f"HODL verification: wallet={wallet}, mint={token_mint}, "
                f"balance={balance}, min_required={min_balance}, passed={passed}"
            )
            
            return passed
        
        except Exception as e:
            logger.error(f"Error checking HODL balance: {e}", exc_info=True)
            return False
    
    async def verify_lifestyle_participant(self, pool_id: int, wallet: str, day: int) -> bool:
        """
        Check if participant submitted check-in for the specified day.
        
        Args:
            pool_id: Pool ID
            wallet: Participant wallet address
            day: Day number to check
        
        Returns:
            True if check-in exists and is successful, False otherwise
        """
        try:
            # Query database for check-in
            results = await execute_query(
                table="checkins",
                operation="select",
                filters={
                    "pool_id": pool_id,
                    "participant_wallet": wallet,
                    "day": day
                },
                limit=1
            )
            
            if not results:
                logger.info(
                    f"Lifestyle verification: No check-in found for "
                    f"pool={pool_id}, wallet={wallet}, day={day}"
                )
                return False
            
            checkin = results[0]
            success = checkin.get("success", False)
            
            logger.info(
                f"Lifestyle verification: pool={pool_id}, wallet={wallet}, "
                f"day={day}, success={success}"
            )
            
            return success
        
        except Exception as e:
            logger.error(f"Error checking lifestyle check-in: {e}", exc_info=True)
            return False
    
    async def get_active_pools(self, goal_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get active pools from database.
        
        Args:
            goal_type: Optional filter by goal type (e.g., 'hodl_token', 'lifestyle_habit')
        
        Returns:
            List of pool dictionaries
        """
        try:
            filters = {"status": "active"}
            if goal_type:
                filters["goal_type"] = goal_type
            
            pools = await execute_query(
                table="pools",
                operation="select",
                filters=filters
            )
            
            return pools
        
        except Exception as e:
            logger.error(f"Error fetching active pools: {e}", exc_info=True)
            return []
    
    async def get_pool_participants(self, pool_id: int) -> List[Dict[str, Any]]:
        """
        Get all active participants for a pool.
        
        Args:
            pool_id: Pool ID
        
        Returns:
            List of participant dictionaries
        """
        try:
            participants = await execute_query(
                table="participants",
                operation="select",
                filters={
                    "pool_id": pool_id,
                    "status": "active"
                }
            )
            
            return participants
        
        except Exception as e:
            logger.error(f"Error fetching pool participants: {e}", exc_info=True)
            return []
    
    async def monitor_dca_pools(self):
        """
        Monitor Daily DCA pools.
        
        Checks if participants made required DCA swaps daily.
        Runs every 24 hours.
        """
        logger.info("Starting DCA pool monitoring...")
        
        while True:
            try:
                logger.info("Checking DCA pools...")

                # Get all active pools and filter to DCA-style crypto goals
                all_pools = await self.get_active_pools()
                dca_pools = [
                    p
                    for p in all_pools
                    if p.get("goal_type") in ("DailyDCA", "dca_trade")
                ]

                if not dca_pools:
                    logger.info("No active DCA pools found")
                else:
                    logger.info("Found %d active DCA pools", len(dca_pools))

                    for pool in dca_pools:
                        try:
                            pool_id = pool.get("pool_id")
                            start_timestamp = pool.get("start_timestamp")

                            if not pool_id:
                                logger.warning("Invalid DCA pool data: %s", pool)
                                continue

                            current_day = self._calculate_current_day(start_timestamp)
                            if current_day is None:
                                logger.info("DCA pool %s hasn't started yet", pool_id)
                                continue

                            participants = await self.get_pool_participants(pool_id)
                            if not participants:
                                logger.info(
                                    "DCA pool %s has no active participants", pool_id
                                )
                                continue

                            logger.info(
                                "Verifying %d participants for DCA pool %s, day %s",
                                len(participants),
                                pool_id,
                                current_day,
                            )

                            for participant in participants:
                                wallet = participant.get("wallet_address")
                                if not wallet:
                                    continue

                                passed = await self.verify_dca_participant(
                                    pool, participant, current_day
                                )

                                if self.verifier:
                                    pool_pubkey = pool.get("pool_pubkey")
                                    if pool_pubkey:
                                        signature = await self.verifier.submit_verification(
                                            pool_id=pool_id,
                                            participant_wallet=wallet,
                                            day=current_day,
                                            passed=passed,
                                        )
                                        if signature:
                                            logger.info(
                                                "DCA verification submitted for "
                                                "pool=%s, wallet=%s, day=%s, passed=%s",
                                                pool_id,
                                                wallet,
                                                current_day,
                                                passed,
                                            )
                                else:
                                    logger.warning(
                                        "Verifier not available, skipping DCA on-chain submission"
                                    )

                await asyncio.sleep(settings.DCA_CHECK_INTERVAL)
            
            except Exception as e:
                logger.error(f"Error in DCA monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying
    
    async def monitor_hodl_pools(self):
        """
        Monitor HODL token pools.
        
        Checks if participants maintained minimum token balance.
        Runs every hour.
        """
        logger.info("Starting HODL pool monitoring...")
        
        while True:
            try:
                logger.info("Checking HODL pools...")
                
                # Get active HODL pools from database
                pools = await self.get_active_pools(goal_type="hodl_token")
                
                if not pools:
                    logger.info("No active HODL pools found")
                else:
                    logger.info(f"Found {len(pools)} active HODL pools")
                    
                    for pool in pools:
                        try:
                            pool_id = pool.get("pool_id")
                            goal_metadata = pool.get("goal_metadata", {})
                            start_timestamp = pool.get("start_timestamp")
                            
                            if not pool_id or not goal_metadata:
                                logger.warning(f"Invalid pool data: {pool}")
                                continue
                            
                            # Extract HODL requirements from goal_metadata
                            token_mint = goal_metadata.get("token_mint")
                            min_balance = goal_metadata.get("min_balance")
                            
                            if not token_mint or min_balance is None:
                                logger.warning(f"Pool {pool_id} missing HODL requirements")
                                continue
                            
                            # Calculate current day
                            current_day = self._calculate_current_day(start_timestamp)
                            if current_day is None:
                                logger.info(f"Pool {pool_id} hasn't started yet")
                                continue
                            
                            # Get all active participants
                            participants = await self.get_pool_participants(pool_id)
                            
                            if not participants:
                                logger.info(f"Pool {pool_id} has no active participants")
                                continue
                            
                            logger.info(
                                f"Verifying {len(participants)} participants for pool {pool_id}, day {current_day}"
                            )
                            
                            # Verify each participant
                            for participant in participants:
                                wallet = participant.get("wallet_address")
                                if not wallet:
                                    continue
                                
                                # Check token balance
                                passed = await self.verify_hodl_participant(
                                    wallet, token_mint, min_balance
                                )
                                
                                # Submit verification to smart contract
                                if self.verifier:
                                    pool_pubkey = pool.get("pool_pubkey")
                                    if pool_pubkey:
                                        signature = await self.verifier.submit_verification(
                                            pool_id=pool_id,
                                            participant_wallet=wallet,
                                            day=current_day,
                                            passed=passed
                                        )
                                        if signature:
                                            logger.info(
                                                f"Verification submitted for pool={pool_id}, "
                                                f"wallet={wallet}, day={current_day}, passed={passed}"
                                            )
                                else:
                                    logger.warning("Verifier not available, skipping on-chain submission")
                        
                        except Exception as e:
                            logger.error(f"Error processing pool {pool.get('pool_id')}: {e}", exc_info=True)
                            continue
                
                # Sleep for the configured interval before next check
                await asyncio.sleep(settings.HODL_CHECK_INTERVAL)
            
            except Exception as e:
                logger.error(f"Error in HODL monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying
    
    async def monitor_lifestyle_pools(self):
        """
        Monitor lifestyle habit pools.
        
        Checks for daily check-ins from participants.
        Runs every 5 minutes.
        """
        logger.info("Starting lifestyle pool monitoring...")
        
        while True:
            try:
                logger.info("Checking lifestyle pools...")
                
                # Get active lifestyle pools from database
                pools = await self.get_active_pools(goal_type="lifestyle_habit")
                
                if not pools:
                    logger.info("No active lifestyle pools found")
                else:
                    logger.info(f"Found {len(pools)} active lifestyle pools")
                    
                    for pool in pools:
                        try:
                            pool_id = pool.get("pool_id")
                            start_timestamp = pool.get("start_timestamp")
                            goal_metadata = pool.get("goal_metadata") or {}
                            
                            if not pool_id:
                                logger.warning(f"Invalid pool data: {pool}")
                                continue
                            
                            # Calculate current day
                            current_day = self._calculate_current_day(start_timestamp)
                            if current_day is None:
                                logger.info(f"Pool {pool_id} hasn't started yet")
                                continue
                            
                            # Get all active participants
                            participants = await self.get_pool_participants(pool_id)
                            
                            if not participants:
                                logger.info(f"Pool {pool_id} has no active participants")
                                continue
                            
                            logger.info(
                                f"Verifying {len(participants)} participants for pool {pool_id}, day {current_day}"
                            )
                            
                            habit_type = goal_metadata.get("habit_type")

                            # Verify each participant
                            for participant in participants:
                                wallet = participant.get("wallet_address")
                                if not wallet:
                                    continue

                                # Route verification based on lifestyle habit type
                                if habit_type == "github_commits":
                                    passed = await self.verify_github_commits(
                                        pool, participant
                                    )
                                elif habit_type == "screen_time":
                                    passed = await self.verify_screentime(
                                        pool_id, wallet, current_day
                                    )
                                else:
                                    # Fallback to generic lifestyle check-in verification
                                    passed = await self.verify_lifestyle_participant(
                                        pool_id, wallet, current_day
                                    )
                                
                                # Store verification in database
                                try:
                                    # Check if verification already exists for this day
                                    existing_verifications = await execute_query(
                                        table="verifications",
                                        operation="select",
                                        filters={
                                            "pool_id": pool_id,
                                            "participant_wallet": wallet,
                                            "day": current_day
                                        },
                                        limit=1
                                    )
                                    
                                    if not existing_verifications:
                                        # Store new verification
                                        verification_data = {
                                            "pool_id": pool_id,
                                            "participant_wallet": wallet,
                                            "day": current_day,
                                            "passed": passed,
                                            "verification_type": habit_type or "lifestyle_habit",
                                            "proof_data": {
                                                "verified_at": datetime.now(timezone.utc).isoformat(),
                                                "habit_type": habit_type
                                            }
                                        }
                                        await execute_query(
                                            table="verifications",
                                            operation="insert",
                                            data=verification_data
                                        )
                                        logger.info(
                                            f"Stored verification in database: pool={pool_id}, "
                                            f"wallet={wallet}, day={current_day}, passed={passed}"
                                        )
                                    else:
                                        # Update existing verification if result changed
                                        existing = existing_verifications[0]
                                        if existing.get("passed") != passed:
                                            await execute_query(
                                                table="verifications",
                                                operation="update",
                                                filters={
                                                    "pool_id": pool_id,
                                                    "participant_wallet": wallet,
                                                    "day": current_day
                                                },
                                                data={"passed": passed}
                                            )
                                            logger.info(
                                                f"Updated verification in database: pool={pool_id}, "
                                                f"wallet={wallet}, day={current_day}, passed={passed}"
                                            )
                                    
                                    # Update days_verified in participants table
                                    # Count all passed verifications for this participant
                                    all_verifications = await execute_query(
                                        table="verifications",
                                        operation="select",
                                        filters={
                                            "pool_id": pool_id,
                                            "participant_wallet": wallet,
                                            "passed": True
                                        }
                                    )
                                    days_verified = len(all_verifications)
                                    
                                    # Update participant's days_verified
                                    await execute_query(
                                        table="participants",
                                        operation="update",
                                        filters={
                                            "pool_id": pool_id,
                                            "wallet_address": wallet
                                        },
                                        data={"days_verified": days_verified}
                                    )
                                    logger.info(
                                        f"Updated days_verified for participant: pool={pool_id}, "
                                        f"wallet={wallet}, days_verified={days_verified}"
                                    )
                                    
                                except Exception as db_err:
                                    logger.error(
                                        f"Error updating database after verification: {db_err}",
                                        exc_info=True
                                    )
                                
                                # Submit verification to smart contract
                                if self.verifier:
                                    pool_pubkey = pool.get("pool_pubkey")
                                    if pool_pubkey:
                                        signature = await self.verifier.submit_verification(
                                            pool_id=pool_id,
                                            participant_wallet=wallet,
                                            day=current_day,
                                            passed=passed
                                        )
                                        if signature:
                                            logger.info(
                                                f"Verification submitted on-chain for pool={pool_id}, "
                                                f"wallet={wallet}, day={current_day}, passed={passed}, "
                                                f"signature={signature}"
                                            )
                                else:
                                    logger.warning("Verifier not available, skipping on-chain submission")
                        
                        except Exception as e:
                            logger.error(f"Error processing pool {pool.get('pool_id')}: {e}", exc_info=True)
                            continue
                
                # Sleep for the configured interval before next check
                await asyncio.sleep(settings.LIFESTYLE_CHECK_INTERVAL)
            
            except Exception as e:
                logger.error(f"Error in lifestyle monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying

