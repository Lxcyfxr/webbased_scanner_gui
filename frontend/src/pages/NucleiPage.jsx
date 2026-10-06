import { useState, useRef, useEffect } from 'react'
import {
  Layout, Form, Input, InputNumber, Button, Table, Tag, Typography,
  Space, Divider, Select, Badge, theme as antTheme, Tooltip,
} from 'antd'
import {
  PlayCircleOutlined, StopOutlined, ThunderboltOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { createJob, openJobSocket } from '../api'
import { loadProxy } from '../utils/proxy'

const { Sider, Content } = Layout
const { Text, Title } = Typography

const SEV_COLOR = {
  critical: 'red',
  high:     'orange',
  medium:   'gold',
  low:      'blue',
  info:     'cyan',
  unknown:  'default',
}

const SEV_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high',     label: 'High'     },
  { value: 'medium',   label: 'Medium'   },
  { value: 'low',      label: 'Low'      },
  { value: 'info',     label: 'Info'     },
]

export default function NucleiPage() {
  const { token } = antTheme.useToken()
  const [form] = Form.useForm()
  const [running, setRunning]   = useState(false)
  const [findings, setFindings] = useState([])
  const [log, setLog]           = useState([])
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
      severity:   values.severity?.length ? values.severity : undefined,
      tags:       values.tags || '',
      templates:  values.templates || '',
      rate_limit: values.rate_limit || undefined,
      max_time:   values.max_time || '',
      proxy_url:  proxy?.enabled && proxy.host && proxy.port
                    ? `http://${proxy.host}:${proxy.port}` : undefined,
    }

    let job
    try {
      job = await createJob('nuclei', values.target, options)
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
        setRunning(false)
      }
    }, () => setRunning(false), () => { setRunning(false); setLog(l => [...l, 'WebSocket error']) })
  }

  const stopScan = () => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }))
    wsRef.current?.close()
    setRunning(false)
  }

  // severity counts from current findings
  const counts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1
    return acc
  }, {})

  const columns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      width: 90,
      render: v => <Tag color={SEV_COLOR[v] || 'default'} style={{ fontSize: 10, margin: 0 }}>{v?.toUpperCase()}</Tag>,
      sorter: (a, b) => {
        const order = ['critical','high','medium','low','info','unknown']
        return order.indexOf(a.severity) - order.indexOf(b.severity)
      },
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Template',
      dataIndex: 'template_id',
      width: 160,
      render: v => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (v, row) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{v}</Text>
          <Text type="secondary" style={{ fontSize: 10 }} ellipsis={{ tooltip: row.matched_at }}>
            {row.matched_at}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 70,
      render: v => v ? <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> : null,
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
          <Title level={5} style={{ margin: 0 }}>Nuclei</Title>
          <Text type="secondary" style={{ fontSize: 11 }}>Template-based vulnerability scanner</Text>
          <Divider style={{ margin: '8px 0' }} />

          <Form
            form={form}
            layout="vertical"
            size="small"
            onFinish={startScan}
            initialValues={{ rate_limit: 150 }}
          >
            <Form.Item
              name="target"
              label="Target"
              rules={[{ required: true, message: 'Enter a target' }]}
            >
              <Input placeholder="https://example.com or 192.168.1.1" autoComplete="off" />
            </Form.Item>

            <Form.Item name="severity" label="Severity filter">
              <Select
                mode="multiple"
                placeholder="All severities"
                options={SEV_OPTIONS}
                allowClear
                style={{ fontSize: 12 }}
              />
            </Form.Item>

            <Form.Item name="tags" label={
              <Tooltip title="Comma-separated: cve,rce,sqli,xss,…">
                <span>Tags <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
              </Tooltip>
            }>
              <Input placeholder="cve,rce,sqli" autoComplete="off" />
            </Form.Item>

            <Form.Item name="templates" label={
              <Tooltip title="Template path or directory, e.g. cves/ or cves/CVE-2021-44228.yaml">
                <span>Templates <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
              </Tooltip>
            }>
              <Input placeholder="cves/ or specific.yaml" autoComplete="off" />
            </Form.Item>

            <Form.Item name="rate_limit" label="Rate limit (req/s)">
              <InputNumber min={1} max={500} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="max_time" label={
              <Tooltip title="e.g. 5m, 1h — auto-stop after this duration">
                <span>Max time <InfoCircleOutlined style={{ fontSize: 10 }} /></span>
              </Tooltip>
            }>
              <Input placeholder="5m / 1h" autoComplete="off" />
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

          {findings.length > 0 && (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <Space wrap size={4}>
                {['critical','high','medium','low','info'].map(s =>
                  counts[s] ? (
                    <Tag key={s} color={SEV_COLOR[s]} style={{ fontSize: 11 }}>
                      {s[0].toUpperCase() + s.slice(1)}: {counts[s]}
                    </Tag>
                  ) : null
                )}
              </Space>
            </>
          )}
        </Space>
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Findings table */}
        <div style={{ flex: '0 0 60%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
            <ThunderboltOutlined style={{ color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 13 }}>Findings</Text>
            {findings.length > 0 && <Badge count={findings.length} color={token.colorPrimary} />}
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
            {log.length === 0 && !running && (
              <Text type="secondary" style={{ fontSize: 11 }}>No output yet.</Text>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  )
}
