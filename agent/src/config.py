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
    
    # Twitter (optional)
    TWITTER_API_KEY: Optional[str] = os.getenv("TWITTER_API_KEY", None)
    TWITTER_API_SECRET: Optional[str] = os.getenv("TWITTER_API_SECRET", None)
    TWITTER_ACCESS_TOKEN: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN", None)
    TWITTER_ACCESS_TOKEN_SECRET: Optional[str] = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", None)
    
    # OpenAI (optional - for AI-powered tweet generation)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    
    # Monitoring intervals (seconds)
    DCA_CHECK_INTERVAL: int = int(os.getenv("DCA_CHECK_INTERVAL", "86400"))  # 24 hours
    HODL_CHECK_INTERVAL: int = int(os.getenv("HODL_CHECK_INTERVAL", "3600"))  # 1 hour
    LIFESTYLE_CHECK_INTERVAL: int = int(os.getenv("LIFESTYLE_CHECK_INTERVAL", "300"))  # 5 minutes
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

