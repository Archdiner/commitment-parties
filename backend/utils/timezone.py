"""
Timezone utilities for the Commitment Parties app.

All date/time operations should use Eastern Standard Time (EST/EDT) as the app's timezone.
"""

from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

# Eastern Time zone (handles EST/EDT automatically)
EASTERN_TZ = ZoneInfo("America/New_York")


def get_eastern_now() -> datetime:
    """
    Get current datetime in Eastern Time (EST/EDT).
    
    Returns:
        Current datetime in Eastern timezone
    """
    return datetime.now(EASTERN_TZ)


def get_eastern_timestamp() -> int:
    """
    Get current Unix timestamp based on Eastern Time.
    
    Returns:
        Unix timestamp (seconds since epoch)
    """
    return int(get_eastern_now().timestamp())


def utc_to_eastern(utc_dt: datetime) -> datetime:
    """
    Convert UTC datetime to Eastern Time.
    
    Args:
        utc_dt: Datetime in UTC (must have timezone info)
    
    Returns:
        Datetime in Eastern timezone
    """
    if utc_dt.tzinfo is None:
        # Assume UTC if no timezone info
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    elif utc_dt.tzinfo != timezone.utc:
        # Convert to UTC first if not already UTC
        utc_dt = utc_dt.astimezone(timezone.utc)
    
    return utc_dt.astimezone(EASTERN_TZ)


def eastern_to_utc(eastern_dt: datetime) -> datetime:
    """
    Convert Eastern Time datetime to UTC.
    
    Args:
        eastern_dt: Datetime in Eastern timezone
    
    Returns:
        Datetime in UTC
    """
    if eastern_dt.tzinfo is None:
        # Assume Eastern if no timezone info
        eastern_dt = eastern_dt.replace(tzinfo=EASTERN_TZ)
    elif eastern_dt.tzinfo != EASTERN_TZ:
        # Convert to Eastern first if not already Eastern
        eastern_dt = eastern_dt.astimezone(EASTERN_TZ)
    
    return eastern_dt.astimezone(timezone.utc)


def timestamp_to_eastern(timestamp: int) -> datetime:
    """
    Convert Unix timestamp to Eastern Time datetime.
    
    Args:
        timestamp: Unix timestamp (seconds since epoch)
    
    Returns:
        Datetime in Eastern timezone
    """
    utc_dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    return utc_to_eastern(utc_dt)


def calculate_current_day(start_timestamp: int, current_timestamp: Optional[int] = None) -> Optional[int]:
    """
    Calculate the current day number based on pool start timestamp.
    Uses 24-hour periods from the exact start time in Eastern Time.
    
    Day 1 = first 24 hours from start
    Day 2 = next 24 hours, etc.
    
    Args:
        start_timestamp: Unix timestamp when pool started
        current_timestamp: Optional current timestamp (defaults to now in Eastern)
    
    Returns:
        Current day number (1-indexed, minimum 1), or None if pool hasn't started yet
    """
    if current_timestamp is None:
        current_timestamp = get_eastern_timestamp()
    
    if current_timestamp < start_timestamp:
        return None  # Pool hasn't started yet
    
    # Calculate days elapsed using 24-hour periods (86400 seconds = 24 hours)
    seconds_elapsed = current_timestamp - start_timestamp
    days_elapsed = seconds_elapsed // 86400
    
    # Ensure day is at least 1 (never 0)
    current_day = max(1, days_elapsed + 1)
    
    return current_day


def get_challenge_day_window(start_timestamp: int, day: int) -> tuple[datetime, datetime]:
    """
    Get the start and end datetime for a specific challenge day in Eastern Time.
    
    Args:
        start_timestamp: Unix timestamp when pool started
        day: Challenge day number (1-indexed)
    
    Returns:
        Tuple of (day_start, day_end) in Eastern timezone
    """
    start_datetime = timestamp_to_eastern(start_timestamp)
    challenge_day_start = start_datetime + timedelta(days=day - 1)  # day-1 because day is 1-indexed
    challenge_day_end = challenge_day_start + timedelta(days=1)
    
    return challenge_day_start, challenge_day_end
