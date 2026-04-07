from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.auth import require_api_key
from app import models, schemas

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.OrderResponse)
@limiter.limit("30/minute")
def create_order(request: Request, order: schemas.OrderCreate, db: Session = Depends(get_db), _key: str = Depends(require_api_key)):
    """Create a new order manually from a JSON body."""
    data = order.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = data["status"].value
    else:
        data.pop("status", None)
    db_order = models.Order(**data)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@router.get("/", response_model=list[schemas.OrderResponse])
def list_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all orders, sorted newest first, with pagination."""
    return (
        db.query(models.Order)
        .order_by(models.Order.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get a single order by ID."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}", response_model=schemas.OrderResponse)
def update_order(order_id: int, order: schemas.OrderUpdate, db: Session = Depends(get_db), _key: str = Depends(require_api_key)):
    """Update an existing order. Only provided fields are updated."""
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    update_data = order.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "status" and value is not None:
            value = value.value
        setattr(db_order, key, value)
    db.commit()
    db.refresh(db_order)
    return db_order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db), _key: str = Depends(require_api_key)):
    """Delete an order by ID."""
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(db_order)
    db.commit()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def upload_document(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db), _key: str = Depends(require_api_key)):
    """Upload a PDF medical document and extract patient data using Vertex AI."""
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Validate file size (10MB max)
    contents = file.file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    import tempfile
    import os
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        from app.services.pdf_extractor import PDFExtractor
        extractor = PDFExtractor()
        extracted = extractor.extract(tmp_path)

        db_order = models.Order(
            first_name=extracted["first_name"],
            last_name=extracted["last_name"],
            date_of_birth=extracted["date_of_birth"],
            document_filename=file.filename,
            status=models.OrderStatus.complete.value,
            extracted_from_document=True,
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)

        return {
            "order": schemas.OrderResponse.model_validate(db_order).model_dump(),
            "extracted_data": extracted,
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Extraction failed: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
