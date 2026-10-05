const BASE = 'http://localhost:8000'

export const createScan = (target, options) =>
  fetch(`${BASE}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, options }),
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

export const listScans = () =>
  fetch(`${BASE}/scans`).then(r => r.json())

export const deleteScan = (id) =>
  fetch(`${BASE}/scans/${id}`, { method: 'DELETE' })

export const openScanSocket = (id, onMessage, onClose) => {
  const ws = new WebSocket(`ws://localhost:8000/ws/scans/${id}`)
  ws.onmessage = e => onMessage(JSON.parse(e.data))
  if (onClose) ws.onclose = onClose
  return ws
}
