import { useState } from 'react'
import {
  Layout, Input, Select, Button, Form, Tabs, Tag, Typography, Space,
  Divider, Switch, InputNumber, theme as antTheme, Badge,
} from 'antd'
import {
  SendOutlined, PlusOutlined, DeleteOutlined, CodeOutlined, UnorderedListOutlined,
} from '@ant-design/icons'

const { Content } = Layout
const { Text, Title } = Typography
const { TextArea } = Input

const METHODS = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']

const METHOD_COLOR = {
  GET:     'green',
  POST:    'blue',
  PUT:     'orange',
  PATCH:   'gold',
  DELETE:  'red',
  HEAD:    'cyan',
  OPTIONS: 'purple',
}

const STATUS_COLOR = (s) => {
  if (s < 200) return 'default'
  if (s < 300) return 'success'
  if (s < 400) return 'warning'
  return 'error'
}

const tryFormatJson = (text) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

export default function HttpClientPage() {
  const { token } = antTheme.useToken()
  const [form] = Form.useForm()
  const [method, setMethod]       = useState('GET')
  const [url, setUrl]             = useState('')
  const [headers, setHeaders]     = useState([{ key: '', value: '' }])
  const [body, setBody]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [response, setResponse]   = useState(null)
  const [error, setError]         = useState(null)
  const [activeTab, setActiveTab] = useState('body')

  const addHeader = () => setHeaders(h => [...h, { key: '', value: '' }])
  const removeHeader = (i) => setHeaders(h => h.filter((_, idx) => idx !== i))
  const updateHeader = (i, field, val) =>
    setHeaders(h => h.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const send = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setResponse(null)

    const hdrs = {}
    headers.forEach(({ key, value }) => { if (key.trim()) hdrs[key.trim()] = value })

    const followRedirects = form.getFieldValue('follow_redirects') ?? true
    const timeout         = form.getFieldValue('timeout') ?? 30
    const verifySSL       = form.getFieldValue('verify_ssl') ?? true

    try {
      const res = await fetch('/tools/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          url: url.trim(),
          headers: hdrs,
          body: ['GET','HEAD','DELETE','OPTIONS'].includes(method) ? '' : body,
          follow_redirects: followRedirects,
          timeout,
          verify_ssl: verifySSL,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Request failed')
        return
      }
      setResponse(await res.json())
      setActiveTab('body')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const hasBody = !['GET','HEAD','DELETE','OPTIONS'].includes(method)

  const mono = { fontFamily: 'monospace', fontSize: 12 }

  return (
    <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden', flexDirection: 'column' }}>

      {/* ── URL bar ── */}
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap' }}>HTTP Client</Title>
        <Select
          value={method}
          onChange={setMethod}
          style={{ width: 110 }}
          options={METHODS.map(m => ({
            value: m,
            label: <Tag color={METHOD_COLOR[m]} style={{ margin: 0 }}>{m}</Tag>,
          }))}
        />
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com/api/endpoint"
          onPressEnter={send}
          style={{ flex: 1, ...mono }}
          autoComplete="off"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={send}
          disabled={!url.trim()}
        >
          Send
        </Button>
      </div>

      {/* ── main area: request | response ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── request panel ── */}
        <div style={{
          width: 380,
          flexShrink: 0,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <Tabs
            size="small"
            style={{ padding: '0 12px', flex: 1, minHeight: 0 }}
            items={[
              {
                key: 'headers',
                label: <><UnorderedListOutlined /> Headers</>,
                children: (
                  <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 12 }}>
                    {headers.map((h, i) => (
                      <Space key={i} style={{ marginBottom: 6, width: '100%' }} align="baseline">
                        <Input
                          size="small"
                          placeholder="Key"
                          value={h.key}
                          onChange={e => updateHeader(i, 'key', e.target.value)}
                          style={{ width: 130, ...mono }}
                        />
                        <Input
                          size="small"
                          placeholder="Value"
                          value={h.value}
                          onChange={e => updateHeader(i, 'value', e.target.value)}
                          style={{ width: 150, ...mono }}
                        />
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeHeader(i)}
                        />
                      </Space>
                    ))}
                    <Button size="small" icon={<PlusOutlined />} onClick={addHeader}>
                      Add header
                    </Button>
                  </div>
                ),
              },
              {
                key: 'body',
                label: <><CodeOutlined /> Body</>,
                disabled: !hasBody,
                children: (
                  <TextArea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    autoSize={{ minRows: 10 }}
                    style={{ ...mono, resize: 'vertical' }}
                  />
                ),
              },
              {
                key: 'settings',
                label: 'Settings',
                children: (
                  <Form form={form} layout="vertical" size="small" initialValues={{ follow_redirects: true, timeout: 30, verify_ssl: true }}>
                    <Form.Item name="follow_redirects" label="Follow redirects" valuePropName="checked">
                      <Switch size="small" />
                    </Form.Item>
                    <Form.Item name="verify_ssl" label="Verify SSL" valuePropName="checked">
                      <Switch size="small" />
                    </Form.Item>
                    <Form.Item name="timeout" label="Timeout (s)">
                      <InputNumber min={1} max={120} style={{ width: '100%' }} />
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </div>

        {/* ── response panel ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* status bar */}
          {(response || error) && (
            <div style={{
              padding: '8px 16px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: token.colorBgContainer,
            }}>
              {response && (
                <>
                  <Badge status={STATUS_COLOR(response.status)} />
                  <Text strong style={{ fontSize: 15 }}>{response.status}</Text>
                  <Text type="secondary">{response.reason}</Text>
                  <Divider type="vertical" />
                  <Text type="secondary" style={{ fontSize: 12 }}>{response.elapsed_ms} ms</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {(new TextEncoder().encode(response.body).length / 1024).toFixed(1)} KB
                  </Text>
                  {response.redirects.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {response.redirects.length} redirect{response.redirects.length > 1 ? 's' : ''}
                    </Text>
                  )}
                </>
              )}
              {error && <Text type="danger">{error}</Text>}
            </div>
          )}

          {/* response tabs */}
          {response ? (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="small"
              style={{ padding: '0 12px', flex: 1, minHeight: 0 }}
              items={[
                {
                  key: 'body',
                  label: 'Body',
                  children: (
                    <div style={{
                      overflowY: 'auto',
                      height: '100%',
                      background: token.colorBgLayout,
                      borderRadius: 6,
                      padding: 12,
                    }}>
                      <pre style={{ ...mono, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: token.colorText }}>
                        {tryFormatJson(response.body)}
                      </pre>
                    </div>
                  ),
                },
                {
                  key: 'headers',
                  label: `Headers (${Object.keys(response.headers).length})`,
                  children: (
                    <div style={{ overflowY: 'auto', height: '100%' }}>
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                          <Text strong style={{ ...mono, width: 220, flexShrink: 0, color: token.colorPrimary }}>{k}</Text>
                          <Text style={{ ...mono, wordBreak: 'break-all' }}>{v}</Text>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {loading ? 'Sending request…' : 'Enter a URL and press Send'}
              </Text>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
