import { useState, useEffect, useCallback } from 'react'
import { Layout, Space, theme as antTheme, Divider } from 'antd'
import MsfConnect  from '../components/msf/MsfConnect'
import MsfModules  from '../components/msf/MsfModules'
import MsfOptions  from '../components/msf/MsfOptions'
import MsfSessions from '../components/msf/MsfSessions'
import MsfConsole  from '../components/msf/MsfConsole'

const { Sider, Content } = Layout

export default function MsfPage() {
  const { token }  = antTheme.useToken()
  const [status, setStatus]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [fillCommand, setFill]       = useState(null)
  const [selectedModule, setSelected] = useState(null)
  const [commandBatch, setBatch]      = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetch('/msf/status').then(r => r.json())
      setStatus(data)
    } catch {
      setStatus({ connected: false, available: false })
    }
  }, [])

  useEffect(() => { fetchStatus() }, [])

  const handleConnect = async (values) => {
    setLoading(true)
    try {
      const res = await fetch('/msf/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setStatus(data)
    } catch (e) {
      setStatus(s => ({ ...s, connected: false, error: e.message }))
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    await fetch('/msf/disconnect', { method: 'POST' })
    setStatus(s => ({ ...s, connected: false }))
  }

  const handleModuleSelect = (mod) => {
    const fullname = mod.fullname || mod.name || ''
    setSelected(mod)
    setFill({ cmd: `use ${fullname}`, id: Date.now() })
  }

  const handleSetOptions = (cmds) => {
    setBatch({ cmds, id: Date.now() })
  }

  const connected = status?.connected ?? false

  return (
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
          <MsfConnect
            status={status}
            onConnect={handleConnect}
            onConnected={setStatus}
            onDisconnect={handleDisconnect}
            loading={loading}
          />

          {connected && (
            <>
              <MsfModules onSelect={handleModuleSelect} />
              {selectedModule && (
                <MsfOptions module={selectedModule} onApply={handleSetOptions} />
              )}
              <MsfSessions connected={connected} />
            </>
          )}
        </Space>
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column', background: '#0d1117', overflow: 'hidden' }}>
        <MsfConsole connected={connected} fillCommand={fillCommand} commandBatch={commandBatch} />
      </Content>
    </Layout>
  )
}
