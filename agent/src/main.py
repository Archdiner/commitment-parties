"""
Commitment Agent - Main Entry Point

Autonomous AI agent that monitors commitment pools 24/7,
verifies goal completion, and executes reward distributions.
"""

import asyncio
import logging
import signal
import sys
from typing import Optional

from config import settings
from solana_client import SolanaClient
from monitor import Monitor
from verify import Verifier
from distribute import Distributor
from social import SocialManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("agent.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


class CommitmentAgent:
    """Main agent class that coordinates all monitoring and verification tasks"""
    
    def __init__(self):
        self.running = False
        self.solana_client: Optional[SolanaClient] = None
        self.monitor: Optional[Monitor] = None
        self.verifier: Optional[Verifier] = None
        self.distributor: Optional[Distributor] = None
        self.social: Optional[SocialManager] = None
    
    async def initialize(self):
        """Initialize all agent components"""
        logger.info("Initializing Commitment Agent...")
        
        try:
            # Initialize Solana client
            self.solana_client = SolanaClient(
                rpc_url=settings.SOLANA_RPC_URL,
                program_id=settings.PROGRAM_ID,
            )
            await self.solana_client.initialize()
            
            # Initialize monitoring components
            self.monitor = Monitor(self.solana_client)
            self.verifier = Verifier(self.solana_client)
            self.distributor = Distributor(self.solana_client)
            self.social = SocialManager()
            
            logger.info("Agent initialized successfully")
        
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}", exc_info=True)
            raise
    
    async def start(self):
        """Start the agent's main monitoring loop"""
        logger.info("Starting Commitment Agent...")
        self.running = True
        
        try:
            # Start monitoring tasks
            tasks = [
                self.monitor.monitor_dca_pools(),
                self.monitor.monitor_hodl_pools(),
                self.monitor.monitor_lifestyle_pools(),
                self.distributor.check_and_distribute(),
                self.social.post_updates(),
            ]
            
            # Run all tasks concurrently
            await asyncio.gather(*tasks)
        
        except Exception as e:
            logger.error(f"Agent error: {e}", exc_info=True)
            raise
    
    async def stop(self):
        """Gracefully stop the agent"""
        logger.info("Stopping Commitment Agent...")
        self.running = False
        
        # Cleanup resources
        if self.solana_client:
            await self.solana_client.close()
        
        logger.info("Agent stopped")


# Global agent instance
agent: Optional[CommitmentAgent] = None


def signal_handler(sig, frame):
    """Handle shutdown signals"""
    logger.info("Received shutdown signal")
    if agent:
        asyncio.create_task(agent.stop())
    sys.exit(0)


async def main():
    """Main entry point"""
    global agent
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Create and initialize agent
        agent = CommitmentAgent()
        await agent.initialize()
        
        # Start agent
        await agent.start()
    
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        if agent:
            await agent.stop()


if __name__ == "__main__":
    asyncio.run(main())

