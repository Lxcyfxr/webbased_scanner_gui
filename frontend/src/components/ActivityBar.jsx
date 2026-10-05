import { Tooltip, theme as antTheme } from 'antd'
import { RadarChartOutlined, BugOutlined, HistoryOutlined, AimOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const ITEMS = [
  { path: '/tool/nmap',       icon: <RadarChartOutlined />, label: 'Network (nmap)' },
  { path: '/tool/fuzzing',    icon: <BugOutlined />,        label: 'Web Fuzzing'    },
  { path: '/tool/metasploit', icon: <AimOutlined />,        label: 'Metasploit'     },
  { path: '/history',         icon: <HistoryOutlined />,    label: 'History'        },
]

export default function ActivityBar() {
  const { token } = antTheme.useToken()
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  return (
    <div
      style={{
        width: 56,
        flexShrink: 0,
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 8,
        gap: 4,
      }}
    >
      {ITEMS.map(item => {
        const active = pathname.startsWith(item.path)
        return (
          <Tooltip key={item.path} title={item.label} placement="right">
            <div
              onClick={() => navigate(item.path)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                cursor: 'pointer',
                background: active ? token.colorPrimaryBg : 'transparent',
                color: active ? token.colorPrimary : token.colorTextSecondary,
                transition: 'all 0.15s',
              }}
            >
              {item.icon}
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}
