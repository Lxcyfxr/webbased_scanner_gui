import { useState, useRef, useEffect } from 'react'
import {
  Layout, Form, Input, InputNumber, Button, Table, Tag, Typography,
  Space, Divider, Select, Badge, Switch, Checkbox, Radio,
  theme as antTheme, Tooltip, Alert,
} from 'antd'
import {
  PlayCircleOutlined, StopOutlined, KeyOutlined, InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'

const { Sider, Content } = Layout
const { Text, Title } = Typography

const SERVICE_OPTIONS = [
  'ssh', 'ftp', 'ftps', 'telnet',
  'smtp', 'smtps', 'pop3', 'pop3s', 'imap', 'imaps',
  'http-get', 'http-post-form', 'https-get', 'https-post-form',
  'mysql', 'postgres', 'mssql', 'redis',
  'vnc', 'rdp', 'smb', 'snmp', 'ldap2', 'ldap3',
].map(s => ({ value: s, label: s }))

const PASS_PRESETS = [
  { label: 'rockyou.txt',                 value: '/usr/share/wordlists/rockyou.txt' },
  { label: 'SecLists / top-passwords-shortlist', value: '/usr/share/seclists/Passwords/Common-Credentials/top-passwords-shortlist.txt' },
  { label: 'SecLists / darkweb2017-top100', value: '/usr/share/seclists/Passwords/darkweb2017-top100.txt' },
  { label: 'SecLists / 10k-most-common',  value: '/usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt' },
]

const USER_PRESETS = [
  { label: 'SecLists / top-usernames-shortlist', value: '/usr/share/seclists/Usernames/top-usernames-shortlist.txt' },
  { label: 'SecLists / Names/names.txt',  value: '/usr/share/seclists/Usernames/Names/names.txt' },
]

const wsBase = () => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}

// login/password input mode
const MODE = { SINGLE: 'single', FILE: 'file', PRESET: 'preset' }

export default function HydraPage() {
  const { token } = antTheme.useToken()
  const [form] = Form.useForm()
  const [running, setRunning]     = useState(false)
  const [creds,   setCreds]       = useState([])
  const [log,     setLog]         = useState([])
  const wsRef  = useRef(null)
  const logRef = useRef(null)

  const [loginMode, setLoginMode] = useState(MODE.SINGLE)
  const [passMode,  setPassMode]  = useState(MODE.PRESET)
  const [verbose,   setVerbose]   = useState(false)

  const service = Form.useWatch('service', form)
  const isForm  = service === 'http-post-form' || service === 'https-post-form'

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  const buildOptions = (values) => {
    const opts = {
      service:      values.service || 'ssh',
      port:         values.port    || undefined,
      tasks:        values.tasks   || 4,
      wait:         values.wait    || undefined,
      stop_on_first: values.stop_on_first ?? true,
      verbose:      verbose,
      extra:        values.extra?.length ? values.extra : undefined,
      module_args:  isForm ? (values.module_args || '') : '',
    }

    // login
    if (loginMode === MODE.SINGLE) {
      opts.login      = (values.login_single || '').trim()
    } else if (loginMode === MODE.FILE) {
      opts.login_file = (values.login_file || '').trim()
    } else {
      opts.login_file = values.login_preset || ''
    }

    // password
    if (passMode === MODE.SINGLE) {
      opts.password      = (values.pass_single || '').trim()
    } else if (passMode === MODE.FILE) {
      opts.password_file = (values.pass_file || '').trim()
    } else {
      opts.password_file = values.pass_preset || PASS_PRESETS[0].value
    }

    return opts
  }

  const startScan = async (values) => {
    setCreds([])
    setLog([])

    const options = buildOptions(values)

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
      key: 'svc',
      width: 110,
      render: (_, r) => <Tag color="geekblue" style={{ fontSize: 10, margin: 0 }}>{r.service}:{r.port}</Tag>,
    },
    {
      title: 'Host',
      dataIndex: 'host',
      width: 130,
      render: v => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Login',
      dataIndex: 'login',
      render: v => <Text code style={{ fontSize: 11 }}>{v || '—'}</Text>,
    },
    {
      title: 'Password',
      dataIndex: 'password',
      render: v => <Text code style={{ fontSize: 11, color: token.colorSuccess }}>{v || '—'}</Text>,
    },
  ]

  const modeOpts = [
    { label: 'Single',  value: MODE.SINGLE  },
    { label: 'File',    value: MODE.FILE     },
    { label: 'Preset',  value: MODE.PRESET   },
  ]

  return (
    <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Sider
        width={310}
        style={{
          background: token.colorBgContainer,
          padding: 16,
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
          <Divider style={{ margin: '6px 0' }} />

          <Form
            form={form}
            layout="vertical"
            size="small"
            onFinish={startScan}
            initialValues={{
              service: 'ssh',
              tasks: 4,
              stop_on_first: true,
              pass_preset: PASS_PRESETS[0].value,
            }}
          >
            {/* ── Target ── */}
            <Form.Item
              name="target"
              label="Target"
              rules={[{ required: true, message: 'Enter a target host / IP' }]}
              style={{ marginBottom: 8 }}
            >
              <Input placeholder="192.168.1.10 or host.local" autoComplete="off" />
            </Form.Item>

            <Space size="small" style={{ width: '100%', marginBottom: 8 }}>
              <Form.Item name="service" label="Service" style={{ marginBottom: 0 }}>
                <Select showSearch options={SERVICE_OPTIONS} style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="port" label="Port" style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={65535} placeholder="default" style={{ width: 90 }} />
              </Form.Item>
            </Space>

            {isForm && (
              <Form.Item
                name="module_args"
                label={
                  <Tooltip title='Format: "/path:user=^USER^&pass=^PASS^:F=failtext"'>
                    <span>Form string <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
                  </Tooltip>
                }
                style={{ marginBottom: 8 }}
              >
                <Input placeholder="/login:user=^USER^&pass=^PASS^:F=incorrect" autoComplete="off" />
              </Form.Item>
            )}

            <Divider orientation="left" plain style={{ margin: '6px 0', fontSize: 11 }}>
              <Text type="secondary">Login</Text>
            </Divider>

            <Radio.Group
              size="small"
              value={loginMode}
              onChange={e => setLoginMode(e.target.value)}
              style={{ marginBottom: 6 }}
              options={modeOpts}
              optionType="button"
            />

            {loginMode === MODE.SINGLE && (
              <Form.Item name="login_single" style={{ marginBottom: 6 }}>
                <Input placeholder="root" autoComplete="off" />
              </Form.Item>
            )}
            {loginMode === MODE.FILE && (
              <Form.Item name="login_file" style={{ marginBottom: 6 }}>
                <Input placeholder="/usr/share/wordlists/users.txt" autoComplete="off" />
              </Form.Item>
            )}
            {loginMode === MODE.PRESET && (
              <Form.Item name="login_preset" style={{ marginBottom: 6 }}>
                <Select options={USER_PRESETS} placeholder="Select preset…" allowClear />
              </Form.Item>
            )}

            <Divider orientation="left" plain style={{ margin: '6px 0', fontSize: 11 }}>
              <Text type="secondary">Password</Text>
            </Divider>

            <Radio.Group
              size="small"
              value={passMode}
              onChange={e => setPassMode(e.target.value)}
              style={{ marginBottom: 6 }}
              options={modeOpts}
              optionType="button"
            />

            {passMode === MODE.SINGLE && (
              <Form.Item name="pass_single" style={{ marginBottom: 6 }}>
                <Input placeholder="toor" autoComplete="off" />
              </Form.Item>
            )}
            {passMode === MODE.FILE && (
              <Form.Item name="pass_file" style={{ marginBottom: 6 }}>
                <Input placeholder="/usr/share/wordlists/rockyou.txt" autoComplete="off" />
              </Form.Item>
            )}
            {passMode === MODE.PRESET && (
              <Form.Item name="pass_preset" style={{ marginBottom: 6 }}>
                <Select options={PASS_PRESETS} />
              </Form.Item>
            )}

            <Form.Item name="extra" label="Also try" style={{ marginBottom: 8 }}>
              <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Checkbox value="n">null password</Checkbox>
                <Checkbox value="s">login as password</Checkbox>
                <Checkbox value="r">reversed login</Checkbox>
              </Checkbox.Group>
            </Form.Item>

            <Divider orientation="left" plain style={{ margin: '6px 0', fontSize: 11 }}>
              <Text type="secondary">Options</Text>
            </Divider>

            <Space size="small" style={{ width: '100%', marginBottom: 6 }}>
              <Form.Item name="tasks" label={
                <Tooltip title="Parallel connections. SSH: keep ≤ 4">
                  <span>Tasks <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
                </Tooltip>
              } style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={64} style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="wait" label="Timeout (s)" style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={120} placeholder="30" style={{ width: 80 }} />
              </Form.Item>
            </Space>

            <Form.Item name="stop_on_first" valuePropName="checked" style={{ marginBottom: 4 }}>
              <Checkbox>Stop after first valid pair (-f)</Checkbox>
            </Form.Item>

            <Space size={6} align="center" style={{ marginBottom: 10 }}>
              <Switch
                size="small"
                checked={verbose}
                onChange={setVerbose}
              />
              <Text style={{ fontSize: 11 }}>
                Show attempts (-V)
              </Text>
              <Tooltip title="Prints every login attempt — can generate millions of lines with large wordlists">
                <WarningOutlined style={{ color: token.colorWarning, fontSize: 11 }} />
              </Tooltip>
            </Space>

            {running ? (
              <Button danger icon={<StopOutlined />} block onClick={stopScan}>Stop</Button>
            ) : (
              <Button type="primary" icon={<PlayCircleOutlined />} htmlType="submit" block>
                Start Attack
              </Button>
            )}
          </Form>
        </Space>
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Credentials table */}
        <div style={{ flex: '0 0 50%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
            <KeyOutlined style={{ color: token.colorSuccess }} />
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

        {/* Live log */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
            <Space>
              <InfoCircleOutlined style={{ color: token.colorTextSecondary }} />
              <Text style={{ fontSize: 12 }} type="secondary">Live output</Text>
              {!verbose && !running && (
                <Text type="secondary" style={{ fontSize: 10 }}>
                  — enable "Show attempts" for live attempt log
                </Text>
              )}
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
              <div
                key={i}
                style={{
                  color: line.includes('[ERROR]') || line.includes('[WARNING]')
                    ? token.colorWarning
                    : token.colorTextSecondary,
                  lineHeight: 1.6,
                }}
              >
                {line}
              </div>
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
