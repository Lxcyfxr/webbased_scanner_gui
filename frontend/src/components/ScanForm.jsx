import {
  Form, Input, InputNumber, Select, Switch, Button, Divider, Typography,
  AutoComplete, Space, Modal, Row, Col, Badge, Tabs, Checkbox, Tag, Alert, Tooltip,
} from 'antd'
import {
  PlayCircleOutlined, StopOutlined, SettingOutlined,
  CheckOutlined, ThunderboltOutlined, InfoCircleOutlined,
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

// Inline info icon with tooltip
function Info({ tip }) {
  return (
    <Tooltip title={tip} placement="right" overlayStyle={{ maxWidth: 280 }}>
      <InfoCircleOutlined style={{ marginLeft: 5, fontSize: 12, color: '#8c8c8c', verticalAlign: 'middle', flexShrink: 0 }} />
    </Tooltip>
  )
}

// Form.Item label with inline info icon
function InfoLabel({ label, tip }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
      {label}
      <Info tip={tip} />
    </span>
  )
}

// Checkbox row with info icon
function Cb({ name, label, flag, tip }) {
  return (
    <Form.Item name={name} valuePropName="checked" style={{ marginBottom: 8 }}>
      <Checkbox>
        <Text style={{ fontSize: 13 }}>{label}</Text>
        {flag && <Text type="secondary" style={{ fontSize: 11, marginLeft: 5 }}>{flag}</Text>}
        {tip && <Info tip={tip} />}
      </Checkbox>
    </Form.Item>
  )
}

const NSE_CATEGORIES = [
  { value: 'safe',      label: 'Safe',      desc: 'Only safe, non-intrusive scripts',   risk: 'low',    tip: 'Scripts that are considered safe to run on any target without risk of crashing services or triggering alerts.' },
  { value: 'default',   label: 'Default',   desc: 'Standard -sC equivalent',            risk: 'low',    tip: 'The default set of scripts run with -sC. Covers common useful checks like HTTP titles, SSL certificates and SSH host keys.' },
  { value: 'discovery', label: 'Discovery', desc: 'Enhanced host & service discovery',  risk: 'low',    tip: 'Scripts that actively discover more about targets — additional services, network topology and host info.' },
  { value: 'version',   label: 'Version',   desc: 'Version detection enhancement',      risk: 'low',    tip: 'Scripts that supplement version detection (-sV) with more detailed service fingerprinting.' },
  { value: 'auth',      label: 'Auth',      desc: 'Authentication bypass checks',       risk: 'medium', tip: 'Checks for authentication weaknesses such as anonymous login, default credentials or missing auth on services.' },
  { value: 'vuln',      label: 'Vuln',      desc: 'CVE & vulnerability detection',      risk: 'medium', tip: 'Checks for known CVEs and common vulnerabilities. Does not exploit — only detects.' },
  { value: 'http',      label: 'HTTP',      desc: 'Web server enumeration (http-*)',    risk: 'medium', tip: 'Enumerates web servers — titles, headers, open directories, common paths, and web application info.' },
  { value: 'smb',       label: 'SMB',       desc: 'Windows / Samba enumeration',        risk: 'medium', tip: 'Enumerates Windows shares, users, OS version and checks for common SMB vulnerabilities.' },
  { value: 'ssh',       label: 'SSH',       desc: 'SSH server checks',                  risk: 'medium', tip: 'Checks SSH host keys, supported auth methods and known weak algorithms.' },
  { value: 'dns',       label: 'DNS',       desc: 'DNS enumeration',                    risk: 'medium', tip: 'Attempts zone transfers, enumerates subdomains and checks for DNS misconfigurations.' },
  { value: 'ftp',       label: 'FTP',       desc: 'FTP server checks',                  risk: 'medium', tip: 'Checks for anonymous FTP login, lists accessible directories and checks for known FTP vulnerabilities.' },
  { value: 'brute',     label: 'Brute',     desc: 'Password brute-force',               risk: 'high',   tip: 'Attempts to brute-force credentials on discovered services. Intrusive — will generate many failed login attempts.' },
  { value: 'exploit',   label: 'Exploit',   desc: 'Active exploitation scripts',        risk: 'high',   tip: 'Actively attempts to exploit vulnerabilities. Can crash services or cause damage. Only use on systems you own.' },
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
      <Row>
        <Col span={8}><Cb name="no_ping"   label="Skip host discovery" flag="-Pn" tip="Treat all hosts as online and skip ping checks. Useful when targets block ICMP or ping is filtered by a firewall." /></Col>
        <Col span={8}><Cb name="no_dns"    label="Disable DNS"         flag="-n"  tip="Never do reverse DNS resolution on discovered IP addresses. Speeds up the scan and avoids DNS leaks." /></Col>
        <Col span={8}><Cb name="force_dns" label="Force DNS"           flag="-R"  tip="Always perform reverse DNS resolution, even for hosts that appear to be offline." /></Col>
      </Row>

      <Divider orientation="left" orientationMargin={0}>Scan Behaviour</Divider>
      <Row>
        <Col span={8}><Cb name="open_only"  label="Open ports only"  flag="--open"       tip="Only show ports that are in the open state. Closed and filtered ports are hidden from the results." /></Col>
        <Col span={8}><Cb name="fast_mode"  label="Fast mode"        flag="-F"           tip="Scan only the 100 most common ports instead of the default 1000. Significantly faster but may miss uncommon services." /></Col>
        <Col span={8}><Cb name="aggressive" label="Aggressive"       flag="-A"           tip="Enables OS detection (-O), version detection (-sV), script scanning (-sC) and traceroute in one flag. Noisy but thorough." /></Col>
        <Col span={8}><Cb name="traceroute" label="Traceroute"       flag="--traceroute" tip="Trace the network hop path to each host after the scan. Shows routers between you and the target." /></Col>
        <Col span={8}><Cb name="reason"     label="Show reason"      flag="--reason"     tip="Display the reason each port is in its particular state (e.g. 'syn-ack' for open, 'reset' for closed)." /></Col>
        <Col span={8}><Cb name="ipv6"       label="IPv6 scanning"    flag="-6"           tip="Enable IPv6 support. The target must be specified as an IPv6 address." /></Col>
      </Row>

      <Divider orientation="left" orientationMargin={0}>Performance</Divider>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="top_ports" label={<InfoLabel label="Top ports" tip="Scan the N most commonly open ports rather than a fixed list. --top-ports 100 is equivalent to fast mode." />}>
            <InputNumber min={1} max={65535} placeholder="100" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="min_rate" label={<InfoLabel label="Min rate (pkt/s)" tip="Send packets no slower than this rate per second. Overrides timing template for throughput. Use with care on slow networks." />}>
            <InputNumber min={1} placeholder="100" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="max_rate" label={<InfoLabel label="Max rate (pkt/s)" tip="Send packets no faster than this rate per second. Useful for rate-limiting to avoid overwhelming the target or triggering IDS." />}>
            <InputNumber min={1} placeholder="1000" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="max_retries" label={<InfoLabel label="Max retries" tip="Maximum number of retransmissions for each port probe. Lower values speed up the scan but may miss ports on lossy networks." />}>
            <InputNumber min={0} max={10} placeholder="3" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="scan_delay" label={<InfoLabel label="Scan delay" tip="Enforce a minimum delay between probes sent to a host. Useful to avoid rate-limiting or IDS detection. e.g. 100ms or 1s." />}>
            <Input placeholder="100ms or 1s" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" orientationMargin={0}>Firewall / Evasion</Divider>
      <Row>
        <Col span={8}><Cb name="badsum" label="Bad checksum" flag="--badsum" tip="Send packets with an intentionally incorrect TCP/UDP checksum. Some firewalls or IDS will respond, revealing their presence." /></Col>
      </Row>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="source_port" label={<InfoLabel label="Source port" tip="Use this fixed port number as the source for all scan packets. Some firewalls allow traffic from common ports like 53 (DNS) or 80 (HTTP)." />}>
            <InputNumber min={1} max={65535} placeholder="53" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="data_length" label={<InfoLabel label="Data length" tip="Append random padding bytes to packets to reach this total length. Helps evade IDS signatures that match on packet size." />}>
            <InputNumber min={1} placeholder="25" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="ttl" label={<InfoLabel label="TTL value" tip="Set the IP Time-To-Live field. Can be used to limit how far packets travel or to mimic specific OS behaviour." />}>
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
                      <Info tip={cat.tip} />
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
          <Form.Item name="script" label={<InfoLabel label="Manual --script" tip="Comma-separated list of script names or categories to run. Overrides category selection above if both are set." />}>
            <Input placeholder="e.g. http-title,ssl-cert" allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="script_args" label={<InfoLabel label="--script-args" tip="Arguments passed to NSE scripts as key=value pairs. e.g. user=admin,pass=secret or http.useragent=Mozilla." />}>
            <Input placeholder="e.g. user=admin,pass=1234" allowClear />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}

export default function ScanForm({ onScan, onStop, scanning, stopping, onOptionsChange }) {
  const [form] = Form.useForm()
  const [advForm] = Form.useForm()
  const [suggestions, setSuggestions] = useState([])
  const [advOpen, setAdvOpen] = useState(false)
  const [advCount, setAdvCount] = useState(0)

  const handleSearch = (value) => {
    const all = loadTargets()
    setSuggestions((value ? all.filter(t => t.includes(value)) : all).map(t => ({ value: t })))
  }

  const computeOptions = (mainVals, advVals) => {
    const { scan_type, service_version, os_detection, default_scripts, timing, ports } = mainVals
    const { script_categories = [], script: customScript, ...restAdv } = advVals
    const combinedScript = [...script_categories, ...(customScript ? [customScript] : [])].join(',') || null
    return {
      ping_scan: scan_type === 'ping',
      udp_scan: scan_type === 'udp',
      service_version: !!service_version,
      os_detection: !!os_detection,
      default_scripts: !!default_scripts,
      timing: timing ?? 3,
      ports: ports || null,
      ...restAdv,
      script: combinedScript,
    }
  }

  const notifyChange = () => {
    if (!onOptionsChange) return
    const mainVals = form.getFieldsValue()
    onOptionsChange(mainVals.target?.trim() || '', computeOptions(mainVals, advForm.getFieldsValue()))
  }

  const handleFinishAdv = () => {
    setAdvCount(countAdvanced(advForm.getFieldsValue()))
    setAdvOpen(false)
    notifyChange()
  }

  const handleSubmit = (values) => {
    const { target } = values
    const options = computeOptions(values, advForm.getFieldsValue())
    saveTarget(target.trim())
    onScan(target.trim(), options)
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
        onValuesChange={notifyChange}
        initialValues={{ scan_type: 'tcp', timing: 3 }}
        size="small"
      >
        <Text strong style={{ fontSize: 14 }}>New Scan</Text>
        <Divider style={{ margin: '8px 0 12px' }} />

        <Form.Item
          name="target"
          label={<InfoLabel label="Target" tip="IP address (192.168.1.1), hostname (example.com), CIDR range (192.168.1.0/24) or IP range (192.168.1.1-50)." />}
          rules={[{ required: true, message: 'Enter a target' }]}
        >
          <AutoComplete
            options={suggestions}
            onSearch={handleSearch}
            onFocus={() => handleSearch('')}
            placeholder="192.168.1.1 / 10.0.0.0/24 / host.com"
            allowClear
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item name="scan_type" label={<InfoLabel label="Scan Type" tip="TCP Connect: full TCP handshake, reliable, no root needed. Ping Only: host discovery without port scan. UDP: scan UDP ports, slower, may need root." />}>
          <Select>
            <Select.Option value="tcp">TCP Connect</Select.Option>
            <Select.Option value="ping">Ping Only (-sn)</Select.Option>
            <Select.Option value="udp">UDP (-sU)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="ports" label={<InfoLabel label="Ports" tip="Specific ports to scan. Comma-separated (80,443) or ranges (1-1000) or both (22,80,8000-9000). Leave empty to scan the 1000 most common ports." />}>
          <Input placeholder="80,443  or  1-1000" allowClear />
        </Form.Item>

        <Form.Item name="timing" label={<InfoLabel label="Timing Template" tip="Controls overall scan speed and aggressiveness. T0–T2 are slow and stealthy. T3 is default. T4–T5 are fast but noisy and may miss results on slow networks." />}>
          <Select>
            <Select.Option value={0}>T0 — Paranoid</Select.Option>
            <Select.Option value={1}>T1 — Sneaky</Select.Option>
            <Select.Option value={2}>T2 — Polite</Select.Option>
            <Select.Option value={3}>T3 — Normal (default)</Select.Option>
            <Select.Option value={4}>T4 — Aggressive</Select.Option>
            <Select.Option value={5}>T5 — Insane</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="service_version" label={<InfoLabel label="Service Version (-sV)" tip="Probe open ports to determine what service and version is running. e.g. identifies 'Apache httpd 2.4.51'. Adds time to the scan." />} valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="os_detection" label={<InfoLabel label="OS Detection (-O)" tip="Attempt to identify the remote operating system via TCP/IP fingerprinting. Results include confidence percentage. Usually requires root privileges." />} valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="default_scripts" label={<InfoLabel label="Default Scripts (-sC)" tip="Run nmap's default NSE scripts against discovered services. Includes useful checks like HTTP page titles, SSL certificate details and SSH host keys." />} valuePropName="checked">
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
