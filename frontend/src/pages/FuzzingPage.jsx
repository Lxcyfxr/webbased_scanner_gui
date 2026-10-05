import { useState, useCallback, useRef } from 'react'
import { Layout, Space, Card, Typography, theme as antTheme } from 'antd'
import FuzzingForm    from '../components/fuzzing/FuzzingForm'
import FuzzingResults from '../components/fuzzing/FuzzingResults'
import ScanProgress   from '../components/ScanProgress'
import ScanHistory    from '../components/ScanHistory'
import { createJob, openJobSocket } from '../api'
import { getProxyUrl } from '../utils/proxy'

const { Sider, Content } = Layout
const { Text } = Typography

export default function FuzzingPage() {
  const { token } = antTheme.useToken()
  const [scanning, setScanning]   = useState(false)
  const [stopping, setStopping]   = useState(false)
  const [lines, setLines]         = useState([])
  const [liveFindings, setLive]   = useState([])
  const [result, setResult]       = useState(null)
  const [historyKey, setHKey]     = useState(0)
  const [error, setError]         = useState(null)
  const wsRef = useRef(null)

  const handleScan = useCallback(async (engine, target, options) => {
    setScanning(true); setStopping(false)
    setLines([]); setLive([]); setResult(null); setError(null)
    try {
      const proxyUrl = getProxyUrl()
      const job = await createJob(engine, target, { ...options, ...(proxyUrl ? { proxy_url: proxyUrl } : {}) })
      const ws  = openJobSocket(job.id, (msg) => {
        if (msg.type === 'progress') {
          setLines(p => [...p, msg])
        } else if (msg.type === 'found') {
          setLive(p => [...p, msg.data])
        } else if (msg.type === 'done') {
          setResult({ ...msg.json, target, engine, jobId: job.id, cancelled: msg.cancelled })
          setScanning(false); setStopping(false); setHKey(n => n + 1)
        }
      }, () => { setScanning(false); setStopping(false); setHKey(n => n + 1) })
      wsRef.current = ws
    } catch (e) { setError(e.message); setScanning(false) }
  }, [])

  const handleStop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }))
    setStopping(true)
  }, [])

  const handleHistorySelect = (job) => {
    if (!job.result_json) return
    const parsed = JSON.parse(job.result_json)
    setResult({ ...parsed, target: job.target, engine: job.tool, jobId: job.id, cancelled: job.status === 'cancelled' })
  }

  return (
    <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Sider width={320} style={{ background: token.colorBgContainer, padding: 20, borderRight: `1px solid ${token.colorBorderSecondary}`, overflowY: 'auto', height: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <FuzzingForm onScan={handleScan} onStop={handleStop} scanning={scanning} stopping={stopping} />
          <ScanHistory key={historyKey} onSelect={handleHistorySelect} tool={null} fuzzing />
        </Space>
      </Sider>

      <Content style={{ padding: 24, background: token.colorBgLayout, overflowY: 'auto' }}>
        {error && <div style={{ color: token.colorError, marginBottom: 16 }}>Error: {error}</div>}

        {scanning && (
          <>
            <FuzzingResults
              result={{ findings: liveFindings, target: 'scanning…' }}
              live
            />
            <Card size="small" style={{ marginTop: 16 }} title="Output">
              <ScanProgress lines={lines} compact />
            </Card>
          </>
        )}

        {!scanning && result && <FuzzingResults result={result} />}

        {!scanning && !result && !error && (
          <div style={{ textAlign: 'center', marginTop: 100, color: token.colorTextDisabled, fontSize: 16 }}>
            Configure a fuzzing job on the left to get started
          </div>
        )}
      </Content>
    </Layout>
  )
}
