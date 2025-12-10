"""
Monitoring functions for different challenge types.

Monitors pools and participants to verify goal completion.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
import time

import httpx
from openai import AsyncOpenAI

from solana_client import SolanaClient
from verify import Verifier
from distribute import Distributor
from database import execute_query
from config import settings
from timezone import (
    get_eastern_now, get_eastern_timestamp, calculate_current_day,
    timestamp_to_eastern, get_challenge_day_window, utc_to_eastern, EASTERN_TZ
)

logger = logging.getLogger(__name__)


class Monitor:
    """Monitors commitment pools for goal completion"""
    
    def __init__(self, solana_client: SolanaClient, verifier: Verifier = None, distributor: Distributor = None):
        self.solana_client = solana_client
        self.verifier = verifier
        self.distributor = distributor
        self.db = None  # Database module reference
        # Initialize OpenAI client if API key is available
        self.openai_client = None
        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    def _calculate_current_day(self, start_timestamp: int) -> Optional[int]:
        """
        Calculate the current day number based on pool start timestamp.
        Uses 24-hour periods from the exact start time in Eastern Time.
        
        Args:
            start_timestamp: Unix timestamp when pool started
        
        Returns:
            Current day number (1-indexed, minimum 1), or None if pool hasn't started yet
        """
        try:
            return calculate_current_day(start_timestamp)
        except Exception as e:
            logger.error(f"Error calculating current day: {e}", exc_info=True)
            return None

    async def _fetch_commit_code(self, repo_full_name: str, sha: str) -> Optional[str]:
        """
        Fetch the code diff/patch for a commit from GitHub API.
        
        Args:
            repo_full_name: Repository name in format "owner/repo"
            sha: Commit SHA
        
        Returns:
            Commit diff/patch as string, or None if fetch fails
        """
        try:
            commit_api_url = f"https://api.github.com/repos/{repo_full_name}/commits/{sha}"
            
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(
                    commit_api_url,
                    headers={
                        "Accept": "application/vnd.github+json",
                    },
                )
            
            if response.status_code == 200:
                commit_data = response.json()
                # Get the patch/diff from the commit
                files = commit_data.get("files", [])
                patches = []
                for file in files:
                    patch = file.get("patch", "")
                    if patch:
                        filename = file.get("filename", "unknown")
                        patches.append(f"--- {filename}\n{patch}")
                
                if patches:
                    return "\n\n".join(patches)
                else:
                    # No patch available (might be binary file or empty commit)
                    return ""
            else:
                logger.debug(
                    f"Could not fetch commit code for {sha[:7]} in {repo_full_name}: "
                    f"status {response.status_code}"
                )
                return None
        except Exception as e:
            logger.debug(f"Error fetching commit code for {sha[:7]}: {e}")
            return None

    def _estimate_token_count(self, text: str) -> int:
        """
        Rough estimate of token count for text.
        Uses a simple heuristic: ~4 characters per token.
        This is conservative and will err on the side of caution.
        
        Args:
            text: Text to estimate tokens for
        
        Returns:
            Estimated token count
        """
        # Rough estimate: 1 token ≈ 4 characters
        # This is conservative - actual tokenization varies
        return len(text) // 4

    async def _check_if_nonsensical_commit(self, code: str, commit_message: str) -> Optional[bool]:
        """
        Check if a commit is nonsensical/useless (just to fulfill commit requirement).
        Only flags obviously bad commits, not genuine work.
        
        Args:
            code: The code diff/patch to verify
            commit_message: The commit message
        
        Returns:
            True if nonsensical/useless, False if genuine, None if check can't be performed
        """
        if not self.openai_client:
            logger.debug("OpenAI client not available, skipping code quality check")
            return None
        
        try:
            # Estimate token count (conservative estimate)
            # Reserve space for prompt (~500 tokens) and response (~100 tokens)
            # Use ~80k tokens as safe limit (well below 128k context window)
            estimated_tokens = self._estimate_token_count(code)
            max_code_tokens = 80000  # Safe limit for code
            
            if estimated_tokens > max_code_tokens:
                logger.info(
                    f"Code exceeds context limit (estimated {estimated_tokens} tokens, "
                    f"max {max_code_tokens}). Passing commit without quality check."
                )
                return None  # Pass without checking if too large
            
            # Build brief prompt - only flag obviously nonsensical commits
            prompt = f"""Is this commit nonsensical or useless (just to fulfill commit requirement)? 
Only say yes if it's clearly garbage like random characters, empty changes, or meaningless edits.

Commit: {commit_message}
Code:
{code[:50000]}

Respond with only "yes" or "no"."""

            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Use cheaper model
                messages=[
                    {"role": "system", "content": "You detect only obviously nonsensical commits. Be very lenient - genuine work always passes. Respond with only 'yes' or 'no'."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=5,
                temperature=0.2,  # Lower temperature for more consistent detection
            )
            
            response_text = response.choices[0].message.content.strip().lower()
            
            # Check if response indicates nonsensical
            if "yes" in response_text:
                return True  # Nonsensical
            else:
                return False  # Genuine (or unclear, default to genuine)
                
        except Exception as e:
            logger.error(f"Error checking if commit is nonsensical: {e}", exc_info=True)
            return None  # On error, assume genuine

    async def verify_github_commits(self, pool: Dict[str, Any], participant: Dict[str, Any], day: int) -> Tuple[Optional[bool], List[str]]:
        """
        Verify that a participant has made enough GitHub commits for the specified challenge day.

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
        across all public repos for this user for the challenge day.
        
        IMPORTANT: This function gives users the full 24-hour window to complete their requirement.
        - Returns True if commits found (regardless of day status)
        - Returns False only if day has ended AND no commits found
        - Returns None if day is still active and no commits found yet (pending status)
        
        Args:
            pool: Pool dictionary
            participant: Participant dictionary
            day: Challenge day number (1-indexed) to verify
        
        Returns:
            Tuple of (passed, checked_commit_shas):
            - passed: True if commits found, False if day ended and no commits found, None if day still active
            - checked_commit_shas: List of commit SHAs that were checked in this verification
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
            min_commits_per_day = int(goal_metadata.get("min_commits_per_day", 1))
            min_lines_per_commit = int(goal_metadata.get("min_lines_per_commit", 0))  # Default 0 = no minimum
            start_timestamp = pool.get("start_timestamp")

            if not start_timestamp:
                logger.warning("Pool %s missing start_timestamp", pool.get("pool_id"))
                return False

            logger.info(
                "Verifying GitHub commits for pool=%s, wallet=%s, verified_github=%s, day=%s, "
                "min_commits=%s, min_lines=%s",
                pool.get("pool_id"),
                participant_wallet,
                github_username,
                day,
                min_commits_per_day,
                min_lines_per_commit
            )

            # Calculate the Eastern Time day window for this challenge day
            # Day 1 = 24 hours from start_timestamp, Day 2 = next 24 hours, etc.
            # This ensures each challenge day is exactly 24 hours from the pool start time
            challenge_day_start, challenge_day_end = get_challenge_day_window(start_timestamp, day)
            start_datetime = timestamp_to_eastern(start_timestamp)
            
            start_of_day = challenge_day_start
            end_of_day = challenge_day_end
            
            # Check if we're checking a future day (shouldn't happen, but safety check)
            current_time = get_eastern_now()
            if current_time < challenge_day_start:
                logger.warning(
                    f"Attempting to verify Day {day} before it has started! "
                    f"Current time: {current_time.isoformat()}, "
                    f"Day {day} starts: {challenge_day_start.isoformat()}. "
                    f"Skipping verification."
                )
                return False
            
            # IMPORTANT: Only mark as failed AFTER the day window has completely passed
            # During the active day, we check for commits and can mark as passed,
            # but we don't mark as failed until the day is over (giving users full 24 hours)
            day_has_ended = current_time >= challenge_day_end
            time_remaining = (challenge_day_end - current_time).total_seconds() / 3600 if not day_has_ended else 0
            
            logger.info(
                "Checking commits for challenge day %s: %s to %s (Eastern Time) "
                "(24-hour window from pool start: %s, current time: %s, "
                "day_ended=%s, time_remaining=%.1fh)",
                day,
                start_of_day.isoformat(),
                end_of_day.isoformat(),
                start_datetime.isoformat(),
                current_time.isoformat(),
                day_has_ended,
                time_remaining
            )

            # Always use user events API to track commits from any repository
            events_url = f"https://api.github.com/users/{github_username}/events"
            async with httpx.AsyncClient(timeout=30) as client:  # Increased timeout for commit detail fetching
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
                push_events_in_range = []
                push_events_out_of_range = []
                
                # Collect all commits from PushEvents in the time range
                candidate_commits = []  # List of (repo, sha, message) tuples
                
                for event in events:
                    try:
                        if event.get("type") != "PushEvent":
                            continue
                        created_at_str = event.get("created_at")
                        if not created_at_str:
                            continue
                        
                        # Parse the ISO 8601 timestamp and compare as datetime objects
                        try:
                            # GitHub timestamps are in UTC, convert to Eastern for comparison
                            event_time_utc = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                            if event_time_utc.tzinfo is None:
                                event_time_utc = event_time_utc.replace(tzinfo=timezone.utc)
                            # Convert to Eastern Time for comparison with challenge day windows
                            event_time = utc_to_eastern(event_time_utc)
                        except (ValueError, AttributeError):
                            if not (start_str <= created_at_str <= end_str):
                                push_events_out_of_range.append({
                                    "time": created_at_str,
                                    "repo": event.get("repo", {}).get("name", "unknown")
                                })
                                continue
                            event_time = None
                        else:
                            if not (start_of_day <= event_time < end_of_day):
                                push_events_out_of_range.append({
                                    "time": created_at_str,
                                    "repo": event.get("repo", {}).get("name", "unknown"),
                                    "event_time": event_time.isoformat()
                                })
                                continue
                        
                        payload = event.get("payload") or {}
                        commits = payload.get("commits") or []
                        repo_name = event.get("repo", {}).get("name", "unknown")
                        
                        # Collect commits with non-trivial messages
                        for commit in commits:
                            msg = (commit.get("message") or "").strip()
                            sha = commit.get("sha", "")
                            if len(msg) >= 5 and sha:
                                candidate_commits.append({
                                    "repo": repo_name,
                                    "sha": sha,
                                    "message": msg,
                                    "url": commit.get("url", "")
                                })
                        
                        if commits:
                            push_events_in_range.append({
                                "time": created_at_str,
                                "repo": repo_name,
                                "commits": len(commits)
                            })
                    except Exception as parse_err:
                        logger.debug("Error parsing GitHub event: %s", parse_err)
                
                # Get previously checked commits from existing verifications to avoid re-checking
                checked_commits = set()
                try:
                    existing_verifications = await execute_query(
                        table="verifications",
                        operation="select",
                        filters={
                            "pool_id": pool.get("pool_id"),
                            "participant_wallet": participant_wallet,
                        }
                    )
                    for verification in existing_verifications:
                        proof_data = verification.get("proof_data") or {}
                        checked_shas = proof_data.get("checked_commit_shas", [])
                        if isinstance(checked_shas, list):
                            checked_commits.update(checked_shas)
                    if checked_commits:
                        logger.info(
                            f"Found {len(checked_commits)} previously checked commits for pool={pool.get('pool_id')}, "
                            f"wallet={participant_wallet}"
                        )
                except Exception as e:
                    logger.debug(f"Error fetching checked commits: {e}")
                
                # Verify code quality for commits using LLM
                valid_commits = []
                quality_checked_commits = []
                checked_commit_shas = []  # Track SHAs we check in this run
                
                for commit_info in candidate_commits:
                    sha = commit_info["sha"]
                    
                    # Skip if we've already checked this commit
                    if sha in checked_commits:
                        logger.debug(
                            f"Commit {sha[:7]} already checked, skipping"
                        )
                        # Still count it as valid if it was previously checked
                        valid_commits.append({
                            "repo": commit_info["repo"],
                            "sha": sha[:7],
                            "message": commit_info["message"][:60],
                            "quality_score": None,
                            "reason": "already_checked"
                        })
                        commit_count += 1
                        continue
                    try:
                        repo_full_name = commit_info["repo"]
                        sha = commit_info["sha"]
                        message = commit_info["message"]
                        
                        # Fetch commit code
                        code = await self._fetch_commit_code(repo_full_name, sha)
                        
                        if code is None:
                            # Couldn't fetch code - might be private repo or API issue
                            # Count it anyway to avoid false negatives
                            logger.debug(
                                f"Could not fetch code for commit {sha[:7]} in {repo_full_name}, "
                                f"counting as valid (may be private repo or API issue)"
                            )
                            valid_commits.append({
                                "repo": repo_full_name,
                                "sha": sha[:7],
                                "message": message[:60],
                                "quality_score": None,
                                "reason": "code_unavailable"
                            })
                            commit_count += 1
                            continue
                        
                        # Check minimum lines if required
                        if min_lines_per_commit > 0:
                            # Count lines in the patch (rough estimate)
                            lines_changed = len(code.split('\n'))
                            if lines_changed < min_lines_per_commit:
                                logger.debug(
                                    f"Commit {sha[:7]} in {repo_full_name} has {lines_changed} lines "
                                    f"(minimum required: {min_lines_per_commit}), skipping"
                                )
                                continue
                        
                        # Verify code quality with LLM (only to detect nonsensical/useless commits)
                        is_nonsensical = await self._check_if_nonsensical_commit(code, message)
                        
                        if is_nonsensical is None:
                            # Code too large or LLM unavailable - pass it (assume genuine)
                            logger.info(
                                f"Commit {sha[:7]} in {repo_full_name} passed without quality check "
                                f"(code too large or LLM unavailable)"
                            )
                            valid_commits.append({
                                "repo": repo_full_name,
                                "sha": sha[:7],
                                "message": message[:60],
                                "quality_score": None,
                                "reason": "context_limit_or_llm_unavailable"
                            })
                            checked_commit_shas.append(sha)
                            commit_count += 1
                        elif not is_nonsensical:
                            # Commit is genuine (not nonsensical) - pass it
                            logger.info(
                                f"Commit {sha[:7]} in {repo_full_name} passed quality check (genuine commit)"
                            )
                            valid_commits.append({
                                "repo": repo_full_name,
                                "sha": sha[:7],
                                "message": message[:60],
                                "quality_score": None,
                                "reason": "genuine_commit"
                            })
                            checked_commit_shas.append(sha)
                            commit_count += 1
                        else:
                            # Commit is nonsensical/useless - reject it
                            logger.info(
                                f"Commit {sha[:7]} in {repo_full_name} failed quality check "
                                f"(detected as nonsensical/useless commit)"
                            )
                            quality_checked_commits.append({
                                "repo": repo_full_name,
                                "sha": sha[:7],
                                "message": message[:60],
                                "quality_score": None,
                                "reason": "nonsensical_commit"
                            })
                            checked_commit_shas.append(sha)  # Still track it as checked
                    except Exception as commit_err:
                        logger.debug(f"Error processing commit {commit_info.get('sha', 'unknown')}: {commit_err}")
                        # On error, count the commit anyway to avoid false negatives
                        error_sha = commit_info.get("sha", "")
                        valid_commits.append({
                            "repo": commit_info.get("repo", "unknown"),
                            "sha": error_sha[:7] if error_sha else "unknown",
                            "message": commit_info.get("message", "")[:60],
                            "quality_score": None,
                            "reason": "error_processing"
                        })
                        if error_sha:
                            checked_commit_shas.append(error_sha)
                        commit_count += 1
                
                if valid_commits:
                    logger.info(
                        f"Valid commits after quality check: {len(valid_commits)} passed, "
                        f"{len(quality_checked_commits)} failed quality check"
                    )
                    if len(valid_commits) <= 5:
                        logger.info(f"Passed commits: {valid_commits}")
                    else:
                        logger.info(f"Passed commits (first 5): {valid_commits[:5]}")
                
                if quality_checked_commits and len(quality_checked_commits) <= 5:
                    logger.info(f"Failed quality check commits: {quality_checked_commits}")
                
                # Log detailed information for debugging
                logger.info(
                    f"GitHub events analysis: total_events={len(events)}, "
                    f"push_events_in_range={len(push_events_in_range)}, "
                    f"push_events_out_of_range={len(push_events_out_of_range)}, "
                    f"candidate_commits={len(candidate_commits)}, "
                    f"valid_commits_counted={commit_count}"
                )
                
                if push_events_in_range:
                    logger.info(f"PushEvents in Day {day} range: {push_events_in_range[:5]}")
                
                if push_events_out_of_range and len(push_events_out_of_range) <= 10:
                    logger.info(f"Recent PushEvents OUT of Day {day} range: {push_events_out_of_range[:5]}")

            # Determine if user passed based on commits found
            has_commits = commit_count >= min_commits_per_day
            
            # Only mark as failed if:
            # 1. The day window has completely ended (day_has_ended = True)
            # 2. AND no commits were found (has_commits = False)
            # This gives users the full 24 hours to complete their requirement
            if day_has_ended:
                # Day is over - final verdict
                passed = has_commits
                logger.info(
                    "GitHub verification (FINAL - day ended): pool=%s, wallet=%s, user=%s, "
                    "commits_found=%s, min_required=%s, min_lines=%s, passed=%s",
                    pool.get("pool_id"),
                    participant.get("wallet_address"),
                    github_username,
                    commit_count,
                    min_commits_per_day,
                    min_lines_per_commit,
                    passed,
                )
            else:
                # Day is still active - only mark as passed if commits found
                # Don't mark as failed yet (user still has time)
                passed = has_commits if has_commits else None  # None = pending, not failed yet
                logger.info(
                    "GitHub verification (IN PROGRESS - day active): pool=%s, wallet=%s, user=%s, "
                    "commits_found=%s, min_required=%s, min_lines=%s, status=%s (%.1fh remaining)",
                    pool.get("pool_id"),
                    participant.get("wallet_address"),
                    github_username,
                    commit_count,
                    min_commits_per_day,
                    min_lines_per_commit,
                    "PASSED" if passed else "PENDING",
                    time_remaining
                )
            
            # Return False only if day ended and no commits found
            # Return True if commits found (regardless of day status)
            # Return None if day still active and no commits yet (caller should handle this)
            if passed is None:
                # Day still active, no commits yet - don't mark as failed
                return (None, checked_commit_shas)
            return (passed, checked_commit_shas)

        except Exception as e:
            logger.error(f"Error verifying GitHub commits: {e}", exc_info=True)
            return (False, [])

    async def verify_screentime(self, pool_id: int, wallet: str, day: int, pool: Optional[Dict[str, Any]] = None) -> bool:
        """
        Verify that a participant submitted a successful screen-time check-in
        for the specified day with a non-empty screenshot URL.
        
        IMPORTANT: Only check-ins submitted BEFORE the day ends are valid.
        The check-in timestamp must be before challenge_day_end.
        """
        try:
            # Get pool info if not provided (for day boundary calculation)
            if pool is None:
                pools = await execute_query(
                    table="pools",
                    operation="select",
                    filters={"pool_id": pool_id},
                    limit=1
                )
                if not pools:
                    logger.warning(f"Pool {pool_id} not found for screen-time verification")
                    return False
                pool = pools[0]
            
            start_timestamp = pool.get("scheduled_start_time") or pool.get("start_timestamp")
            if not start_timestamp:
                logger.warning(f"Pool {pool_id} missing start_timestamp")
                return False
            
            # Calculate day boundaries in Eastern Time
            challenge_day_start, challenge_day_end = get_challenge_day_window(start_timestamp, day)
            
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
            
            # Verify check-in was submitted before day ended
            checkin_timestamp = checkin.get("timestamp")
            if checkin_timestamp:
                # Parse timestamp (could be string or datetime)
                if isinstance(checkin_timestamp, str):
                    try:
                        # Parse timestamp and convert to Eastern Time
                        checkin_time_utc = datetime.fromisoformat(checkin_timestamp.replace('Z', '+00:00'))
                        if checkin_time_utc.tzinfo is None:
                            checkin_time_utc = checkin_time_utc.replace(tzinfo=timezone.utc)
                        checkin_time = utc_to_eastern(checkin_time_utc)
                    except (ValueError, AttributeError):
                        logger.warning(f"Could not parse check-in timestamp: {checkin_timestamp}")
                        checkin_time = None
                elif isinstance(checkin_timestamp, datetime):
                    checkin_time = checkin_timestamp
                    if checkin_time.tzinfo is None:
                        # Assume UTC if no timezone, then convert to Eastern
                        checkin_time = utc_to_eastern(checkin_time.replace(tzinfo=timezone.utc))
                    elif checkin_time.tzinfo != EASTERN_TZ:
                        # Convert to Eastern if not already Eastern
                        checkin_time = utc_to_eastern(checkin_time.astimezone(timezone.utc))
                else:
                    checkin_time = None
                
                if checkin_time and checkin_time >= challenge_day_end:
                    # Check-in was submitted after day ended - invalid
                    logger.warning(
                        "Screen-time verification: check-in submitted after day ended "
                        "pool=%s, wallet=%s, day=%s, checkin_time=%s, day_end=%s",
                        pool_id,
                        wallet,
                        day,
                        checkin_time.isoformat(),
                        challenge_day_end.isoformat(),
                    )
                    return False
            
            passed = bool(screenshot_url)

            logger.info(
                "Screen-time verification: pool=%s, wallet=%s, day=%s, "
                "success=%s, screenshot_url_present=%s, valid_timing=%s",
                pool_id,
                wallet,
                day,
                checkin.get("success"),
                bool(screenshot_url),
                checkin_time < challenge_day_end if checkin_time else "unknown",
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

            # Calculate the UTC day window for the specific challenge day
            # We need to check commits made on the day corresponding to the challenge day
            # Day 1 = day when pool started, Day 2 = next day, etc.
            start_timestamp = pool.get("start_timestamp")
            if not start_timestamp:
                logger.warning("Pool %s missing start_timestamp", pool.get("pool_id"))
                return False
            
            # Get the current challenge day (calculated by the caller)
            current_day = self._calculate_current_day(start_timestamp)
            if current_day is None:
                logger.warning("Pool %s hasn't started yet", pool.get("pool_id"))
                return False
            
            # Calculate day boundaries in Eastern Time
            # Day 1 = first 24 hours from pool start
            start_of_day, end_of_day = get_challenge_day_window(start_timestamp, current_day)
            
            logger.info(
                "Checking commits for challenge day %s: %s to %s (Eastern Time)",
                current_day,
                start_of_day.isoformat(),
                end_of_day.isoformat()
            )

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
    
    async def verify_lifestyle_participant(self, pool_id: int, wallet: str, day: int, pool: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if participant submitted check-in for the specified day.
        
        IMPORTANT: Only check-ins submitted BEFORE the day ends are valid.
        The check-in timestamp must be before challenge_day_end.
        
        Args:
            pool_id: Pool ID
            wallet: Participant wallet address
            day: Day number to check
            pool: Optional pool dictionary (will fetch if not provided)
        
        Returns:
            True if check-in exists, is successful, and was submitted before day ended
        """
        try:
            # Get pool info if not provided (for day boundary calculation)
            if pool is None:
                pools = await execute_query(
                    table="pools",
                    operation="select",
                    filters={"pool_id": pool_id},
                    limit=1
                )
                if not pools:
                    logger.warning(f"Pool {pool_id} not found for lifestyle verification")
                    return False
                pool = pools[0]
            
            start_timestamp = pool.get("scheduled_start_time") or pool.get("start_timestamp")
            if not start_timestamp:
                logger.warning(f"Pool {pool_id} missing start_timestamp")
                return False
            
            # Calculate day boundaries in Eastern Time
            challenge_day_start, challenge_day_end = get_challenge_day_window(start_timestamp, day)
            
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
            
            # Verify check-in was submitted before day ended
            checkin_timestamp = checkin.get("timestamp")
            if checkin_timestamp:
                # Parse timestamp (could be string or datetime)
                if isinstance(checkin_timestamp, str):
                    try:
                        # Parse timestamp and convert to Eastern Time
                        checkin_time_utc = datetime.fromisoformat(checkin_timestamp.replace('Z', '+00:00'))
                        if checkin_time_utc.tzinfo is None:
                            checkin_time_utc = checkin_time_utc.replace(tzinfo=timezone.utc)
                        checkin_time = utc_to_eastern(checkin_time_utc)
                    except (ValueError, AttributeError):
                        logger.warning(f"Could not parse check-in timestamp: {checkin_timestamp}")
                        checkin_time = None
                elif isinstance(checkin_timestamp, datetime):
                    checkin_time = checkin_timestamp
                    if checkin_time.tzinfo is None:
                        # Assume UTC if no timezone, then convert to Eastern
                        checkin_time = utc_to_eastern(checkin_time.replace(tzinfo=timezone.utc))
                    elif checkin_time.tzinfo != EASTERN_TZ:
                        # Convert to Eastern if not already Eastern
                        checkin_time = utc_to_eastern(checkin_time.astimezone(timezone.utc))
                else:
                    checkin_time = None
                
                if checkin_time and checkin_time >= challenge_day_end:
                    # Check-in was submitted after day ended - invalid
                    logger.warning(
                        f"Lifestyle verification: check-in submitted after day ended "
                        f"pool={pool_id}, wallet={wallet}, day={day}, "
                        f"checkin_time={checkin_time.isoformat()}, day_end={challenge_day_end.isoformat()}"
                    )
                    return False
            
            logger.info(
                f"Lifestyle verification: pool={pool_id}, wallet={wallet}, "
                f"day={day}, success={success}, valid_timing={checkin_time < challenge_day_end if checkin_time else 'unknown'}"
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
        
        Failed participants are automatically excluded (status != 'active').
        This ensures we don't waste resources checking participants who have already failed.
        
        Args:
            pool_id: Pool ID
        
        Returns:
            List of participant dictionaries (only active participants)
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
            
            # Log if there are any failed participants (for debugging)
            all_participants = await execute_query(
                table="participants",
                operation="select",
                filters={"pool_id": pool_id}
            )
            failed_count = sum(1 for p in all_participants if p.get("status") != "active")
            if failed_count > 0:
                logger.debug(
                    f"Pool {pool_id}: {failed_count} failed participant(s) excluded from verification "
                    f"(only {len(participants)} active participant(s) will be checked)"
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
                            # Use scheduled_start_time if available, otherwise use start_timestamp
                            scheduled_start = pool.get("scheduled_start_time")
                            start_timestamp = scheduled_start if scheduled_start else pool.get("start_timestamp")

                            if not pool_id or not start_timestamp:
                                logger.warning("Invalid DCA pool data: %s", pool)
                                continue

                            # Check if pool has started
                            current_time = int(time.time())
                            if current_time < start_timestamp:
                                logger.info(
                                    f"DCA pool {pool_id} has not started yet. "
                                    f"Skipping verification until pool starts."
                                )
                                continue

                            current_day = self._calculate_current_day(start_timestamp)
                            if current_day is None:
                                logger.info("DCA pool %s hasn't started yet (scheduled: %s, start: %s)", pool_id, scheduled_start, start_timestamp)
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

                                # Only submit PASSED verifications to on-chain (see lifestyle pools comment)
                                if self.verifier and passed:
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
                                elif not passed:
                                    logger.debug(
                                        f"Skipping on-chain submission for failed DCA verification: "
                                        f"pool={pool_id}, wallet={wallet}, day={current_day}"
                                    )
                                else:
                                    logger.warning(
                                        "Verifier not available, skipping DCA on-chain submission"
                                    )
                        
                        except Exception as e:
                            logger.error(f"Error processing DCA pool {pool.get('pool_id')}: {e}", exc_info=True)
                            continue

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
                            # Use scheduled_start_time if available, otherwise use start_timestamp
                            scheduled_start = pool.get("scheduled_start_time")
                            start_timestamp = scheduled_start if scheduled_start else pool.get("start_timestamp")
                            
                            if not pool_id or not goal_metadata or not start_timestamp:
                                logger.warning(f"Invalid pool data: {pool}")
                                continue
                            
                            # Check if pool has started
                            current_time = int(time.time())
                            if current_time < start_timestamp:
                                logger.info(
                                    f"HODL pool {pool_id} has not started yet. "
                                    f"Skipping verification until pool starts."
                                )
                                continue
                            
                            # Calculate current day (uses 24-hour periods from start)
                            current_day = self._calculate_current_day(start_timestamp)
                            if current_day is None:
                                logger.info(f"HODL pool {pool_id} hasn't started yet (scheduled: {scheduled_start}, start: {start_timestamp})")
                                continue
                            
                            # Extract HODL requirements from goal_metadata
                            token_mint = goal_metadata.get("token_mint")
                            min_balance = goal_metadata.get("min_balance")
                            
                            if not token_mint or min_balance is None:
                                logger.warning(f"Pool {pool_id} missing HODL requirements")
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
                                
                                # Only submit PASSED verifications to on-chain (see lifestyle pools comment)
                                if self.verifier and passed:
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
                                elif not passed:
                                    logger.debug(
                                        f"Skipping on-chain submission for failed HODL verification: "
                                        f"pool={pool_id}, wallet={wallet}, day={current_day}"
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
        Runs daily, with a grace period after each day ends for verification processing.
        
        IMPORTANT: Users must submit their proof BEFORE the day ends. The grace period
        is ONLY for the agent to process and verify submissions that were made during
        the day. Submissions made during the grace period are NOT accepted.
        """
        logger.info("Starting lifestyle pool monitoring (daily checks with grace period)...")
        
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
                            # Use scheduled_start_time if available, otherwise use start_timestamp
                            scheduled_start = pool.get("scheduled_start_time")
                            start_timestamp = scheduled_start if scheduled_start else pool.get("start_timestamp")
                            goal_metadata = pool.get("goal_metadata") or {}
                            
                            if not pool_id or not start_timestamp:
                                logger.warning(f"Invalid pool data: {pool}")
                                continue
                            
                            # Check initial grace period - don't verify until pool grace period has passed
                            current_time = int(time.time())
                            
                            # First check if pool has started
                            if current_time < start_timestamp:
                                start_dt = timestamp_to_eastern(start_timestamp)
                                current_dt = timestamp_to_eastern(current_time)
                                logger.debug(
                                    f"Pool {pool_id} hasn't started yet. "
                                    f"Start: {start_dt.strftime('%Y-%m-%d %H:%M:%S %Z')}, "
                                    f"Current: {current_dt.strftime('%Y-%m-%d %H:%M:%S %Z')}"
                                )
                                continue
                            
                            # Calculate current day (uses 24-hour periods from start)
                            current_day = self._calculate_current_day(start_timestamp)
                            if current_day is None:
                                logger.info(f"Pool {pool_id} hasn't started yet (scheduled: {scheduled_start}, start: {start_timestamp})")
                                continue
                            
                            # Calculate day boundaries and grace period in Eastern Time
                            challenge_day_start, challenge_day_end = get_challenge_day_window(start_timestamp, current_day)
                            current_datetime = get_eastern_now()
                            
                            # Grace period after day ends (for verification processing only)
                            # Users must submit BEFORE day ends - grace period is NOT for new submissions
                            grace_period_hours = getattr(settings, "LIFESTYLE_GRACE_PERIOD_HOURS", 2)
                            grace_period_end = challenge_day_end + timedelta(hours=grace_period_hours)
                            
                            # Determine if we should check this day now
                            day_has_ended = current_datetime >= challenge_day_end
                            grace_period_active = challenge_day_end <= current_datetime < grace_period_end
                            grace_period_passed = current_datetime >= grace_period_end
                            
                            # Only check if:
                            # 1. Day has ended AND we're in the grace period (to catch late submissions), OR
                            # 2. Grace period has passed (final verification for the day)
                            if not day_has_ended:
                                # Day is still active - skip check (will check after day ends)
                                logger.debug(
                                    f"Pool {pool_id} Day {current_day} still active. "
                                    f"Will check after day ends (at {challenge_day_end.isoformat()}) "
                                    f"with {grace_period_hours}h grace period."
                                )
                                continue
                            
                            if grace_period_active:
                                # Day ended but grace period is active - process/verify submissions made during the day
                                # NOTE: Only submissions made BEFORE day_end are valid. Grace period is for processing only.
                                # During grace period, we check more frequently (every 30 minutes)
                                # to ensure we process submissions made right before the deadline
                                hours_into_grace = (current_datetime - challenge_day_end).total_seconds() / 3600
                                minutes_into_grace = (current_datetime - challenge_day_end).total_seconds() / 60
                                
                                # Check every 30 minutes during grace period, or in last 5 minutes
                                if int(minutes_into_grace) % 30 != 0 and minutes_into_grace < (grace_period_hours * 60 - 5):
                                    # Not a 30-minute mark yet, and not near end of grace period
                                    logger.debug(
                                        f"Pool {pool_id} Day {current_day} in grace period "
                                        f"({minutes_into_grace:.0f}min in). "
                                        f"Will check at 30-minute intervals or near grace period end."
                                    )
                                    continue
                                
                                logger.info(
                                    f"Pool {pool_id} Day {current_day} ended, grace period active "
                                    f"({hours_into_grace:.1f}h into {grace_period_hours}h grace period). "
                                    f"Processing verifications for submissions made during the day..."
                                )
                            elif grace_period_passed:
                                # Grace period passed - final verification
                                # Mark failures for participants who didn't submit before challenge_day_end
                                logger.info(
                                    f"Pool {pool_id} Day {current_day} grace period ended. "
                                    f"Performing final verification (only submissions before {challenge_day_end.isoformat()} count)..."
                                )
                            else:
                                # Shouldn't happen, but skip if somehow we're before day end
                                continue
                            
                            # Get all active participants
                            participants = await self.get_pool_participants(pool_id)
                            
                            if not participants:
                                logger.info(f"Pool {pool_id} has no active participants")
                                continue
                            
                            # Determine check type for logging
                            if grace_period_passed:
                                check_type = "FINAL (grace period ended)"
                            elif grace_period_active:
                                check_type = "GRACE PERIOD (checking for late submissions)"
                            else:
                                check_type = "UNKNOWN"
                            
                            logger.info(
                                f"Verifying {len(participants)} participants for pool {pool_id}, day {current_day} ({check_type})"
                            )
                            
                            habit_type = goal_metadata.get("habit_type")

                            # Verify each participant
                            for participant in participants:
                                wallet = participant.get("wallet_address")
                                if not wallet:
                                    continue

                                # For GitHub challenges, check if user is already verified for today
                                # and reset flags for previous days
                                if habit_type == "github_commits":
                                    # Check existing verification for current day
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
                                    
                                    if existing_verifications:
                                        existing = existing_verifications[0]
                                        proof_data = existing.get("proof_data") or {}
                                        # If already verified and flagged as complete for today, skip
                                        if existing.get("passed") and proof_data.get("daily_complete"):
                                            logger.info(
                                                f"Skipping verification for pool={pool_id}, wallet={wallet}, "
                                                f"day={current_day} - already verified and flagged as complete"
                                            )
                                            continue
                                    
                                    # Reset daily_complete flag for previous days (new day started)
                                    # Get all verifications for this participant
                                    all_participant_verifications = await execute_query(
                                        table="verifications",
                                        operation="select",
                                        filters={
                                            "pool_id": pool_id,
                                            "participant_wallet": wallet
                                        }
                                    )
                                    
                                    # Reset daily_complete for previous days
                                    for old_verification in all_participant_verifications:
                                        old_day = old_verification.get("day")
                                        if old_day and old_day < current_day:
                                            old_proof = old_verification.get("proof_data") or {}
                                            if old_proof.get("daily_complete"):
                                                # Remove daily_complete flag for previous days
                                                old_proof.pop("daily_complete", None)
                                                await execute_query(
                                                    table="verifications",
                                                    operation="update",
                                                    filters={
                                                        "pool_id": pool_id,
                                                        "participant_wallet": wallet,
                                                        "day": old_day
                                                    },
                                                    data={"proof_data": old_proof}
                                                )
                                                logger.debug(
                                                    f"Reset daily_complete flag for pool={pool_id}, "
                                                    f"wallet={wallet}, day={old_day} (new day {current_day} started)"
                                                )

                                # Route verification based on lifestyle habit type
                                checked_commit_shas = []
                                if habit_type == "github_commits":
                                    passed, checked_commit_shas = await self.verify_github_commits(
                                        pool, participant, current_day
                                    )
                                elif habit_type == "screen_time":
                                    passed = await self.verify_screentime(
                                        pool_id, wallet, current_day, pool
                                    )
                                else:
                                    # Fallback to generic lifestyle check-in verification
                                    passed = await self.verify_lifestyle_participant(
                                        pool_id, wallet, current_day, pool
                                    )
                                
                                # Handle pending status (None) - only during grace period
                                # If grace period has passed, we should have a definitive result
                                if passed is None:
                                    if grace_period_active:
                                        # Still in grace period - user might submit late, keep checking
                                        logger.debug(
                                            f"Day {current_day} grace period active for pool={pool_id}, wallet={wallet}. "
                                            f"No submission found yet, will check again before grace period ends."
                                        )
                                        continue  # Skip storing verification, still waiting for late submission
                                    else:
                                        # Grace period passed but no result - mark as failed
                                        logger.info(
                                            f"Day {current_day} grace period ended for pool={pool_id}, wallet={wallet}. "
                                            f"No submission found - marking as failed."
                                        )
                                        passed = False  # Grace period ended, no submission = failed
                                
                                # Store verification in database (only if passed is True or False, not None)
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
                                        # Store new verification (only if day ended or user passed)
                                        proof_data = {
                                            "verified_at": get_eastern_now().isoformat(),
                                            "habit_type": habit_type
                                        }
                                        # Store checked commit SHAs for GitHub commits to avoid re-checking
                                        if habit_type == "github_commits" and checked_commit_shas:
                                            # Merge with any previously checked commits
                                            proof_data["checked_commit_shas"] = checked_commit_shas
                                        
                                        # For GitHub challenges: only flag as daily_complete after day ends
                                        # During the day, we allow manual verification which sets daily_complete
                                        # but the agent should only set it after the day ends
                                        if habit_type == "github_commits" and day_has_ended and passed:
                                            proof_data["daily_complete"] = True
                                        
                                        verification_data = {
                                            "pool_id": pool_id,
                                            "participant_wallet": wallet,
                                            "day": current_day,
                                            "passed": passed,
                                            "verification_type": habit_type or "lifestyle_habit",
                                            "proof_data": proof_data
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
                                        existing_passed = existing.get("passed")
                                        existing_proof = existing.get("proof_data") or {}
                                        existing_checked_shas = set(existing_proof.get("checked_commit_shas", []))
                                        
                                        # Merge new checked SHAs with existing ones
                                        if habit_type == "github_commits" and checked_commit_shas:
                                            existing_checked_shas.update(checked_commit_shas)
                                        
                                        update_data = {}
                                        if existing_passed != passed:
                                            update_data["passed"] = passed
                                        
                                        # Update proof_data with merged checked SHAs
                                        if habit_type == "github_commits" and existing_checked_shas:
                                            existing_proof["checked_commit_shas"] = list(existing_checked_shas)
                                            update_data["proof_data"] = existing_proof
                                        
                                        if update_data:
                                            await execute_query(
                                                table="verifications",
                                                operation="update",
                                                filters={
                                                    "pool_id": pool_id,
                                                    "participant_wallet": wallet,
                                                    "day": current_day
                                                },
                                                data=update_data
                                            )
                                            logger.info(
                                                f"Updated verification in database: pool={pool_id}, "
                                                f"wallet={wallet}, day={current_day}, "
                                                f"passed: {existing_passed} -> {passed}"
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
                                    
                                    # Update participant's days_verified and status
                                    update_data = {"days_verified": days_verified}
                                    
                                    # If verification failed, mark participant as failed
                                    if not passed:
                                        update_data["status"] = "failed"
                                        logger.info(
                                            f"Marking participant as failed: pool={pool_id}, "
                                            f"wallet={wallet}, day={current_day}"
                                        )
                                    
                                    await execute_query(
                                        table="participants",
                                        operation="update",
                                        filters={
                                            "pool_id": pool_id,
                                            "wallet_address": wallet
                                        },
                                        data=update_data
                                    )
                                    logger.info(
                                        f"Updated participant: pool={pool_id}, "
                                        f"wallet={wallet}, days_verified={days_verified}, "
                                        f"status={'failed' if not passed else 'active'}"
                                    )
                                    
                                except Exception as db_err:
                                    logger.error(
                                        f"Error updating database after verification: {db_err}",
                                        exc_info=True
                                    )
                                
                                # Submit verification to smart contract (both passed and failed)
                                # This ensures on-chain state matches database state
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
                                            # On-chain submission may have failed if pool not active yet
                                            # Database was already updated, so this is informational
                                            logger.debug(
                                                f"On-chain verification returned None for pool={pool_id}, "
                                                f"wallet={wallet}, day={current_day}. "
                                                f"Database was updated successfully."
                                            )
                                else:
                                    logger.warning("Verifier not available, skipping on-chain submission")
                        
                        except Exception as e:
                            logger.error(f"Error processing pool {pool.get('pool_id')}: {e}", exc_info=True)
                            continue
                
                # Sleep for the configured interval before next check
                # During grace periods, we want to check more frequently, so we use a shorter interval
                # when we're likely in a grace period. Otherwise, use the daily interval.
                base_interval = settings.LIFESTYLE_CHECK_INTERVAL  # Daily (86400 seconds)
                
                # Check if any pools are in grace period - if so, use shorter interval
                grace_period_hours = getattr(settings, "LIFESTYLE_GRACE_PERIOD_HOURS", 2)
                grace_check_interval = min(1800, base_interval // 48)  # 30 minutes or daily/48, whichever is smaller
                
                # Use shorter interval to catch grace periods, but not too short
                sleep_interval = grace_check_interval
                
                await asyncio.sleep(sleep_interval)
            
            except Exception as e:
                logger.error(f"Error in lifestyle monitoring: {e}", exc_info=True)
                await asyncio.sleep(60)  # Wait before retrying

