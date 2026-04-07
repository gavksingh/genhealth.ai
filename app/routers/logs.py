from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/logs", tags=["logs"])


@router.get("/", response_model=list[schemas.ActivityLogResponse])
def list_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List activity logs sorted newest first with pagination."""
    return (
        db.query(models.ActivityLog)
        .order_by(models.ActivityLog.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
