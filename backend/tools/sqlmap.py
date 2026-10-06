import re
from .base import BaseTool

_LEVEL_RE     = re.compile(r"^\[(\w+)\] (.+)$")
_INJECTION_RE = re.compile(r"parameter '(.+?)' (?:appears to be|is) '(.+?)' injectable")
_DBMS_RE      = re.compile(r"the back-end DBMS is (.+)")
_DB_ENTRY_RE  = re.compile(r"^\[\*\] (.+)$")
_TABLE_RE     = re.compile(r"^\|\s+(\S+)\s+\|$")


def _parse_line(line: str) -> dict | None:
    m = _LEVEL_RE.match(line)
    if not m:
        return None
    level, text = m.group(1), m.group(2)

    inj = _INJECTION_RE.search(text)
    if inj:
        return {"type": "found", "data": {
            "kind":   "injection",
            "param":  inj.group(1),
            "detail": inj.group(2),
        }}

    db = _DBMS_RE.search(text)
    if db:
        return {"type": "found", "data": {
            "kind":   "dbms",
            "param":  "Backend DBMS",
            "detail": db.group(1).strip(),
        }}

    return {"type": "progress", "data": line, "level": level}


class SqlmapTool(BaseTool):
    name  = "sqlmap"
    label = "sqlmap"

    def validate_target(self, target: str) -> bool:
        return bool(re.match(r"^https?://", target))

    def build_command(self, target: str, options: dict) -> list[str]:
        cmd = ["sqlmap", "-u", target, "--batch", "--no-color"]

        data = (options.get("data") or "").strip()
        if data:
            cmd.extend(["--data", data])

        cookie = (options.get("cookie") or "").strip()
        if cookie:
            cmd.extend(["--cookie", cookie])

        dbms = (options.get("dbms") or "").strip()
        if dbms:
            cmd.extend(["--dbms", dbms])

        level = options.get("level", 1)
        try:
            level = max(1, min(5, int(level)))
        except (TypeError, ValueError):
            level = 1
        cmd.extend(["--level", str(level)])

        risk = options.get("risk", 1)
        try:
            risk = max(1, min(3, int(risk)))
        except (TypeError, ValueError):
            risk = 1
        cmd.extend(["--risk", str(risk)])

        technique = (options.get("technique") or "").strip()
        if technique and re.match(r"^[BEUSTQbeustq]+$", technique):
            cmd.extend(["--technique", technique.upper()])

        threads = options.get("threads")
        if threads and str(threads).isdigit():
            cmd.extend(["--threads", str(max(1, min(10, int(threads))))])

        if options.get("random_agent"):
            cmd.append("--random-agent")

        if options.get("enum_dbs"):
            cmd.append("--dbs")

        db = (options.get("db") or "").strip()
        if db:
            cmd.extend(["-D", db])

        if options.get("enum_tables"):
            cmd.append("--tables")

        table = (options.get("table") or "").strip()
        if table:
            cmd.extend(["-T", table])

        if options.get("dump"):
            cmd.append("--dump")

        proxy = (options.get("proxy_url") or "").strip()
        if proxy and re.match(r"^https?://", proxy):
            cmd.extend(["--proxy", proxy])

        return cmd

    def parse_stdout_line(self, line: str) -> dict | None:
        if not line:
            return None

        # database / table list entries: [*] name
        m = _DB_ENTRY_RE.match(line)
        if m:
            return {"type": "found", "data": {
                "kind":   "entry",
                "param":  m.group(1).strip(),
                "detail": "",
            }}

        return _parse_line(line)

    def parse_stderr_line(self, line: str) -> dict | None:
        return {"type": "progress", "data": line, "level": "ERROR"} if line else None

    def parse_result(self, stdout_lines: list[str]) -> dict:
        findings, seen = [], set()
        for raw in stdout_lines:
            r = _parse_line(raw) or (
                {"type": "found", "data": {"kind": "entry", "param": _DB_ENTRY_RE.match(raw).group(1).strip(), "detail": ""}}
                if _DB_ENTRY_RE.match(raw) else None
            )
            if r and r["type"] == "found":
                key = (r["data"]["kind"], r["data"]["param"], r["data"]["detail"])
                if key not in seen:
                    seen.add(key)
                    findings.append(r["data"])
        return {"findings": findings, "total": len(findings)}
