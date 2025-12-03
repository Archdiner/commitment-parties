"""
Pydantic models for request/response validation.

Provides type-safe data models for API endpoints.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime


# Pool Models
class GoalTypeBase(BaseModel):
    """
    Base goal type model.

    The backend stores goal configuration as a flexible JSON `goal_metadata` object.
    We currently support two main goal families:

    1) Crypto goals (on-chain, trade/balance based)
       - HODL token balance:
         {
             "goal_type": "hodl_token",
             "goal_metadata": {
                 "token_mint": "So111...1112",
                 "min_balance": 1000000000,
                 "check_frequency": "hourly"
             }
         }
       - DCA / trade activity (approximate, per-day trades):
         {
             "goal_type": "DailyDCA",
             "goal_metadata": {
                 "token_mint": "So111...1112",
                 "min_trades_per_day": 1
             }
         }

    2) Lifestyle goals (off-chain habits, extensible)
       - GitHub commits:
         {
             "goal_type": "lifestyle_habit",
             "goal_metadata": {
                 "habit_type": "github_commits",
                 "github_username": "alice",
                 "repo": "alice/commitment-parties",  // optional; if omitted, any repo counts
                 "min_commits_per_day": 1
             }
         }
       - Screen-time (screenshot-based):
         {
             "goal_type": "lifestyle_habit",
             "goal_metadata": {
                 "habit_type": "screen_time",
                 "max_hours": 2,
                 "verification_method": "screenshot_upload"
             }
         }
       - Future lifestyle types can add new `habit_type` values under
         the same `goal_type="lifestyle_habit"` umbrella.
    """
    goal_type: str = Field(
        ...,
        description=(
            "Type of goal "
            "(e.g. 'hodl_token', 'lifestyle_habit', or experimental types like 'DailyDCA')"
        ),
    )
    goal_metadata: Dict[str, Any] = Field(
        ...,
        description="Goal-specific metadata; shape depends on goal_type (see class docstring)",
    )


class PoolCreate(BaseModel):
    """Request model for creating a pool"""
    pool_id: int = Field(..., description="Unique pool ID")
    pool_pubkey: str = Field(..., description="On-chain pool public key", max_length=44)
    creator_wallet: str = Field(..., description="Wallet address of pool creator", max_length=44)
    name: str = Field(..., description="Pool name", max_length=100)
    description: Optional[str] = Field(None, description="Pool description")
    goal_type: str = Field(..., description="Type of goal")
    goal_metadata: Dict[str, Any] = Field(..., description="Goal-specific metadata")
    stake_amount: float = Field(..., gt=0, description="Stake amount in SOL")
    duration_days: int = Field(..., ge=1, le=30, description="Duration in days")
    max_participants: int = Field(..., ge=1, le=100, description="Maximum participants")
    distribution_mode: str = Field(
        "competitive",
        description="Distribution mode: competitive, charity, split",
        max_length=20,
    )
    split_percentage_winners: int = Field(
        100,
        ge=0,
        le=100,
        description="Percentage of losers stakes to winners; remainder to charity",
    )
    charity_address: str = Field(..., description="Charity wallet address", max_length=44)
    start_timestamp: int = Field(..., description="Pool start timestamp")
    end_timestamp: int = Field(..., description="Pool end timestamp")
    is_public: bool = Field(True, description="Whether pool is public")
    recruitment_period_hours: int = Field(
        24,
        ge=0,
        le=168,
        description="Recruitment period in hours before challenge starts (0=immediate, 1=1hour, 24=1day, 168=1week)"
    )
    require_min_participants: bool = Field(
        False,
        description="If true, pool won't start until minimum participants joined"
    )


class PoolConfirmRequest(BaseModel):
    """Request model for confirming pool creation after on-chain transaction"""
    pool_id: int = Field(..., description="Unique pool ID")
    pool_pubkey: str = Field(..., description="On-chain pool public key", max_length=44)
    transaction_signature: str = Field(..., description="Transaction signature from Solana")
    creator_wallet: str = Field(..., description="Wallet address of pool creator", max_length=44)
    name: str = Field(..., description="Pool name", max_length=100)
    description: Optional[str] = Field(None, description="Pool description")
    goal_type: str = Field(..., description="Type of goal")
    goal_metadata: Dict[str, Any] = Field(..., description="Goal-specific metadata")
    stake_amount: float = Field(..., gt=0, description="Stake amount in SOL")
    duration_days: int = Field(..., ge=1, le=30, description="Duration in days")
    max_participants: int = Field(..., ge=1, le=100, description="Maximum participants")
    min_participants: int = Field(1, ge=1, description="Minimum participants")
    distribution_mode: str = Field(
        "competitive",
        description="Distribution mode: competitive, charity, split",
        max_length=20,
    )
    split_percentage_winners: int = Field(
        100,
        ge=0,
        le=100,
        description="Percentage of losers stakes to winners; remainder to charity",
    )
    charity_address: str = Field(..., description="Charity wallet address", max_length=44)
    start_timestamp: int = Field(..., description="Pool start timestamp")
    end_timestamp: int = Field(..., description="Pool end timestamp")
    is_public: bool = Field(True, description="Whether pool is public")
    recruitment_period_hours: int = Field(
        24,
        ge=0,
        le=168,
        description="Recruitment period in hours before challenge starts (0=immediate, 1=1hour, 24=1day, 168=1week)"
    )
    require_min_participants: bool = Field(
        False,
        description="If true, pool won't start until minimum participants joined"
    )


class JoinPoolConfirmRequest(BaseModel):
    """Request model for confirming pool join after on-chain transaction"""
    transaction_signature: str = Field(..., description="Transaction signature from Solana")
    participant_wallet: str = Field(..., description="Participant wallet address", max_length=44)


class PoolResponse(BaseModel):
    """Response model for pool data"""
    pool_id: int
    pool_pubkey: str
    creator_wallet: str
    name: str
    description: Optional[str]
    goal_type: str
    goal_metadata: Dict[str, Any]
    stake_amount: float
    duration_days: int
    max_participants: int
    participant_count: int
    distribution_mode: str
    split_percentage_winners: int
    charity_address: str
    total_staked: float
    yield_earned: float
    yield_last_updated: Optional[datetime]
    final_pool_value: Optional[float]
    status: str
    start_timestamp: int
    end_timestamp: int
    is_public: bool
    created_at: datetime
    updated_at: datetime
    recruitment_period_hours: Optional[int] = None
    scheduled_start_time: Optional[int] = None
    require_min_participants: Optional[bool] = None

    class Config:
        from_attributes = True


# Check-in Models
class CheckInCreate(BaseModel):
    """Request model for creating a check-in"""
    pool_id: int = Field(..., description="Pool ID")
    participant_wallet: str = Field(..., description="Participant wallet address", max_length=44)
    day: int = Field(..., ge=1, description="Day number")
    success: bool = Field(..., description="Whether check-in was successful")
    screenshot_url: Optional[str] = Field(None, description="Optional screenshot URL", max_length=500)


class CheckInResponse(BaseModel):
    """Response model for check-in data"""
    id: int
    pool_id: int
    participant_wallet: str
    day: int
    success: bool
    screenshot_url: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


# User Models
class UserResponse(BaseModel):
    """Response model for user data"""
    wallet_address: str
    username: Optional[str]
    twitter_handle: Optional[str]
    verified_github_username: Optional[str]
    reputation_score: int
    streak_count: int
    total_games: int
    games_completed: int
    total_earned: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# GitHub Verification Models
class GitHubVerifyRequest(BaseModel):
    """Request model for GitHub verification"""
    wallet_address: str = Field(..., description="Wallet address to verify", max_length=44)
    github_username: str = Field(..., description="GitHub username to verify", max_length=100)
    gist_id: str = Field(..., description="GitHub Gist ID containing verification signature", max_length=100)
    signature: str = Field(..., description="Signed message from wallet", max_length=200)


class GitHubVerifyResponse(BaseModel):
    """Response model for GitHub verification"""
    verified: bool
    message: str
    github_username: Optional[str] = None


# Error Models
class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str
    detail: Optional[str] = None

