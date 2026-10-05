import { Alert, Card, Table, Tag, Badge, Typography, Space, Empty, Button, Dropdown } from 'antd'
import { DownloadOutlined, FileTextOutlined, TableOutlined, CodeOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

const STATE_COLOR = { open: 'green', closed: 'red', filtered: 'orange' }

// ── export helpers ────────────────────────────────────────────────────────────

function triggerDownload(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

function safeName(target) {
  return target.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function doExportJSON(result) {
  const payload = { target: result.target, exported_at: new Date().toISOString(), hosts: result.hosts }
  triggerDownload(`scan_${safeName(result.target)}.json`, JSON.stringify(payload, null, 2), 'application/json')
}

function doExportCSV(result) {
  const header = ['IP', 'Hostname', 'MAC', 'Status', 'Port', 'Protocol', 'State', 'Service', 'Product', 'Version']
  const rows = [header]
  for (const host of result.hosts || []) {
    const ip       = host.ip || ''
    const hostname = (host.hostnames || []).filter(Boolean).join(';')
    const mac      = host.mac || ''
    const status   = host.status || ''
    const ports    = host.ports || []
    if (ports.length === 0) {
      rows.push([ip, hostname, mac, status, '', '', '', '', '', ''])
    } else {
      for (const p of ports) {
        rows.push([ip, hostname, mac, status, p.port, p.protocol, p.state, p.service || '', p.product || '', p.version || ''])
      }
    }
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  triggerDownload(`scan_${safeName(result.target)}.csv`, csv, 'text/csv')
}

async function doExportXML(result) {
  const res = await fetch(`/jobs/${result.scanId}/xml`)
  if (!res.ok) return
  const xml = await res.text()
  triggerDownload(`scan_${safeName(result.target)}.xml`, xml, 'application/xml')
}

// ── sub-components ────────────────────────────────────────────────────────────

function PortsTable({ ports }) {
  const columns = [
    { title: 'Port',     dataIndex: 'port',     key: 'port',     width: 75 },
    { title: 'Proto',    dataIndex: 'protocol', key: 'protocol', width: 70 },
    {
      title: 'State', dataIndex: 'state', key: 'state', width: 90,
      render: s => <Tag color={STATE_COLOR[s] || 'default'}>{s}</Tag>,
    },
    { title: 'Service', dataIndex: 'service', key: 'service', width: 100 },
    {
      title: 'Product / Version', key: 'version',
      render: (_, r) => [r.product, r.version].filter(Boolean).join(' ') || '—',
    },
  ]
  return <Table dataSource={ports} columns={columns} rowKey={r => `${r.port}-${r.protocol}`} size="small" pagination={false} />
}

function HostCard({ host }) {
  const isUp      = host.status === 'up'
  const hostnames = host.hostnames?.filter(Boolean).join(', ')
  const ports     = host.ports || []
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
      {ports.length > 0 ? <PortsTable ports={ports} /> : <Text type="secondary">No port data</Text>}
    </Card>
  )
}

// ── main component ────────────────────────────────────────────────────────────

const EXPORT_ITEMS = [
  { key: 'json', label: 'JSON',  icon: <FileTextOutlined /> },
  { key: 'csv',  label: 'CSV',   icon: <TableOutlined />    },
  { key: 'xml',  label: 'XML',   icon: <CodeOutlined />     },
]

export default function ScanResults({ result }) {
  if (!result) return null

  const hosts   = result.hosts || []
  const upCount = hosts.filter(h => h.status === 'up').length

  const handleExport = ({ key }) => {
    if (key === 'json') doExportJSON(result)
    if (key === 'csv')  doExportCSV(result)
    if (key === 'xml')  doExportXML(result)
  }

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Title level={5} style={{ margin: 0 }}>Results — {result.target}</Title>
          <Tag color="blue">{upCount} up</Tag>
          <Tag>{hosts.length} total</Tag>
        </Space>

        <Dropdown menu={{ items: EXPORT_ITEMS, onClick: handleExport }} placement="bottomRight">
          <Button icon={<DownloadOutlined />}>Export</Button>
        </Dropdown>
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

      {hosts.length === 0
        ? <Empty description="No hosts found" />
        : hosts.map((host, i) => <HostCard key={i} host={host} />)
      }
    </div>
  )
}
