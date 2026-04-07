import os
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

# API key from environment variable; if not set, auth is disabled (dev mode)
_API_KEY = os.getenv("API_KEY")


def require_api_key(api_key: str | None = Depends(API_KEY_HEADER)) -> str | None:
    """Dependency that enforces API key auth on write operations.

    If API_KEY env var is not set, auth is disabled (development mode).
    If set, requests without a valid X-API-Key header get 401.
    """
    if _API_KEY is None:
        return None  # Auth disabled — no API_KEY configured
    if not api_key or api_key != _API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key. Provide X-API-Key header.",
        )
    return api_key
