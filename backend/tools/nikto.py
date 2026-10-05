import re
from .base import BaseTool

_HEADER_PREFIXES = (
    "Target IP:", "Target Hostname:", "Target Port:", "Start Time:",
    "End Time:", "SSL Info:", "1 host(s)", "0 host(s)", "Error(s)",
)

_OSVDB_RE  = re.compile(r"^(OSVDB-\d+):\s*(/\S*):\s*(.+)$")
_CVE_RE    = re.compile(r"^(CVE-[\w-]+):\s*(/\S*):\s*(.+)$")
_NIKTO_RE  = re.compile(r"^\[(\w+)\]\s*(/\S*):\s*(.+)$")  # newer [012345] /path: desc
_PATH_RE   = re.compile(r"^(/\S*):\s*(.+)$")


def _parse_finding(text: str) -> dict | None:
    text = text.strip()
    if not text or any(text.startswith(p) for p in _HEADER_PREFIXES):
        return None
    for pattern in (_OSVDB_RE, _CVE_RE, _NIKTO_RE):
        m = pattern.match(text)
        if m:
            return {"ref": m.group(1), "uri": m.group(2), "description": m.group(3).strip()}
    m = _PATH_RE.match(text)
    if m:
        return {"ref": None, "uri": m.group(1), "description": m.group(2).strip()}
    return None


class NiktoTool(BaseTool):
    name = "nikto"
    label = "Nikto"

    def validate_target(self, target: str) -> bool:
        patterns = [
            r"^https?://",
            r"^(\d{1,3}\.){3}\d{1,3}$",
            r"^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$",
        ]
        return any(re.match(p, target) for p in patterns)

    def build_command(self, target: str, options: dict) -> list[str]:
        port = options.get("port")
        host = target
        # Nikto rejects -port when target is a full URI; embed port in URL instead
        if port and str(port).isdigit() and re.match(r'^https?://', target):
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(target)
            host = urlunparse(parsed._replace(netloc=f"{parsed.hostname}:{port}"))
            port = None
        cmd = ["nikto", "-h", host, "-nointeractive"]
        if port and str(port).isdigit():
            cmd.extend(["-port", str(port)])
        if options.get("ssl"):
            cmd.append("-ssl")
        tuning = options.get("tuning", "").strip()
        if tuning and re.match(r"^[0-9a-cx]+$", tuning):
            cmd.extend(["-Tuning", tuning])
        if options.get("no_404"):
            cmd.append("-no404")
        timeout = options.get("timeout")
        if timeout and str(timeout).isdigit():
            cmd.extend(["-timeout", str(timeout)])
        proxy = options.get("proxy_url")
        if proxy and re.match(r'^https?://', proxy):
            cmd.extend(["-useproxy", proxy])
        return cmd

    def parse_stdout_line(self, line: str) -> dict | None:
        if line.startswith("+ "):
            finding = _parse_finding(line[2:])
            if finding:
                return {"type": "found", "data": finding}
            return {"type": "progress", "data": line}
        if line.startswith("- ") or line.startswith("-" * 5):
            return {"type": "progress", "data": line}
        return {"type": "progress", "data": line} if line else None

    def parse_stderr_line(self, line: str) -> dict | None:
        return {"type": "progress", "data": line} if line else None

    def parse_result(self, stdout_lines: list[str]) -> dict:
        findings = []
        info = {}
        for raw in stdout_lines:
            line = raw.strip()
            if line.startswith("+ Target IP:"):
                info["ip"] = line.split(":", 1)[1].strip()
            elif line.startswith("+ Target Hostname:"):
                info["hostname"] = line.split(":", 1)[1].strip()
            elif line.startswith("+ Target Port:"):
                info["port"] = line.split(":", 1)[1].strip()
            elif line.startswith("+ Server:"):
                info["server"] = line.split(":", 1)[1].strip()
            elif line.startswith("+ "):
                f = _parse_finding(line[2:])
                if f:
                    findings.append(f)
        return {"info": info, "findings": findings, "count": len(findings)}
