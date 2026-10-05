from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
from uuid import uuid4
from .database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    target = Column(String, nullable=False)
    options = Column(Text)       # JSON blob
    status = Column(String, default="pending")  # pending | running | done | failed
    result_xml = Column(Text)
    result_json = Column(Text)
    error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
