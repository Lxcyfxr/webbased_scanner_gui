from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class JobCreate(BaseModel):
    tool: str
    target: str
    options: dict[str, Any] = {}


class JobResponse(BaseModel):
    id: str
    tool: str
    target: str
    status: str
    created_at: datetime
    finished_at: Optional[datetime]
    result_json: Optional[str]
    error: Optional[str]

    class Config:
        from_attributes = True
