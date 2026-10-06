import re
from .base import BaseTool

SUPPORTED_SERVICES = (
    "ssh", "ftp", "ftps", "telnet", "smtp", "smtps", "pop3", "pop3s",
    "imap", "imaps", "http-get", "http-post-form", "https-get",
    "https-post-form", "http-head", "mysql", "postgres", "mssql",
    "vnc", "rdp", "smb", "snmp", "ldap2", "ldap3", "redis",
    "rsh", "rlogin", "rpcap", "svn", "teamspeak", "xmpp",
)

# [22][ssh] host: 192.168.1.1   login: root   password: toor
_CRED_RE = re.compile(
    r"\[(\d+)\]\[([\w\-]+)\]\s+host:\s*(\S+)"
    r"(?:\s+login:\s*(\S*))?(?:\s+password:\s*(\S*))?"
)


class HydraTool(BaseTool):
    name = "hydra"
    label = "Hydra"

    def validate_target(self, target: str) -> bool:
        return bool(re.match(
            r"^((\d{1,3}\.){3}\d{1,3}|[a-fA-F0-9:]+|[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?)$",
            target,
        ))

    def build_command(self, target: str, options: dict) -> list[str]:
        cmd = ["hydra", "-I"]   # always skip restore prompt

        # ── credentials ───────────────────────────────────────────────────
        login_file = (options.get("login_file") or "").strip()
        login      = (options.get("login")      or "").strip()
        if login_file:
            cmd += ["-L", login_file]
        elif login:
            cmd += ["-l", login]

        pass_file = (options.get("password_file") or "").strip()
        password  = (options.get("password")      or "").strip()
        if pass_file:
            cmd += ["-P", pass_file]
        elif password:
            cmd += ["-p", password]

        # ── extra checks (-e nsr) ─────────────────────────────────────────
        extra = options.get("extra") or []
        if isinstance(extra, list):
            flag = "".join(c for c in ("n", "s", "r") if c in extra)
            if flag:
                cmd += ["-e", flag]

        # ── port ──────────────────────────────────────────────────────────
        port = options.get("port")
        if port and str(port).isdigit():
            cmd += ["-s", str(port)]

        # ── tuning ────────────────────────────────────────────────────────
        tasks = options.get("tasks", 4)
        try:
            tasks = max(1, min(64, int(tasks)))
        except (TypeError, ValueError):
            tasks = 4
        cmd += ["-t", str(tasks)]

        wait = options.get("wait")
        if wait and str(wait).isdigit():
            cmd += ["-w", str(wait)]

        if options.get("stop_on_first"):
            cmd.append("-f")

        # -V shows every attempt — only enable when explicitly requested
        # (it can generate millions of lines for large wordlists)
        if options.get("verbose"):
            cmd.append("-V")

        # ── target + service + optional module args ────────────────────────
        service     = (options.get("service") or "ssh").strip()
        module_args = (options.get("module_args") or "").strip()

        cmd.append(target)
        cmd.append(service)
        if module_args:
            cmd.append(module_args)

        return cmd

    def _parse_cred(self, line: str) -> dict | None:
        m = _CRED_RE.search(line)
        if not m:
            return None
        port, svc, host, user, pw = m.groups()
        return {
            "port":     port,
            "service":  svc,
            "host":     host,
            "login":    user or "",
            "password": pw   or "",
        }

    def parse_stdout_line(self, line: str) -> dict | None:
        if not line:
            return None
        cred = self._parse_cred(line)
        if cred:
            return {"type": "found", "data": cred}
        return {"type": "progress", "data": line}

    def parse_stderr_line(self, line: str) -> dict | None:
        if not line:
            return None
        cred = self._parse_cred(line)
        if cred:
            return {"type": "found", "data": cred}
        return {"type": "progress", "data": line}

    def parse_result(self, stdout_lines: list[str]) -> dict:
        creds, seen = [], set()
        for raw in stdout_lines:
            c = self._parse_cred(raw)
            if not c:
                continue
            key = (c["host"], c["port"], c["login"], c["password"])
            if key in seen:
                continue
            seen.add(key)
            creds.append(c)
        return {"credentials": creds, "total": len(creds)}
