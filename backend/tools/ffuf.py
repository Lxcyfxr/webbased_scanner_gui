import re
from .base import BaseTool

# ffuf result line: "word    [Status: 200, Size: 1234, Words: 45, Lines: 23, Duration: 5ms]"
_RESULT_RE = re.compile(
    r"^(\S+)\s+\[Status:\s*(\d+),\s*Size:\s*(\d+),\s*Words:\s*(\d+),\s*Lines:\s*(\d+)(?:,\s*Duration:\s*(\d+)ms)?\]"
)


class FfufTool(BaseTool):
    name = "ffuf"
    label = "ffuf"

    def validate_target(self, target: str) -> bool:
        return target.startswith(("http://", "https://"))

    def build_command(self, target: str, options: dict) -> list[str]:
        wordlist = options.get("wordlist", "")
        if not wordlist:
            raise ValueError("wordlist is required")

        url = target if "FUZZ" in target else target.rstrip("/") + "/FUZZ"

        cmd = [
            "ffuf",
            "-u", url,
            "-w", wordlist,
            "-t", str(options.get("threads", 40)),
            "-noninteractive",
        ]

        if options.get("filter_codes"):
            cmd.extend(["-fc", str(options["filter_codes"])])
        if options.get("filter_size"):
            cmd.extend(["-fs", str(options["filter_size"])])
        if options.get("filter_words"):
            cmd.extend(["-fw", str(options["filter_words"])])
        if options.get("match_codes"):
            cmd.extend(["-mc", str(options["match_codes"])])
        if options.get("extensions"):
            cmd.extend(["-e", options["extensions"]])
        if options.get("follow_redirects"):
            cmd.append("-r")
        if options.get("method") and options["method"] != "GET":
            cmd.extend(["-X", options["method"]])
        if options.get("data") and re.match(r"^[\w=&%+.\-@]+$", options["data"]):
            cmd.extend(["-d", options["data"]])
        if options.get("recursion"):
            cmd.extend(["-recursion", "-recursion-depth", str(options.get("recursion_depth", 2))])

        proxy = options.get("proxy_url")
        if proxy and re.match(r'^https?://', proxy):
            cmd.extend(["-x", proxy])

        return cmd

    def parse_stdout_line(self, line: str) -> dict | None:
        m = _RESULT_RE.match(line)
        if m:
            return {
                "type": "found",
                "data": {
                    "value": m.group(1),
                    "status": int(m.group(2)),
                    "size": int(m.group(3)),
                    "words": int(m.group(4)),
                    "lines": int(m.group(5)),
                    "duration": int(m.group(6)) if m.group(6) else None,
                },
            }
        if line and not line.startswith("::") and "ffuf" not in line.lower():
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
