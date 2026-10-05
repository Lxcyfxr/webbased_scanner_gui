import { useState, useCallback, useRef } from 'react'
import { Layout, Space, theme as antTheme } from 'antd'
import ScanForm    from '../components/ScanForm'
import ScanHistory from '../components/ScanHistory'
import ScanProgress from '../components/ScanProgress'
import ScanResults  from '../components/ScanResults'
import { createJob, openJobSocket } from '../api'
import { getProxyUrl } from '../utils/proxy'

const { Sider, Content } = Layout

export default function NmapPage() {
  const { token } = antTheme.useToken()
  const [scanning, setScanning]     = useState(false)
  const [stopping, setStopping]     = useState(false)
  const [progressLines, setLines]   = useState([])
  const [discoveries, setDisc]      = useState({ hosts: [], ports: [] })
  const [result, setResult]         = useState(null)
  const [historyKey, setHistoryKey] = useState(0)
  const [error, setError]           = useState(null)
  const wsRef = useRef(null)

  const handleScan = useCallback(async (target, options) => {
    setScanning(true); setStopping(false)
    setLines([]); setDisc({ hosts: [], ports: [] })
    setResult(null); setError(null)
    try {
      const proxyUrl = getProxyUrl()
      const job = await createJob('nmap', target, { ...options, ...(proxyUrl ? { proxy_url: proxyUrl } : {}) })
      const ws  = openJobSocket(job.id, (msg) => {
        if (msg.type === 'progress')   setLines(p => [...p, msg])
        else if (msg.type === 'found_port') { setLines(p => [...p, msg]); setDisc(p => ({ ...p, ports: [...p.ports, msg] })) }
        else if (msg.type === 'found_host') { setLines(p => [...p, msg]); setDisc(p => ({ ...p, hosts: [...p.hosts, msg] })) }
        else if (msg.type === 'done') {
          setResult({ ...msg.json, target, scanId: job.id, cancelled: msg.cancelled })
          setScanning(false); setStopping(false); setHistoryKey(n => n + 1)
        }
      }, () => { setScanning(false); setStopping(false); setHistoryKey(n => n + 1) })
      wsRef.current = ws
    } catch (e) { setError(e.message); setScanning(false) }
  }, [])

  const handleStop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }))
    setStopping(true)
  }, [])

  return (
    <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Sider width={300} style={{ background: token.colorBgContainer, padding: 20, borderRight: `1px solid ${token.colorBorderSecondary}`, overflowY: 'auto', height: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <ScanForm onScan={handleScan} onStop={handleStop} scanning={scanning} stopping={stopping} />
          <ScanHistory key={historyKey} onSelect={setResult} tool="nmap" />
        </Space>
      </Sider>
      <Content style={{ padding: 24, background: token.colorBgLayout, overflowY: 'auto' }}>
        {error && <div style={{ color: token.colorError, marginBottom: 16 }}>Error: {error}</div>}
        {scanning && <ScanProgress lines={progressLines} discoveries={discoveries} />}
        {!scanning && result && <ScanResults result={result} />}
        {!scanning && !result && !error && (
          <div style={{ textAlign: 'center', marginTop: 100, color: token.colorTextDisabled, fontSize: 16 }}>
            Configure a scan on the left to get started
          </div>
        )}
      </Content>
    </Layout>
  )
}
