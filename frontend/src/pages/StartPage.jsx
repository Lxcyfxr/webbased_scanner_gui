import { useNavigate } from 'react-router-dom'
import { Typography, theme as antTheme } from 'antd'
import {
  RadarChartOutlined, BugOutlined, SafetyOutlined, ThunderboltOutlined,
  KeyOutlined, ApiOutlined, AimOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

const TOOLS = [
  {
    path:    '/tool/nmap',
    icon:    RadarChartOutlined,
    name:    'Nmap',
    color:   '#1677ff',
    tagline: 'Network & Port Scanner',
    desc:    'Scannt Hosts, offene Ports und laufende Services. Erkennt Betriebssysteme und Versionsnummern.',
    when:    'Erster Schritt bei jeder Reconnaissance — was ist im Netz, was lauscht wo?',
  },
  {
    path:    '/tool/fuzzing',
    icon:    BugOutlined,
    name:    'Web Fuzzing',
    color:   '#fa8c16',
    tagline: 'Directory & Endpoint Discovery',
    desc:    'Brute-forcet versteckte Verzeichnisse, Dateien und Endpunkte auf Webservern (ffuf, feroxbuster, gobuster).',
    when:    'Nach dem Portscan — welche Pfade existieren auf Port 80/443?',
  },
  {
    path:    '/tool/nikto',
    icon:    SafetyOutlined,
    name:    'Nikto',
    color:   '#52c41a',
    tagline: 'Web Server Vulnerability Scanner',
    desc:    'Prüft Webserver auf veraltete Software, gefährliche Dateien, Fehlkonfigurationen und fehlende Security-Header.',
    when:    'Schneller Check eines Webservers auf bekannte Schwachstellen und Default-Configs.',
  },
  {
    path:    '/tool/nuclei',
    icon:    ThunderboltOutlined,
    name:    'Nuclei',
    color:   '#722ed1',
    tagline: 'Template-based Vulnerability Scanner',
    desc:    'Scannt mit tausenden Community-Templates auf CVEs, Misconfigurations, Default Credentials und mehr.',
    when:    'Umfassender Vuln-Scan mit aktuellen CVE-Templates — tiefer als Nikto.',
  },
  {
    path:    '/tool/hydra',
    icon:    KeyOutlined,
    name:    'Hydra',
    color:   '#eb2f96',
    tagline: 'Online Credential Testing',
    desc:    'Testet Login-Kombinationen gegen SSH, FTP, HTTP-Forms, RDP, MySQL und viele weitere Protokolle.',
    when:    'Schwache oder Default-Passwörter auf gefundenen Services testen (nur autorisiert!).',
  },
  {
    path:    '/tool/http',
    icon:    ApiOutlined,
    name:    'HTTP Client',
    color:   '#13c2c2',
    tagline: 'Manual Request Builder',
    desc:    'Baut und sendet beliebige HTTP-Requests mit eigenen Headern, Body und Method — wie curl im Browser.',
    when:    'API-Endpunkte manuell testen, Auth-Header prüfen, Responses analysieren.',
  },
  {
    path:    '/tool/metasploit',
    icon:    AimOutlined,
    name:    'Metasploit',
    color:   '#f5222d',
    tagline: 'Exploitation Framework',
    desc:    'Sucht, konfiguriert und führt Exploits gegen bekannte Schwachstellen aus. Verwaltet Sessions und Payloads.',
    when:    'Gefundene Schwachstelle gezielt ausnutzen — nach Recon & Scanning (nur autorisiert!).',
  },
]

export default function StartPage() {
  const { token } = antTheme.useToken()
  const navigate  = useNavigate()

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '40px 48px',
      background: token.colorBgLayout,
    }}>
      <div>
        <Title level={3} style={{ margin: '0 0 4px' }}>Web Security GUI</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Wähle ein Tool — oder starte mit Nmap für die erste Reconnaissance.
        </Text>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: 24,
          marginTop: 32,
        }}>
          {TOOLS.map(tool => {
            const Icon = tool.icon
            return (
              <div
                key={tool.path}
                onClick={() => navigate(tool.path)}
                style={{
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 14,
                  padding: 32,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  userSelect: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = tool.color
                  e.currentTarget.style.boxShadow   = `0 0 0 2px ${tool.color}22`
                  e.currentTarget.style.transform   = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = token.colorBorderSecondary
                  e.currentTarget.style.boxShadow   = 'none'
                  e.currentTarget.style.transform   = 'none'
                }}
              >
                {/* icon + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 14,
                    background: `${tool.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon style={{ fontSize: 30, color: tool.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: token.colorText, lineHeight: 1.2 }}>
                      {tool.name}
                    </div>
                    <div style={{ fontSize: 13, color: tool.color, marginTop: 4, fontWeight: 500 }}>
                      {tool.tagline}
                    </div>
                  </div>
                </div>

                {/* description */}
                <Text style={{ fontSize: 14, color: token.colorTextSecondary, lineHeight: 1.6 }}>
                  {tool.desc}
                </Text>

                {/* when to use */}
                <div style={{
                  background: token.colorBgLayout,
                  borderRadius: 10,
                  padding: '10px 16px',
                  borderLeft: `3px solid ${tool.color}`,
                }}>
                  <Text style={{ fontSize: 13, color: token.colorTextSecondary }}>
                    <span style={{ fontWeight: 600, color: token.colorText }}>Wann: </span>
                    {tool.when}
                  </Text>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
