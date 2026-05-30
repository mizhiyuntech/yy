import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Drawer, Input, List, Popconfirm, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api from '../api/client'
import type { ConversationMember, Group, Paged } from '../api/types'

export default function Groups() {
  const [data, setData] = useState<Group[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  const [current, setCurrent] = useState<Group | null>(null)
  const [members, setMembers] = useState<ConversationMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const load = useCallback(
    (overrideKeyword?: string) => {
      setLoading(true)
      const kw = overrideKeyword ?? keyword
      api
        .get<{ data: Paged<Group> }>('/admin/groups', { params: { page, size, keyword: kw } })
        .then((r) => {
          setData(r.data.data.list)
          setTotal(r.data.data.total)
        })
        .finally(() => setLoading(false))
    },
    [page, size, keyword],
  )

  useEffect(() => {
    load()
  }, [load])

  const loadMembers = useCallback((group: Group) => {
    setMembersLoading(true)
    api
      .get<{ data: { list: ConversationMember[] } }>(`/admin/groups/${group.id}/members`)
      .then((r) => setMembers(r.data.data.list))
      .finally(() => setMembersLoading(false))
  }, [])

  const openMembers = (group: Group) => {
    setCurrent(group)
    loadMembers(group)
  }

  const removeMember = async (m: ConversationMember) => {
    await api.delete(`/admin/groups/${current!.id}/members/${m.user_id}`)
    message.success('已移除成员')
    loadMembers(current!)
    load()
  }

  const dissolve = async (group: Group) => {
    await api.delete(`/admin/groups/${group.id}`)
    message.success('群聊已解散')
    load()
  }

  const columns: ColumnsType<Group> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '群名称', dataIndex: 'name', render: (v) => v || '未命名群聊' },
    { title: '群主', dataIndex: 'owner_name', render: (v) => v || '-' },
    {
      title: '成员数',
      dataIndex: 'member_count',
      width: 100,
      render: (v) => <Tag color="purple">{v}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleString(), width: 180 },
    {
      title: '操作',
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openMembers(r)}>
            成员管理
          </Button>
          <Popconfirm title="确认解散该群聊?（不可恢复）" onConfirm={() => dissolve(r)}>
            <Button danger size="small">
              解散
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="群聊管理"
      extra={
        <Input.Search
          placeholder="搜索群名称"
          allowClear
          onSearch={(v) => {
            setKeyword(v)
            setPage(1)
            load(v)
          }}
          style={{ width: 220 }}
        />
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 'max-content' }}
        pagination={{ current: page, pageSize: size, total, onChange: setPage }}
      />
      <Drawer
        title={`群成员 - ${current?.name || ''}`}
        open={!!current}
        onClose={() => setCurrent(null)}
        width={360}
      >
        <List
          loading={membersLoading}
          dataSource={members}
          renderItem={(m) => (
            <List.Item
              actions={[
                m.role === 'owner' ? (
                  <Tag color="gold" key="owner">
                    群主
                  </Tag>
                ) : (
                  <Popconfirm key="remove" title="移除该成员?" onConfirm={() => removeMember(m)}>
                    <Button danger size="small" type="link">
                      移除
                    </Button>
                  </Popconfirm>
                ),
              ]}
            >
              <List.Item.Meta
                title={m.user?.nickname || m.user?.username || `用户 ${m.user_id}`}
                description={m.user?.username}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </Card>
  )
}
