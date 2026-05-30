import { useState } from 'react'
import { Layout, Menu, Button, Grid, theme } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  MessageOutlined,
  CommentOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Sider, Content } = Layout
const { useBreakpoint } = Grid

const items = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
  { key: '/groups', icon: <UsergroupAddOutlined />, label: '群聊管理' },
  { key: '/conversations', icon: <CommentOutlined />, label: '会话管理' },
  { key: '/messages', icon: <MessageOutlined />, label: '消息记录' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const logout = () => {
    localStorage.removeItem('yy_admin_token')
    navigate('/login', { replace: true })
  }

  const onMenuClick = (key: string) => {
    navigate(key)
    if (isMobile) {
      setCollapsed(true)
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={isMobile ? collapsed : false}
        collapsible={isMobile}
        trigger={null}
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={
          isMobile
            ? { position: 'fixed', height: '100vh', zIndex: 100, left: 0, top: 0 }
            : undefined
        }
      >
        <div
          style={{
            color: '#fff',
            textAlign: 'center',
            padding: '16px 0',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          YY IM
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => onMenuClick(key)}
        />
      </Sider>
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 99,
          }}
        />
      )}
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
          }}
        >
          {isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed((v) => !v)}
              aria-label="菜单"
            />
          ) : (
            <span />
          )}
          <Button icon={<LogoutOutlined />} onClick={logout}>
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
