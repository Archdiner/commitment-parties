#!/usr/bin/env python3
"""
Debug script to test GitHub commit verification logic.
This helps identify why commits might not be detected.
"""

import asyncio
import httpx
from datetime import datetime, timezone, timedelta
import sys
import os

# Add agent src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'agent', 'src'))

async def debug_verification(github_username: str, pool_start_timestamp: int, day: int, repo: str = None):
    """
    Debug the exact verification logic used by the agent.
    
    Args:
        github_username: GitHub username to check
        pool_start_timestamp: Unix timestamp when pool started
        day: Challenge day number (1-indexed)
        repo: Optional repo name (owner/repo) or None for any repo
    """
    
    print(f"\n🔍 Debugging GitHub Commit Verification")
    print(f"   Username: {github_username}")
    print(f"   Pool Start: {datetime.fromtimestamp(pool_start_timestamp, tz=timezone.utc).isoformat()}")
    print(f"   Challenge Day: {day}")
    print(f"   Repo: {repo or 'Any repository'}")
    print()
    
    # Calculate the UTC day window for this challenge day (EXACT agent logic)
    start_datetime = datetime.fromtimestamp(pool_start_timestamp, tz=timezone.utc)
    challenge_day_start = datetime(
        start_datetime.year, start_datetime.month, start_datetime.day, tzinfo=timezone.utc
    ) + timedelta(days=day - 1)  # day-1 because day is 1-indexed
    challenge_day_end = challenge_day_start + timedelta(days=1)
    
    start_of_day = challenge_day_start
    end_of_day = challenge_day_end
    
    print(f"📅 Challenge Day {day} Window (UTC):")
    print(f"   Start: {start_of_day.isoformat()}")
    print(f"   End:   {end_of_day.isoformat()}")
    print(f"   Duration: {(end_of_day - start_of_day).total_seconds() / 3600:.1f} hours")
    print()
    
    current_time = datetime.now(timezone.utc)
    print(f"⏰ Current UTC Time: {current_time.isoformat()}")
    
    if current_time < start_of_day:
        print(f"   ⚠️  Challenge day hasn't started yet!")
    elif current_time >= end_of_day:
        print(f"   ⚠️  Challenge day has already ended!")
    else:
        elapsed = (current_time - start_of_day).total_seconds() / 3600
        remaining = (end_of_day - current_time).total_seconds() / 3600
        print(f"   ✅ Challenge day is active ({elapsed:.1f}h elapsed, {remaining:.1f}h remaining)")
    print()
    
    if repo:
        # Test specific repo
        owner, _, repo_name = repo.partition("/")
        if not owner or not repo_name:
            print(f"❌ Invalid repo format: {repo}")
            return
        
        url = f"https://api.github.com/repos/{owner}/{repo_name}/commits"
        params = {
            "author": github_username,
            "since": start_of_day.isoformat(),
            "until": end_of_day.isoformat(),
        }
        
        print(f"🌐 Querying Repo API: {url}")
        print(f"   Params: {params}")
        print()
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                url,
                params=params,
                headers={
                    "Accept": "application/vnd.github+json",
                },
            )
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return
        
        commits = response.json() or []
        print(f"✅ Found {len(commits)} commits in this repo for challenge day {day}")
        
        if commits:
            print(f"\n📝 Commits found:")
            for i, commit in enumerate(commits[:10], 1):
                commit_info = commit.get("commit", {})
                author_date = commit_info.get("author", {}).get("date", "")
                message = commit_info.get("message", "").strip()
                sha = commit.get("sha", "")[:7]
                print(f"   {i}. [{author_date}] {sha}: {message[:60]}")
        else:
            print(f"\n⚠️  No commits found in this repo for challenge day {day}")
            print(f"   Make sure commits were made between:")
            print(f"   {start_of_day.isoformat()} and {end_of_day.isoformat()}")
        
    else:
        # Test user events API (any repo)
        events_url = f"https://api.github.com/users/{github_username}/events"
        
        print(f"🌐 Querying User Events API: {events_url}")
        print()
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                events_url,
                headers={
                    "Accept": "application/vnd.github+json",
                },
            )
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return
        
        events = response.json() or []
        start_str = start_of_day.isoformat()
        end_str = end_of_day.isoformat()
        
        print(f"📊 Found {len(events)} total events from user")
        print()
        
        commit_count = 0
        push_events_in_range = []
        
        for event in events:
            try:
                if event.get("type") != "PushEvent":
                    continue
                
                created_at_str = event.get("created_at")
                if not created_at_str:
                    continue
                
                # Parse timestamp (same as agent)
                try:
                    event_time = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                    if event_time.tzinfo is None:
                        event_time = event_time.replace(tzinfo=timezone.utc)
                except (ValueError, AttributeError):
                    # Fallback to string comparison
                    if not (start_str <= created_at_str <= end_str):
                        continue
                    event_time = None
                
                # Check if in range (same as agent)
                if event_time:
                    if not (start_of_day <= event_time < end_of_day):
                        continue
                
                payload = event.get("payload") or {}
                commits = payload.get("commits") or []
                
                # Count commits with messages >= 5 chars (same as agent)
                for commit in commits:
                    msg = (commit.get("message") or "").strip()
                    if len(msg) >= 5:
                        commit_count += 1
                        push_events_in_range.append({
                            "time": created_at_str,
                            "repo": event.get("repo", {}).get("name", "unknown"),
                            "message": msg[:60],
                            "sha": commit.get("sha", "")[:7]
                        })
            except Exception as parse_err:
                print(f"⚠️  Error parsing event: {parse_err}")
        
        print(f"✅ Found {commit_count} commits for challenge day {day} (from {len(push_events_in_range)} push events)")
        
        if push_events_in_range:
            print(f"\n📝 Commits in challenge day {day}:")
            for i, commit_info in enumerate(push_events_in_range[:10], 1):
                print(f"   {i}. [{commit_info['time']}] {commit_info['repo']}: {commit_info['sha']} - {commit_info['message']}")
        else:
            print(f"\n⚠️  No commits found for challenge day {day}")
            print(f"   Make sure commits were made between:")
            print(f"   {start_of_day.isoformat()} and {end_of_day.isoformat()}")
            
            # Show recent events for debugging
            print(f"\n📋 Recent PushEvents (for reference):")
            recent_pushes = [e for e in events if e.get("type") == "PushEvent"][:5]
            for i, event in enumerate(recent_pushes, 1):
                created_at = event.get("created_at", "")
                repo_name = event.get("repo", {}).get("name", "unknown")
                commits_in_event = len(event.get("payload", {}).get("commits", []))
                print(f"   {i}. [{created_at}] {repo_name}: {commits_in_event} commit(s)")
    
    print()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python debug_github_verification.py <github_username> <pool_start_timestamp> <day> [repo]")
        print("Example: python debug_github_verification.py archdiner 1733172000 1")
        print("Example: python debug_github_verification.py archdiner 1733172000 1 owner/repo")
        sys.exit(1)
    
    username = sys.argv[1]
    start_ts = int(sys.argv[2])
    day = int(sys.argv[3])
    repo = sys.argv[4] if len(sys.argv) > 4 else None
    
    asyncio.run(debug_verification(username, start_ts, day, repo))

