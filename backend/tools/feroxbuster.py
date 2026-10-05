import re
import json
from .base import BaseTool


class FeroxbusterTool(BaseTool):
    name = "feroxbuster"
    label = "feroxbuster"

    def validate_target(self, target: str) -> bool:
        return target.startswith(("http://", "https://"))

    def build_command(self, target: str, options: dict) -> list[str]:
        wordlist = options.get("wordlist", "")
        if not wordlist:
            raise ValueError("wordlist is required")

        cmd = [
            "feroxbuster",
            "-u", target,
            "-w", wordlist,
            "-t", str(options.get("threads", 50)),
            "--json",
            "--no-state",
            "--silent",
        ]

        if options.get("filter_codes"):
            for code in str(options["filter_codes"]).split(","):
                cmd.extend(["--filter-status", code.strip()])
        if options.get("filter_size"):
            cmd.extend(["--filter-size", str(options["filter_size"])])
        if options.get("filter_words"):
            cmd.extend(["--filter-words", str(options["filter_words"])])
        if options.get("extensions"):
            cmd.extend(["-x", options["extensions"]])
        if options.get("depth"):
            cmd.extend(["-d", str(options["depth"])])
        if options.get("insecure"):
            cmd.append("-k")
        if not options.get("recursion", True):
            cmd.append("--no-recursion")

        return cmd

    def parse_stdout_line(self, line: str) -> dict | None:
        try:
            data = json.loads(line)
            if data.get("type") == "response":
                return {
                    "type": "found",
                    "data": {
                        "value": data.get("url", ""),
                        "status": data.get("status", 0),
                        "size": data.get("content_length", 0),
                        "words": data.get("word_count", 0),
                        "lines": data.get("line_count", 0),
                    },
                }
        except (json.JSONDecodeError, KeyError):
            if line:
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
