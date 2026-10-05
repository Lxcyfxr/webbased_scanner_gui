import { useState, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, Layout, Typography, Space, Switch, theme as antTheme } from 'antd'
import { RadarChartOutlined, MoonOutlined, SunOutlined, GithubOutlined } from '@ant-design/icons'
import ScanForm from './components/ScanForm'
import ScanHistory from './components/ScanHistory'
import ScanProgress from './components/ScanProgress'
import ScanResults from './components/ScanResults'
import HistoryPage from './pages/HistoryPage'
import { createScan, openScanSocket } from './api'

const { Header, Sider, Content, Footer } = Layout
const { Title } = Typography

function AppLayout({ isDark, onToggleDark }) {
  const { token } = antTheme.useToken()
  const [scanning, setScanning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [progressLines, setProgressLines] = useState([])
  const [discoveries, setDiscoveries] = useState({ hosts: [], ports: [] })
  const [result, setResult] = useState(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)

  const handleScan = useCallback(async (target, options) => {
    setScanning(true)
    setStopping(false)
    setProgressLines([])
    setDiscoveries({ hosts: [], ports: [] })
    setResult(null)
    setError(null)

    try {
      const scan = await createScan(target, options)
      const ws = openScanSocket(
        scan.id,
        (msg) => {
          if (msg.type === 'progress') {
            setProgressLines(prev => [...prev, msg])
          } else if (msg.type === 'found_port') {
            setProgressLines(prev => [...prev, msg])
            setDiscoveries(prev => ({ ...prev, ports: [...prev.ports, msg] }))
          } else if (msg.type === 'found_host') {
            setProgressLines(prev => [...prev, msg])
            setDiscoveries(prev => ({ ...prev, hosts: [...prev.hosts, msg] }))
          } else if (msg.type === 'done') {
            setResult({ ...msg.json, target, scanId: scan.id, cancelled: msg.cancelled })
            setScanning(false)
            setStopping(false)
            setHistoryRefresh(n => n + 1)
          }
        },
        () => {
          setScanning(false)
          setStopping(false)
          setHistoryRefresh(n => n + 1)
        }
      )
      wsRef.current = ws
    } catch (err) {
      setError(err.message)
      setScanning(false)
    }
  }, [])

  const handleStop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'cancel' }))
      setStopping(true)
    }
  }, [])

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 24px',
          flexShrink: 0,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <RadarChartOutlined style={{ color: token.colorPrimary, fontSize: 22 }} />
        <Title level={4} style={{ margin: 0, flex: 1, color: token.colorText }}>
          nmap Web GUI
        </Title>
        <Switch
          checked={isDark}
          onChange={onToggleDark}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </Header>

      <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sider
          width={300}
          style={{
            background: token.colorBgContainer,
            padding: 20,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            overflowY: 'auto',
            height: '100%',
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <ScanForm onScan={handleScan} onStop={handleStop} scanning={scanning} stopping={stopping} />
            <ScanHistory key={historyRefresh} onSelect={setResult} />
          </Space>
        </Sider>

        <Content style={{ padding: 24, background: token.colorBgLayout, overflowY: 'auto', height: '100%' }}>
          {error && (
            <div style={{ color: token.colorError, marginBottom: 16 }}>Error: {error}</div>
          )}
          {scanning && <ScanProgress lines={progressLines} discoveries={discoveries} />}
          {!scanning && result && <ScanResults result={result} />}
          {!scanning && !result && !error && (
            <div style={{ textAlign: 'center', marginTop: 100, color: token.colorTextDisabled }}>
              <RadarChartOutlined style={{ fontSize: 72 }} />
              <div style={{ marginTop: 16, fontSize: 16 }}>
                Configure a scan on the left to get started
              </div>
            </div>
          )}
        </Content>
      </Layout>

      <Footer
        style={{
          textAlign: 'center',
          padding: '10px 24px',
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          fontSize: 12,
          color: token.colorTextSecondary,
        }}
      >
        <Space split={<span style={{ color: token.colorBorderSecondary }}>·</span>}>
          <span>v1.0.0</span>
          <a
            href="https://github.com/Lxcyfxr/webbased_scanner_gui"
            target="_blank"
            rel="noreferrer"
            style={{ color: token.colorTextSecondary }}
          >
            <GithubOutlined style={{ marginRight: 5 }} />
            Lxcyfxr/webbased_scanner_gui
          </a>
          <span>AGPL-3.0</span>
        </Space>
      </Footer>
    </Layout>
  )
}

export default function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  const toggleDark = (checked) => {
    setIsDark(checked)
    localStorage.setItem('theme', checked ? 'dark' : 'light')
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout isDark={isDark} onToggleDark={toggleDark} />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
