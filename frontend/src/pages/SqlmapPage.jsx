import { useState, useRef, useEffect } from 'react'
import {
  Layout, Form, Input, InputNumber, Button, Table, Tag, Typography,
  Space, Divider, Select, Badge, Switch, theme as antTheme, Tooltip,
} from 'antd'
import {
  PlayCircleOutlined, StopOutlined, DatabaseOutlined, InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { createJob, openJobSocket } from '../api'
import { loadProxy } from '../utils/proxy'

const { Sider, Content } = Layout
const { Text, Title } = Typography

const KIND_COLOR = {
  injection: 'red',
  dbms:      'purple',
  entry:     'blue',
}

const KIND_LABEL = {
  injection: 'Injection',
  dbms:      'DBMS',
  entry:     'Entry',
}

const LOG_COLOR = {
  WARNING:  '#faad14',
  CRITICAL: '#ff4d4f',
  ERROR:    '#ff4d4f',
}

const DBMS_OPTIONS = [
  'MySQL', 'PostgreSQL', 'Microsoft SQL Server', 'Oracle', 'SQLite',
  'Microsoft Access', 'Firebird', 'SAP MaxDB', 'Sybase', 'DB2',
].map(d => ({ value: d, label: d }))

export default function SqlmapPage() {
  const { token } = antTheme.useToken()
  const [form] = Form.useForm()
  const [running, setRunning]     = useState(false)
  const [findings, setFindings]   = useState([])
  const [log, setLog]             = useState([])
  const wsRef  = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [log])

  const startScan = async (values) => {
    setFindings([])
    setLog([])

    const proxy = loadProxy()
    const options = {
      data:         (values.data || '').trim() || undefined,
      cookie:       (values.cookie || '').trim() || undefined,
      dbms:         values.dbms || undefined,
      level:        values.level ?? 1,
      risk:         values.risk ?? 1,
      technique:    (values.technique || '').trim() || undefined,
      threads:      values.threads || undefined,
      random_agent: values.random_agent ?? false,
      enum_dbs:     values.enum_dbs ?? false,
      db:           (values.db || '').trim() || undefined,
      enum_tables:  values.enum_tables ?? false,
      table:        (values.table || '').trim() || undefined,
      dump:         values.dump ?? false,
      proxy_url:    proxy?.enabled && proxy.host && proxy.port
                      ? `http://${proxy.host}:${proxy.port}` : undefined,
    }

    let job
    try {
      job = await createJob('sqlmap', values.target, options)
    } catch (e) {
      setLog(l => [...l, { text: `Error: ${e.message}`, level: 'ERROR' }])
      return
    }
    setRunning(true)

    wsRef.current = openJobSocket(job.id, (msg) => {
      if (msg.type === 'found') {
        setFindings(f => {
          const key = `${msg.data.kind}:${msg.data.param}:${msg.data.detail}`
          if (f.some(x => x._key === key)) return f
          return [...f, { key: f.length, _key: key, ...msg.data }]
        })
      } else if (msg.type === 'progress') {
        setLog(l => [...l, { text: msg.data, level: msg.level }])
      } else if (msg.type === 'done') {
        setRunning(false)
      }
    }, () => setRunning(false), () => { setRunning(false); setLog(l => [...l, { text: 'WebSocket error', level: 'ERROR' }]) })
  }

  const stopScan = () => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }))
    wsRef.current?.close()
    setRunning(false)
  }

  const injections = findings.filter(f => f.kind === 'injection')

  const columns = [
    {
      title: 'Type',
      dataIndex: 'kind',
      width: 90,
      render: v => <Tag color={KIND_COLOR[v] || 'default'} style={{ fontSize: 10, margin: 0 }}>{KIND_LABEL[v] || v}</Tag>,
    },
    {
      title: 'Name / Parameter',
      dataIndex: 'param',
      width: 180,
      render: v => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Detail',
      dataIndex: 'detail',
      render: v => v ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
  ]

  return (
    <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Sider
        width={290}
        style={{
          background: token.colorBgContainer,
          padding: 16,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflowY: 'auto',
          height: '100%',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5} style={{ margin: 0 }}>sqlmap</Title>
          <Text type="secondary" style={{ fontSize: 11 }}>
            SQL injection detection &amp; exploitation — authorised use only
          </Text>
          <Divider style={{ margin: '6px 0' }} />

          <Form
            form={form}
            layout="vertical"
            size="small"
            onFinish={startScan}
            initialValues={{ level: 1, risk: 1, enum_dbs: true, random_agent: false, dump: false, enum_tables: false }}
          >
            <Form.Item
              name="target"
              label="Target URL"
              rules={[{ required: true, message: 'Enter a URL with a parameter (e.g. ?id=1)' }]}
              style={{ marginBottom: 8 }}
            >
              <Input placeholder="http://example.com/page?id=1" autoComplete="off" />
            </Form.Item>

            <Form.Item name="data" label={
              <Tooltip title="POST body — sqlmap will test these parameters">
                <span>POST data <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
              </Tooltip>
            } style={{ marginBottom: 8 }}>
              <Input placeholder='username=foo&password=bar' autoComplete="off" />
            </Form.Item>

            <Form.Item name="cookie" label="Cookie" style={{ marginBottom: 8 }}>
              <Input placeholder="PHPSESSID=abc123" autoComplete="off" />
            </Form.Item>

            <Form.Item name="dbms" label="Force DBMS" style={{ marginBottom: 8 }}>
              <Select options={DBMS_OPTIONS} placeholder="Auto-detect" allowClear />
            </Form.Item>

            <Space size="small" style={{ width: '100%', marginBottom: 8 }}>
              <Form.Item name="level" label={
                <Tooltip title="1=basic, 5=exhaustive (slower, noisier)">
                  <span>Level <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
                </Tooltip>
              } style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={5} style={{ width: 70 }} />
              </Form.Item>
              <Form.Item name="risk" label={
                <Tooltip title="1=safe, 3=may modify data">
                  <span>Risk <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
                </Tooltip>
              } style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={3} style={{ width: 70 }} />
              </Form.Item>
              <Form.Item name="threads" label="Threads" style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={10} placeholder="1" style={{ width: 70 }} />
              </Form.Item>
            </Space>

            <Form.Item name="technique" label={
              <Tooltip title="B=Boolean, E=Error, U=Union, S=Stacked, T=Time-based, Q=Inline — default: all">
                <span>Technique <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
              </Tooltip>
            } style={{ marginBottom: 8 }}>
              <Input placeholder="BEUSTQ" autoComplete="off" />
            </Form.Item>

            <Divider orientation="left" plain style={{ margin: '4px 0', fontSize: 11 }}>
              <Text type="secondary">Enumeration</Text>
            </Divider>

            <Form.Item name="enum_dbs" valuePropName="checked" style={{ marginBottom: 4 }}>
              <Switch size="small" /> <Text style={{ fontSize: 11, marginLeft: 6 }}>List databases (--dbs)</Text>
            </Form.Item>

            <Form.Item name="db" label="Database (-D)" style={{ marginBottom: 8 }}>
              <Input placeholder="dbname" autoComplete="off" />
            </Form.Item>

            <Form.Item name="enum_tables" valuePropName="checked" style={{ marginBottom: 4 }}>
              <Switch size="small" /> <Text style={{ fontSize: 11, marginLeft: 6 }}>List tables (--tables)</Text>
            </Form.Item>

            <Form.Item name="table" label="Table (-T)" style={{ marginBottom: 8 }}>
              <Input placeholder="tablename" autoComplete="off" />
            </Form.Item>

            <Form.Item name="dump" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Switch size="small" />
              <Text style={{ fontSize: 11, marginLeft: 6 }}>Dump table (--dump)</Text>
              <Tooltip title="Dumps rows from selected table — only use on authorised targets">
                <WarningOutlined style={{ color: token.colorWarning, fontSize: 11, marginLeft: 4 }} />
              </Tooltip>
            </Form.Item>

            <Form.Item name="random_agent" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Switch size="small" /> <Text style={{ fontSize: 11, marginLeft: 6 }}>Random User-Agent</Text>
            </Form.Item>

            {running ? (
              <Button danger icon={<StopOutlined />} block onClick={stopScan}>Stop</Button>
            ) : (
              <Button type="primary" icon={<PlayCircleOutlined />} htmlType="submit" block>
                Start Scan
              </Button>
            )}
          </Form>
        </Space>
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: '0 0 55%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
            <DatabaseOutlined style={{ color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 13 }}>Findings</Text>
            {findings.length > 0 && <Badge count={findings.length} color={token.colorPrimary} />}
            {injections.length > 0 && <Tag color="red" style={{ fontSize: 10 }}>{injections.length} injection{injections.length > 1 ? 's' : ''}</Tag>}
            {running && <Badge status="processing" text={<Text style={{ fontSize: 11 }}>Scanning...</Text>} />}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              dataSource={findings}
              columns={columns}
              size="small"
              pagination={false}
              scroll={{ y: '100%' }}
              locale={{ emptyText: running ? 'Testing for injections...' : 'No findings yet. Run a scan.' }}
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
            {log.map((entry, i) => (
              <div key={i} style={{ color: LOG_COLOR[entry.level] || token.colorTextSecondary, lineHeight: 1.6 }}>
                {entry.text}
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
