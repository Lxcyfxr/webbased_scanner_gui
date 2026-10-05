# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (c) 2026 Lxcyfxr — https://github.com/Lxcyfxr/webbased_scanner_gui

# ── Stage 1: build the React frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + built frontend ───────────────────────────────────
FROM python:3.12-slim

LABEL org.opencontainers.image.title="Web Security GUI" \
      org.opencontainers.image.description="Web-based GUI for nmap and fuzzing tools" \
      org.opencontainers.image.source="https://github.com/Lxcyfxr/webbased_scanner_gui" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"

# Install nmap and optional fuzzing tools
RUN apt-get update && apt-get install -y --no-install-recommends \
        nmap \
        ffuf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY backend/ ./backend/

# Built frontend from stage 1
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Data volume for SQLite database
RUN mkdir -p /data
VOLUME ["/data"]

ENV DATABASE_URL=sqlite:////data/scans.db \
    PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/tools')"

CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}
