#!/usr/bin/env python3
"""
Test script to check if GitHub commits are being detected correctly.
Run this to debug why commits aren't being detected.
"""

import asyncio
import httpx
from datetime import datetime, timezone, timedelta
import sys
import os

# Add agent src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'agent', 'src'))

async def test_github_commits(github_username: str, repo: str = None):
    """Test GitHub commit detection"""
    
    print(f"\n🔍 Testing GitHub Commit Detection")
    print(f"   Username: {github_username}")
    print(f"   Repo: {repo or 'Any repository'}")
    print()
    
    # Compute current UTC day window (same as agent)
    now_utc = datetime.now(timezone.utc)
    start_of_day = datetime(
        now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc
    )
    end_of_day = start_of_day + timedelta(days=1)
    
    print(f"📅 Date Range (UTC):")
    print(f"   Start: {start_of_day.isoformat()}")
    print(f"   End:   {end_of_day.isoformat()}")
    print(f"   Current UTC: {now_utc.isoformat()}")
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
        
        print(f"🌐 Querying: {url}")
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
        print(f"✅ Found {len(commits)} commits today")
        
        if commits:
            print(f"\n📝 Recent commits:")
            for i, commit in enumerate(commits[:5], 1):
                commit_date = commit.get("commit", {}).get("author", {}).get("date", "")
                message = commit.get("commit", {}).get("message", "").strip()[:60]
                print(f"   {i}. [{commit_date}] {message}")
        
    else:
        # Test user events API
        events_url = f"https://api.github.com/users/{github_username}/events"
        
        print(f"🌐 Querying: {events_url}")
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
        
        print(f"📊 Found {len(events)} total events")
        print()
        
        commit_count = 0
        push_events_today = []
        
        for event in events:
            try:
                if event.get("type") != "PushEvent":
                    continue
                
                created_at = event.get("created_at")
                if not created_at:
                    continue
                
                # Check if within today's range
                if start_str <= created_at <= end_str:
                    payload = event.get("payload") or {}
                    commits = payload.get("commits") or []
                    
                    for commit in commits:
                        msg = (commit.get("message") or "").strip()
                        if len(msg) >= 5:
                            commit_count += 1
                            push_events_today.append({
                                "time": created_at,
                                "repo": event.get("repo", {}).get("name", "unknown"),
                                "message": msg[:60]
                            })
            except Exception as parse_err:
                print(f"⚠️  Error parsing event: {parse_err}")
        
        print(f"✅ Found {commit_count} commits today (from {len(push_events_today)} push events)")
        
        if push_events_today:
            print(f"\n📝 Commits today:")
            for i, commit_info in enumerate(push_events_today[:10], 1):
                print(f"   {i}. [{commit_info['time']}] {commit_info['repo']}: {commit_info['message']}")
        else:
            print(f"\n⚠️  No commits found for today (UTC)")
            print(f"   Make sure commits were made after {start_str}")
    
    print()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_github_commits.py <github_username> [repo]")
        print("Example: python test_github_commits.py archdiner")
        print("Example: python test_github_commits.py archdiner owner/repo")
        sys.exit(1)
    
    username = sys.argv[1]
    repo = sys.argv[2] if len(sys.argv) > 2 else None
    
    asyncio.run(test_github_commits(username, repo))

