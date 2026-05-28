import { Layout, Menu, Button, theme } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  MessageOutlined,
  CommentOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Sider, Content } = Layout

const items = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
  { key: '/conversations', icon: <CommentOutlined />, label: '会话管理' },
  { key: '/messages', icon: <MessageOutlined />, label: '消息记录' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const logout = () => {
    localStorage.removeItem('yy_admin_token')
    navigate('/login', { replace: true })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
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
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingRight: 24,
          }}
        >
          <Button icon={<LogoutOutlined />} onClick={logout}>
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
