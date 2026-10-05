import { List, Tag, Typography, Divider, Popconfirm, Button, Space } from 'antd'
import { DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listJobs, deleteJob } from '../api'

const { Text } = Typography

const STATUS_COLOR = { done: 'green', running: 'blue', failed: 'red', pending: 'orange', cancelled: 'warning' }
const TOOL_COLOR   = { nmap: 'geekblue', ffuf: 'purple', feroxbuster: 'magenta', gobuster: 'cyan', wenum: 'volcano' }

// tool=null means show all fuzzing tools; tool="nmap" means nmap only
export default function ScanHistory({ onSelect, tool = 'nmap', fuzzing = false }) {
  const [jobs, setJobs] = useState([])
  const navigate = useNavigate()

  const load = () => {
    // for fuzzing page show all non-nmap jobs; for nmap page show nmap only
    listJobs(fuzzing ? undefined : tool).then(all => {
      const filtered = fuzzing ? all.filter(j => j.tool !== 'nmap') : all
      setJobs(filtered)
    }).catch(() => {})
  }

  useEffect(() => { load() }, [tool, fuzzing])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    await deleteJob(id)
    load()
  }

  const handleSelect = (job) => {
    if (!job.result_json) return
    onSelect(job)
  }

  const displayed = jobs.slice(0, 3)
  const hasMore   = jobs.length > 3

  return (
    <div>
      <Text strong style={{ fontSize: 14 }}>Recent Jobs</Text>
      <Divider style={{ margin: '8px 0 12px' }} />

      {jobs.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>No jobs yet</Text>}

      <List
        dataSource={displayed}
        size="small"
        renderItem={job => (
          <List.Item
            style={{ cursor: job.result_json ? 'pointer' : 'default', padding: '6px 4px', borderRadius: 4 }}
            onClick={() => handleSelect(job)}
            actions={[
              <Popconfirm title="Delete this job?" onConfirm={e => handleDelete(job.id, e)} onClick={e => e.stopPropagation()} okText="Yes" cancelText="No">
                <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 13 }} onClick={e => e.stopPropagation()} />
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={<Text ellipsis style={{ maxWidth: 150, fontSize: 12 }}>{job.target}</Text>}
              description={
                <Space size={4}>
                  {fuzzing && <Tag color={TOOL_COLOR[job.tool] || 'default'} style={{ fontSize: 10 }}>{job.tool}</Tag>}
                  <Tag color={STATUS_COLOR[job.status] || 'default'} style={{ fontSize: 11 }}>{job.status}</Tag>
                </Space>
              }
            />
          </List.Item>
        )}
      />

      {(hasMore || jobs.length > 0) && (
        <Button type="dashed" size="small" block icon={<UnorderedListOutlined />} style={{ marginTop: 8 }} onClick={() => navigate('/history')}>
          {hasMore ? 'More' : 'View all jobs'}
        </Button>
      )}
    </div>
  )
}
