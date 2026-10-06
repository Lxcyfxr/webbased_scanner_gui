import json
import re
from .base import BaseTool

_SEVERITY_ORDER = ("critical", "high", "medium", "low", "info", "unknown")


class NucleiTool(BaseTool):
    name = "nuclei"
    label = "Nuclei"

    def validate_target(self, target: str) -> bool:
        patterns = [
            r"^https?://",
            r"^(\d{1,3}\.){3}\d{1,3}(:\d+)?$",
            r"^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?(:\d+)?$",
        ]
        return any(re.match(p, target) for p in patterns)

    def build_command(self, target: str, options: dict) -> list[str]:
        cmd = [
            "nuclei",
            "-u", target,
            "-jsonl",           # JSON lines to stdout
            "-nc",              # no colour / ANSI codes
            "-silent",          # findings only (no banner noise)
            "-ot",              # omit base64-encoded template in each line
            "-no-interactsh",   # disable OOB interaction server
        ]

        severity = options.get("severity")
        if severity and isinstance(severity, list):
            cmd.extend(["-severity", ",".join(severity)])

        tags = options.get("tags", "").strip()
        if tags:
            cmd.extend(["-tags", tags])

        templates = options.get("templates", "").strip()
        if templates:
            cmd.extend(["-t", templates])

        rate_limit = options.get("rate_limit")
        if rate_limit and str(rate_limit).isdigit():
            cmd.extend(["-rate-limit", str(rate_limit)])

        max_time = options.get("max_time", "").strip()
        if max_time and re.match(r"^\d+[smh]$", max_time):
            cmd.extend(["-max-time", max_time])

        proxy = options.get("proxy_url", "").strip()
        if proxy and re.match(r"^https?://", proxy):
            cmd.extend(["-proxy", proxy])

        return cmd

    def parse_stdout_line(self, line: str) -> dict | None:
        if not line:
            return None
        try:
            obj = json.loads(line)
            if "template-id" in obj and "info" in obj:
                info = obj["info"]
                finding = {
                    "template_id":  obj.get("template-id", ""),
                    "name":         info.get("name", ""),
                    "severity":     info.get("severity", "unknown").lower(),
                    "tags":         info.get("tags", []),
                    "matched_at":   obj.get("matched-at", obj.get("host", "")),
                    "type":         obj.get("type", ""),
                    "ip":           obj.get("ip", ""),
                    "description":  info.get("description", ""),
                    "matcher_name": obj.get("matcher-name", ""),
                    "extracted":    obj.get("extracted-results", []),
                }
                return {"type": "found", "data": finding}
            return {"type": "progress", "data": line}
        except (json.JSONDecodeError, KeyError):
            return {"type": "progress", "data": line}

    def parse_stderr_line(self, line: str) -> dict | None:
        return {"type": "progress", "data": line} if line else None

    def parse_result(self, stdout_lines: list[str]) -> dict:
        findings = []
        counts = {s: 0 for s in _SEVERITY_ORDER}
        for raw in stdout_lines:
            try:
                obj = json.loads(raw)
                if "template-id" in obj and "info" in obj:
                    sev = obj["info"].get("severity", "unknown").lower()
                    counts[sev] = counts.get(sev, 0) + 1
                    findings.append({
                        "template_id": obj.get("template-id", ""),
                        "name":        obj["info"].get("name", ""),
                        "severity":    sev,
                        "matched_at":  obj.get("matched-at", obj.get("host", "")),
                        "type":        obj.get("type", ""),
                    })
            except (json.JSONDecodeError, KeyError):
                pass
        return {"findings": findings, "counts": counts, "total": len(findings)}
