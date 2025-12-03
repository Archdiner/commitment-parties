"""
Standalone Social Agent

Runs only the Twitter/Blinks posting functionality without requiring
Solana wallet or other agent components.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add src directory to path so imports work correctly
agent_dir = Path(__file__).parent
src_dir = agent_dir / "src"
sys.path.insert(0, str(src_dir))

from social import SocialManager
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def run_social_only():
    """Run only the social media agent"""
    logger.info("Starting Social Media Agent (Twitter/Blinks only)")

    try:
        # Initialize social manager
        social = SocialManager()

        if not social.twitter_enabled:
            logger.error("Twitter not configured! Check your .env file.")
            return

        logger.info("Social agent initialized successfully")
        logger.info("Will check for active pools and post updates every hour")

        # Run the social posting loop
        await social.post_updates()

    except KeyboardInterrupt:
        logger.info("Social agent stopped by user")
    except Exception as e:
        logger.error(f"Social agent error: {e}", exc_info=True)


if __name__ == "__main__":
    logger.info("🤖 Starting Twitter/Blinks Social Agent")
    asyncio.run(run_social_only())
