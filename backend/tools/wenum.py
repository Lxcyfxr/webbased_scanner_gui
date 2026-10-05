import re
from .base import BaseTool

# wenum output: 000000157:   200        23 L     45 W     1234 Ch   "admin"
_RESULT_RE = re.compile(
    r"(\d+):\s+(\d+)\s+(\d+)\s+L\s+(\d+)\s+W\s+(\d+)\s+Ch\s+\"(.+)\""
)


class WenumTool(BaseTool):
    name = "wenum"
    label = "wenum"

    def validate_target(self, target: str) -> bool:
        return target.startswith(("http://", "https://"))

    def build_command(self, target: str, options: dict) -> list[str]:
        wordlist = options.get("wordlist", "")
        if not wordlist:
            raise ValueError("wordlist is required")

        url = target if "FUZZ" in target else target.rstrip("/") + "/FUZZ"

        cmd = [
            "wenum",
            "-u", url,
            "-w", wordlist,
            "-t", str(options.get("threads", 40)),
        ]

        if options.get("filter_codes"):
            cmd.extend(["--hc", str(options["filter_codes"])])
        if options.get("filter_size"):
            cmd.extend(["--hs", str(options["filter_size"])])
        if options.get("filter_words"):
            cmd.extend(["--hw", str(options["filter_words"])])
        if options.get("extensions"):
            cmd.extend(["-z", f"extensions,{options['extensions']}"])
        if options.get("follow_redirects"):
            cmd.append("-r")

        proxy = options.get("proxy_url")
        if proxy and re.match(r'^https?://', proxy):
            cmd.extend(["--proxy", proxy])

        return cmd

    def parse_stdout_line(self, line: str) -> dict | None:
        m = _RESULT_RE.search(line)
        if m:
            return {
                "type": "found",
                "data": {
                    "value": m.group(6),
                    "status": int(m.group(2)),
                    "lines": int(m.group(3)),
                    "words": int(m.group(4)),
                    "size": int(m.group(5)),
                },
            }
        if line.strip():
            return {"type": "progress", "data": line}
        return None

    def parse_stderr_line(self, line: str) -> dict | None:
        return {"type": "progress", "data": line} if line else None

    def parse_result(self, stdout_lines: list[str]) -> dict:
        findings = []
        for line in stdout_lines:
            msg = self.parse_stdout_line(line)
            if msg and msg["type"] == "found":
                findings.append(msg["data"])
        return {"findings": findings}
