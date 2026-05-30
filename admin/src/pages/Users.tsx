import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import api from '../api/client'
import type { Paged, User } from '../api/types'

interface BanFormValues {
  reason: string
  range?: [Dayjs, Dayjs]
}

export default function Users() {
  const [data, setData] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [size] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const [banTarget, setBanTarget] = useState<User | null>(null)
  const [banForm] = Form.useForm<BanFormValues>()

  const load = useCallback(
    (overrideKeyword?: string) => {
      setLoading(true)
      const kw = overrideKeyword ?? keyword
      api
        .get<{ data: Paged<User> }>('/admin/users', { params: { page, size, keyword: kw } })
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

  const onSearch = (value: string) => {
    setKeyword(value)
    setPage(1)
    load(value)
  }

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

  const unban = async (u: User) => {
    await api.post(`/admin/users/${u.id}/unban`)
    message.success('已解封')
    load()
  }

  const submitBan = async () => {
    const values = await banForm.validateFields()
    const [start, end] = values.range ?? []
    try {
      await api.post(`/admin/users/${banTarget!.id}/ban`, {
        reason: values.reason,
        start: start ? start.toISOString() : '',
        end: end ? end.toISOString() : '',
      })
      message.success('已封禁')
      setBanTarget(null)
      banForm.resetFields()
      load()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message || '封禁失败')
    }
  }

  const createUser = async () => {
    const values = await form.validateFields()
    try {
      await api.post('/admin/users', values)
      message.success('创建成功')
      setModalOpen(false)
      form.resetFields()
      load()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message || '创建失败')
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
    {
      title: '封禁',
      dataIndex: 'banned',
      render: (v: boolean, r) =>
        v ? (
          <Tooltip
            title={
              <>
                <div>原因：{r.ban_reason || '—'}</div>
                <div>起：{r.ban_start ? new Date(r.ban_start).toLocaleString() : '立即'}</div>
                <div>止：{r.ban_end ? new Date(r.ban_end).toLocaleString() : '永久'}</div>
              </>
            }
          >
            <Tag color="red">已封禁</Tag>
          </Tooltip>
        ) : (
          <Tag color="green">正常</Tag>
        ),
    },
    { title: '注册时间', dataIndex: 'created_at', render: (v) => new Date(v).toLocaleString() },
    {
      title: '操作',
      render: (_, r) => (
        <Space>
          {r.banned ? (
            <Button size="small" onClick={() => unban(r)} disabled={r.role === 'admin'}>
              解封
            </Button>
          ) : (
            <Button size="small" onClick={() => setBanTarget(r)} disabled={r.role === 'admin'}>
              封禁
            </Button>
          )}
          <Popconfirm title="确认删除该用户?" onConfirm={() => remove(r)} disabled={r.role === 'admin'}>
            <Button danger size="small" disabled={r.role === 'admin'}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="用户管理"
      extra={
        <Space wrap>
          <Input.Search
            placeholder="搜索账号/昵称"
            allowClear
            onSearch={onSearch}
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
        scroll={{ x: 'max-content' }}
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
      <Modal
        title={`封禁用户 ${banTarget?.username ?? ''}`}
        open={!!banTarget}
        onOk={submitBan}
        onCancel={() => {
          setBanTarget(null)
          banForm.resetFields()
        }}
        okText="确认封禁"
        okButtonProps={{ danger: true }}
      >
        <Form form={banForm} layout="vertical">
          <Form.Item name="reason" label="封禁原因" rules={[{ required: true, message: '请填写封禁原因' }]}>
            <Input.TextArea rows={3} placeholder="请输入封禁原因" />
          </Form.Item>
          <Form.Item name="range" label="封禁起止时间（留空表示立即且永久）">
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
