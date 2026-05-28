import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic } from 'antd'
import {
  TeamOutlined,
  MessageOutlined,
  CommentOutlined,
  WifiOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons'
import api from '../api/client'
import type { Stats } from '../api/types'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const load = () => api.get('/admin/stats').then((r) => setStats(r.data.data)).catch(() => undefined)
    load()
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [])

  const cards = [
    { title: '用户总数', value: stats?.users ?? 0, icon: <TeamOutlined />, color: '#1677ff' },
    { title: '当前在线', value: stats?.online ?? 0, icon: <WifiOutlined />, color: '#52c41a' },
    { title: '消息总数', value: stats?.messages ?? 0, icon: <MessageOutlined />, color: '#722ed1' },
    { title: '会话总数', value: stats?.conversations ?? 0, icon: <CommentOutlined />, color: '#fa8c16' },
    { title: '群聊数量', value: stats?.groups ?? 0, icon: <UsergroupAddOutlined />, color: '#eb2f96' },
  ]

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col xs={24} sm={12} md={8} lg={6} key={c.title}>
          <Card>
            <Statistic title={c.title} value={c.value} prefix={<span style={{ color: c.color }}>{c.icon}</span>} />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
