import re
import xml.etree.ElementTree as ET
from .base import BaseTool

ALLOWED_TIMING = {0, 1, 2, 3, 4, 5}


def _validate_ports(ports: str) -> bool:
    return bool(re.match(r"^(\d{1,5}(-\d{1,5})?,?)+$", ports))


def _parse_xml(xml_str: str) -> dict:
    def _try(raw):
        root = ET.fromstring(raw)
        result = {"hosts": []}
        for host in root.findall("host"):
            h: dict = {}
            status = host.find("status")
            if status is not None:
                h["status"] = status.get("state")
            for addr in host.findall("address"):
                if addr.get("addrtype") == "ipv4":
                    h["ip"] = addr.get("addr")
                elif addr.get("addrtype") == "mac":
                    h["mac"] = addr.get("addr")
            hostnames_el = host.find("hostnames")
            if hostnames_el is not None:
                h["hostnames"] = [hn.get("name") for hn in hostnames_el.findall("hostname")]
            ports_el = host.find("ports")
            if ports_el is not None:
                ports = []
                for port in ports_el.findall("port"):
                    p: dict = {"port": int(port.get("portid")), "protocol": port.get("protocol")}
                    state = port.find("state")
                    if state is not None:
                        p["state"] = state.get("state")
                    service = port.find("service")
                    if service is not None:
                        p["service"] = service.get("name", "")
                        p["product"] = service.get("product", "")
                        p["version"] = service.get("version", "")
                    ports.append(p)
                h["ports"] = ports
            os_el = host.find("os")
            if os_el is not None:
                matches = os_el.findall("osmatch")
                if matches:
                    h["os"] = [{"name": m.get("name"), "accuracy": m.get("accuracy")} for m in matches[:3]]
            result["hosts"].append(h)
        return result
    try:
        return _try(xml_str)
    except ET.ParseError:
        if "<nmaprun" in xml_str and "</nmaprun>" not in xml_str:
            try:
                return _try(xml_str + "</nmaprun>")
            except ET.ParseError:
                pass
        return {"hosts": [], "error": "XML parse failed"}


class NmapTool(BaseTool):
    name = "nmap"
    label = "nmap"

    def validate_target(self, target: str) -> bool:
        patterns = [
            r"^(\d{1,3}\.){3}\d{1,3}(/\d{1,2})?$",
            r"^(\d{1,3}\.){3}\d{1,3}-\d{1,3}$",
            r"^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$",
        ]
        return any(re.match(p, target) for p in patterns)

    def build_command(self, target: str, options: dict) -> list[str]:
        cmd = ["nmap", "-oX", "-", "--stats-every", "2s", "-v"]
        if options.get("ping_scan"):
            cmd.append("-sn")
        elif options.get("udp_scan"):
            cmd.append("-sU")
        else:
            cmd.append("-sT")
        if options.get("service_version"): cmd.append("-sV")
        if options.get("os_detection"):    cmd.append("-O")
        if options.get("default_scripts"): cmd.append("-sC")
        timing = options.get("timing", 3)
        if timing in ALLOWED_TIMING:
            cmd.append(f"-T{timing}")
        ports = options.get("ports") or ""
        if ports and _validate_ports(ports):
            cmd.extend(["-p", ports])
        if options.get("no_ping"):    cmd.append("-Pn")
        if options.get("no_dns"):     cmd.append("-n")
        if options.get("force_dns"):  cmd.append("-R")
        if options.get("open_only"):  cmd.append("--open")
        if options.get("fast_mode"):  cmd.append("-F")
        if options.get("aggressive"): cmd.append("-A")
        if options.get("traceroute"): cmd.append("--traceroute")
        if options.get("reason"):     cmd.append("--reason")
        if options.get("ipv6"):       cmd.append("-6")
        if options.get("top_ports") and str(options["top_ports"]).isdigit():
            cmd.extend(["--top-ports", str(options["top_ports"])])
        if options.get("min_rate") and str(options["min_rate"]).isdigit():
            cmd.extend(["--min-rate", str(options["min_rate"])])
        if options.get("max_rate") and str(options["max_rate"]).isdigit():
            cmd.extend(["--max-rate", str(options["max_rate"])])
        if options.get("max_retries") is not None and str(options["max_retries"]).isdigit():
            cmd.extend(["--max-retries", str(options["max_retries"])])
        if options.get("scan_delay") and re.match(r"^\d+(ms|s)?$", str(options["scan_delay"])):
            cmd.extend(["--scan-delay", str(options["scan_delay"])])
        if options.get("badsum"):     cmd.append("--badsum")
        if options.get("source_port") and str(options["source_port"]).isdigit():
            cmd.extend(["--source-port", str(options["source_port"])])
        if options.get("data_length") and str(options["data_length"]).isdigit():
            cmd.extend(["--data-length", str(options["data_length"])])
        if options.get("ttl") and str(options["ttl"]).isdigit():
            cmd.extend(["--ttl", str(options["ttl"])])
        if options.get("script") and re.match(r"^[\w,\-\./]+$", str(options["script"])):
            cmd.extend(["--script", str(options["script"])])
        if options.get("script_args") and re.match(r"^[\w,\-\.=\'/]+$", str(options["script_args"])):
            cmd.extend(["--script-args", str(options["script_args"])])
        proxy = options.get("proxy_url")
        if proxy and re.match(r'^(http|https|socks4|socks5)://', proxy):
            cmd.extend(["--proxies", proxy])

        cmd.append(target)
        return cmd

    def parse_stderr_line(self, line: str) -> dict | None:
        port_match = re.search(r"Discovered open port (\d+)/(\w+) on ([\S]+)", line)
        if port_match:
            return {"type": "found_port", "port": int(port_match.group(1)), "protocol": port_match.group(2), "ip": port_match.group(3), "data": line}
        host_match = re.search(r"Host ([\S]+) appears to be up", line)
        if host_match:
            return {"type": "found_host", "ip": host_match.group(1), "data": line}
        pct = re.search(r"About ([\d.]+)%", line)
        etc = re.search(r"\((.+? remaining)\)", line)
        return {"type": "progress", "data": line, "percent": round(float(pct.group(1))) if pct else None, "remaining": etc.group(1) if etc else None}

    def parse_stdout_line(self, line: str) -> dict | None:
        return None  # nmap XML comes from stdout, collected separately

    def parse_result(self, stdout_lines: list[str]) -> dict:
        return _parse_xml("\n".join(stdout_lines))
