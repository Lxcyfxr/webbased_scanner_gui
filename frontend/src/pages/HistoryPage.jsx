import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Table, Tag, Button, Drawer, Typography, Space, theme as antTheme, Popconfirm } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import ScanResults    from '../components/ScanResults'
import FuzzingResults from '../components/fuzzing/FuzzingResults'
import { listJobs, deleteJob } from '../api'

const { Content, Footer } = Layout
const { Text } = Typography

const STATUS_COLOR = { done: 'green', running: 'blue', failed: 'red', pending: 'orange', cancelled: 'warning' }
const TOOL_COLOR   = { nmap: 'geekblue', ffuf: 'purple', feroxbuster: 'magenta', gobuster: 'cyan', wenum: 'volcano' }

const FUZZING_TOOLS = new Set(['ffuf', 'feroxbuster', 'gobuster', 'wenum'])

function getSummary(job) {
  if (!job.result_json) return {}
  try {
    const d = JSON.parse(job.result_json)
    if (job.tool === 'nmap') {
      const hosts = d.hosts || []
      return { hostsUp: hosts.filter(h => h.status === 'up').length, openPorts: hosts.flatMap(h => h.ports || []).filter(p => p.state === 'open').length }
    }
    return { found: (d.findings || []).length }
  } catch { return {} }
}

function getDuration(job) {
  if (!job.finished_at) return '—'
  const s = Math.round((new Date(job.finished_at) - new Date(job.created_at)) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function HistoryPage() {
  const { token } = antTheme.useToken()
  const navigate  = useNavigate()
  const [jobs, setJobs]       = useState([])
  const [selected, setSelected] = useState(null)
  const [drawerOpen, setDrawer] = useState(false)

  const load = () => listJobs().then(setJobs).catch(() => {})
  useEffect(() => { load() }, [])

  const openReport = (job) => {
    if (!job.result_json) return
    const parsed = JSON.parse(job.result_json)
    setSelected({ ...parsed, target: job.target, tool: job.tool, jobId: job.id, scanId: job.id, cancelled: job.status === 'cancelled' })
    setDrawer(true)
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    await deleteJob(id)
    load()
  }

  const columns = [
    {
      title: 'Tool', dataIndex: 'tool', key: 'tool', width: 110,
      render: t => <Tag color={TOOL_COLOR[t] || 'default'}>{t}</Tag>,
    },
    {
      title: 'Target', dataIndex: 'target', key: 'target',
      render: (t, job) => (
        <Button type="link" style={{ padding: 0 }} disabled={!job.result_json} onClick={() => openReport(job)}>{t}</Button>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: s => <Tag color={STATUS_COLOR[s] || 'default'}>{s}</Tag>,
    },
    { title: 'Started', dataIndex: 'created_at', key: 'created_at', width: 175, render: d => new Date(d).toLocaleString() },
    { title: 'Duration', key: 'duration', width: 90, render: (_, job) => getDuration(job) },
    {
      title: 'Results', key: 'results', width: 130,
      render: (_, job) => {
        const s = getSummary(job)
        if (job.tool === 'nmap') return s.hostsUp != null
          ? <Space size={4}><Tag color="blue">{s.hostsUp} up</Tag><Tag color="green">{s.openPorts} ports</Tag></Space>
          : <Text type="secondary">—</Text>
        return s.found != null ? <Tag color="blue">{s.found} found</Tag> : <Text type="secondary">—</Text>
      },
    },
    {
      title: '', key: 'del', width: 48,
      render: (_, job) => (
        <Popconfirm title="Delete this job?" onConfirm={e => handleDelete(job.id, e)} onClick={e => e.stopPropagation()} okText="Yes" cancelText="No">
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Content style={{ padding: 24, background: token.colorBgLayout, overflowY: 'auto', flex: 1 }}>
        <Table dataSource={jobs} columns={columns} rowKey="id"
          onRow={job => ({ onClick: () => openReport(job), style: { cursor: job.result_json ? 'pointer' : 'default' } })}
          locale={{ emptyText: 'No jobs yet' }}
        />
      </Content>

      <Drawer
        title={selected ? `Report — ${selected.target}` : ''}
        placement="right"
        width="60%"
        open={drawerOpen}
        onClose={() => setDrawer(false)}
        destroyOnClose
      >
        {selected && (
          FUZZING_TOOLS.has(selected.tool)
            ? <FuzzingResults result={selected} />
            : <ScanResults    result={selected} />
        )}
      </Drawer>
    </Layout>
  )
}
