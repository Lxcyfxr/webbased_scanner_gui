import asyncio
import re
import xml.etree.ElementTree as ET

ALLOWED_TIMING = {0, 1, 2, 3, 4, 5}


def validate_target(target: str) -> bool:
    patterns = [
        r"^(\d{1,3}\.){3}\d{1,3}(/\d{1,2})?$",                      # IP / CIDR
        r"^(\d{1,3}\.){3}\d{1,3}-\d{1,3}$",                          # IP range
        r"^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$",       # hostname
    ]
    return any(re.match(p, target) for p in patterns)


def validate_ports(ports: str) -> bool:
    return bool(re.match(r"^(\d{1,5}(-\d{1,5})?,?)+$", ports))


def build_command(target: str, options: dict) -> list[str]:
    cmd = ["nmap", "-oX", "-", "--stats-every", "2s", "-v"]

    if options.get("ping_scan"):
        cmd.append("-sn")
    elif options.get("udp_scan"):
        cmd.append("-sU")
    else:
        cmd.append("-sT")   # TCP connect scan — works without root

    if options.get("service_version"):
        cmd.append("-sV")
    if options.get("os_detection"):
        cmd.append("-O")
    if options.get("default_scripts"):
        cmd.append("-sC")

    timing = options.get("timing", 3)
    if timing in ALLOWED_TIMING:
        cmd.append(f"-T{timing}")

    ports = options.get("ports") or ""
    if ports and validate_ports(ports):
        cmd.extend(["-p", ports])

    # Host discovery
    if options.get("no_ping"):      cmd.append("-Pn")
    if options.get("no_dns"):       cmd.append("-n")
    if options.get("force_dns"):    cmd.append("-R")

    # Scan behaviour
    if options.get("open_only"):    cmd.append("--open")
    if options.get("fast_mode"):    cmd.append("-F")
    if options.get("aggressive"):   cmd.append("-A")
    if options.get("traceroute"):   cmd.append("--traceroute")
    if options.get("reason"):       cmd.append("--reason")
    if options.get("ipv6"):         cmd.append("-6")

    # Performance
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

    # Evasion
    if options.get("badsum"):       cmd.append("--badsum")
    if options.get("source_port") and str(options["source_port"]).isdigit():
        cmd.extend(["--source-port", str(options["source_port"])])
    if options.get("data_length") and str(options["data_length"]).isdigit():
        cmd.extend(["--data-length", str(options["data_length"])])
    if options.get("ttl") and str(options["ttl"]).isdigit():
        cmd.extend(["--ttl", str(options["ttl"])])

    # Scripts
    if options.get("script") and re.match(r"^[\w,\-\./]+$", str(options["script"])):
        cmd.extend(["--script", str(options["script"])])
    if options.get("script_args") and re.match(r"^[\w,\-\.=\'/]+$", str(options["script_args"])):
        cmd.extend(["--script-args", str(options["script_args"])])

    cmd.append(target)
    return cmd


def parse_xml(xml_str: str) -> dict:
    try:
        root = ET.fromstring(xml_str)
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
                    p: dict = {
                        "port": int(port.get("portid")),
                        "protocol": port.get("protocol"),
                    }
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
                    h["os"] = [
                        {"name": m.get("name"), "accuracy": m.get("accuracy")}
                        for m in matches[:3]
                    ]

            result["hosts"].append(h)

        return result
    except ET.ParseError:
        # nmap killed mid-scan may leave the closing tag missing — patch it
        if "<nmaprun" in xml_str and "</nmaprun>" not in xml_str:
            try:
                root = ET.fromstring(xml_str + "</nmaprun>")
                result = {"hosts": []}
                for host in root.findall("host"):
                    h: dict = {}
                    status = host.find("status")
                    if status is not None:
                        h["status"] = status.get("state")
                    for addr in host.findall("address"):
                        if addr.get("addrtype") == "ipv4":
                            h["ip"] = addr.get("addr")
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
                    result["hosts"].append(h)
                return result
            except ET.ParseError:
                pass
        return {"error": "XML parse failed", "raw": xml_str[:500]}


async def run_scan(target: str, options: dict, queue: asyncio.Queue, cancel_event: asyncio.Event | None = None) -> None:
    cmd = build_command(target, options)
    xml_lines: list[str] = []

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    async def watch_cancel():
        if cancel_event:
            await cancel_event.wait()
            try:
                proc.terminate()
            except ProcessLookupError:
                pass

    cancel_watcher = asyncio.create_task(watch_cancel())

    async def drain_stderr():
        async for line in proc.stderr:
            text = line.decode().strip()
            if not text:
                continue

            # Discovered open port 22/tcp on 192.168.1.1
            port_match = re.search(r"Discovered open port (\d+)/(\w+) on ([\S]+)", text)
            if port_match:
                await queue.put({
                    "type": "found_port",
                    "port": int(port_match.group(1)),
                    "protocol": port_match.group(2),
                    "ip": port_match.group(3),
                    "data": text,
                })
                continue

            # Host 192.168.1.1 appears to be up (ping scans)
            host_match = re.search(r"Host ([\S]+) appears to be up", text)
            if host_match:
                await queue.put({
                    "type": "found_host",
                    "ip": host_match.group(1),
                    "data": text,
                })
                continue

            pct_match = re.search(r"About ([\d.]+)%", text)
            etc_match = re.search(r"\((.+? remaining)\)", text)
            await queue.put({
                "type": "progress",
                "data": text,
                "percent": round(float(pct_match.group(1))) if pct_match else None,
                "remaining": etc_match.group(1) if etc_match else None,
            })

    async def drain_stdout():
        async for line in proc.stdout:
            xml_lines.append(line.decode())

    await asyncio.gather(drain_stderr(), drain_stdout())
    cancel_watcher.cancel()
    await proc.wait()

    cancelled = bool(cancel_event and cancel_event.is_set())
    xml_str = "".join(xml_lines)
    parsed = parse_xml(xml_str) if xml_str.strip() else {"hosts": []}

    await queue.put({
        "type": "done",
        "success": proc.returncode == 0 and not cancelled,
        "cancelled": cancelled,
        "xml": xml_str,
        "json": parsed,
    })
