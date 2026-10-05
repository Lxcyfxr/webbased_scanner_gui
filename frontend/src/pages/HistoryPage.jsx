import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Table, Tag, Button, Drawer, Typography, Space, theme as antTheme, Popconfirm } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, RadarChartOutlined } from '@ant-design/icons'
import ScanResults from '../components/ScanResults'
import { listScans, deleteScan } from '../api'

const { Content, Header } = Layout
const { Title, Text } = Typography

const STATUS_COLOR = { done: 'green', running: 'blue', failed: 'red', pending: 'orange', cancelled: 'warning' }

function getSummary(scan) {
  if (!scan.result_json) return { hostsUp: null, openPorts: null }
  try {
    const { hosts = [] } = JSON.parse(scan.result_json)
    return {
      hostsUp: hosts.filter(h => h.status === 'up').length,
      openPorts: hosts.flatMap(h => h.ports || []).filter(p => p.state === 'open').length,
    }
  } catch {
    return { hostsUp: null, openPorts: null }
  }
}

function getDuration(scan) {
  if (!scan.finished_at) return '—'
  const s = Math.round((new Date(scan.finished_at) - new Date(scan.created_at)) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function HistoryPage() {
  const { token } = antTheme.useToken()
  const navigate = useNavigate()
  const [scans, setScans] = useState([])
  const [selected, setSelected] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = () => listScans().then(setScans).catch(() => {})
  useEffect(() => { load() }, [])

  const openReport = (scan) => {
    if (!scan.result_json) return
    const parsed = JSON.parse(scan.result_json)
    setSelected({ ...parsed, target: scan.target, scanId: scan.id, cancelled: scan.status === 'cancelled' })
    setDrawerOpen(true)
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    await deleteScan(id)
    load()
  }

  const columns = [
    {
      title: 'Target',
      dataIndex: 'target',
      key: 'target',
      render: (t, scan) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          disabled={!scan.result_json}
          onClick={() => openReport(scan)}
        >
          {t}
        </Button>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: s => <Tag color={STATUS_COLOR[s] || 'default'}>{s}</Tag>,
    },
    {
      title: 'Started',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: d => new Date(d).toLocaleString(),
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 90,
      render: (_, scan) => getDuration(scan),
    },
    {
      title: 'Hosts Up',
      key: 'hosts_up',
      width: 95,
      render: (_, scan) => {
        const { hostsUp } = getSummary(scan)
        return hostsUp != null ? <Tag color="blue">{hostsUp}</Tag> : <Text type="secondary">—</Text>
      },
    },
    {
      title: 'Open Ports',
      key: 'open_ports',
      width: 105,
      render: (_, scan) => {
        const { openPorts } = getSummary(scan)
        return openPorts != null ? <Tag color="green">{openPorts}</Tag> : <Text type="secondary">—</Text>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, scan) => (
        <Popconfirm
          title="Delete this scan?"
          onConfirm={e => handleDelete(scan.id, e)}
          onClick={e => e.stopPropagation()}
          okText="Yes"
          cancelText="No"
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={e => e.stopPropagation()}
          />
        </Popconfirm>
      ),
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 24px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <RadarChartOutlined style={{ color: token.colorPrimary, fontSize: 22 }} />
        <Title level={4} style={{ margin: 0, flex: 1, color: token.colorText }}>
          nmap Web GUI — Scan History
        </Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          Back to Scanner
        </Button>
      </Header>

      <Content style={{ padding: 24, background: token.colorBgLayout }}>
        <Table
          dataSource={scans}
          columns={columns}
          rowKey="id"
          onRow={(scan) => ({
            onClick: () => openReport(scan),
            style: { cursor: scan.result_json ? 'pointer' : 'default' },
          })}
          locale={{ emptyText: 'No scans yet' }}
        />
      </Content>

      <Drawer
        title={selected ? `Full Report — ${selected.target}` : ''}
        placement="right"
        width="60%"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        {selected && <ScanResults result={selected} />}
      </Drawer>
    </Layout>
  )
}
