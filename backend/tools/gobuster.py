import re
from .base import BaseTool

# /admin                (Status: 200) [Size: 1234]
# /login                (Status: 301) [Size: 0] [--> http://target/login/]
_RESULT_RE = re.compile(
    r"^(/\S*)\s+\(Status:\s*(\d+)\)\s+\[Size:\s*(\d+)\](?:\s+\[-->\s*(.+?)\])?"
)


class GobusterTool(BaseTool):
    name = "gobuster"
    label = "gobuster"

    def validate_target(self, target: str) -> bool:
        return target.startswith(("http://", "https://"))

    def build_command(self, target: str, options: dict) -> list[str]:
        wordlist = options.get("wordlist", "")
        if not wordlist:
            raise ValueError("wordlist is required")

        mode = options.get("mode", "dir")

        cmd = [
            "gobuster", mode,
            "-u", target,
            "-w", wordlist,
            "-t", str(options.get("threads", 50)),
            "--no-progress",
            "-q",
        ]

        if options.get("extensions"):
            cmd.extend(["-x", options["extensions"]])
        if options.get("filter_codes"):
            cmd.extend(["-b", str(options["filter_codes"])])
        if options.get("insecure"):
            cmd.append("-k")
        if options.get("follow_redirects"):
            cmd.append("-r")

        proxy = options.get("proxy_url")
        if proxy and re.match(r'^https?://', proxy):
            cmd.extend(["--proxy", proxy])

        return cmd

    def parse_stdout_line(self, line: str) -> dict | None:
        m = _RESULT_RE.match(line.strip())
        if m:
            return {
                "type": "found",
                "data": {
                    "value": m.group(1),
                    "status": int(m.group(2)),
                    "size": int(m.group(3)),
                    "redirect": m.group(4),
                    "words": None,
                    "lines": None,
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
