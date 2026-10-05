import { Input, Button, Tooltip, Space, Tag, theme as antTheme } from 'antd'
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons'
import { useState } from 'react'

export default function CommandBar({ command, onChange, isDirty, onReset }) {
  const { token } = antTheme.useToken()
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      style={{
        padding: '6px 16px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: token.colorTextSecondary,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        $
      </span>

      <Input
        value={command}
        onChange={e => onChange(e.target.value)}
        size="small"
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          flex: 1,
          background: isDirty ? token.colorWarningBg : token.colorFillTertiary,
          borderColor: isDirty ? token.colorWarning : 'transparent',
          color: token.colorText,
        }}
        variant="filled"
      />

      {isDirty && (
        <Tag color="warning" style={{ margin: 0, flexShrink: 0, fontSize: 11 }}>
          edited
        </Tag>
      )}

      <Space size={4}>
        {isDirty && (
          <Tooltip title="Reset to auto-generated">
            <Button size="small" icon={<ReloadOutlined />} onClick={onReset} />
          </Tooltip>
        )}
        <Tooltip title={copied ? 'Copied!' : 'Copy command'}>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={copy}
            type={copied ? 'primary' : 'default'}
          />
        </Tooltip>
      </Space>
    </div>
  )
}
