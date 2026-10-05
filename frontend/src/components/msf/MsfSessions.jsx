import { List, Tag, Button, Typography, Divider, Popconfirm, Empty } from 'antd'
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState, useEffect, useCallback } from 'react'

const { Text } = Typography

const SESSION_COLOR = { meterpreter: 'green', shell: 'orange' }

export default function MsfSessions({ connected }) {
  const [sessions, setSessions] = useState({})

  const load = useCallback(async () => {
    if (!connected) return
    try {
      const data = await fetch('/msf/sessions').then(r => r.json())
      setSessions(data ?? {})
    } catch {
      setSessions({})
    }
  }, [connected])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  const kill = async (sid) => {
    await fetch(`/msf/sessions/${sid}`, { method: 'DELETE' })
    load()
  }

  const list = Object.entries(sessions)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text strong style={{ fontSize: 13 }}>Sessions</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={load} type="text" />
      </div>
      <Divider style={{ margin: '6px 0 10px' }} />

      {list.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>No active sessions</Text>
      ) : (
        <List
          dataSource={list}
          size="small"
          renderItem={([sid, s]) => (
            <List.Item
              style={{ padding: '4px 2px' }}
              actions={[
                <Popconfirm title="Kill session?" onConfirm={() => kill(sid)} okText="Yes" cancelText="No">
                  <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Tag color={SESSION_COLOR[s.type] || 'default'} style={{ fontSize: 10, margin: 0 }}>{s.type}</Tag>
                    <Text style={{ fontSize: 11 }}>{sid}</Text>
                  </div>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {s.tunnel_peer} — {s.info || s.via_exploit}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  )
}
