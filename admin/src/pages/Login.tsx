import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import api from '../api/client'

const { Title } = Typography

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const resp = await api.post('/auth/login', values)
      if (resp.data?.code === 0) {
        const user = resp.data.data.user
        if (user.role !== 'admin') {
          message.error('该账号不是管理员')
          return
        }
        localStorage.setItem('yy_admin_token', resp.data.data.token)
        message.success('登录成功')
        navigate('/', { replace: true })
      } else {
        message.error(resp.data?.message || '登录失败')
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '账号或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="centered-page">
      <Card className="auth-card">
        <Title level={3} style={{ textAlign: 'center' }}>
          YY IM 管理后台
        </Title>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ username: 'admin', password: 'admin123' }}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<UserOutlined />} placeholder="管理员账号" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
