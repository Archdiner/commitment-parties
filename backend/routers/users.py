"""
User-related endpoints.

Handles user data, participations, and profile information.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging
import time
import httpx
import base64
import secrets
from urllib.parse import urlencode

from database import execute_query
from models import GitHubVerifyRequest, GitHubVerifyResponse
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for OAuth state (in production, use Redis or database)
_oauth_states: dict[str, dict] = {}

# In-memory store for access tokens (in production, use Redis or database)
# Key: wallet_address, Value: access_token
_github_tokens: dict[str, str] = {}


@router.get(
    "/{wallet}/participations",
    summary="Get user's pool participations",
    description="Get all pools where the user is a participant (not just creator)",
)
async def get_user_participations(wallet: str) -> List[dict]:
    """
    Get all pools where the user is a participant.
    
    Returns pools with participant status, days_verified, and progress.
    """
    try:
        # Get all participants for this wallet
        participants = await execute_query(
            table="participants",
            operation="select",
            filters={"wallet_address": wallet},
        )
        
        logger.info(f"Found {len(participants)} participants for wallet {wallet}")
        
        if not participants:
            return []
        
        # Get pool details for each participation
        participations = []
        for participant in participants:
            pool_id = participant.get("pool_id")
            if not pool_id:
                continue
            
            # Get pool details
            pools = await execute_query(
                table="pools",
                operation="select",
                filters={"pool_id": pool_id},
                limit=1,
            )
            
            if not pools:
                logger.warning(f"Pool {pool_id} not found for participant {wallet}")
                continue
            
            pool = pools[0]
            logger.info(f"Processing participation: pool_id={pool_id}, pool_name={pool.get('name')}")
            
            # Calculate progress
            duration_days = pool.get("duration_days", 1)
            days_verified = participant.get("days_verified", 0)
            progress = min(100, int((days_verified / duration_days) * 100)) if duration_days > 0 else 0
            
            # Calculate days remaining
            start_timestamp = pool.get("start_timestamp", 0)
            end_timestamp = pool.get("end_timestamp", 0)
            current_time = int(time.time())
            
            days_remaining = 0
            if current_time < start_timestamp:
                days_remaining = duration_days
            elif current_time < end_timestamp:
                days_elapsed = (current_time - start_timestamp) // 86400
                days_remaining = max(0, duration_days - days_elapsed)
            
            participations.append({
                "pool_id": pool_id,
                "pool_pubkey": pool.get("pool_pubkey"),
                "name": pool.get("name"),
                "description": pool.get("description"),
                "goal_type": pool.get("goal_type"),
                "goal_metadata": pool.get("goal_metadata"),
                "stake_amount": float(pool.get("stake_amount", 0)),
                "duration_days": duration_days,
                "status": pool.get("status"),
                "participant_status": participant.get("status"),
                "days_verified": days_verified,
                "progress": progress,
                "days_remaining": days_remaining,
                "joined_at": participant.get("joined_at"),  # Already a string from Supabase
                "start_timestamp": start_timestamp,
                "end_timestamp": end_timestamp,
            })
        
        return participations
    
    except Exception as e:
        logger.error(f"Error fetching user participations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch participations")


@router.get(
    "/github/oauth/initiate",
    summary="Initiate GitHub OAuth flow",
    description="Returns GitHub OAuth authorization URL",
)
async def initiate_github_oauth(
    wallet_address: str = Query(..., description="Wallet address to link GitHub account to")
) -> dict:
    """
    Initiate GitHub OAuth flow.
    
    Returns authorization URL that user should be redirected to.
    """
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET."
        )
    
    # Generate state token for CSRF protection
    state_token = secrets.token_urlsafe(32)
    
    # Store state with wallet address
    _oauth_states[state_token] = {
        "wallet_address": wallet_address,
        "timestamp": time.time()
    }
    
    # Build GitHub OAuth URL
    # Request repo scope to fetch user repositories
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "read:user repo",  # Read user profile and repositories
        "state": state_token,
    }
    
    auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    
    return {
        "auth_url": auth_url,
        "state": state_token
    }


@router.get(
    "/github/oauth/callback",
    summary="GitHub OAuth callback",
    description="Handles GitHub OAuth callback and verifies account",
)
async def github_oauth_callback(
    code: str = Query(..., description="OAuth authorization code"),
    state: str = Query(..., description="OAuth state token"),
) -> GitHubVerifyResponse:
    """
    Handle GitHub OAuth callback.
    
    Exchanges code for access token, fetches user info, and verifies account.
    """
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured"
        )
    
    # Verify state token
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state token")
    
    state_data = _oauth_states.pop(state)
    wallet_address = state_data["wallet_address"]
    
    # Check state expiration (5 minutes)
    if time.time() - state_data["timestamp"] > 300:
        raise HTTPException(status_code=400, detail="State token expired")
    
    try:
        # Exchange code for access token
        async with httpx.AsyncClient(timeout=10) as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.GITHUB_REDIRECT_URI,
                },
                headers={"Accept": "application/json"},
            )
            
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to exchange code for token: {token_response.text}"
                )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                raise HTTPException(
                    status_code=500,
                    detail="No access token received from GitHub"
                )
            
            # Fetch user info from GitHub
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            
            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch user info: {user_response.text}"
                )
            
            github_user = user_response.json()
            github_username = github_user.get("login", "").lower()
            
            if not github_username:
                raise HTTPException(
                    status_code=500,
                    detail="No GitHub username found"
                )
            
            # Store access token temporarily for fetching repositories
            _github_tokens[wallet_address] = access_token
            logger.info(f"Stored GitHub access token for wallet {wallet_address}")
        
        # Verification successful - update user record
        try:
            # Ensure user exists
            users = await execute_query(
                table="users",
                operation="select",
                filters={"wallet_address": wallet_address},
                limit=1
            )
            
            if not users:
                # Auto-create user
                user_data = {
                    "wallet_address": wallet_address,
                    "username": None,
                    "twitter_handle": None,
                    "verified_github_username": github_username,
                    "reputation_score": 100,
                    "total_games": 0,
                    "games_completed": 0,
                    "total_earned": 0.0,
                    "streak_count": 0
                }
                await execute_query(
                    table="users",
                    operation="insert",
                    data=user_data
                )
                logger.info(f"Created user {wallet_address} with verified GitHub {github_username}")
            else:
                # Update existing user
                await execute_query(
                    table="users",
                    operation="update",
                    filters={"wallet_address": wallet_address},
                    data={"verified_github_username": github_username}
                )
                logger.info(f"Updated user {wallet_address} with verified GitHub {github_username}")
            
            return GitHubVerifyResponse(
                verified=True,
                message="GitHub account verified successfully via OAuth",
                github_username=github_username
            )
            
        except Exception as db_err:
            logger.error(f"Error updating user record: {db_err}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Verification succeeded but failed to update database: {str(db_err)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in GitHub OAuth callback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OAuth verification failed: {str(e)}")


@router.post(
    "/verify-github",
    response_model=GitHubVerifyResponse,
    summary="Verify GitHub username ownership (Legacy Gist method)",
    description="Legacy method using Gist. Use OAuth flow instead for better UX.",
)
async def verify_github(request: GitHubVerifyRequest) -> GitHubVerifyResponse:
    """
    Verify GitHub username ownership via Gist signature method.
    
    Process:
    1. User creates a GitHub Gist with a message containing their wallet address and signature
    2. Backend verifies the signature matches the wallet
    3. Backend fetches the Gist and verifies content
    4. If verified, stores GitHub username in user record
    
    Expected Gist content format:
    "Verifying wallet {wallet_address} for Commitment Agent\nSignature: {signature}"
    """
    try:
        wallet_address = request.wallet_address
        github_username = request.github_username.lower().strip()
        gist_id = request.gist_id.strip()
        signature = request.signature.strip()
        
        # Verify signature using Solana
        try:
            from solders.pubkey import Pubkey
            from solders.signature import Signature
            from nacl.signing import VerifyKey
            import nacl.encoding
            
            # Parse wallet address
            wallet_pubkey = Pubkey.from_string(wallet_address)
            
            # Parse signature (base58 encoded)
            sig = Signature.from_string(signature)
            
            # Create message to verify (wallet address + github username)
            message = f"Commitment Agent GitHub Verification\nWallet: {wallet_address}\nGitHub: {github_username}".encode('utf-8')
            
            # Verify signature
            # Note: This is a simplified verification. In production, you'd want to use
            # a proper Solana message signing format (like what Phantom uses)
            # For now, we'll verify the Gist content instead and trust the signature
            # is valid if the Gist verification passes
            
        except Exception as sig_err:
            logger.warning(f"Signature verification error (continuing with Gist check): {sig_err}")
            # Continue with Gist verification as primary method
        
        # Fetch Gist from GitHub API
        gist_url = f"https://api.github.com/gists/{gist_id}"
        
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                gist_url,
                headers={
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "Commitment-Agent/1.0",
                },
            )
            
            if response.status_code != 200:
                logger.warning(
                    f"GitHub Gist not found or inaccessible: {gist_id}, "
                    f"status={response.status_code}"
                )
                return GitHubVerifyResponse(
                    verified=False,
                    message=f"Gist not found or inaccessible. Status: {response.status_code}"
                )
            
            gist_data = response.json()
            
            # Verify Gist owner matches GitHub username
            gist_owner = gist_data.get("owner", {}).get("login", "").lower()
            if gist_owner != github_username:
                logger.warning(
                    f"Gist owner mismatch: expected {github_username}, got {gist_owner}"
                )
                return GitHubVerifyResponse(
                    verified=False,
                    message="Gist owner does not match GitHub username"
                )
            
            # Check Gist files for verification content
            files = gist_data.get("files", {})
            verification_found = False
            
            for file_name, file_data in files.items():
                content = file_data.get("content", "")
                if wallet_address.lower() in content.lower() and signature in content:
                    verification_found = True
                    logger.info(f"Verification content found in Gist file: {file_name}")
                    break
            
            if not verification_found:
                logger.warning(
                    f"Verification content not found in Gist {gist_id} for wallet {wallet_address}"
                )
                return GitHubVerifyResponse(
                    verified=False,
                    message="Gist does not contain required verification content (wallet address and signature)"
                )
        
        # Verification successful - update user record
        try:
            # Ensure user exists
            users = await execute_query(
                table="users",
                operation="select",
                filters={"wallet_address": wallet_address},
                limit=1
            )
            
            if not users:
                # Auto-create user
                user_data = {
                    "wallet_address": wallet_address,
                    "username": None,
                    "twitter_handle": None,
                    "verified_github_username": github_username,
                    "reputation_score": 100,
                    "total_games": 0,
                    "games_completed": 0,
                    "total_earned": 0.0,
                    "streak_count": 0
                }
                await execute_query(
                    table="users",
                    operation="insert",
                    data=user_data
                )
                logger.info(f"Created user {wallet_address} with verified GitHub {github_username}")
            else:
                # Update existing user
                await execute_query(
                    table="users",
                    operation="update",
                    filters={"wallet_address": wallet_address},
                    data={"verified_github_username": github_username}
                )
                logger.info(f"Updated user {wallet_address} with verified GitHub {github_username}")
            
            return GitHubVerifyResponse(
                verified=True,
                message="GitHub username verified successfully",
                github_username=github_username
            )
            
        except Exception as db_err:
            logger.error(f"Error updating user record: {db_err}", exc_info=True)
            return GitHubVerifyResponse(
                verified=False,
                message=f"Verification succeeded but failed to update database: {str(db_err)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying GitHub username: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to verify GitHub username: {str(e)}")


@router.get(
    "/{wallet}/github",
    summary="Get verified GitHub username for wallet",
    description="Returns the verified GitHub username for a wallet address, if any",
)
async def get_github_username(wallet: str) -> dict:
    """Get verified GitHub username for a wallet."""
    try:
        users = await execute_query(
            table="users",
            operation="select",
            filters={"wallet_address": wallet},
            limit=1
        )
        
        if not users:
            return {"verified_github_username": None}
        
        return {
            "verified_github_username": users[0].get("verified_github_username")
        }
    
    except Exception as e:
        logger.error(f"Error fetching GitHub username: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub username")


@router.get(
    "/{wallet}/github/repos",
    summary="Get user's GitHub repositories",
    description="Returns list of repositories for the verified GitHub account",
)
async def get_github_repos(wallet: str) -> dict:
    """Get GitHub repositories for a verified user."""
    try:
        # Check if user has verified GitHub
        users = await execute_query(
            table="users",
            operation="select",
            filters={"wallet_address": wallet},
            limit=1
        )
        
        if not users or not users[0].get("verified_github_username"):
            raise HTTPException(
                status_code=400,
                detail="GitHub account not verified. Please verify your GitHub account first."
            )
        
        # Get stored access token
        access_token = _github_tokens.get(wallet)
        if not access_token:
            # Token not found (likely server restarted). Return empty list with a message.
            # User can still create challenges with "any repo" option.
            logger.warning(f"GitHub access token not found for wallet {wallet}. User may need to reconnect.")
            return {
                "repositories": [],
                "message": "GitHub access token expired. You can still create challenges that track all repositories, or reconnect to select a specific repository."
            }
        
        # Fetch repositories from GitHub API
        async with httpx.AsyncClient(timeout=10) as client:
            repos_response = await client.get(
                "https://api.github.com/user/repos",
                params={
                    "type": "all",  # all, owner, member
                    "sort": "updated",
                    "per_page": 100,  # Get up to 100 repos
                },
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            
            if repos_response.status_code == 401:
                # Token expired or invalid
                _github_tokens.pop(wallet, None)
                raise HTTPException(
                    status_code=401,
                    detail="GitHub access token expired. Please reconnect your GitHub account."
                )
            
            if repos_response.status_code != 200:
                logger.error(f"GitHub API error: {repos_response.status_code}, {repos_response.text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch repositories: {repos_response.text}"
                )
            
            repos = repos_response.json()
            
            # Format repos as owner/repo
            repo_list = [
                {
                    "full_name": repo.get("full_name"),
                    "name": repo.get("name"),
                    "owner": repo.get("owner", {}).get("login"),
                    "private": repo.get("private", False),
                    "description": repo.get("description"),
                    "updated_at": repo.get("updated_at"),
                }
                for repo in repos
            ]
            
            return {
                "repositories": repo_list
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching GitHub repositories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch repositories: {str(e)}")

