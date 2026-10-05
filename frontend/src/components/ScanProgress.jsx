import { Card, Progress, Spin, Typography, Table, Tag, Badge } from 'antd'
import { useEffect, useRef, useMemo } from 'react'

const { Text } = Typography

function getLatestProgress(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].type === 'progress' && lines[i].percent != null) {
      return { percent: lines[i].percent, remaining: lines[i].remaining }
    }
  }
  return { percent: 0, remaining: null }
}

const PORT_COLS = [
  { title: 'IP', dataIndex: 'ip', key: 'ip' },
  { title: 'Port', dataIndex: 'port', key: 'port', width: 70 },
  { title: 'Proto', dataIndex: 'protocol', key: 'protocol', width: 70 },
  {
    title: 'State',
    key: 'state',
    width: 80,
    render: () => <Tag color="green">open</Tag>,
  },
]

const HOST_COLS = [
  { title: 'IP', dataIndex: 'ip', key: 'ip' },
  {
    title: 'Status',
    key: 'status',
    render: () => <><Badge status="success" /> up</>,
  },
]

export default function ScanProgress({ lines, discoveries }) {
  const bottomRef = useRef(null)
  const { percent, remaining } = useMemo(() => getLatestProgress(lines), [lines])
  const { ports = [], hosts = [] } = discoveries || {}

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div>
      <Card
        title={<span><Spin size="small" style={{ marginRight: 8 }} />Scan in progress</span>}
        style={{ marginBottom: 16 }}
      >
        <div style={{ marginBottom: 10 }}>
          <Progress
            percent={percent}
            status="active"
            strokeColor={{ from: '#1677ff', to: '#52c41a' }}
          />
          {remaining && (
            <Text type="secondary" style={{ fontSize: 12 }}>{remaining}</Text>
          )}
        </div>

        <div
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: 12,
            background: '#1a1a1a',
            color: '#00ff41',
            padding: 12,
            borderRadius: 6,
          }}
        >
          {lines.length === 0 && <Text style={{ color: '#666' }}>Waiting for output...</Text>}
          {lines.map((msg, i) => (
            <div key={i} style={{ lineHeight: 1.8 }}>{msg.data}</div>
          ))}
          <div ref={bottomRef} />
        </div>
      </Card>

      {(ports.length > 0 || hosts.length > 0) && (
        <Card title="Discovered so far" size="small">
          {ports.length > 0 && (
            <>
              <Text strong style={{ fontSize: 12 }}>Open Ports ({ports.length})</Text>
              <Table
                dataSource={ports}
                columns={PORT_COLS}
                rowKey={(r, i) => `${r.ip}-${r.port}-${i}`}
                size="small"
                pagination={false}
                style={{ marginTop: 6, marginBottom: hosts.length > 0 ? 16 : 0 }}
              />
            </>
          )}
          {hosts.length > 0 && (
            <>
              <Text strong style={{ fontSize: 12 }}>Hosts Up ({hosts.length})</Text>
              <Table
                dataSource={hosts}
                columns={HOST_COLS}
                rowKey={(r, i) => `${r.ip}-${i}`}
                size="small"
                pagination={false}
                style={{ marginTop: 6 }}
              />
            </>
          )}
        </Card>
      )}
    </div>
  )
}
