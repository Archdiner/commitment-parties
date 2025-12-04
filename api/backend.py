"""
Vercel serverless function wrapper for FastAPI backend
This allows the FastAPI app to run on Vercel's serverless platform
"""

import sys
import os

# Add backend directory to path so we can import from it
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from mangum import Mangum
from backend.main import app

# Wrap FastAPI app for Vercel serverless
# Mangum converts ASGI (FastAPI) to AWS Lambda format (which Vercel uses)
handler = Mangum(app, lifespan="off")

# Vercel expects a handler function
def handler_wrapper(event, context):
    return handler(event, context)

