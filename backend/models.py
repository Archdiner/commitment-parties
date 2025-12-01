"""
Pydantic models for request/response validation.

Provides type-safe data models for API endpoints.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime


# Pool Models
class GoalTypeBase(BaseModel):
    """Base goal type model"""
    goal_type: str = Field(..., description="Type of goal (DailyDCA, HodlToken, LifestyleHabit)")
    goal_metadata: Dict[str, Any] = Field(..., description="Goal-specific metadata")


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
    reputation_score: int
    streak_count: int
    total_games: int
    games_completed: int
    total_earned: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Error Models
class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str
    detail: Optional[str] = None

