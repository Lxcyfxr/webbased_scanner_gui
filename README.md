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

AGPL-3.0 — see [LICENSE](LICENSE).

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version. If you run a modified version over a network, you must make the
source available to users of that service.
