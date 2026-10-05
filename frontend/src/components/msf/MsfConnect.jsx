import { Form, Input, InputNumber, Switch, Button, Alert, Badge, Typography, Divider, Space } from 'antd'
import { LinkOutlined, DisconnectOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'

const { Text } = Typography

export default function MsfConnect({ status, onConnect, onDisconnect, loading }) {
  const [form] = Form.useForm()
  const [daemonStatus, setDaemonStatus] = useState({ running: false })
  const [starting, setStarting]         = useState(false)
  const [stopping, setStopping]         = useState(false)
  const [daemonError, setDaemonError]   = useState(null)

  const connected = status?.connected

  useEffect(() => {
    fetchDaemonStatus()
  }, [])

  const fetchDaemonStatus = async () => {
    try {
      const d = await fetch('/msf/daemon/status').then(r => r.json())
      setDaemonStatus(d)
    } catch {}
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
      onConnect(data)   // already connected by the backend
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

      {!status?.available && (
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
            {/* Primary action: start daemon + connect in one click */}
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={starting}
              block
              onClick={handleStartDaemon}
            >
              Start msfrpcd & Connect
            </Button>

            {/* Secondary: connect to an already-running daemon */}
            <Button
              icon={<LinkOutlined />}
              loading={loading}
              htmlType="submit"
              block
            >
              Connect to existing
            </Button>
          </Space>
        </Form>
      )}
    </div>
  )
}
