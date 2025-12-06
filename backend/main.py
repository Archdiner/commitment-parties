"""
Commitment Agent Backend API

FastAPI application for managing commitment pools, check-ins, and user data.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from routers import pools, checkins, users, invites, ai_onchain, solana_actions
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting Commitment Agent Backend API")
    yield
    logger.info("Shutting down Commitment Agent Backend API")


# Create FastAPI app
app = FastAPI(
    title="Commitment Agent API",
    description="Backend API for Commitment Agent - AI-powered accountability pools",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pools.router, prefix="/api/pools", tags=["pools"])
app.include_router(checkins.router, prefix="/api/checkins", tags=["checkins"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(invites.router, prefix="/api/pools", tags=["invites"])
app.include_router(ai_onchain.router, prefix="/api/ai/onchain", tags=["ai_onchain"])
app.include_router(
    solana_actions.router,
    prefix="/solana/actions",
    tags=["solana_actions"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "ok",
        "service": "commitment-agent-backend",
        "version": "1.0.0",
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Commitment Agent API",
        "docs": "/docs",
        "health": "/health",
    }


@app.options("/actions.json")
async def options_actions_json():
    """Handle CORS preflight requests for actions.json"""
    from fastapi.responses import Response
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
        }
    )


@app.get("/actions.json")
async def actions_json():
    """
    Solana Actions configuration file.
    
    Maps URL patterns to API endpoints for Blink integration.
    Required for Twitter/X Blinks to properly unfurl and recognize actions.
    
    This file must be accessible at the root domain for Blinks to work.
    Must return CORS headers with Access-Control-Allow-Origin: *
    """
    import os
    
    # Get base URL from environment or use default
    base_url = os.getenv("BACKEND_URL", "https://commitment-backend.onrender.com")
    base_url = base_url.rstrip('/')
    
    # Return actions.json in the format expected by Solana Actions
    # Reference: https://docs.solana.com/developers/actions-and-blinks
    actions_config = {
        "version": "1.0.0",
        "rules": [
            {
                "pathPattern": "/solana/actions/join-pool",
                "apiPath": f"{base_url}/solana/actions/join-pool"
            },
            {
                "pathPattern": "/solana/actions/create-pool",
                "apiPath": f"{base_url}/solana/actions/create-pool"
            },
            {
                "pathPattern": "/solana/actions/*",
                "apiPath": f"{base_url}/solana/actions/*"
            }
        ]
    }
    
    # Return with CORS headers as required by spec
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=actions_config,
        headers={
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # Required by spec
            "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

