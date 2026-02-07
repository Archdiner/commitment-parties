"""
Waitlist router for collecting early access signups.

Stores name, email, and survey responses in the waitlist_signups table.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from database import get_supabase_client
import logging
import re

logger = logging.getLogger(__name__)

router = APIRouter()


class WaitlistSignup(BaseModel):
    """Request model for waitlist signup"""
    name: str = Field(..., description="User's name", min_length=1, max_length=200)
    email: str = Field(..., description="User's email address", max_length=200)
    auth_method: str = Field("manual", description="How user signed up: 'manual' or 'google'")
    why_use: Optional[str] = Field(None, description="Why they want to use CommitMint", max_length=2000)
    what_want_to_see: Optional[str] = Field(None, description="What they'd want to see from CommitMint", max_length=2000)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, v):
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()


class WaitlistResponse(BaseModel):
    """Response model for waitlist signup"""
    success: bool
    message: str


@router.post("", response_model=WaitlistResponse)
async def signup_waitlist(data: WaitlistSignup):
    """
    Add a user to the waitlist.
    
    Collects name, email, survey responses, and stores in Supabase.
    Duplicate emails are updated with the latest info.
    """
    try:
        client = get_supabase_client()
        
        signup_data = {
            "name": data.name,
            "email": data.email,
            "auth_method": data.auth_method,
            "why_use": data.why_use,
            "what_want_to_see": data.what_want_to_see,
        }
        
        # Upsert: if email already exists, update the record
        response = client.table("waitlist_signups").upsert(
            signup_data,
            on_conflict="email"
        ).execute()
        
        logger.info(f"Waitlist signup: {data.email} ({data.auth_method})")
        
        return WaitlistResponse(
            success=True,
            message="You're on the list! We'll be in touch soon."
        )
        
    except Exception as e:
        logger.error(f"Waitlist signup error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to save signup. Please try again."
        )
