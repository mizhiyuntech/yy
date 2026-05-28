import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, InputNumber, Steps, Typography, message } from 'antd'
import api from '../api/client'

const { Title, Paragraph } = Typography

interface InstallForm {
  db_host: string
  db_port: number
  db_user: string
  db_password: string
  db_name: string
  site_name: string
  admin_user: string
  admin_pass: string
}

export default function Install() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.get('/install/status').then((resp) => {
      if (resp.data?.data?.installed) {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  const onFinish = async (values: InstallForm) => {
    setLoading(true)
    try {
      const resp = await api.post('/install', values)
      if (resp.data?.code === 0) {
        if (resp.data.data?.token) {
          localStorage.setItem('yy_admin_token', resp.data.data.token)
        }
        setDone(true)
        message.success('安装成功！')
        setTimeout(() => navigate('/', { replace: true }), 1200)
      } else {
        message.error(resp.data?.message || '安装失败')
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || '安装失败，请检查数据库配置')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="centered-page">
      <Card className="auth-card" style={{ width: 520 }}>
        <Title level={3} style={{ textAlign: 'center' }}>
          YY IM 快速安装
        </Title>
        <Steps
          size="small"
          current={done ? 2 : 1}
          items={[{ title: '环境' }, { title: '配置' }, { title: '完成' }]}
          style={{ marginBottom: 24 }}
        />
        <Paragraph type="secondary">
          填写数据库连接信息与管理员账号，系统将自动建表并创建管理员。默认管理员账号为
          <b> admin / admin123</b>。
        </Paragraph>
        <Form<InstallForm>
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            db_host: '127.0.0.1',
            db_port: 3306,
            db_user: 'root',
            db_name: 'yy_im',
            site_name: 'YY IM',
            admin_user: 'admin',
            admin_pass: 'admin123',
          }}
        >
          <Form.Item label="站点名称" name="site_name" rules={[{ required: true }]}>
            <Input placeholder="YY IM" />
          </Form.Item>
          <Form.Item label="数据库地址" name="db_host" rules={[{ required: true }]}>
            <Input placeholder="127.0.0.1" />
          </Form.Item>
          <Form.Item label="数据库端口" name="db_port" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={65535} />
          </Form.Item>
          <Form.Item label="数据库用户" name="db_user" rules={[{ required: true }]}>
            <Input placeholder="root" />
          </Form.Item>
          <Form.Item label="数据库密码" name="db_password">
            <Input.Password placeholder="数据库密码" />
          </Form.Item>
          <Form.Item label="数据库名" name="db_name" rules={[{ required: true }]}>
            <Input placeholder="yy_im" />
          </Form.Item>
          <Form.Item label="管理员账号" name="admin_user" rules={[{ required: true }]}>
            <Input placeholder="admin" />
          </Form.Item>
          <Form.Item label="管理员密码" name="admin_pass" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="至少 6 位" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              立即安装
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
