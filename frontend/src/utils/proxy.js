const KEY = 'proxy_config'

export function loadProxy() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null }
}

export function saveProxy(config) {
  localStorage.setItem(KEY, JSON.stringify(config))
}

export function getProxyUrl() {
  const c = loadProxy()
  if (!c?.enabled || !c.host || !c.port) return null
  const auth = c.username
    ? `${encodeURIComponent(c.username)}:${encodeURIComponent(c.password ?? '')}@`
    : ''
  return `${c.type ?? 'http'}://${auth}${c.host}:${c.port}`
}
