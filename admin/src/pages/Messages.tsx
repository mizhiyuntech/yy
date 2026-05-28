import { useEffect, useState } from 'react'
import { Card, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api from '../api/client'
import type { Message, Paged } from '../api/types'

export default function Messages() {
  const [data, setData] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(20)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api
      .get<{ data: Paged<Message> }>('/admin/messages', { params: { page, size } })
      .then((r) => {
        setData(r.data.data.list)
        setTotal(r.data.data.total)
      })
      .finally(() => setLoading(false))
  }, [page, size])

  const columns: ColumnsType<Message> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '会话', dataIndex: 'conversation_id', width: 100 },
    { title: '发送者', render: (_, r) => r.sender?.nickname || r.sender?.username || r.sender_id },
    { title: '类型', dataIndex: 'type', render: (v) => <Tag>{v}</Tag>, width: 100 },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleString(), width: 180 },
  ]

  return (
    <Card title="消息记录">
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ current: page, pageSize: size, total, onChange: setPage }}
      />
    </Card>
  )
}
