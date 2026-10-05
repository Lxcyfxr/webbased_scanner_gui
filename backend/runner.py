import asyncio
from .tools.base import BaseTool


async def run_job(
    tool: BaseTool,
    target: str,
    options: dict,
    queue: asyncio.Queue,
    cancel_event: asyncio.Event | None = None,
) -> None:
    cmd = tool.build_command(target, options)
    stdout_lines: list[str] = []

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    async def watch_cancel():
        if cancel_event:
            await cancel_event.wait()
            try:
                proc.terminate()
            except ProcessLookupError:
                pass

    cancel_watcher = asyncio.create_task(watch_cancel())

    async def drain_stderr():
        async for line in proc.stderr:
            text = line.decode().strip()
            if not text:
                continue
            msg = tool.parse_stderr_line(text)
            if msg:
                await queue.put(msg)

    async def drain_stdout():
        async for line in proc.stdout:
            text = line.decode().strip()
            stdout_lines.append(text)
            msg = tool.parse_stdout_line(text)
            if msg:
                await queue.put(msg)

    await asyncio.gather(drain_stderr(), drain_stdout())
    cancel_watcher.cancel()
    await proc.wait()

    cancelled = bool(cancel_event and cancel_event.is_set())
    result = tool.parse_result(stdout_lines)

    await queue.put({
        "type": "done",
        "success": proc.returncode == 0 and not cancelled,
        "cancelled": cancelled,
        "json": result,
    })
