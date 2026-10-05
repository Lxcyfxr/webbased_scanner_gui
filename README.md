# nmap Web GUI

A web-based graphical interface for nmap, built with FastAPI and React.

## Features

- Live scan progress with real-time port discovery
- Advanced scan options and NSE script picker
- Scan history with full report viewer
- Dark mode

## Requirements

- Python 3.11+
- Node.js 18+
- [nmap](https://nmap.org/download.html) installed on the system

## Getting started

**Backend**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The API runs on `http://localhost:8000`.

## Legal

This tool is intended for use on networks and systems you own or have explicit
written permission to test. Unauthorized scanning may be illegal in your
jurisdiction. The authors accept no liability for misuse.

**nmap** is distributed under the [Nmap Public Source License](https://nmap.org/npsl/).
This project calls nmap as an external process and does not include or modify
nmap's source code.

**Dependencies** are listed in `requirements.txt` and `frontend/package.json`.
All are distributed under permissive licenses (MIT, BSD-3-Clause, Apache-2.0,
ISC, MPL-2.0). Full license texts are available in their respective packages.

## License

MIT — see [LICENSE](LICENSE).
