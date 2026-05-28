import { useEffect, useState } from 'react'
import { Card, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api from '../api/client'
import type { Conversation, Paged } from '../api/types'

export default function Conversations() {
  const [data, setData] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(20)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api
      .get<{ data: Paged<Conversation> }>('/admin/conversations', { params: { page, size } })
      .then((r) => {
        setData(r.data.data.list)
        setTotal(r.data.data.total)
      })
      .finally(() => setLoading(false))
  }, [page, size])

  const columns: ColumnsType<Conversation> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (v) => <Tag color={v === 'group' ? 'purple' : 'blue'}>{v === 'group' ? '群聊' : '单聊'}</Tag>,
    },
    { title: '名称', dataIndex: 'name', render: (v) => v || '-' },
    {
      title: '成员',
      render: (_, r) => (r.members || []).map((m) => m.user?.nickname || m.user?.username || m.user_id).join('、'),
    },
    { title: '创建时间', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleString(), width: 180 },
  ]

  return (
    <Card title="会话管理">
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
