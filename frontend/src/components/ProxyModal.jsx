import { Modal, Form, Input, InputNumber, Select, Switch, Typography, Divider, Alert } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { loadProxy, saveProxy, getProxyUrl } from '../utils/proxy'

const { Text } = Typography

const PROXY_TYPES = [
  { label: 'HTTP',   value: 'http'   },
  { label: 'HTTPS',  value: 'https'  },
  { label: 'SOCKS4', value: 'socks4' },
  { label: 'SOCKS5', value: 'socks5' },
]

export default function ProxyModal({ open, onClose, onSave }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      const saved = loadProxy()
      form.setFieldsValue(saved ?? { type: 'http', enabled: false })
    }
  }, [open])

  const handleSave = () => {
    form.validateFields().then(values => {
      saveProxy(values)
      onSave(!!values.enabled && !!values.host && !!values.port)
      onClose()
    })
  }

  const values   = Form.useWatch([], form) ?? {}
  const proxyUrl = values.enabled && values.host && values.port
    ? `${values.type ?? 'http'}://${values.username ? `${values.username}:***@` : ''}${values.host}:${values.port}`
    : null

  return (
    <Modal
      title={<><GlobalOutlined style={{ marginRight: 8 }} />Proxy Configuration</>}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      width={480}
      style={{ top: '15vh' }}
    >
      <Form form={form} layout="vertical" size="small" style={{ marginTop: 8 }}>

        <Form.Item name="enabled" label="Enable proxy" valuePropName="checked" style={{ marginBottom: 12 }}>
          <Switch />
        </Form.Item>

        <Divider style={{ margin: '0 0 12px' }} />

        <Form.Item name="type" label="Type">
          <Select options={PROXY_TYPES} style={{ width: 130 }} />
        </Form.Item>

        <Form.Item name="host" label="Host / IP" rules={[{ required: true, message: 'Enter host' }]}>
          <Input placeholder="127.0.0.1" autoComplete="off" allowClear />
        </Form.Item>

        <Form.Item name="port" label="Port" rules={[{ required: true, message: 'Enter port' }]}>
          <InputNumber min={1} max={65535} placeholder="8080" style={{ width: '100%' }} />
        </Form.Item>

        <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12 }}>
          Authentication (optional)
        </Divider>

        <Form.Item name="username" label="Username">
          <Input placeholder="username" autoComplete="new-password" allowClear />
        </Form.Item>

        <Form.Item name="password" label="Password">
          <Input.Password placeholder="password" autoComplete="new-password" />
        </Form.Item>

        {proxyUrl && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message={
              <Text style={{ fontSize: 12 }}>
                All tool requests will route through <Text code style={{ fontSize: 11 }}>{proxyUrl}</Text>
              </Text>
            }
          />
        )}

        {values.enabled && (!values.host || !values.port) && (
          <Alert type="warning" showIcon message="Enter host and port to enable the proxy." style={{ marginTop: 8 }} />
        )}

      </Form>
    </Modal>
  )
}
