import asyncio
import re
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

try:
    from pymetasploit3.msfrpc import MsfRpcClient
    MSF_AVAILABLE = True
except ImportError:
    MSF_AVAILABLE = False
    MsfRpcClient = None

router = APIRouter(prefix="/msf")
_executor = ThreadPoolExecutor(max_workers=4)
_client: "MsfRpcClient | None" = None

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[mGKHF]")


def _strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


def _run(fn):
    return asyncio.get_event_loop().run_in_executor(_executor, fn)


# ── connection ─────────────────────────────────────────────────────────────────

class ConnectRequest(BaseModel):
    host: str = "127.0.0.1"
    port: int = 55553
    password: str
    ssl: bool = False


@router.post("/connect")
async def connect(body: ConnectRequest):
    if not MSF_AVAILABLE:
        raise HTTPException(501, "pymetasploit3 not installed — run: pip install pymetasploit3")
    global _client
    try:
        client = await _run(lambda: MsfRpcClient(
            body.password, server=body.host, port=body.port, ssl=body.ssl
        ))
        version = await _run(lambda: client.core.version())
        _client = client
        return {"connected": True, "version": version}
    except Exception as e:
        raise HTTPException(400, f"Connection failed: {e}")


@router.post("/disconnect")
async def disconnect():
    global _client
    _client = None
    return {"connected": False}


@router.get("/status")
async def status():
    if not MSF_AVAILABLE:
        return {"connected": False, "available": False, "reason": "pymetasploit3 not installed"}
    if _client is None:
        return {"connected": False, "available": True}
    try:
        version = await _run(lambda: _client.core.version())
        return {"connected": True, "available": True, "version": version}
    except Exception:
        return {"connected": False, "available": True}


# ── modules ────────────────────────────────────────────────────────────────────

def _require_client():
    if _client is None:
        raise HTTPException(403, "Not connected to Metasploit")


@router.get("/modules")
async def search_modules(q: str = ""):
    _require_client()
    try:
        results = await _run(lambda: _client.modules.search(q))
        return results[:100]  # cap results
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/modules/{mtype}/{mname:path}")
async def get_module(mtype: str, mname: str):
    _require_client()
    if mtype not in {"exploit", "auxiliary", "post", "payload", "encoder", "nop"}:
        raise HTTPException(400, "Invalid module type")
    try:
        mod = await _run(lambda: _client.modules.use(mtype, mname))
        opts = {}
        for k, v in mod.options.items():
            opts[k] = {
                "type":     v.get("type", "string"),
                "required": v.get("required", False),
                "default":  v.get("default"),
                "desc":     v.get("desc", ""),
            }
        return {
            "name":        mod.modulename,
            "fullname":    f"{mtype}/{mname}",
            "description": mod.description,
            "options":     opts,
        }
    except Exception as e:
        raise HTTPException(500, str(e))


# ── console WebSocket ──────────────────────────────────────────────────────────

@router.websocket("/console")
async def console_ws(websocket: WebSocket):
    if _client is None:
        await websocket.close(code=4003)
        return

    await websocket.accept()

    try:
        console = await _run(lambda: _client.consoles.console())
    except Exception as e:
        await websocket.send_json({"type": "error", "data": str(e)})
        await websocket.close()
        return

    # drain initial banner
    initial = await _run(console.read)
    if initial.get("data"):
        await websocket.send_json({"type": "output", "data": _strip_ansi(initial["data"])})

    stop = asyncio.Event()

    async def poll():
        while not stop.is_set():
            try:
                result = await _run(console.read)
                if result.get("data"):
                    await websocket.send_json({"type": "output", "data": _strip_ansi(result["data"])})
            except Exception:
                break
            await asyncio.sleep(0.3)

    poll_task = asyncio.create_task(poll())

    try:
        while True:
            msg = await websocket.receive_json()
            if msg.get("type") == "input":
                cmd = msg.get("command", "").strip()
                if cmd:
                    await _run(lambda: console.write(cmd + "\n"))
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        stop.set()
        poll_task.cancel()
        try:
            await _run(lambda: _client.consoles.destroy(console.cid))
        except Exception:
            pass


# ── sessions ───────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions():
    _require_client()
    try:
        sessions = await _run(lambda: _client.sessions.list)
        return sessions
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/sessions/{sid}")
async def kill_session(sid: str):
    _require_client()
    try:
        session = await _run(lambda: _client.sessions.session(sid))
        await _run(session.stop)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))
