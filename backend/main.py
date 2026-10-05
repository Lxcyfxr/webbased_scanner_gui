from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import asyncio
import json
import os
from uuid import uuid4
from datetime import datetime

from .database import engine, get_db, Base, run_migrations
from .models import Job
from .schemas import JobCreate, JobResponse
from .runner import run_job
from .tools.nmap import NmapTool
from .tools.ffuf import FfufTool
from .tools.feroxbuster import FeroxbusterTool
from .tools.gobuster import GobusterTool
from .tools.wenum import WenumTool

Base.metadata.create_all(bind=engine)
run_migrations()

TOOLS = {
    "nmap":         NmapTool(),
    "ffuf":         FfufTool(),
    "feroxbuster":  FeroxbusterTool(),
    "gobuster":     GobusterTool(),
    "wenum":        WenumTool(),
}

WORDLIST_PRESETS = [
    {"label": "dirb / common (4614)",           "path": "/usr/share/wordlists/dirb/common.txt"},
    {"label": "dirb / big (20469)",              "path": "/usr/share/wordlists/dirb/big.txt"},
    {"label": "SecLists / common",              "path": "/usr/share/seclists/Discovery/Web-Content/common.txt"},
    {"label": "SecLists / big",                 "path": "/usr/share/seclists/Discovery/Web-Content/big.txt"},
    {"label": "SecLists / raft-medium-dirs",    "path": "/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt"},
    {"label": "SecLists / directory-list-2.3-medium", "path": "/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt"},
]

app = FastAPI(title="Web Security GUI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_active: dict[str, asyncio.Queue] = {}


# ── meta ──────────────────────────────────────────────────────────────────────

@app.get("/tools")
def list_tools():
    return [{"name": t.name, "label": t.label} for t in TOOLS.values()]


@app.get("/wordlists")
def list_wordlists():
    return [w for w in WORDLIST_PRESETS if os.path.exists(w["path"])]


# ── jobs ──────────────────────────────────────────────────────────────────────

@app.post("/jobs", response_model=JobResponse, status_code=201)
def create_job(job_in: JobCreate, db: Session = Depends(get_db)):
    tool = TOOLS.get(job_in.tool)
    if not tool:
        raise HTTPException(status_code=400, detail=f"Unknown tool: {job_in.tool}")
    if not tool.validate_target(job_in.target):
        raise HTTPException(status_code=400, detail="Invalid target for this tool")

    job = Job(
        id=str(uuid4()),
        tool=job_in.tool,
        target=job_in.target,
        options=json.dumps(job_in.options),
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@app.websocket("/ws/jobs/{job_id}")
async def job_stream(websocket: WebSocket, job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        await websocket.close(code=4004)
        return

    tool = TOOLS.get(job.tool)
    if not tool:
        await websocket.close(code=4003)
        return

    await websocket.accept()

    queue: asyncio.Queue = asyncio.Queue()
    cancel_event = asyncio.Event()
    _active[job_id] = queue

    job.status = "running"
    db.commit()

    options = json.loads(job.options)
    job_task = asyncio.create_task(run_job(tool, job.target, options, queue, cancel_event))

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
                job.status = "cancelled" if msg.get("cancelled") else ("done" if msg["success"] else "failed")
                job.result_json = json.dumps(msg["json"])
                if job.tool == "nmap":
                    job.result_xml = "\n".join(msg.get("xml_lines", []))
                job.finished_at = datetime.utcnow()
                db.commit()
                break
    except WebSocketDisconnect:
        job_task.cancel()
        cancel_event.set()
        job.status = "failed"
        job.error = "Client disconnected"
        db.commit()
    finally:
        recv_task.cancel()
        _active.pop(job_id, None)


@app.get("/jobs", response_model=list[JobResponse])
def list_jobs(tool: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Job).order_by(Job.created_at.desc())
    if tool:
        q = q.filter(Job.tool == tool)
    return q.all()


@app.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/jobs/{job_id}/xml")
def get_job_xml(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or not job.result_xml:
        raise HTTPException(status_code=404, detail="XML not available")
    return Response(
        content=job.result_xml,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename=scan_{job_id}.xml"},
    )


@app.delete("/jobs/{job_id}", status_code=204)
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
