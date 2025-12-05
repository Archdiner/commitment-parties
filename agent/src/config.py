"""
Configuration management for Commitment Agent.

Loads configuration from environment variables.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
# Look for .env in the agent/ directory (parent of src/)
agent_dir = Path(__file__).parent.parent
env_path = agent_dir / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Agent settings loaded from environment variables"""
    
    # Solana configuration
    SOLANA_RPC_URL: str = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
    # Default to the devnet program ID from Anchor.toml; can be overridden via env.
    PROGRAM_ID: str = os.getenv("PROGRAM_ID", "GSvoKxVHbtAY2mAAU4RM3PVQC3buLSjRm24N7QhAoieH")
    
    # Agent wallet
    AGENT_PRIVATE_KEY: Optional[str] = os.getenv("AGENT_PRIVATE_KEY", None)
    AGENT_KEYPAIR_PATH: Optional[str] = os.getenv("AGENT_KEYPAIR_PATH", None)
    
    # Database (Supabase)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Twitter Account 1 (optional)
    TWITTER_API_KEY: Optional[str] = os.getenv("TWITTER_API_KEY", None)
    TWITTER_API_SECRET: Optional[str] = os.getenv("TWITTER_API_SECRET", None)
    TWITTER_ACCESS_TOKEN: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN", None)
    TWITTER_ACCESS_TOKEN_SECRET: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", None)
    
    # Twitter Account 2 (optional - for increased capacity)
    TWITTER_API_KEY_2: Optional[str] = os.getenv("TWITTER_API_KEY_2", None)
    TWITTER_API_SECRET_2: Optional[str] = os.getenv("TWITTER_API_SECRET_2", None)
    TWITTER_ACCESS_TOKEN_2: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_2", None)
    TWITTER_ACCESS_TOKEN_SECRET_2: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_SECRET_2", None)
    
    # Frontend / Actions URLs
    # Base URL for the web app pool pages (used in tweets for "view details" links)
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "https://commitment-parties.vercel.app")
    # Base URL for Solana Action endpoints (used as Blink targets in tweets)
    ACTION_BASE_URL: str = os.getenv("ACTION_BASE_URL", "https://commitment-backend.onrender.com/solana/actions")
    
    # OpenAI (optional - for AI-powered tweet generation)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    
    # Monitoring intervals (seconds)
    DCA_CHECK_INTERVAL: int = int(os.getenv("DCA_CHECK_INTERVAL", "86400"))  # 24 hours
    HODL_CHECK_INTERVAL: int = int(os.getenv("HODL_CHECK_INTERVAL", "3600"))  # 1 hour
    LIFESTYLE_CHECK_INTERVAL: int = int(os.getenv("LIFESTYLE_CHECK_INTERVAL", "86400"))  # 24 hours (daily)
    LIFESTYLE_GRACE_PERIOD_HOURS: int = int(os.getenv("LIFESTYLE_GRACE_PERIOD_HOURS", "2"))  # 2 hours grace period after day ends
    DISTRIBUTION_CHECK_INTERVAL: int = int(os.getenv("DISTRIBUTION_CHECK_INTERVAL", "3600"))  # 1 hour
    
    # Test pool configuration (optional - for demo/testing)
    TEST_POOL_ID: Optional[int] = None
    test_pool_id_str = os.getenv("TEST_POOL_ID", None)
    if test_pool_id_str:
        TEST_POOL_ID = int(test_pool_id_str)
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


# Global settings instance
settings = Settings()

