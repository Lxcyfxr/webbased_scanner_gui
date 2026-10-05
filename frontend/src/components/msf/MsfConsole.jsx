import { useEffect, useRef, useState } from 'react'
import { Input, Button, Space, Tag, Typography } from 'antd'
import { SendOutlined, ClearOutlined } from '@ant-design/icons'

const { Text } = Typography

const wsBase = () => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}

export default function MsfConsole({ connected, fillCommand, commandBatch }) {
  const [lines, setLines]       = useState([])
  const [input, setInput]       = useState('')
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [history, setHistory]   = useState([])
  const [histIdx, setHistIdx]   = useState(-1)
  const ws   = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    if (!connected) return

    const socket = new WebSocket(`${wsBase()}/msf/console`)
    ws.current = socket
    setWsStatus('connecting')

    socket.onopen  = () => setWsStatus('connected')
    socket.onclose = () => setWsStatus('disconnected')
    socket.onerror = () => setWsStatus('error')

    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'output' || msg.type === 'error') {
        setLines(prev => [...prev, { text: msg.data, type: msg.type }])
      }
    }

    return () => socket.close()
  }, [connected])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    if (fillCommand?.cmd) setInput(fillCommand.cmd)
  }, [fillCommand])

  useEffect(() => {
    if (!commandBatch?.cmds?.length || wsStatus !== 'connected') return
    commandBatch.cmds.forEach((cmd, i) => {
      setTimeout(() => {
        ws.current?.send(JSON.stringify({ type: 'input', command: cmd }))
      }, i * 150)
    })
  }, [commandBatch])

  const send = () => {
    const cmd = input.trim()
    if (!cmd || wsStatus !== 'connected') return
    ws.current.send(JSON.stringify({ type: 'input', command: cmd }))
    setHistory(h => [cmd, ...h].slice(0, 50))
    setHistIdx(-1)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { send(); return }
    if (e.key === 'ArrowUp') {
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setInput(history[next] ?? '')
    }
    if (e.key === 'ArrowDown') {
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setInput(next === -1 ? '' : history[next])
    }
  }

  const statusColor = { connected: 'green', connecting: 'orange', disconnected: 'default', error: 'red' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #30363d', background: '#161b22', flexShrink: 0 }}>
        <Space size={6}>
          <Tag color={statusColor[wsStatus]} style={{ margin: 0 }}>{wsStatus}</Tag>
          <Text style={{ fontSize: 12, color: '#58a6ff' }}>msfconsole</Text>
        </Space>
        <Button
          size="small"
          icon={<ClearOutlined />}
          type="text"
          style={{ color: '#8b949e' }}
          onClick={() => setLines([])}
        >
          Clear
        </Button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#0d1117',
          padding: '10px 14px',
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {lines.length === 0 && wsStatus === 'connected' && (
          <Text style={{ color: '#484f58' }}>Waiting for banner...</Text>
        )}
        {lines.length === 0 && wsStatus !== 'connected' && (
          <Text style={{ color: '#484f58' }}>
            {connected ? 'Connecting to msfconsole...' : 'Connect to Metasploit first.'}
          </Text>
        )}
        {lines.map((line, i) => (
          <pre
            key={i}
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: line.type === 'error' ? '#f85149' : '#e6edf3',
            }}
          >
            {line.text}
          </pre>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: 8, background: '#161b22', flexShrink: 0 }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={wsStatus === 'connected' ? 'msf6 > ...' : 'Not connected'}
          disabled={wsStatus !== 'connected'}
          style={{
            fontFamily: 'monospace',
            background: '#0d1117',
            color: '#e6edf3',
            borderColor: '#30363d',
          }}
          prefix={<Text style={{ color: '#58a6ff', fontFamily: 'monospace', fontSize: 12 }}>msf&gt;</Text>}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={send}
          disabled={wsStatus !== 'connected'}
        />
      </div>
    </div>
  )
}
