import { Form, Input, InputNumber, Switch, Button, Alert, Badge, Typography, Divider, Space } from 'antd'
import { LinkOutlined, DisconnectOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function MsfConnect({ status, onConnect, onDisconnect, loading }) {
  const [form] = Form.useForm()

  const handleConnect = (values) => {
    onConnect(values)
  }

  const connected = status?.connected

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Badge status={connected ? 'success' : 'default'} />
        <Text strong style={{ fontSize: 13 }}>
          {connected ? `Connected — msf ${status.version?.version ?? ''}` : 'Not connected'}
        </Text>
      </Space>

      {!status?.available && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 10, fontSize: 11 }}
          message="pymetasploit3 not installed"
          description="Run: pip install pymetasploit3"
        />
      )}

      {connected ? (
        <Button
          danger
          icon={<DisconnectOutlined />}
          size="small"
          block
          onClick={onDisconnect}
        >
          Disconnect
        </Button>
      ) : (
        <Form
          form={form}
          layout="vertical"
          size="small"
          onFinish={handleConnect}
          initialValues={{ host: '127.0.0.1', port: 55553, ssl: false }}
        >
          <Divider style={{ margin: '8px 0 10px' }} />

          <Form.Item name="host" label="Host">
            <Input placeholder="127.0.0.1" autoComplete="off" />
          </Form.Item>

          <Form.Item name="port" label="Port">
            <InputNumber min={1} max={65535} placeholder="55553" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Enter msfrpcd password' }]}
            extra={
              <Text type="secondary" style={{ fontSize: 11 }}>
                The password you chose when starting msfrpcd — not a system password.
              </Text>
            }
          >
            <Input.Password placeholder="password you set with -P" autoComplete="new-password" />
          </Form.Item>

          <Form.Item name="ssl" label="SSL" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 10, fontSize: 11 }}
            message={
              <span>
                Start msfrpcd first, pick any password:<br />
                <Text code style={{ fontSize: 10 }}>sudo msfrpcd -P mypassword -S -f</Text>
              </span>
            }
          />

          <Button
            type="primary"
            htmlType="submit"
            icon={<LinkOutlined />}
            loading={loading}
            block
          >
            Connect
          </Button>
        </Form>
      )}
    </div>
  )
}
