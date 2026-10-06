import { useState, useRef, useEffect } from 'react'
import {
  Layout, Form, Input, InputNumber, Switch, Button, Table, Tag, Typography,
  Space, Divider, Select, Badge, theme as antTheme,
} from 'antd'
import {
  PlayCircleOutlined, StopOutlined, SafetyOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { createJob, openJobSocket } from '../api'
import { loadProxy } from '../utils/proxy'

const { Sider, Content } = Layout
const { Text, Title } = Typography

const SEVERITY_COLOR = {
  OSVDB: 'orange',
  CVE:   'red',
  ID:    'blue',
}

const TUNING_OPTIONS = [
  { value: '1', label: '1 – Interesting files' },
  { value: '2', label: '2 – Misconfiguration' },
  { value: '3', label: '3 – Info disclosure' },
  { value: '4', label: '4 – Injection (XSS)' },
  { value: '5', label: '5 – Remote file retrieval' },
  { value: '6', label: '6 – Denial of Service' },
  { value: '7', label: '7 – Remote file retrieval (server-wide)' },
  { value: '8', label: '8 – Command execution / RCE' },
  { value: '9', label: '9 – SQL Injection' },
  { value: 'a', label: 'a – Auth bypass' },
  { value: 'b', label: 'b – Software identification' },
  { value: 'c', label: 'c – Remote source inclusion' },
]

export default function NiktoPage() {
  const { token } = antTheme.useToken()
  const [form] = Form.useForm()
  const [running, setRunning]     = useState(false)
  const [findings, setFindings]   = useState([])
  const [log, setLog]             = useState([])
  const [info, setInfo]           = useState(null)
  const wsRef  = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  const startScan = async (values) => {
    setFindings([])
    setLog([])
    setInfo(null)

    const proxy = loadProxy()
    const options = {
      port:      values.port || undefined,
      ssl:       values.ssl || false,
      tuning:    values.tuning?.join('') || '',
      no_404:    values.no_404 || false,
      timeout:   values.timeout || undefined,
      proxy_url: proxy?.enabled && proxy.host && proxy.port
                   ? `http://${proxy.host}:${proxy.port}` : undefined,
    }

    let job
    try {
      job = await createJob('nikto', values.target, options)
    } catch (e) {
      setLog(l => [...l, `Error: ${e.message}`])
      return
    }
    setRunning(true)

    wsRef.current = openJobSocket(job.id, (msg) => {
      if (msg.type === 'found') {
        setFindings(f => [...f, { key: f.length, ...msg.data }])
      } else if (msg.type === 'progress') {
        setLog(l => [...l, msg.data])
      } else if (msg.type === 'done') {
        if (msg.json?.info) setInfo(msg.json.info)
        setRunning(false)
      }
    }, () => setRunning(false), () => { setRunning(false); setLog(l => [...l, 'WebSocket error']) })
  }

  const stopScan = () => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }))
    wsRef.current?.close()
    setRunning(false)
  }

  const refType = (ref) => {
    if (!ref) return null
    if (ref.startsWith('OSVDB')) return 'OSVDB'
    if (ref.startsWith('CVE')) return 'CVE'
    return 'ID'
  }

  const columns = [
    {
      title: '#',
      key: 'idx',
      width: 40,
      render: (_, __, i) => <Text type="secondary" style={{ fontSize: 11 }}>{i + 1}</Text>,
    },
    {
      title: 'URI',
      dataIndex: 'uri',
      width: 180,
      render: v => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Reference',
      dataIndex: 'ref',
      width: 120,
      render: v => v ? (
        <Tag color={SEVERITY_COLOR[refType(v)] || 'default'} style={{ fontSize: 10 }}>{v}</Tag>
      ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: v => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
  ]

  return (
    <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Sider
        width={280}
        style={{
          background: token.colorBgContainer,
          padding: 20,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflowY: 'auto',
          height: '100%',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5} style={{ margin: 0 }}>Nikto</Title>
          <Text type="secondary" style={{ fontSize: 11 }}>Web server vulnerability scanner</Text>
          <Divider style={{ margin: '8px 0' }} />

          <Form
            form={form}
            layout="vertical"
            size="small"
            onFinish={startScan}
            initialValues={{ ssl: false, no_404: false, timeout: 10 }}
          >
            <Form.Item
              name="target"
              label="Target"
              rules={[{ required: true, message: 'Enter a target' }]}
            >
              <Input placeholder="http://example.com or 192.168.1.1" autoComplete="off" />
            </Form.Item>

            <Form.Item name="port" label="Port">
              <InputNumber min={1} max={65535} placeholder="80 / 443" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="ssl" label="Force SSL" valuePropName="checked">
              <Switch size="small" />
            </Form.Item>

            <Form.Item name="tuning" label="Tuning">
              <Select
                mode="multiple"
                placeholder="All checks (default)"
                options={TUNING_OPTIONS}
                allowClear
                style={{ fontSize: 12 }}
              />
            </Form.Item>

            <Form.Item name="no_404" label='Disable 404 guessing' valuePropName="checked">
              <Switch size="small" />
            </Form.Item>

            <Form.Item name="timeout" label="Timeout (s)">
              <InputNumber min={1} max={120} style={{ width: '100%' }} />
            </Form.Item>

            {running ? (
              <Button danger icon={<StopOutlined />} block onClick={stopScan}>
                Stop
              </Button>
            ) : (
              <Button type="primary" icon={<PlayCircleOutlined />} htmlType="submit" block>
                Start Scan
              </Button>
            )}
          </Form>

          {info && (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <Space direction="vertical" size={2}>
                {info.ip && <Text style={{ fontSize: 11 }}><Text strong>IP: </Text>{info.ip}</Text>}
                {info.hostname && <Text style={{ fontSize: 11 }}><Text strong>Host: </Text>{info.hostname}</Text>}
                {info.port && <Text style={{ fontSize: 11 }}><Text strong>Port: </Text>{info.port}</Text>}
                {info.server && <Text style={{ fontSize: 11 }}><Text strong>Server: </Text>{info.server}</Text>}
              </Space>
            </>
          )}
        </Space>
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Findings table */}
        <div style={{ flex: '0 0 60%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
            <SafetyOutlined style={{ color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 13 }}>Findings</Text>
            {findings.length > 0 && (
              <Badge count={findings.length} color={token.colorPrimary} />
            )}
            {running && <Badge status="processing" text={<Text style={{ fontSize: 11 }}>Scanning...</Text>} />}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              dataSource={findings}
              columns={columns}
              size="small"
              pagination={false}
              scroll={{ y: '100%' }}
              locale={{ emptyText: running ? 'Waiting for findings...' : 'No findings yet. Run a scan.' }}
              style={{ height: '100%' }}
            />
          </div>
        </div>

        {/* Live log */}
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
            {log.length === 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>No output yet.</Text>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  )
}
