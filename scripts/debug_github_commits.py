#!/usr/bin/env python3
"""
Debug script to check GitHub commit detection issues.

Usage:
    python scripts/debug_github_commits.py <github_username> [pool_id] [day]
    
If pool_id and day are provided, it will check commits for that specific challenge day.
Otherwise, it checks commits for today.
"""

import sys
import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

EASTERN_TZ = ZoneInfo("America/New_York")


def get_eastern_now():
    return datetime.now(EASTERN_TZ)


def utc_to_eastern(utc_dt):
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(EASTERN_TZ)


async def check_github_commits(github_username: str, start_time: datetime, end_time: datetime, repo: str = None):
    """Check GitHub commits using both Events API and Commits API"""
    print(f"\n🔍 Checking GitHub commits for @{github_username}")
    print(f"   Time window: {start_time.isoformat()} to {end_time.isoformat()} (Eastern Time)")
    if repo:
        print(f"   Repository filter: {repo}")
    print()
    
    commits_found = []
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Method 1: Commits API (if repo specified)
        if repo and "/" in repo:
            owner, repo_name = repo.split("/", 1)
            # Convert to UTC for GitHub API
            start_utc = start_time.astimezone(timezone.utc)
            end_utc = end_time.astimezone(timezone.utc)
            
            print(f"📦 Method 1: Commits API for {repo}")
            commits_url = f"https://api.github.com/repos/{owner}/{repo_name}/commits"
            try:
                response = await client.get(
                    commits_url,
                    params={
                        "author": github_username,
                        "since": start_utc.isoformat(),
                        "until": end_utc.isoformat(),
                    },
                    headers={"Accept": "application/vnd.github+json"},
                )
                
                if response.status_code == 200:
                    commits = response.json() or []
                    print(f"   ✅ Found {len(commits)} commits")
                    for commit in commits[:5]:
                        commit_info = commit.get("commit", {})
                        author_info = commit_info.get("author", {})
                        date_str = author_info.get("date", "")
                        message = commit_info.get("message", "").strip()[:60]
                        sha = commit.get("sha", "")[:7]
                        print(f"      - [{date_str}] {sha}: {message}")
                        commits_found.append({
                            "sha": commit.get("sha"),
                            "message": message,
                            "date": date_str,
                            "repo": repo
                        })
                else:
                    print(f"   ❌ API Error: {response.status_code} - {response.text[:200]}")
            except Exception as e:
                print(f"   ❌ Error: {e}")
        
        # Method 2: Events API (works for all repos)
        print(f"\n📦 Method 2: Events API (all repositories)")
        events_url = f"https://api.github.com/users/{github_username}/events"
        try:
            response = await client.get(
                events_url,
                headers={"Accept": "application/vnd.github+json"},
            )
            
            if response.status_code == 200:
                events = response.json() or []
                print(f"   ✅ Retrieved {len(events)} events (last 300)")
                
                push_events_in_range = []
                push_events_out_of_range = []
                
                for event in events:
                    if event.get("type") != "PushEvent":
                        continue
                    
                    created_at_str = event.get("created_at", "")
                    if not created_at_str:
                        continue
                    
                    try:
                        event_time_utc = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                        if event_time_utc.tzinfo is None:
                            event_time_utc = event_time_utc.replace(tzinfo=timezone.utc)
                        event_time_eastern = utc_to_eastern(event_time_utc)
                        
                        repo_name = event.get("repo", {}).get("name", "unknown")
                        payload = event.get("payload", {})
                        commits_in_event = payload.get("commits", [])
                        
                        if start_time <= event_time_eastern < end_time:
                            push_events_in_range.append({
                                "time": event_time_eastern.isoformat(),
                                "repo": repo_name,
                                "commits": len(commits_in_event)
                            })
                            for commit in commits_in_event:
                                msg = (commit.get("message", "") or "").strip()
                                sha = commit.get("sha", "")
                                if len(msg) >= 5 and sha:
                                    commits_found.append({
                                        "sha": sha,
                                        "message": msg[:60],
                                        "date": event_time_eastern.isoformat(),
                                        "repo": repo_name
                                    })
                        else:
                            push_events_out_of_range.append({
                                "time": event_time_eastern.isoformat(),
                                "repo": repo_name,
                                "commits": len(commits_in_event)
                            })
                    except Exception as e:
                        print(f"   ⚠️  Error parsing event: {e}")
                
                print(f"   📊 Push events in range: {len(push_events_in_range)}")
                print(f"   📊 Push events out of range: {len(push_events_out_of_range)}")
                
                if push_events_in_range:
                    print(f"\n   ✅ Commits found in time window:")
                    for event in push_events_in_range[:5]:
                        print(f"      - [{event['time']}] {event['repo']}: {event['commits']} commits")
                
                if push_events_out_of_range:
                    print(f"\n   ⚠️  Recent commits OUTSIDE time window (for debugging):")
                    for event in push_events_out_of_range[:5]:
                        print(f"      - [{event['time']}] {event['repo']}: {event['commits']} commits")
            else:
                print(f"   ❌ API Error: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Summary
    print(f"\n📊 Summary:")
    print(f"   Total commits found in time window: {len(commits_found)}")
    if commits_found:
        print(f"\n   Commits:")
        for i, commit in enumerate(commits_found[:10], 1):
            print(f"      {i}. [{commit['date']}] {commit['repo']}: {commit['message']}")
    else:
        print(f"\n   ⚠️  No commits found in the specified time window!")
        print(f"   Make sure:")
        print(f"   1. Commits were made between {start_time.isoformat()} and {end_time.isoformat()} (Eastern Time)")
        print(f"   2. Commits were pushed (not just local)")
        print(f"   3. GitHub username is correct: @{github_username}")
        if repo:
            print(f"   4. Repository matches: {repo}")
        print(f"   5. Very recent commits (within last 1-2 minutes) may not appear in API yet")


async def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/debug_github_commits.py <github_username> [repo] [pool_start_timestamp] [day]")
        print("\nExample:")
        print("  python scripts/debug_github_commits.py archdiner")
        print("  python scripts/debug_github_commits.py archdiner Archdiner/commitment-parties")
        print("  python scripts/debug_github_commits.py archdiner Archdiner/commitment-parties 1234567890 1")
        sys.exit(1)
    
    github_username = sys.argv[1]
    repo = sys.argv[2] if len(sys.argv) > 2 else None
    
    # If pool_start_timestamp and day provided, calculate challenge day window
    if len(sys.argv) > 4:
        pool_start_timestamp = int(sys.argv[3])
        day = int(sys.argv[4])
        
        # Calculate challenge day window (same logic as backend)
        start_datetime = datetime.fromtimestamp(pool_start_timestamp, tz=EASTERN_TZ)
        challenge_day_start = start_datetime + timedelta(days=day - 1)
        challenge_day_end = challenge_day_start + timedelta(days=1)
        
        start_time = challenge_day_start
        end_time = challenge_day_end
        
        print(f"🎯 Checking commits for Challenge Day {day}")
        print(f"   Pool started: {start_datetime.isoformat()} (Eastern Time)")
    else:
        # Check commits for today (last 24 hours)
        end_time = get_eastern_now()
        start_time = end_time - timedelta(days=1)
        
        print(f"🎯 Checking commits for the last 24 hours")
    
    await check_github_commits(github_username, start_time, end_time, repo)


if __name__ == "__main__":
    asyncio.run(main())
