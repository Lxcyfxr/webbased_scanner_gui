const BASE = 'http://localhost:8000'

export const createJob  = (tool, target, options) =>
  fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, target, options }),
  }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })

export const listJobs   = (tool) =>
  fetch(`${BASE}/jobs${tool ? `?tool=${tool}` : ''}`).then(r => r.json())

export const getJob     = (id)   =>
  fetch(`${BASE}/jobs/${id}`).then(r => r.json())

export const deleteJob  = (id)   =>
  fetch(`${BASE}/jobs/${id}`, { method: 'DELETE' })

export const listWordlists = () =>
  fetch(`${BASE}/wordlists`).then(r => r.json())

export const openJobSocket = (id, onMessage, onClose) => {
  const ws = new WebSocket(`ws://localhost:8000/ws/jobs/${id}`)
  ws.onmessage = e => onMessage(JSON.parse(e.data))
  if (onClose) ws.onclose = onClose
  return ws
}
