"""
Configuration management for Commitment Agent.

Loads configuration from environment variables.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Agent settings loaded from environment variables"""
    
    # Solana configuration
    SOLANA_RPC_URL: str = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
    PROGRAM_ID: str = os.getenv("PROGRAM_ID", "")
    
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
    
    # Monitoring intervals (seconds)
    DCA_CHECK_INTERVAL: int = int(os.getenv("DCA_CHECK_INTERVAL", "86400"))  # 24 hours
    HODL_CHECK_INTERVAL: int = int(os.getenv("HODL_CHECK_INTERVAL", "3600"))  # 1 hour
    LIFESTYLE_CHECK_INTERVAL: int = int(os.getenv("LIFESTYLE_CHECK_INTERVAL", "300"))  # 5 minutes
    DISTRIBUTION_CHECK_INTERVAL: int = int(os.getenv("DISTRIBUTION_CHECK_INTERVAL", "3600"))  # 1 hour
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


# Global settings instance
settings = Settings()

