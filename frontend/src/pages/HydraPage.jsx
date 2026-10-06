import { useState, useRef, useEffect } from 'react'
import {
  Layout, Form, Input, InputNumber, Button, Table, Tag, Typography,
  Space, Divider, Select, Badge, Switch, Checkbox, theme as antTheme, Tooltip,
} from 'antd'
import {
  PlayCircleOutlined, StopOutlined, KeyOutlined, InfoCircleOutlined,
} from '@ant-design/icons'

const { Sider, Content } = Layout
const { Text, Title } = Typography

const SERVICE_OPTIONS = [
  'ssh', 'ftp', 'ftps', 'telnet', 'smtp', 'pop3', 'imap',
  'http-get', 'http-post-form', 'https-get', 'https-post-form', 'http-head',
  'mysql', 'postgres', 'mssql', 'vnc', 'rdp', 'smb', 'snmp',
  'ldap2', 'ldap3', 'redis', 'rsh', 'rlogin',
].map(s => ({ value: s, label: s }))

const EXTRA_OPTIONS = [
  { value: 'n', label: 'null password (n)' },
  { value: 's', label: 'login as password (s)' },
  { value: 'r', label: 'reversed login (r)' },
]

const wsBase = () => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}

export default function HydraPage() {
  const { token } = antTheme.useToken()
  const [form] = Form.useForm()
  const [running, setRunning] = useState(false)
  const [creds, setCreds]     = useState([])
  const [log, setLog]         = useState([])
  const wsRef  = useRef(null)
  const logRef = useRef(null)

  // Toggle wordlist vs. single value for login/password fields
  const [loginList, setLoginList] = useState(false)
  const [passList,  setPassList]  = useState(true)

  const service = Form.useWatch('service', form)
  const isForm  = service === 'http-post-form' || service === 'https-post-form'

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  const startScan = async (values) => {
    setCreds([])
    setLog([])

    const options = {
      service:       values.service,
      login:         loginList ? undefined : (values.login || undefined),
      login_file:    loginList ? (values.login || undefined) : undefined,
      password:      passList ? undefined : (values.password ?? undefined),
      password_file: passList ? (values.password || undefined) : undefined,
      extra:         values.extra?.length ? values.extra : undefined,
      port:          values.port || undefined,
      tasks:         values.tasks || undefined,
      wait:          values.wait || undefined,
      stop_on_first: values.stop_on_first ?? true,
      verbose:       values.verbose ?? true,
      module_args:   isForm ? (values.module_args || '') : '',
    }

    let res
    try {
      res = await fetch('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'hydra', target: values.target, options }),
      })
    } catch (e) {
      setLog(l => [...l, `Error: ${e.message}`])
      return
    }
    if (!res.ok) {
      const err = await res.json()
      setLog(l => [...l, `Error: ${err.detail}`])
      return
    }

    const job = await res.json()
    setRunning(true)

    const ws = new WebSocket(`${wsBase()}/ws/jobs/${job.id}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'found') {
        setCreds(c => {
          const key = `${msg.data.host}:${msg.data.port}:${msg.data.login}:${msg.data.password}`
          if (c.some(x => x._key === key)) return c
          return [...c, { key: c.length, _key: key, ...msg.data }]
        })
      } else if (msg.type === 'progress') {
        setLog(l => [...l, msg.data])
      } else if (msg.type === 'done') {
        setRunning(false)
      }
    }
    ws.onclose = () => setRunning(false)
    ws.onerror = () => { setRunning(false); setLog(l => [...l, 'WebSocket error']) }
  }

  const stopScan = () => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }))
    wsRef.current?.close()
    setRunning(false)
  }

  const columns = [
    {
      title: 'Service',
      dataIndex: 'service',
      width: 90,
      render: (v, r) => <Tag color="geekblue" style={{ fontSize: 10, margin: 0 }}>{v}:{r.port}</Tag>,
    },
    {
      title: 'Host',
      dataIndex: 'host',
      width: 140,
      render: v => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Login',
      dataIndex: 'login',
      render: v => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Password',
      dataIndex: 'password',
      render: v => <Text code style={{ fontSize: 11, color: token.colorSuccess }}>{v}</Text>,
    },
  ]

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
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5} style={{ margin: 0 }}>Hydra</Title>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Online credential testing — authorised use only
          </Text>
          <Divider style={{ margin: '8px 0' }} />

          <Form
            form={form}
            layout="vertical"
            size="small"
            onFinish={startScan}
            initialValues={{
              service: 'ssh', tasks: 16, stop_on_first: true, verbose: true,
            }}
          >
            <Form.Item
              name="target"
              label="Target host"
              rules={[{ required: true, message: 'Enter a target host/IP' }]}
            >
              <Input placeholder="192.168.1.10 or host.local" autoComplete="off" />
            </Form.Item>

            <Space style={{ width: '100%' }} size="small">
              <Form.Item name="service" label="Service" style={{ flex: 1, marginBottom: 12 }}>
                <Select showSearch options={SERVICE_OPTIONS} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="port" label="Port" style={{ marginBottom: 12 }}>
                <InputNumber min={1} max={65535} placeholder="default" style={{ width: 90 }} />
              </Form.Item>
            </Space>

            {isForm && (
              <Form.Item name="module_args" label={
                <Tooltip title='Form string: "/path:user=^USER^&pass=^PASS^:F=failtext"'>
                  <span>Form string <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
                </Tooltip>
              }>
                <Input placeholder="/login:user=^USER^&pass=^PASS^:F=incorrect" autoComplete="off" />
              </Form.Item>
            )}

            <Divider style={{ margin: '4px 0 10px' }} orientation="left" plain>
              <Text type="secondary" style={{ fontSize: 11 }}>Login</Text>
            </Divider>
            <Form.Item style={{ marginBottom: 6 }}>
              <Switch size="small" checked={loginList} onChange={setLoginList} />
              <Text style={{ fontSize: 11, marginLeft: 8 }}>
                {loginList ? 'Username wordlist (file path)' : 'Single username'}
              </Text>
            </Form.Item>
            <Form.Item name="login">
              <Input
                placeholder={loginList ? '/usr/share/wordlists/users.txt' : 'root'}
                autoComplete="off"
              />
            </Form.Item>

            <Divider style={{ margin: '4px 0 10px' }} orientation="left" plain>
              <Text type="secondary" style={{ fontSize: 11 }}>Password</Text>
            </Divider>
            <Form.Item style={{ marginBottom: 6 }}>
              <Switch size="small" checked={passList} onChange={setPassList} />
              <Text style={{ fontSize: 11, marginLeft: 8 }}>
                {passList ? 'Password wordlist (file path)' : 'Single password'}
              </Text>
            </Form.Item>
            <Form.Item name="password">
              <Input
                placeholder={passList ? '/usr/share/wordlists/rockyou.txt' : 'toor'}
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item name="extra" label="Also try" style={{ marginBottom: 10 }}>
              <Checkbox.Group options={EXTRA_OPTIONS} style={{ display: 'flex', flexDirection: 'column', gap: 2 }} />
            </Form.Item>

            <Space style={{ width: '100%' }} size="small">
              <Form.Item name="tasks" label={
                <Tooltip title="Parallel connections (-t). Lower is gentler.">
                  <span>Tasks <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
                </Tooltip>
              } style={{ marginBottom: 10 }}>
                <InputNumber min={1} max={64} style={{ width: 90 }} />
              </Form.Item>
              <Form.Item name="wait" label="Timeout (s)" style={{ marginBottom: 10 }}>
                <InputNumber min={1} max={120} placeholder="default" style={{ width: 90 }} />
              </Form.Item>
            </Space>

            <Form.Item name="stop_on_first" valuePropName="checked" style={{ marginBottom: 4 }}>
              <Checkbox>Stop after first valid pair (-f)</Checkbox>
            </Form.Item>
            <Form.Item name="verbose" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Checkbox>Verbose — show each attempt (-V)</Checkbox>
            </Form.Item>

            {running ? (
              <Button danger icon={<StopOutlined />} block onClick={stopScan}>
                Stop
              </Button>
            ) : (
              <Button type="primary" icon={<PlayCircleOutlined />} htmlType="submit" block>
                Start Attack
              </Button>
            )}
          </Form>
        </Space>
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: '0 0 55%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
            <KeyOutlined style={{ color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 13 }}>Recovered credentials</Text>
            {creds.length > 0 && <Badge count={creds.length} color={token.colorSuccess} />}
            {running && <Badge status="processing" text={<Text style={{ fontSize: 11 }}>Running...</Text>} />}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              dataSource={creds}
              columns={columns}
              size="small"
              pagination={false}
              scroll={{ y: '100%' }}
              locale={{ emptyText: running ? 'Testing credentials...' : 'No credentials recovered yet.' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
            <Space>
              <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              <Text style={{ fontSize: 12 }} type="secondary">Live output</Text>
            </Space>
          </div>
          <div
            ref={logRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              background: token.colorBgLayout,
              padding: '8px 16px',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            {log.map((line, i) => (
              <div key={i} style={{ color: token.colorTextSecondary, lineHeight: 1.6 }}>{line}</div>
            ))}
            {log.length === 0 && !running && (
              <Text type="secondary" style={{ fontSize: 11 }}>No output yet.</Text>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  )
}
