from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ScanOptions(BaseModel):
    # Basic
    ping_scan: bool = False
    udp_scan: bool = False
    service_version: bool = False
    os_detection: bool = False
    default_scripts: bool = False
    timing: int = 3
    ports: Optional[str] = None

    # Host discovery
    no_ping: bool = False
    no_dns: bool = False
    force_dns: bool = False

    # Scan behaviour
    open_only: bool = False
    fast_mode: bool = False
    aggressive: bool = False
    traceroute: bool = False
    reason: bool = False
    ipv6: bool = False

    # Performance
    top_ports: Optional[int] = None
    min_rate: Optional[int] = None
    max_rate: Optional[int] = None
    max_retries: Optional[int] = None
    scan_delay: Optional[str] = None

    # Evasion
    badsum: bool = False
    source_port: Optional[int] = None
    data_length: Optional[int] = None
    ttl: Optional[int] = None

    # Scripts
    script: Optional[str] = None
    script_args: Optional[str] = None


class ScanCreate(BaseModel):
    target: str
    options: ScanOptions = ScanOptions()


class ScanResponse(BaseModel):
    id: str
    target: str
    status: str
    created_at: datetime
    finished_at: Optional[datetime]
    result_json: Optional[str]
    error: Optional[str]

    class Config:
        from_attributes = True
