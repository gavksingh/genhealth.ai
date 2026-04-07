import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app import models

SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


class ActivityLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs every API request to the ActivityLog table."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Read body for write operations
        body_text = None
        if request.method in ("POST", "PUT", "PATCH"):
            try:
                body_bytes = await request.body()
                body_text = body_bytes.decode("utf-8", errors="replace")[:1000]
            except Exception:
                body_text = None

        response = await call_next(request)

        duration_ms = (time.time() - start_time) * 1000
        path = request.url.path

        if path not in SKIP_PATHS:
            try:
                # Use the same get_db dependency to respect test overrides
                from app.database import get_db
                from app.main import app

                # Get the potentially overridden get_db
                db_gen = app.dependency_overrides.get(get_db, get_db)
                db = next(db_gen())
                try:
                    log_entry = models.ActivityLog(
                        method=request.method,
                        path=path,
                        client_ip=request.client.host if request.client else None,
                        user_agent=request.headers.get("user-agent"),
                        request_body=body_text,
                        status_code=response.status_code,
                        duration_ms=round(duration_ms, 2),
                    )
                    db.add(log_entry)
                    db.commit()
                finally:
                    db.close()
            except Exception:
                pass  # Never let logging crash the API

        return response
