import { Table, Tag, Typography, Space, Button, Dropdown, Alert, Empty } from 'antd'
import { DownloadOutlined, FileTextOutlined, TableOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const STATUS_COLOR = (s) => {
  if (s >= 500) return 'red'
  if (s >= 400) return 'orange'
  if (s >= 300) return 'blue'
  if (s >= 200) return 'green'
  return 'default'
}

function triggerDownload(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

function exportJSON(result) {
  triggerDownload(`fuzz_${result.target.replace(/[^a-z0-9]/gi, '_')}.json`, JSON.stringify(result, null, 2), 'application/json')
}

function exportCSV(result) {
  const rows = [['URL/Path', 'Status', 'Size', 'Words', 'Lines', 'Redirect']]
  for (const f of result.findings || []) {
    rows.push([f.value, f.status, f.size ?? '', f.words ?? '', f.lines ?? '', f.redirect ?? ''])
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  triggerDownload(`fuzz_${result.target.replace(/[^a-z0-9]/gi, '_')}.csv`, csv, 'text/csv')
}

const EXPORT_ITEMS = [
  { key: 'json', label: 'JSON', icon: <FileTextOutlined /> },
  { key: 'csv',  label: 'CSV',  icon: <TableOutlined />    },
]

const COLUMNS = [
  {
    title: 'Path / Value',
    dataIndex: 'value',
    key: 'value',
    render: v => <Text code style={{ fontSize: 12 }}>{v}</Text>,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 80,
    render: s => <Tag color={STATUS_COLOR(s)}>{s}</Tag>,
  },
  { title: 'Size',  dataIndex: 'size',  key: 'size',  width: 80,
    render: v => v != null ? v : <Text type="secondary">—</Text> },
  { title: 'Words', dataIndex: 'words', key: 'words', width: 75,
    render: v => v != null ? v : <Text type="secondary">—</Text> },
  { title: 'Lines', dataIndex: 'lines', key: 'lines', width: 75,
    render: v => v != null ? v : <Text type="secondary">—</Text> },
  {
    title: 'Redirect',
    dataIndex: 'redirect',
    key: 'redirect',
    render: v => v ? <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> : null,
  },
]

export default function FuzzingResults({ result, live = false }) {
  if (!result) return null

  const findings = result.findings || []

  const handleExport = ({ key }) => {
    if (key === 'json') exportJSON(result)
    if (key === 'csv')  exportCSV(result)
  }

  return (
    <div>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            {live ? 'Live Results' : 'Results'} — {result.target}
          </Title>
          <Tag color="blue">{findings.length} found</Tag>
          {result.engine && <Tag>{result.engine}</Tag>}
        </Space>
        {!live && (
          <Dropdown menu={{ items: EXPORT_ITEMS, onClick: handleExport }} placement="bottomRight">
            <Button icon={<DownloadOutlined />} size="small">Export</Button>
          </Dropdown>
        )}
      </Space>

      {result.cancelled && (
        <Alert type="warning" showIcon message="Scan stopped early — results are partial." style={{ marginBottom: 12 }} />
      )}

      {findings.length === 0
        ? <Empty description={live ? 'Waiting for results...' : 'Nothing found'} />
        : (
          <Table
            dataSource={findings}
            columns={COLUMNS}
            rowKey={(r, i) => `${r.value}-${i}`}
            size="small"
            pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `${t} total` }}
          />
        )
      }
    </div>
  )
}
