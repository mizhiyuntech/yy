import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api from '../api/client'
import type { Paged, User } from '../api/types'

export default function Users() {
  const [data, setData] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const load = () => {
    setLoading(true)
    api
      .get<{ data: Paged<User> }>('/admin/users', { params: { page, size, keyword } })
      .then((r) => {
        setData(r.data.data.list)
        setTotal(r.data.data.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const toggleStatus = async (u: User, checked: boolean) => {
    await api.put(`/admin/users/${u.id}/status`, { status: checked ? 1 : 0 })
    message.success('已更新')
    load()
  }

  const remove = async (u: User) => {
    await api.delete(`/admin/users/${u.id}`)
    message.success('已删除')
    load()
  }

  const createUser = async () => {
    const values = await form.validateFields()
    try {
      await api.post('/admin/users', values)
      message.success('创建成功')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.message || '创建失败')
    }
  }

  const columns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: '账号',
      dataIndex: 'username',
      render: (v, r) => (
        <Space>
          <Badge status={r.online ? 'success' : 'default'} />
          {v}
        </Space>
      ),
    },
    { title: '昵称', dataIndex: 'nickname' },
    {
      title: '角色',
      dataIndex: 'role',
      render: (v) => <Tag color={v === 'admin' ? 'gold' : 'blue'}>{v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v, r) => <Switch checked={v === 1} onChange={(c) => toggleStatus(r, c)} />,
    },
    { title: '注册时间', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleString() },
    {
      title: '操作',
      render: (_, r) => (
        <Popconfirm title="确认删除该用户?" onConfirm={() => remove(r)} disabled={r.role === 'admin'}>
          <Button danger size="small" disabled={r.role === 'admin'}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <Card
      title="用户管理"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索账号/昵称"
            allowClear
            onSearch={(v) => {
              setKeyword(v)
              setPage(1)
              setTimeout(load, 0)
            }}
            style={{ width: 220 }}
          />
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建用户
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ current: page, pageSize: size, total, onChange: setPage }}
      />
      <Modal title="新建用户" open={modalOpen} onOk={createUser} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical" initialValues={{ role: 'user' }}>
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="nickname" label="昵称">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select
              options={[
                { value: 'user', label: '普通用户' },
                { value: 'admin', label: '管理员' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
