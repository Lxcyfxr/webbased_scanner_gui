import { Form, Input, Button, Space, Tag, Typography, Divider } from 'antd'
import { PlayCircleOutlined, SettingOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'

const { Text } = Typography

const FIXED_FIELDS = ['LHOST', 'RHOST', 'LPORT', 'RPORT', 'PAYLOAD']
const PLACEHOLDERS = {
  LHOST: 'e.g. 192.168.1.10',
  RHOST: 'e.g. 10.10.10.5',
  LPORT: '4444',
  RPORT: 'e.g. 445, 80',
  PAYLOAD: 'e.g. windows/x64/meterpreter/reverse_tcp',
}

export default function MsfOptions({ module: mod, onApply }) {
  const [form] = Form.useForm()
  const [requiredFields, setRequiredFields] = useState({})

  useEffect(() => {
    if (!mod?.fullname) return
    const parts = mod.fullname.split('/')
    const mtype = parts[0]
    const mname = parts.slice(1).join('/')
    if (!mtype || !mname) return

    fetch(`/msf/modules/${mtype}/${mname}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.options) return
        const req = {}
        for (const [key, val] of Object.entries(data.options)) {
          req[key.toUpperCase()] = val.required === true
        }
        setRequiredFields(req)
      })
      .catch(() => {})
  }, [mod?.fullname])

  if (!mod) return null

  const buildCmds = (vals) => {
    const cmds = []
    if (vals.LHOST?.trim())   cmds.push(`set LHOST ${vals.LHOST.trim()}`)
    if (vals.RHOST?.trim())   cmds.push(`set RHOST ${vals.RHOST.trim()}`)
    if (vals.LPORT?.trim())   cmds.push(`set LPORT ${vals.LPORT.trim()}`)
    if (vals.RPORT?.trim())   cmds.push(`set RPORT ${vals.RPORT.trim()}`)
    if (vals.PAYLOAD?.trim()) cmds.push(`set PAYLOAD ${vals.PAYLOAD.trim()}`)
    ;(vals.extra || []).forEach(({ key, value }) => {
      if (key?.trim() && value?.trim()) cmds.push(`set ${key.trim().toUpperCase()} ${value.trim()}`)
    })
    return cmds
  }

  const handleSet = () => {
    const cmds = buildCmds(form.getFieldsValue())
    if (cmds.length) onApply(cmds)
  }

  const handleRun = () => {
    const cmds = buildCmds(form.getFieldsValue())
    cmds.push('run')
    onApply(cmds)
  }

  const TYPE_COLOR = { exploit: 'red', auxiliary: 'orange', post: 'blue', payload: 'purple' }

  const label = (key) => (
    <span>
      {key}
      {requiredFields[key] && (
        <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>
      )}
    </span>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <SettingOutlined style={{ fontSize: 12, color: '#8b949e' }} />
        <Text strong style={{ fontSize: 13 }}>Options</Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Tag color={TYPE_COLOR[mod.type] || 'default'} style={{ fontSize: 10, margin: 0 }}>{mod.type}</Tag>
        <Text style={{ fontSize: 11, color: '#8b949e' }} ellipsis>{mod.fullname || mod.name}</Text>
      </div>
      <Divider style={{ margin: '0 0 12px' }} />

      <Form form={form} layout="vertical" size="small">
        {FIXED_FIELDS.map(key => (
          <Form.Item key={key} label={label(key)} name={key} style={{ marginBottom: 8 }}>
            <Input
              placeholder={PLACEHOLDERS[key]}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
        ))}

        <Text type="secondary" style={{ fontSize: 11 }}>Extra options</Text>
        <Form.List name="extra">
          {(fields, { add, remove }) => (
            <div style={{ marginTop: 6 }}>
              {fields.map(({ key, name }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 4 }} align="baseline">
                  <Form.Item name={[name, 'key']} style={{ marginBottom: 0 }}>
                    <Input placeholder="KEY" style={{ width: 80, fontFamily: 'monospace', fontSize: 11 }} />
                  </Form.Item>
                  <Form.Item name={[name, 'value']} style={{ marginBottom: 0 }}>
                    <Input placeholder="value" style={{ width: 100, fontFamily: 'monospace', fontSize: 11 }} />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', fontSize: 12 }} />
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
                size="small"
                style={{ marginTop: 4 }}
              >
                Add option
              </Button>
            </div>
          )}
        </Form.List>

        <Space style={{ marginTop: 14, width: '100%' }} direction="vertical">
          <Button block size="small" icon={<SettingOutlined />} onClick={handleSet}>
            Set options
          </Button>
          <Button block size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleRun}>
            Set &amp; Run
          </Button>
        </Space>
      </Form>
    </div>
  )
}
