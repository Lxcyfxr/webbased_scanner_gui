import { Form, Input, InputNumber, Select, Switch, Button, Divider, Typography, Space, Segmented, Tooltip } from 'antd'
import { PlayCircleOutlined, StopOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { listWordlists } from '../../api'

const { Text } = Typography

const ENGINES = [
  { label: 'ffuf',         value: 'ffuf'         },
  { label: 'feroxbuster',  value: 'feroxbuster'  },
  { label: 'gobuster',     value: 'gobuster'     },
  { label: 'wenum',        value: 'wenum'        },
]

function Info({ tip }) {
  return (
    <Tooltip title={tip} placement="right" overlayStyle={{ maxWidth: 260 }}>
      <InfoCircleOutlined style={{ marginLeft: 5, fontSize: 12, color: '#8c8c8c', verticalAlign: 'middle' }} />
    </Tooltip>
  )
}

function InfoLabel({ label, tip }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center' }}>{label}<Info tip={tip} /></span>
}

const ENGINE_NOTES = {
  ffuf:        'Fast Go fuzzer — best for API/parameter fuzzing and custom injection points.',
  feroxbuster: 'Rust-based, auto-recursive. Best for deep directory discovery.',
  gobuster:    'Simple and fast. Good for quick dir/DNS/vhost enumeration.',
  wenum:       'wfuzz successor — flexible filter system, plugin support.',
}

export default function FuzzingForm({ onScan, onStop, scanning, stopping }) {
  const [form]      = Form.useForm()
  const [engine, setEngine]       = useState('ffuf')
  const [wordlists, setWordlists] = useState([])
  const [customWl, setCustomWl]   = useState(false)

  useEffect(() => {
    listWordlists().then(wls => {
      setWordlists(wls)
      if (wls.length) form.setFieldValue('wordlist', wls[0].path)
    }).catch(() => setCustomWl(true))
  }, [])

  const handleSubmit = (values) => {
    const { target, wordlist, custom_wordlist, threads, filter_codes, filter_size, filter_words, extensions, follow_redirects, recursion, depth, insecure, method, data, mode } = values
    onScan(engine, target, {
      wordlist: customWl ? custom_wordlist : wordlist,
      threads:  threads ?? 40,
      filter_codes:      filter_codes  || undefined,
      filter_size:       filter_size   || undefined,
      filter_words:      filter_words  || undefined,
      extensions:        extensions    || undefined,
      follow_redirects:  !!follow_redirects,
      recursion:         !!recursion,
      depth:             depth         || undefined,
      insecure:          !!insecure,
      method:            method        || 'GET',
      data:              data          || undefined,
      mode:              mode          || 'dir',
    })
  }

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ threads: 40, method: 'GET', mode: 'dir' }} size="small">
      <Text strong style={{ fontSize: 14 }}>Web Fuzzing</Text>
      <Divider style={{ margin: '8px 0 12px' }} />

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Engine</Text>
        <Segmented
          options={ENGINES}
          value={engine}
          onChange={setEngine}
          block
          size="small"
        />
        {ENGINE_NOTES[engine] && (
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            {ENGINE_NOTES[engine]}
          </Text>
        )}
      </div>

      <Form.Item name="target" label={<InfoLabel label="Target URL" tip="Full URL to fuzz. FUZZ keyword will be appended to the path automatically if not present. e.g. http://target.com" />} rules={[{ required: true, message: 'Enter a URL' }]}>
        <Input placeholder="http://target.com" allowClear autoComplete="off" />
      </Form.Item>

      <Form.Item label={<InfoLabel label="Wordlist" tip="List of paths/words to try against the target. Choose a preset or enter a custom path." />} required>
        {!customWl && wordlists.length > 0 ? (
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="wordlist" noStyle rules={[{ required: true }]}>
              <Select style={{ flex: 1 }} options={wordlists.map(w => ({ label: w.label, value: w.path }))} />
            </Form.Item>
            <Button onClick={() => setCustomWl(true)}>Custom</Button>
          </Space.Compact>
        ) : (
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="custom_wordlist" noStyle rules={[{ required: true, message: 'Enter path' }]}>
              <Input placeholder="/path/to/wordlist.txt" />
            </Form.Item>
            {wordlists.length > 0 && <Button onClick={() => setCustomWl(false)}>Presets</Button>}
          </Space.Compact>
        )}
      </Form.Item>

      <Form.Item name="threads" label={<InfoLabel label="Threads" tip="Number of concurrent requests. Higher = faster but more aggressive. Stay below 100 on production targets." />}>
        <InputNumber min={1} max={500} style={{ width: '100%' }} />
      </Form.Item>

      <Divider style={{ margin: '8px 0 12px' }}>Filters</Divider>

      <Form.Item name="filter_codes" label={<InfoLabel label="Hide status codes" tip="Comma-separated HTTP status codes to hide from results. e.g. 404,403,500" />}>
        <Input placeholder="404,403" allowClear />
      </Form.Item>

      <Form.Item name="filter_size" label={<InfoLabel label="Hide response size" tip="Hide responses with this exact byte size. Useful to filter wildcard responses that all return the same size." />}>
        <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 1337" />
      </Form.Item>

      <Form.Item name="filter_words" label={<InfoLabel label="Hide word count" tip="Hide responses with this exact word count. Another way to filter wildcard responses." />}>
        <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 9" />
      </Form.Item>

      <Divider style={{ margin: '8px 0 12px' }}>Options</Divider>

      <Form.Item name="extensions" label={<InfoLabel label="Extensions" tip="Comma-separated file extensions to append to each word. e.g. .php,.html,.txt" />}>
        <Input placeholder=".php,.html,.txt" allowClear />
      </Form.Item>

      {engine === 'gobuster' && (
        <Form.Item name="mode" label="Mode">
          <Select options={[{ label: 'Directory', value: 'dir' }, { label: 'DNS', value: 'dns' }, { label: 'Vhost', value: 'vhost' }]} />
        </Form.Item>
      )}

      {(engine === 'ffuf' || engine === 'wenum') && (
        <>
          <Form.Item name="method" label="HTTP Method">
            <Select options={['GET','POST','PUT','PATCH','DELETE'].map(m => ({ label: m, value: m }))} />
          </Form.Item>
          <Form.Item name="data" label={<InfoLabel label="POST data" tip="Request body for POST/PUT requests. Use FUZZ as placeholder." />}>
            <Input placeholder="param=FUZZ" allowClear />
          </Form.Item>
        </>
      )}

      {engine === 'feroxbuster' && (
        <>
          <Form.Item name="depth" label={<InfoLabel label="Recursion depth" tip="How many levels deep to recurse. 0 = unlimited." />}>
            <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="4" />
          </Form.Item>
          <Form.Item name="insecure" label="Skip TLS verify" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
        </>
      )}

      {engine !== 'feroxbuster' && (
        <Form.Item name="follow_redirects" label="Follow redirects" valuePropName="checked">
          <Switch size="small" />
        </Form.Item>
      )}

      {engine === 'ffuf' && (
        <Form.Item name="recursion" label={<InfoLabel label="Recursion" tip="Automatically fuzz discovered directories recursively." />} valuePropName="checked">
          <Switch size="small" />
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
        {scanning ? (
          <Space.Compact block>
            <Button type="primary" loading disabled style={{ flex: 1 }}>
              {stopping ? 'Stopping...' : 'Fuzzing...'}
            </Button>
            <Button danger type="primary" icon={<StopOutlined />} onClick={onStop} disabled={stopping} style={{ width: 32, minWidth: 32, padding: 0 }} />
          </Space.Compact>
        ) : (
          <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />} block>Start Fuzzing</Button>
        )}
      </Form.Item>
    </Form>
  )
}
