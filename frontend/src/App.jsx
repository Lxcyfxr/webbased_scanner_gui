import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Layout, Typography, Switch, Space, theme as antTheme } from 'antd'
import { RadarChartOutlined, MoonOutlined, SunOutlined, GithubOutlined } from '@ant-design/icons'
import ActivityBar  from './components/ActivityBar'
import NmapPage     from './pages/NmapPage'
import FuzzingPage  from './pages/FuzzingPage'
import HistoryPage  from './pages/HistoryPage'

const { Header, Footer } = Layout
const { Title } = Typography

function Shell({ isDark, onToggleDark }) {
  const { token } = antTheme.useToken()

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px', flexShrink: 0, background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <RadarChartOutlined style={{ color: token.colorPrimary, fontSize: 22 }} />
        <Title level={4} style={{ margin: 0, flex: 1, color: token.colorText }}>
          Web Security GUI
        </Title>
        <Switch checked={isDark} onChange={onToggleDark} checkedChildren={<MoonOutlined />} unCheckedChildren={<SunOutlined />} />
      </Header>

      <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
        <ActivityBar />

        <Routes>
          <Route path="/"               element={<Navigate to="/tool/nmap" replace />} />
          <Route path="/tool/nmap"      element={<NmapPage />} />
          <Route path="/tool/fuzzing"   element={<FuzzingPage />} />
          <Route path="/history"        element={<HistoryPage />} />
        </Routes>
      </Layout>

      <Footer style={{ textAlign: 'center', padding: '10px 24px', flexShrink: 0, background: token.colorBgContainer, borderTop: `1px solid ${token.colorBorderSecondary}`, fontSize: 12, color: token.colorTextSecondary }}>
        <Space split={<span style={{ color: token.colorBorderSecondary }}>·</span>}>
          <span>v1.0.0</span>
          <a href="https://github.com/Lxcyfxr/webbased_scanner_gui" target="_blank" rel="noreferrer" style={{ color: token.colorTextSecondary }}>
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
    <ConfigProvider theme={{ algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm }}>
      <BrowserRouter>
        <Shell isDark={isDark} onToggleDark={toggleDark} />
      </BrowserRouter>
    </ConfigProvider>
  )
}
