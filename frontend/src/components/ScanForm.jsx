import {
  Form, Input, InputNumber, Select, Switch, Button, Divider, Typography,
  AutoComplete, Space, Modal, Row, Col, Badge, Tabs, Checkbox, Tag, Alert,
} from 'antd'
import {
  PlayCircleOutlined, StopOutlined, SettingOutlined,
  CheckOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { useState } from 'react'

const { Text } = Typography

const STORAGE_KEY = 'nmap_targets'
function loadTargets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveTarget(target) {
  const prev = loadTargets().filter(t => t !== target)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([target, ...prev].slice(0, 20)))
}

function countAdvanced(vals) {
  let n = 0
  const flags = ['no_ping','no_dns','force_dns','open_only','fast_mode','aggressive','traceroute','reason','ipv6','badsum']
  flags.forEach(k => { if (vals[k] === true) n++ })
  const nums = ['top_ports','min_rate','max_rate','max_retries','source_port','data_length','ttl']
  nums.forEach(k => { if (vals[k] != null) n++ })
  if (vals.scan_delay) n++
  if ((vals.script_categories || []).length) n++
  if (vals.script) n++
  if (vals.script_args) n++
  return n
}

// Checkbox helper — label and flag inline, no separate Switch
function Cb({ name, label, flag }) {
  return (
    <Form.Item name={name} valuePropName="checked" style={{ marginBottom: 8 }}>
      <Checkbox>
        <Text style={{ fontSize: 13 }}>{label}</Text>
        {flag && <Text type="secondary" style={{ fontSize: 11, marginLeft: 5 }}>{flag}</Text>}
      </Checkbox>
    </Form.Item>
  )
}

const NSE_CATEGORIES = [
  { value: 'safe',      label: 'Safe',       desc: 'Only safe, non-intrusive scripts',   risk: 'low'    },
  { value: 'default',   label: 'Default',    desc: 'Standard -sC equivalent',            risk: 'low'    },
  { value: 'discovery', label: 'Discovery',  desc: 'Enhanced host & service discovery',  risk: 'low'    },
  { value: 'version',   label: 'Version',    desc: 'Version detection enhancement',      risk: 'low'    },
  { value: 'auth',      label: 'Auth',       desc: 'Authentication bypass checks',       risk: 'medium' },
  { value: 'vuln',      label: 'Vuln',       desc: 'CVE & vulnerability detection',      risk: 'medium' },
  { value: 'http',      label: 'HTTP',       desc: 'Web server enumeration (http-*)',    risk: 'medium' },
  { value: 'smb',       label: 'SMB',        desc: 'Windows / Samba enumeration',        risk: 'medium' },
  { value: 'ssh',       label: 'SSH',        desc: 'SSH server checks',                  risk: 'medium' },
  { value: 'dns',       label: 'DNS',        desc: 'DNS enumeration',                    risk: 'medium' },
  { value: 'ftp',       label: 'FTP',        desc: 'FTP server checks',                  risk: 'medium' },
  { value: 'brute',     label: 'Brute',      desc: 'Password brute-force',               risk: 'high'   },
  { value: 'exploit',   label: 'Exploit',    desc: 'Active exploitation scripts',        risk: 'high'   },
]

const RISK_COLOR = { low: 'green', medium: 'orange', high: 'red' }

const PRESETS = [
  { label: 'Safe',         categories: ['safe', 'default'] },
  { label: 'Web Server',   categories: ['http', 'vuln', 'auth'] },
  { label: 'Vuln Scan',    categories: ['vuln', 'safe', 'default'] },
  { label: 'Full Recon',   categories: ['discovery', 'default', 'version', 'vuln'] },
]

function SettingsTab() {
  return (
    <>
      <Divider orientation="left" orientationMargin={0} style={{ marginTop: 4 }}>Host Discovery</Divider>
      <Row gutter={[0, 0]}>
        <Col span={8}><Cb name="no_ping"    label="Skip host discovery" flag="-Pn" /></Col>
        <Col span={8}><Cb name="no_dns"     label="Disable DNS"         flag="-n"  /></Col>
        <Col span={8}><Cb name="force_dns"  label="Force DNS"           flag="-R"  /></Col>
      </Row>

      <Divider orientation="left" orientationMargin={0}>Scan Behaviour</Divider>
      <Row>
        <Col span={8}><Cb name="open_only"  label="Open ports only"  flag="--open"       /></Col>
        <Col span={8}><Cb name="fast_mode"  label="Fast mode"        flag="-F"           /></Col>
        <Col span={8}><Cb name="aggressive" label="Aggressive"       flag="-A"           /></Col>
        <Col span={8}><Cb name="traceroute" label="Traceroute"       flag="--traceroute" /></Col>
        <Col span={8}><Cb name="reason"     label="Show reason"      flag="--reason"     /></Col>
        <Col span={8}><Cb name="ipv6"       label="IPv6 scanning"    flag="-6"           /></Col>
      </Row>

      <Divider orientation="left" orientationMargin={0}>Performance</Divider>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="top_ports" label="Top ports">
            <InputNumber min={1} max={65535} placeholder="100" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="min_rate" label="Min rate (pkt/s)">
            <InputNumber min={1} placeholder="100" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="max_rate" label="Max rate (pkt/s)">
            <InputNumber min={1} placeholder="1000" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="max_retries" label="Max retries">
            <InputNumber min={0} max={10} placeholder="3" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="scan_delay" label="Scan delay">
            <Input placeholder="100ms or 1s" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" orientationMargin={0}>Firewall / Evasion</Divider>
      <Row>
        <Col span={8}><Cb name="badsum" label="Bad checksum" flag="--badsum" /></Col>
      </Row>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="source_port" label="Source port">
            <InputNumber min={1} max={65535} placeholder="53" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="data_length" label="Data length">
            <InputNumber min={1} placeholder="25" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="ttl" label="TTL value">
            <InputNumber min={1} max={255} placeholder="64" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}

function NseTab({ advForm }) {
  const applyPreset = (categories) => advForm.setFieldValue('script_categories', categories)

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Quick presets
        </Text>
        <Space wrap>
          {PRESETS.map(p => (
            <Button key={p.label} size="small" icon={<ThunderboltOutlined />} onClick={() => applyPreset(p.categories)}>
              {p.label}
            </Button>
          ))}
          <Button size="small" danger onClick={() => applyPreset([])}>Clear</Button>
        </Space>
      </div>

      <Divider orientation="left" orientationMargin={0} style={{ marginTop: 4 }}>Script Categories</Divider>
      <Form.Item name="script_categories" style={{ marginBottom: 8 }}>
        <Checkbox.Group style={{ width: '100%' }}>
          <Row gutter={[8, 4]}>
            {NSE_CATEGORIES.map(cat => (
              <Col span={12} key={cat.value}>
                <Checkbox value={cat.value} style={{ alignItems: 'flex-start' }}>
                  <div style={{ lineHeight: 1.3 }}>
                    <Space size={4} align="center">
                      <Text style={{ fontSize: 13 }}>{cat.label}</Text>
                      <Tag
                        color={RISK_COLOR[cat.risk]}
                        style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}
                      >
                        {cat.risk}
                      </Tag>
                    </Space>
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 1 }}>{cat.desc}</div>
                  </div>
                </Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      </Form.Item>

      <Form.Item shouldUpdate noStyle>
        {() => {
          const cats = advForm.getFieldValue('script_categories') || []
          if (cats.includes('brute') || cats.includes('exploit')) {
            return (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="Intrusive scripts selected"
                description="Brute-force and exploit scripts can cause damage or trigger alarms. Only use on systems you own or have explicit permission to test."
              />
            )
          }
        }}
      </Form.Item>

      <Divider orientation="left" orientationMargin={0}>Custom Override</Divider>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="script" label="Manual --script">
            <Input placeholder="e.g. http-title,ssl-cert" allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="script_args" label="--script-args">
            <Input placeholder="e.g. user=admin,pass=1234" allowClear />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}

export default function ScanForm({ onScan, onStop, scanning, stopping }) {
  const [form] = Form.useForm()
  const [advForm] = Form.useForm()
  const [suggestions, setSuggestions] = useState([])
  const [advOpen, setAdvOpen] = useState(false)
  const [advCount, setAdvCount] = useState(0)

  const handleSearch = (value) => {
    const all = loadTargets()
    setSuggestions((value ? all.filter(t => t.includes(value)) : all).map(t => ({ value: t })))
  }

  const handleFinishAdv = () => {
    setAdvCount(countAdvanced(advForm.getFieldsValue()))
    setAdvOpen(false)
  }

  const handleSubmit = (values) => {
    const { target, scan_type, service_version, os_detection, default_scripts, timing, ports } = values
    const { script_categories = [], script: customScript, ...restAdv } = advForm.getFieldsValue()
    const combinedScript = [...script_categories, ...(customScript ? [customScript] : [])].join(',') || null
    saveTarget(target.trim())
    onScan(target.trim(), {
      ping_scan: scan_type === 'ping',
      udp_scan: scan_type === 'udp',
      service_version: !!service_version,
      os_detection: !!os_detection,
      default_scripts: !!default_scripts,
      timing: timing ?? 3,
      ports: ports || null,
      ...restAdv,
      script: combinedScript,
    })
  }

  const tabs = [
    { key: 'settings', label: 'Settings',    children: <SettingsTab /> },
    { key: 'nse',      label: 'NSE Scripts', children: <NseTab advForm={advForm} /> },
  ]

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ scan_type: 'tcp', timing: 3 }}
        size="small"
      >
        <Text strong style={{ fontSize: 14 }}>New Scan</Text>
        <Divider style={{ margin: '8px 0 12px' }} />

        <Form.Item name="target" label="Target" rules={[{ required: true, message: 'Enter a target' }]}>
          <AutoComplete
            options={suggestions}
            onSearch={handleSearch}
            onFocus={() => handleSearch('')}
            placeholder="192.168.1.1 / 10.0.0.0/24 / host.com"
            allowClear
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item name="scan_type" label="Scan Type">
          <Select>
            <Select.Option value="tcp">TCP Connect</Select.Option>
            <Select.Option value="ping">Ping Only (-sn)</Select.Option>
            <Select.Option value="udp">UDP (-sU)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="ports" label="Ports (optional)">
          <Input placeholder="80,443  or  1-1000" allowClear />
        </Form.Item>

        <Form.Item name="timing" label="Timing Template">
          <Select>
            <Select.Option value={0}>T0 — Paranoid</Select.Option>
            <Select.Option value={1}>T1 — Sneaky</Select.Option>
            <Select.Option value={2}>T2 — Polite</Select.Option>
            <Select.Option value={3}>T3 — Normal (default)</Select.Option>
            <Select.Option value={4}>T4 — Aggressive</Select.Option>
            <Select.Option value={5}>T5 — Insane</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="service_version" label="Service Version (-sV)" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="os_detection" label="OS Detection (-O)" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="default_scripts" label="Default Scripts (-sC)" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item style={{ marginBottom: 8 }}>
          <Badge count={advCount} size="small" offset={[-4, 4]}>
            <Button block icon={<SettingOutlined />} onClick={() => setAdvOpen(true)}>
              Advanced Settings
            </Button>
          </Badge>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          {scanning ? (
            <Space.Compact block>
              <Button type="primary" loading disabled style={{ flex: 1 }}>
                {stopping ? 'Stopping...' : 'Scanning...'}
              </Button>
              <Button
                danger type="primary"
                icon={<StopOutlined />}
                onClick={onStop}
                disabled={stopping}
                style={{ width: 32, minWidth: 32, padding: 0 }}
                title="Stop scan"
              />
            </Space.Compact>
          ) : (
            <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />} block>
              Start Scan
            </Button>
          )}
        </Form.Item>
      </Form>

      <Modal
        title="Advanced Scan Settings"
        open={advOpen}
        onCancel={handleFinishAdv}
        width="60%"
        style={{ top: '8vh' }}
        styles={{ body: { paddingTop: 0 } }}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleFinishAdv}>
              Finished
            </Button>
          </div>
        }
        destroyOnClose={false}
      >
        <Form form={advForm} layout="vertical" size="small">
          <Tabs items={tabs} />
        </Form>
      </Modal>
    </>
  )
}
