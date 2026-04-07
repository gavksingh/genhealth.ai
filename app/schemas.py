import enum
from pydantic import BaseModel, ConfigDict, field_validator, Field
from datetime import datetime
from typing import Optional


class OrderStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    complete = "complete"
    failed = "failed"


class OrderCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str
    notes: Optional[str] = None
    status: Optional[OrderStatus] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_and_validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def strip_dob(cls, v: str) -> str:
        return v.strip()


class OrderUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[OrderStatus] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_and_validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    date_of_birth: str
    document_filename: Optional[str]
    status: str
    notes: Optional[str]
    extracted_from_document: bool
    created_at: datetime
    updated_at: Optional[datetime]


class ExtractedPatientData(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str
    confidence: float = Field(ge=0, le=1)


class UploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order: OrderResponse
    extracted_data: ExtractedPatientData


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    method: str
    path: str
    client_ip: Optional[str]
    user_agent: Optional[str]
    request_body: Optional[str]
    status_code: Optional[int]
    duration_ms: Optional[float]
    timestamp: datetime


class PaginatedLogsResponse(BaseModel):
    logs: list[ActivityLogResponse]
    total: int
    skip: int
    limit: int
