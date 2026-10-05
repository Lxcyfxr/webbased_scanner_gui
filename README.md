# Web Security GUI

A web-based graphical interface for network scanning and web fuzzing, built with FastAPI and React.

## Features

- **Network scanning** via nmap — live port discovery, OS detection, NSE scripts, full export
- **Web fuzzing** via ffuf, feroxbuster, gobuster or wenum — engine selector, live results table, wordlist presets
- Real-time output streaming over WebSocket
- Dark mode, scan history, JSON / CSV / XML export
- Advanced options with inline tooltips for every flag

## Supported tools

| Tool | Purpose |
|---|---|
| nmap | Network & port scanning |
| ffuf | Fast web fuzzer — API & directory discovery |
| feroxbuster | Recursive content discovery |
| gobuster | Directory, DNS & vhost enumeration |
| wenum | wfuzz successor — flexible filter-based fuzzing |

---

## Installation

### Option 1 — Docker (recommended)

No dependencies needed on the host beyond Docker.

```bash
git clone https://github.com/Lxcyfxr/webbased_scanner_gui.git
cd webbased_scanner_gui
docker compose up -d
```

Open **http://localhost:8080** in your browser.

> **Note on SYN scans:** The container runs with `NET_RAW` and `NET_ADMIN` capabilities so nmap can perform SYN scans (`-sS`) without being root on the host.

**Useful commands:**

```bash
# Stop
docker compose down

# View logs
docker compose logs -f

# Rebuild after a code change
docker compose up -d --build

# Change port (default 8080)
HOST_PORT=9090 docker compose up -d
```

**Data persistence:** The SQLite database is stored in a named Docker volume (`scanner-data`) and survives container restarts and rebuilds.

---

### Option 2 — Debian / Kali package

Build the `.deb` from source (requires `node`, `npm`, `python3`, `dpkg-deb`):

```bash
git clone https://github.com/Lxcyfxr/webbased_scanner_gui.git
cd webbased_scanner_gui
./build-deb.sh
sudo dpkg -i dist/webbased-scanner-gui_1.0.0_all.deb
sudo apt-get install -f   # install any missing dependencies
```

The installer:
1. Creates a `websecgui` system user
2. Sets up a Python venv in `/usr/share/webbased-scanner-gui/venv`
3. Adds a sudoers rule so nmap can run as root for SYN/UDP scans
4. Enables and starts the systemd service

Open **http://localhost:8080** in your browser.

**Service management:**

```bash
sudo systemctl status  webbased-scanner-gui
sudo systemctl restart webbased-scanner-gui
sudo systemctl stop    webbased-scanner-gui
journalctl -u webbased-scanner-gui -f   # live logs
```

**Configuration** (`/etc/webbased-scanner-gui/config.env`):

```bash
PORT=8080
DATABASE_URL=sqlite:////var/lib/webbased-scanner-gui/scans.db
# CORS_ORIGINS=http://localhost:8080
```

Restart the service after editing.

**Uninstall:**

```bash
sudo apt remove webbased-scanner-gui          # keeps database
sudo apt purge  webbased-scanner-gui          # removes everything
```

---

### Option 3 — Development setup

```bash
git clone https://github.com/Lxcyfxr/webbased_scanner_gui.git
cd webbased_scanner_gui

# Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend (Vite dev server) | http://localhost:5173 |
| Backend API + docs | http://localhost:8000/docs |

The Vite dev server proxies all `/jobs`, `/ws`, `/tools` and `/wordlists` requests to the backend automatically.

---

## Configuration

| Environment variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./nmap_scans.db` | SQLAlchemy database URL |
| `PORT` | `8080` | Port to listen on |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins (`*` = all) |

---

## nmap permissions

Some nmap scan types require raw socket access:

| Scan type | Needs root? |
|---|---|
| TCP Connect (`-sT`) | No |
| Ping scan (`-sn`) | No |
| SYN scan (`-sS`) | Yes |
| UDP scan (`-sU`) | Yes |
| OS detection (`-O`) | Yes |

- **Docker:** handled via `NET_RAW` / `NET_ADMIN` capabilities in `docker-compose.yml`
- **DEB:** handled via a sudoers rule created during `postinst`
- **Dev:** run `sudo uvicorn ...` or set the setuid bit: `sudo chmod u+s /usr/bin/nmap`

---

## Fuzzing wordlists

The app auto-detects wordlists installed on the system:

| Wordlist | Package |
|---|---|
| `/usr/share/wordlists/dirb/common.txt` | `dirb` |
| `/usr/share/wordlists/dirb/big.txt` | `dirb` |
| `/usr/share/seclists/...` | `seclists` |

Install on Kali: `sudo apt install seclists dirb`

Custom paths can always be entered manually in the wordlist field.

---

## Legal

This tool is intended for use on networks and systems you own or have **explicit written permission** to test. Unauthorized scanning may be illegal in your jurisdiction. The authors accept no liability for misuse.

**nmap** is distributed under the [Nmap Public Source License](https://nmap.org/npsl/). This project calls nmap as an external process and does not include or modify nmap's source code.

**Third-party dependency licenses:**

| Dependency | License |
|---|---|
| FastAPI, SQLAlchemy, Pydantic, aiofiles | MIT |
| uvicorn, Starlette, anyio, websockets | BSD-3-Clause |
| React, Ant Design, react-router-dom | MIT |
| lightningcss (build tool only) | MPL-2.0 |

Full license texts are available in [`packaging/deb/copyright`](packaging/deb/copyright).

---

## License

AGPL-3.0 — see [LICENSE](LICENSE).

Anyone who distributes or **hosts** a modified version must publish their source code under the same license.
