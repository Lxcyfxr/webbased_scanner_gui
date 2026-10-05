from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import asyncio
import json
from uuid import uuid4
from datetime import datetime

from .database import engine, get_db, Base
from .models import Scan
from .schemas import ScanCreate, ScanResponse
from .scanner import validate_target, run_scan

Base.metadata.create_all(bind=engine)

app = FastAPI(title="nmap Web GUI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # lock this down in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory queues for scans currently streaming output
_active: dict[str, asyncio.Queue] = {}


@app.post("/scans", response_model=ScanResponse, status_code=201)
def create_scan(scan_in: ScanCreate, db: Session = Depends(get_db)):
    if not validate_target(scan_in.target):
        raise HTTPException(status_code=400, detail="Invalid target")

    scan = Scan(
        id=str(uuid4()),
        target=scan_in.target,
        options=json.dumps(scan_in.options.model_dump()),
        status="pending",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


@app.websocket("/ws/scans/{scan_id}")
async def scan_stream(websocket: WebSocket, scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        await websocket.close(code=4004)
        return

    await websocket.accept()

    queue: asyncio.Queue = asyncio.Queue()
    cancel_event = asyncio.Event()
    _active[scan_id] = queue

    scan.status = "running"
    db.commit()

    options = json.loads(scan.options)
    scan_task = asyncio.create_task(run_scan(scan.target, options, queue, cancel_event))

    async def recv_cancel():
        try:
            while True:
                data = await websocket.receive_json()
                if data.get("type") == "cancel":
                    cancel_event.set()
                    break
        except Exception:
            pass

    recv_task = asyncio.create_task(recv_cancel())

    try:
        while True:
            msg = await queue.get()
            await websocket.send_json(msg)

            if msg["type"] == "done":
                if msg.get("cancelled"):
                    scan.status = "cancelled"
                else:
                    scan.status = "done" if msg["success"] else "failed"
                scan.result_xml = msg["xml"]
                scan.result_json = json.dumps(msg["json"])
                scan.finished_at = datetime.utcnow()
                db.commit()
                break
    except WebSocketDisconnect:
        scan_task.cancel()
        scan.status = "failed"
        scan.error = "Client disconnected"
        db.commit()
    finally:
        recv_task.cancel()
        _active.pop(scan_id, None)


@app.get("/scans", response_model=list[ScanResponse])
def list_scans(db: Session = Depends(get_db)):
    return db.query(Scan).order_by(Scan.created_at.desc()).all()


@app.get("/scans/{scan_id}", response_model=ScanResponse)
def get_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@app.delete("/scans/{scan_id}", status_code=204)
def delete_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    db.delete(scan)
    db.commit()
