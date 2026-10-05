import { Form, Input, InputNumber, Switch, Button, Alert, Badge, Typography, Divider, Space, List, Tag, Popconfirm } from 'antd'
import { LinkOutlined, DisconnectOutlined, PlayCircleOutlined, StopOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useEffect, useState, useCallback } from 'react'

const { Text } = Typography

export default function MsfConnect({ status, onConnect, onConnected, onDisconnect, loading }) {
  const [form] = Form.useForm()
  const [daemonStatus, setDaemonStatus] = useState({ running: false })
  const [starting, setStarting]         = useState(false)
  const [stopping, setStopping]         = useState(false)
  const [daemonError, setDaemonError]   = useState(null)
  const [procs, setProcs]               = useState([])
  const [procsLoading, setProcsLoading] = useState(false)

  const connected = status?.connected

  const fetchDaemonStatus = useCallback(async () => {
    try {
      const d = await fetch('/msf/daemon/status').then(r => r.json())
      setDaemonStatus(d)
    } catch {}
  }, [])

  const fetchProcs = useCallback(async () => {
    setProcsLoading(true)
    try {
      const data = await fetch('/msf/procs').then(r => r.json())
      setProcs(Array.isArray(data) ? data : [])
    } catch {
      setProcs([])
    } finally {
      setProcsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDaemonStatus()
  }, [fetchDaemonStatus])

  useEffect(() => {
    if (!connected) fetchProcs()
    else setProcs([])
  }, [connected, fetchProcs])

  const killProc = async (pid) => {
    try {
      await fetch(`/msf/procs/${pid}`, { method: 'DELETE' })
    } catch {}
    fetchProcs()
  }

  const handleStartDaemon = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    setStarting(true)
    setDaemonError(null)
    try {
      const res = await fetch('/msf/daemon/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setDaemonStatus({ running: true, pid: data.pid })
      onConnected(data)   // daemon start already returns a connected status
    } catch (e) {
      setDaemonError(e.message)
    } finally {
      setStarting(false)
      fetchDaemonStatus()
    }
  }

  const handleStopDaemon = async () => {
    setStopping(true)
    try {
      await fetch('/msf/daemon/stop', { method: 'POST' })
      setDaemonStatus({ running: false })
      onDisconnect()
    } finally {
      setStopping(false)
    }
  }

  const handleConnect = (values) => {
    onConnect(values)
  }

  return (
    <div>
      {/* Connection status */}
      <Space style={{ marginBottom: 8 }}>
        <Badge status={connected ? 'success' : 'default'} />
        <Text strong style={{ fontSize: 13 }}>
          {connected
            ? `Connected — msf ${status?.version?.version ?? ''}`
            : 'Not connected'}
        </Text>
      </Space>

      {status?.available === false && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 10, fontSize: 11 }}
          message="pymetasploit3 not installed"
          description="Run: pip install pymetasploit3"
        />
      )}

      {connected ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button danger icon={<DisconnectOutlined />} size="small" block onClick={onDisconnect}>
            Disconnect
          </Button>
          {daemonStatus.running && (
            <Button
              icon={<StopOutlined />}
              size="small"
              block
              loading={stopping}
              onClick={handleStopDaemon}
            >
              Stop msfrpcd (PID {daemonStatus.pid})
            </Button>
          )}
        </Space>
      ) : (
        <Form
          form={form}
          layout="vertical"
          size="small"
          onFinish={handleConnect}
          initialValues={{ host: '127.0.0.1', port: 55553, ssl: false }}
        >
          <Divider style={{ margin: '8px 0 10px' }} />

          <Form.Item name="host" label="Host">
            <Input placeholder="127.0.0.1" autoComplete="off" />
          </Form.Item>

          <Form.Item name="port" label="Port">
            <InputNumber min={1} max={65535} placeholder="55553" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Enter a password' }]}
            extra={
              <Text type="secondary" style={{ fontSize: 11 }}>
                The password you want to use for msfrpcd — you choose it yourself.
              </Text>
            }
          >
            <Input.Password placeholder="pick any password" autoComplete="new-password" />
          </Form.Item>

          <Form.Item name="ssl" label="SSL" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          {daemonError && (
            <Alert type="error" showIcon message={daemonError} style={{ marginBottom: 10, fontSize: 11 }} />
          )}

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={starting}
              block
              onClick={handleStartDaemon}
            >
              Start msfrpcd & Connect
            </Button>

            <Button
              icon={<LinkOutlined />}
              loading={loading}
              htmlType="submit"
              block
            >
              Connect to existing
            </Button>
          </Space>

          {/* Running msfrpcd processes */}
          <Divider style={{ margin: '14px 0 8px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Running msfrpcd</Text>
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              loading={procsLoading}
              onClick={fetchProcs}
              style={{ fontSize: 11 }}
            />
          </div>
          {procs.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 11 }}>None found</Text>
          ) : (
            <List
              size="small"
              dataSource={procs}
              renderItem={p => (
                <List.Item
                  style={{ padding: '4px 0' }}
                  actions={[
                    <Popconfirm
                      title={`Kill PID ${p.pid}?`}
                      onConfirm={() => killProc(p.pid)}
                      okText="Kill"
                      cancelText="No"
                      okButtonProps={{ danger: true }}
                    >
                      <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 12, cursor: 'pointer' }} />
                    </Popconfirm>
                  ]}
                >
                  <div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>PID {p.pid}</Tag>
                      {p.port && <Tag style={{ fontSize: 10, margin: 0 }}>:{p.port}</Tag>}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Form>
      )}
    </div>
  )
}
