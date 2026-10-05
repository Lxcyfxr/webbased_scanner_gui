from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
from uuid import uuid4
from .database import Base


class Job(Base):
    __tablename__ = "scans"   # keep existing table name for backward compat

    id          = Column(String, primary_key=True, default=lambda: str(uuid4()))
    tool        = Column(String, nullable=False, default="nmap")
    target      = Column(String, nullable=False)
    options     = Column(Text)
    status      = Column(String, default="pending")  # pending|running|done|failed|cancelled
    result_json = Column(Text)
    result_xml  = Column(Text)   # nmap only
    error       = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
