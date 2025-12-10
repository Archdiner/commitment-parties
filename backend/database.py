"""
Database connection and query utilities.

Uses Supabase Python client for PostgreSQL database access.
"""

from supabase import create_client, Client
from typing import Optional, Dict, Any, List
import logging
from config import settings

# Try to import Supabase/PostgREST error types
try:
    from postgrest.exceptions import APIError as PostgrestAPIError
except ImportError:
    PostgrestAPIError = None

logger = logging.getLogger(__name__)

# Global Supabase client
_supabase: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client instance"""
    global _supabase
    
    if _supabase is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables"
            )
        
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized")
    
    return _supabase


async def execute_query(
    table: str,
    operation: str = "select",
    filters: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Execute a database query using Supabase client.
    
    Args:
        table: Table name
        operation: Operation type (select, insert, update, delete)
        filters: Optional filters for select operations
        data: Data for insert/update operations
        limit: Optional limit for select operations
    
    Returns:
        List of result rows
    """
    client = get_supabase_client()
    
    try:
        if operation == "select":
            query = client.table(table).select("*")
            
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return response.data if response.data else []
        
        elif operation == "insert":
            if not data:
                raise ValueError("Data required for insert operation")
            
            response = client.table(table).insert(data).execute()
            return response.data if response.data else []
        
        elif operation == "update":
            if not data:
                raise ValueError("Data required for update operation")
            if not filters:
                raise ValueError("Filters required for update operation")
            
            query = client.table(table).update(data)
            for key, value in filters.items():
                query = query.eq(key, value)
            
            response = query.execute()
            return response.data if response.data else []
        
        elif operation == "delete":
            if not filters:
                raise ValueError("Filters required for delete operation")
            
            query = client.table(table).delete()
            for key, value in filters.items():
                query = query.eq(key, value)
            
            response = query.execute()
            return response.data if response.data else []
        
        else:
            raise ValueError(f"Unknown operation: {operation}")
    
    except Exception as e:
        logger.error(f"Database query error: {e}", exc_info=True)
        
        # Extract detailed error message from Supabase/PostgREST exceptions
        error_msg = str(e)
        
        # Handle PostgREST APIError specifically
        if PostgrestAPIError and isinstance(e, PostgrestAPIError):
            if hasattr(e, 'message'):
                error_msg = e.message
            elif hasattr(e, 'details'):
                error_msg = e.details
            elif hasattr(e, 'hint'):
                error_msg = f"{error_msg}. Hint: {e.hint}"
        
        # Check if it's a Supabase/PostgREST API error
        if hasattr(e, 'message'):
            error_msg = e.message
        elif hasattr(e, 'args') and len(e.args) > 0:
            # PostgREST errors often have the message in args[0]
            if isinstance(e.args[0], dict):
                error_msg = e.args[0].get('message', str(e.args[0]))
            else:
                error_msg = str(e.args[0])
        
        # Check for common database errors and provide helpful messages
        error_str = error_msg.lower()
        if 'column' in error_str and ('does not exist' in error_str or 'unknown column' in error_str):
            error_msg = f"Database schema mismatch: {error_msg}. Please ensure all migrations have been run. Missing columns may need to be added via migration."
        elif 'duplicate key' in error_str or 'unique constraint' in error_str:
            error_msg = f"Duplicate entry: {error_msg}"
        elif 'null value' in error_str or 'not null constraint' in error_str:
            error_msg = f"Missing required field: {error_msg}"
        elif 'foreign key' in error_str:
            error_msg = f"Referenced record does not exist: {error_msg}"
        
        # Create a more informative exception
        db_error = Exception(f"Database error: {error_msg}")
        db_error.original_error = e
        raise db_error


