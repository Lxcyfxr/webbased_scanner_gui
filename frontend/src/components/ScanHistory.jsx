import { List, Tag, Typography, Divider, Popconfirm, Button } from 'antd'
import { DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listScans, deleteScan } from '../api'

const { Text } = Typography

const STATUS_COLOR = { done: 'green', running: 'blue', failed: 'red', pending: 'orange', cancelled: 'warning' }

export default function ScanHistory({ onSelect }) {
  const [scans, setScans] = useState([])
  const navigate = useNavigate()

  const load = () => listScans().then(setScans).catch(() => {})
  useEffect(() => { load() }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    await deleteScan(id)
    load()
  }

  const handleSelect = (scan) => {
    if (!scan.result_json) return
    const parsed = JSON.parse(scan.result_json)
    onSelect({ ...parsed, target: scan.target, scanId: scan.id, cancelled: scan.status === 'cancelled' })
  }

  const displayed = scans.slice(0, 3)
  const hasMore = scans.length > 3

  return (
    <div>
      <Text strong style={{ fontSize: 14 }}>Recent Scans</Text>
      <Divider style={{ margin: '8px 0 12px' }} />

      {scans.length === 0 && (
        <Text type="secondary" style={{ fontSize: 12 }}>No scans yet</Text>
      )}

      <List
        dataSource={displayed}
        size="small"
        renderItem={scan => (
          <List.Item
            style={{
              cursor: scan.result_json ? 'pointer' : 'default',
              padding: '6px 4px',
              borderRadius: 4,
            }}
            onClick={() => handleSelect(scan)}
            actions={[
              <Popconfirm
                title="Delete this scan?"
                onConfirm={e => handleDelete(scan.id, e)}
                onClick={e => e.stopPropagation()}
                okText="Yes"
                cancelText="No"
              >
                <DeleteOutlined
                  style={{ color: '#ff4d4f', fontSize: 13 }}
                  onClick={e => e.stopPropagation()}
                />
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={
                <Text ellipsis style={{ maxWidth: 160, fontSize: 12 }}>
                  {scan.target}
                </Text>
              }
              description={
                <Tag color={STATUS_COLOR[scan.status] || 'default'} style={{ fontSize: 11 }}>
                  {scan.status}
                </Tag>
              }
            />
          </List.Item>
        )}
      />

      {(hasMore || scans.length > 0) && (
        <Button
          type="dashed"
          size="small"
          block
          icon={<UnorderedListOutlined />}
          style={{ marginTop: 8 }}
          onClick={() => navigate('/history')}
        >
          {hasMore ? 'More' : 'View all scans'}
        </Button>
      )}
    </div>
  )
}
