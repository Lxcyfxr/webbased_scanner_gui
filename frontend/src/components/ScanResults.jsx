import { Alert, Card, Table, Tag, Badge, Typography, Space, Empty } from 'antd'

const { Text, Title } = Typography

const STATE_COLOR = { open: 'green', closed: 'red', filtered: 'orange' }

function PortsTable({ ports }) {
  const columns = [
    { title: 'Port', dataIndex: 'port', key: 'port', width: 75 },
    { title: 'Proto', dataIndex: 'protocol', key: 'protocol', width: 70 },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      width: 90,
      render: s => <Tag color={STATE_COLOR[s] || 'default'}>{s}</Tag>,
    },
    { title: 'Service', dataIndex: 'service', key: 'service', width: 100 },
    {
      title: 'Product / Version',
      key: 'version',
      render: (_, r) => [r.product, r.version].filter(Boolean).join(' ') || '—',
    },
  ]

  return (
    <Table
      dataSource={ports}
      columns={columns}
      rowKey={r => `${r.port}-${r.protocol}`}
      size="small"
      pagination={false}
    />
  )
}

function HostCard({ host }) {
  const isUp = host.status === 'up'
  const hostnames = host.hostnames?.filter(Boolean).join(', ')
  const ports = host.ports || []
  const openPorts = ports.filter(p => p.state === 'open')

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <Space>
          <Badge status={isUp ? 'success' : 'error'} />
          <Text strong>{host.ip || 'Unknown'}</Text>
          {hostnames && <Text type="secondary">({hostnames})</Text>}
          {host.mac && <Tag color="geekblue">{host.mac}</Tag>}
          <Tag color={isUp ? 'success' : 'error'}>{host.status}</Tag>
          {openPorts.length > 0 && (
            <Tag color="blue">{openPorts.length} open port{openPorts.length !== 1 ? 's' : ''}</Tag>
          )}
        </Space>
      }
    >
      {host.os && (
        <div style={{ marginBottom: 10 }}>
          <Text type="secondary">OS guess: </Text>
          <Text>{host.os[0]?.name}</Text>
          <Tag style={{ marginLeft: 6 }}>{host.os[0]?.accuracy}% accuracy</Tag>
        </div>
      )}
      {ports.length > 0 ? (
        <PortsTable ports={ports} />
      ) : (
        <Text type="secondary">No port data</Text>
      )}
    </Card>
  )
}

export default function ScanResults({ result }) {
  if (!result) return null

  const hosts = result.hosts || []
  const upCount = hosts.filter(h => h.status === 'up').length

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          Results — {result.target}
        </Title>
        <Tag color="blue">{upCount} up</Tag>
        <Tag>{hosts.length} total</Tag>
      </Space>

      {result.cancelled && (
        <Alert
          type="warning"
          showIcon
          message="Scan was stopped early"
          description="These results are partial. Not all hosts or ports may have been scanned."
          style={{ marginBottom: 16 }}
        />
      )}

      {hosts.length === 0 ? (
        <Empty description="No hosts found" />
      ) : (
        hosts.map((host, i) => <HostCard key={i} host={host} />)
      )}
    </div>
  )
}
