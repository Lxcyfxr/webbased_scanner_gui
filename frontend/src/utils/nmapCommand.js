// Mirrors backend tools/nmap.py build_command so the UI can preview the command live.
export function buildNmapCommand(target, options = {}) {
  const p = ['nmap']

  if (options.ping_scan)  p.push('-sn')
  else if (options.udp_scan) p.push('-sU')
  else p.push('-sT')

  if (options.service_version) p.push('-sV')
  if (options.os_detection)    p.push('-O')
  if (options.default_scripts) p.push('-sC')

  const timing = options.timing ?? 3
  p.push(`-T${timing}`)

  if (options.ports)       p.push('-p', options.ports)
  if (options.no_ping)     p.push('-Pn')
  if (options.no_dns)      p.push('-n')
  if (options.force_dns)   p.push('-R')
  if (options.open_only)   p.push('--open')
  if (options.fast_mode)   p.push('-F')
  if (options.aggressive)  p.push('-A')
  if (options.traceroute)  p.push('--traceroute')
  if (options.reason)      p.push('--reason')
  if (options.ipv6)        p.push('-6')
  if (options.top_ports)   p.push('--top-ports',   String(options.top_ports))
  if (options.min_rate)    p.push('--min-rate',     String(options.min_rate))
  if (options.max_rate)    p.push('--max-rate',     String(options.max_rate))
  if (options.max_retries != null) p.push('--max-retries', String(options.max_retries))
  if (options.scan_delay)  p.push('--scan-delay',  options.scan_delay)
  if (options.badsum)      p.push('--badsum')
  if (options.source_port) p.push('--source-port', String(options.source_port))
  if (options.data_length) p.push('--data-length', String(options.data_length))
  if (options.ttl)         p.push('--ttl',         String(options.ttl))
  if (options.script)      p.push('--script',      options.script)
  if (options.script_args) p.push('--script-args', options.script_args)
  if (options.proxy_url)   p.push('--proxies',     options.proxy_url)

  p.push(target || '<target>')
  return p.join(' ')
}
