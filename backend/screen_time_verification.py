"""
Standalone screen time verification logic for backend.

This module provides screen time screenshot verification without requiring agent imports.
Used by the backend API when agent modules are not available.
Uses OpenAI Vision API to analyze screenshots and verify date and screen time limits.
"""

import logging
import base64
import json
import re
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
from openai import AsyncOpenAI
from config import settings
from utils.timezone import (
    get_eastern_now, timestamp_to_eastern, get_challenge_day_window, utc_to_eastern
)

logger = logging.getLogger(__name__)

# Initialize OpenAI client if available
_openai_client: Optional[AsyncOpenAI] = None
if settings.OPENAI_API_KEY:
    _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    logger.info("OpenAI client initialized for screen time verification")
else:
    logger.warning("OpenAI API key not configured - screen time verification will not work")


async def verify_screen_time_screenshot(
    image_data: bytes,
    image_content_type: str,
    pool: Dict[str, Any],
    participant: Dict[str, Any],
    day: int
) -> Tuple[Optional[bool], Dict[str, Any]]:
    """
    Verify a screen time screenshot using OpenAI Vision API.
    
    This function:
    1. Validates the screenshot is an image
    2. Uses OpenAI vision API to analyze the screenshot
    3. Checks if date matches today
    4. Checks if screen time is below max_hours limit
    5. Returns verification result with details
    
    Args:
        image_data: Raw image bytes
        image_content_type: MIME type of the image (e.g., "image/png")
        pool: Pool dictionary with goal_metadata containing max_hours
        participant: Participant dictionary
        day: Challenge day number (1-indexed)
    
    Returns:
        Tuple of (passed, verification_details):
        - passed: True if verification passed, False if failed, None if error
        - verification_details: Dictionary with date_matches, screen_time_hours, 
          screen_time_below_limit, reason, etc.
    """
    try:
        if not _openai_client:
            logger.error("OpenAI client not available for screen time verification")
            return None, {
                "error": "OpenAI API key not configured",
                "reason": "Screen time verification requires OpenAI API key"
            }
        
        goal_metadata = pool.get("goal_metadata") or {}
        habit_type = goal_metadata.get("habit_type")
        max_hours = goal_metadata.get("max_hours")
        
        # Validate this is a screen_time challenge
        if habit_type != "screen_time":
            logger.warning(f"verify_screen_time_screenshot called for non-screen_time pool {pool.get('pool_id')}")
            return False, {
                "error": "Invalid challenge type",
                "reason": "This verification is only for screen time challenges"
            }
        
        # Validate max_hours
        if not max_hours or not isinstance(max_hours, (int, float)) or max_hours < 0 or max_hours > 12:
            logger.warning(f"Invalid max_hours in pool {pool.get('pool_id')}: {max_hours}")
            return False, {
                "error": "Invalid max_hours configuration",
                "reason": f"max_hours must be between 0 and 12, got {max_hours}"
            }
        
        # Validate image content type
        if not image_content_type or not image_content_type.startswith('image/'):
            logger.warning(f"Invalid image content type: {image_content_type}")
            return False, {
                "error": "Invalid file type",
                "reason": "File must be an image (PNG, JPEG, etc.)"
            }
        
        # Encode image to base64 for OpenAI API
        try:
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            image_data_url = f"data:{image_content_type};base64,{image_base64}"
        except Exception as e:
            logger.error(f"Error encoding image: {e}")
            return None, {
                "error": "Image encoding failed",
                "reason": str(e)
            }
        
        # Get today's date in a format the AI can recognize
        today = get_eastern_now()
        today_str = today.strftime("%Y-%m-%d")
        today_readable = today.strftime("%B %d, %Y")
        
        # Create prompt for verification
        prompt = f"""Analyze this mobile screen time screenshot. You need to verify two things:

1. DATE VERIFICATION: Check if the date visible in the screenshot matches today's date: {today_readable} ({today_str}). The date must be clearly visible and match exactly.

2. SCREEN TIME VERIFICATION: Check if the total screen time shown is LESS than {max_hours} hours. Look for the total screen time number (usually displayed prominently).

Respond with ONLY a JSON object in this exact format:
{{
  "date_matches": true/false,
  "screen_time_hours": <number>,
  "screen_time_below_limit": true/false,
  "reason": "brief explanation"
}}

If the date is not visible or unclear, set date_matches to false.
If screen time is not visible or unclear, set screen_time_below_limit to false."""
        
        logger.info(
            f"Verifying screen time screenshot for pool={pool.get('pool_id')}, "
            f"wallet={participant.get('wallet_address')}, day={day}, "
            f"max_hours={max_hours}, today={today_readable}"
        )
        
        # Call OpenAI Vision API
        try:
            response = await _openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_data_url
                                }
                            }
                        ]
                    }
                ],
                max_tokens=200,
                temperature=0.1
            )
        except Exception as e:
            logger.error(f"OpenAI API error during screen time verification: {e}")
            return None, {
                "error": "OpenAI API error",
                "reason": str(e)
            }
        
        # Parse response
        response_text = response.choices[0].message.content.strip()
        
        # Try to extract JSON from response (might be wrapped in markdown)
        # Remove markdown code blocks if present
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        response_text = response_text.strip()
        
        try:
            verification_result = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON object from text
            json_match = re.search(r'\{[^}]+\}', response_text)
            if json_match:
                try:
                    verification_result = json.loads(json_match.group())
                except json.JSONDecodeError:
                    logger.error(f"Could not parse AI response as JSON: {response_text}")
                    return None, {
                        "error": "Failed to parse AI response",
                        "reason": "AI response was not valid JSON",
                        "raw_response": response_text[:200]  # First 200 chars for debugging
                    }
            else:
                logger.error(f"Could not find JSON in AI response: {response_text}")
                return None, {
                    "error": "Failed to parse AI response",
                    "reason": "No JSON object found in AI response",
                    "raw_response": response_text[:200]
                }
        
        # Extract verification results
        date_matches = verification_result.get("date_matches", False)
        screen_time_hours = verification_result.get("screen_time_hours", 0)
        screen_time_below_limit = verification_result.get("screen_time_below_limit", False)
        reason = verification_result.get("reason", "")
        
        # Determine if verification passed
        passed = date_matches and screen_time_below_limit
        
        verification_details = {
            "date_matches": date_matches,
            "screen_time_hours": screen_time_hours,
            "screen_time_below_limit": screen_time_below_limit,
            "max_hours_allowed": max_hours,
            "reason": reason,
            "verified_at": get_eastern_now().isoformat(),
            "today_date": today_readable,
            "today_date_iso": today_str
        }
        
        if passed:
            logger.info(
                f"✓ Screen time verification PASSED: pool={pool.get('pool_id')}, "
                f"wallet={participant.get('wallet_address')}, day={day}, "
                f"screen_time={screen_time_hours}h (limit: {max_hours}h)"
            )
        else:
            logger.warning(
                f"✗ Screen time verification FAILED: pool={pool.get('pool_id')}, "
                f"wallet={participant.get('wallet_address')}, day={day}, "
                f"date_matches={date_matches}, screen_time={screen_time_hours}h, "
                f"below_limit={screen_time_below_limit}, reason={reason}"
            )
        
        return passed, verification_details
        
    except Exception as e:
        logger.error(f"Error verifying screen time screenshot: {e}", exc_info=True)
        return None, {
            "error": "Verification error",
            "reason": str(e)
        }


async def verify_screen_time_checkin(
    pool: Dict[str, Any],
    participant: Dict[str, Any],
    day: int
) -> Tuple[Optional[bool], Dict[str, Any]]:
    """
    Verify that a participant has a successful screen-time check-in for the specified day.
    
    This function checks the checkins table for a successful submission.
    Used by the agent for automatic verification.
    
    IMPORTANT: Only check-ins submitted BEFORE the day ends are valid.
    The check-in timestamp must be before challenge_day_end.
    
    Args:
        pool: Pool dictionary
        participant: Participant dictionary
        day: Challenge day number (1-indexed)
    
    Returns:
        Tuple of (passed, details):
        - passed: True if check-in found and valid, False if not found or invalid, None if error
        - details: Dictionary with check-in information
    """
    try:
        from database import execute_query
        
        pool_id = pool.get("pool_id")
        participant_wallet = participant.get("wallet_address")
        
        if not pool_id or not participant_wallet:
            logger.warning("Missing pool_id or wallet_address for screen time check-in verification")
            return False, {"error": "Missing required fields"}
        
        start_timestamp = pool.get("scheduled_start_time") or pool.get("start_timestamp")
        if not start_timestamp:
            logger.warning(f"Pool {pool_id} missing start_timestamp")
            return False, {"error": "Pool missing start timestamp"}
        
        # Calculate day boundaries in Eastern Time
        challenge_day_start, challenge_day_end = get_challenge_day_window(start_timestamp, day)
        
        # Get check-ins for this day
        checkins = await execute_query(
            table="checkins",
            operation="select",
            filters={
                "pool_id": pool_id,
                "participant_wallet": participant_wallet,
                "day": day,
                "success": True,
            },
            limit=1,
        )
        
        if not checkins:
            logger.info(
                f"Screen-time verification: no successful check-in found for "
                f"pool={pool_id}, wallet={participant_wallet}, day={day}"
            )
            return False, {
                "reason": "No successful check-in found for this day"
            }
        
        checkin = checkins[0]
        screenshot_url = (checkin.get("screenshot_url") or "").strip()
        
        # Verify check-in was submitted before day ended
        checkin_timestamp = checkin.get("timestamp")
        valid_timing = True
        
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
                    checkin_time = checkin_time.replace(tzinfo=timezone.utc)
            else:
                checkin_time = None
            
            if checkin_time and checkin_time >= challenge_day_end:
                # Check-in was submitted after day ended - invalid
                logger.warning(
                    f"Screen-time verification: check-in submitted after day ended "
                    f"pool={pool_id}, wallet={participant_wallet}, day={day}, "
                    f"checkin_time={checkin_time.isoformat()}, day_end={challenge_day_end.isoformat()}"
                )
                valid_timing = False
        
        passed = bool(screenshot_url) and valid_timing
        
        logger.info(
            f"Screen-time verification: pool={pool_id}, wallet={participant_wallet}, day={day}, "
            f"success={checkin.get('success')}, screenshot_url_present={bool(screenshot_url)}, "
            f"valid_timing={valid_timing}"
        )
        
        return passed, {
            "checkin_found": True,
            "screenshot_url_present": bool(screenshot_url),
            "valid_timing": valid_timing,
            "checkin_timestamp": checkin_timestamp.isoformat() if isinstance(checkin_timestamp, datetime) else str(checkin_timestamp),
            "day_end": challenge_day_end.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error verifying screen-time check-in: {e}", exc_info=True)
        return None, {
            "error": "Verification error",
            "reason": str(e)
        }
