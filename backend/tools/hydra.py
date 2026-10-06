import re
from .base import BaseTool

# Protocols/modules commonly used; kept as a hint set for the GUI dropdown.
# Hydra itself accepts many more — anything the installed binary supports works.
SUPPORTED_SERVICES = (
    "ssh", "ftp", "ftps", "telnet", "smtp", "pop3", "imap",
    "http-get", "http-post-form", "https-get", "https-post-form",
    "http-head", "mysql", "postgres", "mssql", "vnc", "rdp",
    "smb", "snmp", "ldap2", "ldap3", "redis", "rsh", "rlogin",
)

# [port][service] host: 1.2.3.4   login: root   password: toor
_CRED_RE = re.compile(
    r"\[(\d+)\]\[([\w\-]+)\]\s+host:\s*(\S+)"
    r"(?:\s+login:\s*(\S*))?(?:\s+password:\s*(\S*))?"
)


class HydraTool(BaseTool):
    """Thin wrapper around THC-Hydra for authorised credential testing.

    Produces structured 'found' events for each recovered credential pair and
    streams the rest of hydra's output as progress lines, matching the
    conventions of the other tool integrations (nuclei, nikto, …).
    """

    name = "hydra"
    label = "Hydra"

    def validate_target(self, target: str) -> bool:
        patterns = [
            r"^(\d{1,3}\.){3}\d{1,3}$",                                  # IPv4
            r"^[a-fA-F0-9:]+$",                                          # IPv6 (loose)
            r"^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$",       # hostname/domain
        ]
        return any(re.match(p, target) for p in patterns)

    def build_command(self, target: str, options: dict) -> list[str]:
        cmd = ["hydra"]

        # ── credentials: single value or a wordlist file ──────────────────
        login = (options.get("login") or "").strip()
        login_file = (options.get("login_file") or "").strip()
        if login_file:
            cmd.extend(["-L", login_file])
        elif login:
            cmd.extend(["-l", login])

        password = options.get("password") or ""
        password_file = (options.get("password_file") or "").strip()
        if password_file:
            cmd.extend(["-P", password_file])
        elif password != "":
            cmd.extend(["-p", password])

        # ── -e nsr: try null / login-as-pass / reversed login ─────────────
        extra = options.get("extra")  # subset of {"n","s","r"}
        if extra and isinstance(extra, list):
            flag = "".join(c for c in ("n", "s", "r") if c in extra)
            if flag:
                cmd.extend(["-e", flag])

        # ── tuning ────────────────────────────────────────────────────────
        port = options.get("port")
        if port and str(port).isdigit():
            cmd.extend(["-s", str(port)])

        tasks = options.get("tasks")
        if tasks and str(tasks).isdigit():
            cmd.extend(["-t", str(tasks)])

        wait = options.get("wait")  # per-connect timeout (-w)
        if wait and str(wait).isdigit():
            cmd.extend(["-w", str(wait)])

        if options.get("stop_on_first"):
            cmd.append("-f")

        if options.get("verbose"):
            cmd.append("-V")   # show each attempt

        # Always ignore the restore file so a prior aborted run never resumes
        # unexpectedly, and never prompt interactively.
        cmd.append("-I")

        # ── target + service module ────────────────────────────────────────
        service = (options.get("service") or "").strip()
        cmd.append(target)
        if service:
            cmd.append(service)

        # http-*-form and some modules take a trailing module argument, e.g.
        #   "/login:user=^USER^&pass=^PASS^:F=incorrect"
        module_args = (options.get("module_args") or "").strip()
        if module_args:
            cmd.append(module_args)

        return cmd

    def _match_cred(self, line: str) -> dict | None:
        m = _CRED_RE.search(line)
        if not m:
            return None
        port, svc, host, user, pw = m.groups()
        return {
            "port":     port,
            "service":  svc,
            "host":     host,
            "login":    user or "",
            "password": pw or "",
        }

    def parse_stdout_line(self, line: str) -> dict | None:
        if not line:
            return None
        cred = self._match_cred(line)
        if cred:
            return {"type": "found", "data": cred}
        return {"type": "progress", "data": line}

    def parse_stderr_line(self, line: str) -> dict | None:
        if not line:
            return None
        # Hydra prints attempt counters and the result banner to stderr too;
        # recovered creds can appear here, so check for them as well.
        cred = self._match_cred(line)
        if cred:
            return {"type": "found", "data": cred}
        return {"type": "progress", "data": line}

    def parse_result(self, stdout_lines: list[str]) -> dict:
        creds = []
        seen = set()
        for raw in stdout_lines:
            cred = self._match_cred(raw)
            if not cred:
                continue
            key = (cred["host"], cred["port"], cred["login"], cred["password"])
            if key in seen:
                continue
            seen.add(key)
            creds.append(cred)
        return {"credentials": creds, "total": len(creds)}
