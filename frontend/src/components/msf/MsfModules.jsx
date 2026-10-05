import { Input, List, Tag, Typography, Spin, Empty, Divider } from 'antd'
import { useState, useCallback, useRef } from 'react'

const { Text } = Typography

const TYPE_COLOR = {
  exploit:   'red',
  auxiliary: 'orange',
  post:      'blue',
  payload:   'purple',
  encoder:   'cyan',
  nop:       'default',
}

function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

export default function MsfModules({ onSelect }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery]     = useState('')

  const search = useCallback(debounce(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const data = await fetch(`/msf/modules?q=${encodeURIComponent(q)}`).then(r => r.json())
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, 400), [])

  const handleChange = (e) => {
    setQuery(e.target.value)
    search(e.target.value)
  }

  return (
    <div>
      <Text strong style={{ fontSize: 13 }}>Module Search</Text>
      <Divider style={{ margin: '6px 0 10px' }} />

      <Input.Search
        value={query}
        onChange={handleChange}
        placeholder="e.g. ms17_010, smb, eternalblue"
        size="small"
        loading={loading}
        allowClear
        onClear={() => setResults([])}
      />

      {results.length > 0 && (
        <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8 }}>
          <List
            dataSource={results}
            size="small"
            renderItem={mod => (
              <List.Item
                style={{ cursor: 'pointer', padding: '4px 2px' }}
                onClick={() => onSelect(mod)}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Tag color={TYPE_COLOR[mod.type] || 'default'} style={{ fontSize: 10, margin: 0 }}>
                      {mod.type}
                    </Tag>
                    {mod.rank && <Tag style={{ fontSize: 10, margin: 0 }}>{mod.rank}</Tag>}
                  </div>
                  <Text style={{ fontSize: 11 }} ellipsis>
                    {mod.fullname || mod.name}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <Empty description="No modules found" style={{ marginTop: 16 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )
}
