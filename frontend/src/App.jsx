import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Layout, Typography, Switch, Space, Button, Badge, Tooltip, theme as antTheme } from 'antd'
import { RadarChartOutlined, MoonOutlined, SunOutlined, GithubOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import ActivityBar    from './components/ActivityBar'
import ProxyModal     from './components/ProxyModal'
import NmapPage       from './pages/NmapPage'
import FuzzingPage    from './pages/FuzzingPage'
import MsfPage        from './pages/MsfPage'
import NiktoPage      from './pages/NiktoPage'
import NucleiPage     from './pages/NucleiPage'
import HydraPage      from './pages/HydraPage'
import HistoryPage    from './pages/HistoryPage'
import { loadProxy } from './utils/proxy'

const { Header, Footer } = Layout
const { Title } = Typography

function Shell({ isDark, onToggleDark }) {
  const { token } = antTheme.useToken()
  const [proxyOpen,   setProxyOpen]   = useState(false)
  const [proxyActive, setProxyActive] = useState(() => {
    const c = loadProxy()
    return !!(c?.enabled && c.host && c.port)
  })

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px', flexShrink: 0, background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <RadarChartOutlined style={{ color: token.colorPrimary, fontSize: 22 }} />
        <Title level={4} style={{ margin: 0, flex: 1, color: token.colorText }}>
          Web Security GUI
        </Title>

        <Tooltip title={proxyActive ? 'VPN/Proxy active' : 'No proxy configured'}>
          <Badge dot status={proxyActive ? 'success' : 'default'} offset={[-2, 2]}>
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={() => setProxyOpen(true)}
              type={proxyActive ? 'primary' : 'default'}
              size="small"
            >
              VPN
            </Button>
          </Badge>
        </Tooltip>

        <Switch
          checked={isDark}
          onChange={onToggleDark}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </Header>

      <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
        <ActivityBar />

        <Routes>
          <Route path="/"               element={<Navigate to="/tool/nmap" replace />} />
          <Route path="/tool/nmap"      element={<NmapPage />} />
          <Route path="/tool/fuzzing"     element={<FuzzingPage />} />
          <Route path="/tool/metasploit" element={<MsfPage />} />
          <Route path="/tool/nikto"      element={<NiktoPage />} />
          <Route path="/tool/nuclei"     element={<NucleiPage />} />
          <Route path="/tool/hydra"      element={<HydraPage />} />
          <Route path="/history"         element={<HistoryPage />} />
        </Routes>
      </Layout>

      <Footer style={{ textAlign: 'center', padding: '10px 24px', flexShrink: 0, background: token.colorBgContainer, borderTop: `1px solid ${token.colorBorderSecondary}`, fontSize: 12, color: token.colorTextSecondary }}>
        <Space separator={<span style={{ color: token.colorBorderSecondary }}>·</span>}>
          <span>v1.0.0</span>
          <a href="https://github.com/Lxcyfxr/webbased_scanner_gui" target="_blank" rel="noreferrer" style={{ color: token.colorTextSecondary }}>
            <GithubOutlined style={{ marginRight: 5 }} />
            Lxcyfxr/webbased_scanner_gui
          </a>
          <span>AGPL-3.0</span>
        </Space>
      </Footer>

      <ProxyModal
        open={proxyOpen}
        onClose={() => setProxyOpen(false)}
        onSave={setProxyActive}
      />
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
    <ConfigProvider theme={{ algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm }}>
      <BrowserRouter>
        <Shell isDark={isDark} onToggleDark={toggleDark} />
      </BrowserRouter>
    </ConfigProvider>
  )
}
