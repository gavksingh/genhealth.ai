from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/logs", tags=["logs"])


@router.get("/", response_model=schemas.PaginatedLogsResponse)
def list_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List activity logs sorted newest first with pagination."""
    total = db.query(models.ActivityLog).count()
    logs = (
        db.query(models.ActivityLog)
        .order_by(models.ActivityLog.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"logs": logs, "total": total, "skip": skip, "limit": limit}
