"""
Standalone GitHub verification logic for backend.

This module provides GitHub commit verification without requiring agent imports.
Used by the backend API when agent modules are not available.
Includes code quality checking using OpenAI to detect nonsensical commits.
"""

import logging
import httpx
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timezone, timedelta
from database import execute_query
from config import settings
from openai import AsyncOpenAI
from utils.timezone import (
    get_eastern_now, timestamp_to_eastern, get_challenge_day_window
)

logger = logging.getLogger(__name__)

# Initialize OpenAI client if available
_openai_client: Optional[AsyncOpenAI] = None
if settings.OPENAI_API_KEY:
    _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    logger.info("OpenAI client initialized for code quality checking")
else:
    logger.info("OpenAI API key not configured - code quality checking will be skipped")


def _estimate_token_count(text: str) -> int:
    """
    Rough estimate of token count for text.
    Uses a simple heuristic: ~4 characters per token.
    This is conservative and will err on the side of caution.
    """
    return len(text) // 4


async def _fetch_commit_code(repo_full_name: str, sha: str) -> Optional[str]:
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


async def _check_if_nonsensical_commit(code: str, commit_message: str) -> Optional[bool]:
    """
    Check if a commit is nonsensical/useless (just to fulfill commit requirement).
    Only flags obviously bad commits, not genuine work.
    
    Args:
        code: The code diff/patch to verify
        commit_message: The commit message
    
    Returns:
        True if nonsensical/useless, False if genuine, None if check can't be performed
    """
    if not _openai_client:
        logger.debug("OpenAI client not available, skipping code quality check")
        return None
    
    try:
        # Estimate token count (conservative estimate)
        # Reserve space for prompt (~500 tokens) and response (~100 tokens)
        # Use ~80k tokens as safe limit (well below 128k context window)
        estimated_tokens = _estimate_token_count(code)
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

        response = await _openai_client.chat.completions.create(
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


async def verify_github_commits(
    pool: Dict[str, Any],
    participant: Dict[str, Any],
    day: int
) -> Tuple[Optional[bool], List[str]]:
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
            return False, []

        # Get participant's wallet address
        participant_wallet = participant.get("wallet_address")
        if not participant_wallet:
            logger.warning(
                "Participant missing wallet_address for pool %s",
                pool.get("pool_id")
            )
            return False, []

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
            return False, []

        github_username = users[0].get("verified_github_username")
        min_commits_per_day = int(goal_metadata.get("min_commits_per_day", 1))
        min_lines_per_commit = int(goal_metadata.get("min_lines_per_commit", 0))  # Default 0 = no minimum
        start_timestamp = pool.get("start_timestamp")

        if not start_timestamp:
            logger.warning("Pool %s missing start_timestamp", pool.get("pool_id"))
            return False, []

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
            return False, []
        
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
        async with httpx.AsyncClient(timeout=30) as client:
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
                return False, []

            events = response.json() or []
            start_str = start_of_day.isoformat()
            end_str = end_of_day.isoformat()

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
                            from utils.timezone import utc_to_eastern
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
                                "message": msg
                            })
                    
                    push_events_in_range.append({
                        "time": created_at_str,
                        "repo": repo_name,
                        "commits": len(commits)
                    })
                    
                except Exception as e:
                    logger.warning(f"Error processing GitHub event: {e}")
                    continue
            
            # Filter by repo if specified
            repo_filter = goal_metadata.get("repo")
            if repo_filter:
                # Filter commits to only those in the specified repo
                filtered_commits = [
                    c for c in candidate_commits
                    if c["repo"].lower() == repo_filter.lower()
                ]
                candidate_commits = filtered_commits
                logger.info(
                    f"Filtered to repo '{repo_filter}': {len(candidate_commits)} commits found"
                )
            
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
                    checked_commit_shas.append(sha)
                    continue
                
                try:
                    repo_full_name = commit_info["repo"]
                    sha = commit_info["sha"]
                    message = commit_info["message"]
                    
                    # Check minimum lines if required
                    if min_lines_per_commit > 0:
                        # Fetch commit details to check lines changed
                        try:
                            # Parse repo name (format: "owner/repo")
                            if "/" in repo_full_name:
                                owner, repo_name = repo_full_name.split("/", 1)
                                commit_url = f"https://api.github.com/repos/{owner}/{repo_name}/commits/{sha}"
                                
                                commit_response = await client.get(
                                    commit_url,
                                    headers={"Accept": "application/vnd.github+json"},
                                )
                                
                                if commit_response.status_code == 200:
                                    commit_data = commit_response.json()
                                    stats = commit_data.get("stats", {})
                                    total_lines = stats.get("total", 0)
                                    
                                    if total_lines < min_lines_per_commit:
                                        logger.debug(
                                            f"Commit {sha[:7]} in {repo_full_name} has {total_lines} lines "
                                            f"(minimum required: {min_lines_per_commit}), skipping"
                                        )
                                        checked_commit_shas.append(sha)  # Track as checked
                                        continue
                                else:
                                    logger.warning(
                                        f"Failed to fetch commit {sha} from {repo_full_name}: status {commit_response.status_code}"
                                    )
                                    # If we can't verify lines, count it anyway (fail open)
                        except Exception as e:
                            logger.warning(f"Error fetching commit details for {sha}: {e}")
                            # Fail open - count it if we can't verify
                    
                    # Fetch commit code for quality checking
                    code = await _fetch_commit_code(repo_full_name, sha)
                    
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
                        checked_commit_shas.append(sha)
                        continue
                    
                    # Verify code quality with LLM (only to detect nonsensical/useless commits)
                    is_nonsensical = await _check_if_nonsensical_commit(code, message)
                    
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
                    valid_commits.append({
                        "repo": commit_info.get("repo", "unknown"),
                        "sha": commit_info.get("sha", "unknown")[:7],
                        "message": commit_info.get("message", "")[:60],
                        "quality_score": None,
                        "reason": "error_processing"
                    })
                    checked_commit_shas.append(commit_info.get("sha", ""))
            
            # Final commit count is from valid_commits
            commit_count = len(valid_commits)
            
            logger.info(
                f"GitHub verification result for pool={pool.get('pool_id')}, "
                f"wallet={participant_wallet}, day={day}: "
                f"{commit_count} commits found (min required: {min_commits_per_day}), "
                f"day_ended={day_has_ended}, time_remaining={time_remaining:.1f}h"
            )
            
            # Determine result based on commit count and day status
            if commit_count >= min_commits_per_day:
                # User has sufficient commits
                logger.info(
                    f"✓ Verification PASSED: {commit_count} commits >= {min_commits_per_day} required "
                    f"(pool={pool.get('pool_id')}, wallet={participant_wallet}, day={day})"
                )
                return True, checked_commit_shas
            elif day_has_ended:
                # Day has ended and user didn't meet requirement
                logger.warning(
                    f"✗ Verification FAILED: Only {commit_count} commits found, "
                    f"need {min_commits_per_day} (pool={pool.get('pool_id')}, "
                    f"wallet={participant_wallet}, day={day}, day_ended=True)"
                )
                return False, checked_commit_shas
            else:
                # Day is still active, no commits yet (pending)
                logger.info(
                    f"⏳ Verification PENDING: Only {commit_count} commits found, "
                    f"need {min_commits_per_day}, but day is still active "
                    f"(pool={pool.get('pool_id')}, wallet={participant_wallet}, "
                    f"day={day}, time_remaining={time_remaining:.1f}h)"
                )
                return None, checked_commit_shas
                
    except Exception as e:
        logger.error(f"Error verifying GitHub commits: {e}", exc_info=True)
        return False, []
