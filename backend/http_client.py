from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import time

router = APIRouter(prefix="/tools/http", tags=["http"])


class HttpRequest(BaseModel):
    method: str = "GET"
    url: str
    headers: dict[str, str] = {}
    body: str = ""
    follow_redirects: bool = True
    timeout: int = 30
    verify_ssl: bool = True


class HttpResponse(BaseModel):
    status: int
    reason: str
    headers: dict[str, str]
    body: str
    elapsed_ms: int
    url: str                 # final URL after redirects
    redirects: list[str]


@router.post("", response_model=HttpResponse)
async def send_request(req: HttpRequest):
    method = req.method.upper()
    if method not in ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"):
        raise HTTPException(400, f"Unsupported method: {method}")

    content = req.body.encode() if req.body else None

    try:
        async with httpx.AsyncClient(
            verify=req.verify_ssl,
            follow_redirects=req.follow_redirects,
            timeout=req.timeout,
        ) as client:
            t0 = time.monotonic()
            resp = await client.request(
                method,
                req.url,
                headers=req.headers or {},
                content=content,
            )
            elapsed_ms = int((time.monotonic() - t0) * 1000)

        redirects = [str(r.url) for r in resp.history]

        # decode body, fall back to escaped bytes for binary
        try:
            body = resp.text
        except Exception:
            body = repr(resp.content)

        return HttpResponse(
            status=resp.status_code,
            reason=resp.reason_phrase or "",
            headers=dict(resp.headers),
            body=body,
            elapsed_ms=elapsed_ms,
            url=str(resp.url),
            redirects=redirects,
        )

    except httpx.TimeoutException:
        raise HTTPException(504, "Request timed out")
    except httpx.ConnectError as e:
        raise HTTPException(502, f"Connection error: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))
