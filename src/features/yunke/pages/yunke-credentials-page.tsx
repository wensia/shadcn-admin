/**
 * 云客账号凭证管理页面 - Semi Design
 *
 * 管理云客登录凭证（手机号、密码、公司信息），支持 CRUD 操作和自动登录
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Phone,
  Building2,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Clock,
  Bell,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Button, Input, Select, Modal, Form, Tag, Dropdown, Typography } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { yunkeCredentialsApi } from '../api'
import { dingtalkRobotsApi } from '@/features/admin/api'
import type { YunkeCredential } from '../types'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

// 状态选项
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: '1', label: '已登录' },
  { value: '0', label: '未登录' },
]

interface CredentialFormValues {
  phone?: string
  password?: string
  company_code?: string
  company_name?: string
  domain?: string
  notify_robot_id?: string
}

export function YunkeCredentialsPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<YunkeCredential | null>(null)

  // Semi Form refs
  const createFormRef = useRef<FormApi | null>(null)
  const updateFormRef = useRef<FormApi | null>(null)

  // 查询账号凭证列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['yunke-credentials', page, pageSize, statusFilter],
    queryFn: async () => {
      const params: { status?: number; skip?: number; limit?: number } = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      }
      if (statusFilter !== 'all') {
        params.status = parseInt(statusFilter)
      }
      return yunkeCredentialsApi.getCredentials(params)
    },
  })

  // 查询钉钉机器人列表
  const { data: robotsData } = useQuery({
    queryKey: ['dingtalk-robots-active'],
    queryFn: () => dingtalkRobotsApi.getActive(),
  })
  const robots = useMemo(() => robotsData ?? [], [robotsData])

  const credentials = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total || 0

  // 创建账号
  const createMutation = useMutation({
    mutationFn: (data: CredentialFormValues) => {
      if (!data.phone || !data.password || !data.company_code || !data.company_name) {
        throw new Error('请完整填写手机号、密码、公司编码和公司名称')
      }
      return yunkeCredentialsApi.createCredential({
        phone: data.phone,
        password: data.password,
        company_code: data.company_code,
        company_name: data.company_name,
        domain: data.domain || undefined,
      })
    },
    onSuccess: () => {
      toast.success('账号创建成功')
      setCreateModalOpen(false)
      createFormRef.current?.reset()
      queryClient.invalidateQueries({ queryKey: ['yunke-credentials'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新账号
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CredentialFormValues }) =>
      yunkeCredentialsApi.updateCredential(id, {
        phone: data.phone,
        password: data.password || undefined,
        company_code: data.company_code,
        company_name: data.company_name,
        domain: data.domain || undefined,
        notify_robot_id: data.notify_robot_id,
      }),
    onSuccess: () => {
      toast.success('更新成功')
      setEditModalOpen(false)
      setSelectedCredential(null)
      updateFormRef.current?.reset()
      queryClient.invalidateQueries({ queryKey: ['yunke-credentials'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除账号
  const deleteMutation = useMutation({
    mutationFn: yunkeCredentialsApi.deleteCredential,
    onSuccess: () => {
      toast.success('账号删除成功')
      setDeleteDialogOpen(false)
      setSelectedCredential(null)
      queryClient.invalidateQueries({ queryKey: ['yunke-credentials'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 登录/刷新
  const loginMutation = useMutation({
    mutationFn: yunkeCredentialsApi.loginCredential,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('登录成功')
      } else {
        toast.error(result.message || '登录失败')
      }
      queryClient.invalidateQueries({ queryKey: ['yunke-credentials'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '登录失败')
    },
  })

  // 列定义
  const columns: ColumnProps<YunkeCredential>[] = [
      {
        title: '手机号',
        dataIndex: 'phone',
        width: 150,
        render: (_text: string, record: YunkeCredential) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
              <span style={{ fontFamily: 'monospace' }}>{record.phone}</span>
            </div>
          )
        },
      },
      {
        title: '公司',
        dataIndex: 'company_name',
        width: 200,
        render: (_text: string, record: YunkeCredential) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
              <div>
                <div style={{ fontWeight: 500 }}>{record.company_name || '-'}</div>
                <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  {record.company_code || '-'}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (_text: number, record: YunkeCredential) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          const isLoggedIn = record.status === 1
          return (
            <Tag
              color={isLoggedIn ? 'green' : 'grey'}
              type="light"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {isLoggedIn ? (
                <CheckCircle style={{ width: 12, height: 12 }} />
              ) : (
                <XCircle style={{ width: 12, height: 12 }} />
              )}
              {isLoggedIn ? '已登录' : '未登录'}
            </Tag>
          )
        },
      },
      {
        title: '最后登录',
        dataIndex: 'last_login',
        width: 180,
        render: (_text: string, record: YunkeCredential) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
          if (!record.last_login) {
            return <Text type="tertiary">从未登录</Text>
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <Clock style={{ width: 12, height: 12, color: 'var(--semi-color-text-2)' }} />
              {formatTime(record.last_login)}
            </div>
          )
        },
      },
      {
        title: '失败通知',
        dataIndex: 'notify_robot_name',
        width: 140,
        render: (_text: string, record: YunkeCredential) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          if (!record.notify_robot_name) {
            return <Text type="tertiary" size="small">-</Text>
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <Bell style={{ width: 12, height: 12, color: 'orange' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }} title={record.notify_robot_name}>
                {record.notify_robot_name}
              </span>
            </div>
          )
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 160,
        render: (_text: string, record: YunkeCredential) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
          return record.created_at ? formatTime(record.created_at) : '-'
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 120,
        fixed: 'right' as const,
        render: (_: unknown, record: YunkeCredential) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                icon={<LogIn style={{ width: 16, height: 16 }} />}
                onClick={() => handleLogin(record)}
                disabled={loginMutation.isPending}
              />
              <Dropdown
                trigger="click"
                position="bottomRight"
                clickToHide
                render={
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleEdit(record)}>
                      <Pencil style={{ width: 14, height: 14, marginRight: 8 }} />
                      编辑
                    </Dropdown.Item>
                    <Dropdown.Item type="danger" onClick={() => handleDeleteClick(record)}>
                      <Trash2 style={{ width: 14, height: 14, marginRight: 8 }} />
                      删除
                    </Dropdown.Item>
                  </Dropdown.Menu>
                }
              >
                <Button
                  theme="borderless"
                  type="tertiary"
                  size="small"
                  icon={<MoreHorizontal style={{ width: 16, height: 16 }} />}
                />
              </Dropdown>
            </div>
          )
        },
      },
  ]

  const items = credentials

  // 处理函数
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleCreateClick = () => {
    createFormRef.current?.reset()
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = () => {
    createFormRef.current?.validate().then((rawValues) => {
      const values = rawValues as CredentialFormValues
      createMutation.mutate(values)
    })
  }

  const handleEdit = (credential: YunkeCredential) => {
    setSelectedCredential(credential)
    setEditModalOpen(true)
    // 延迟设置值，等待 modal 渲染
    setTimeout(() => {
      updateFormRef.current?.setValues({
        phone: credential.phone,
        password: '',
        company_code: credential.company_code || '',
        company_name: credential.company_name || '',
        domain: '',
        notify_robot_id: credential.notify_robot_id || '',
      })
    }, 0)
  }

  const handleUpdateSubmit = () => {
    updateFormRef.current?.validate().then((rawValues) => {
      const values = rawValues as CredentialFormValues
      if (selectedCredential) {
        updateMutation.mutate({ id: selectedCredential.id, data: values })
      }
    })
  }

  const handleDeleteClick = (credential: YunkeCredential) => {
    setSelectedCredential(credential)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedCredential) {
      deleteMutation.mutate(selectedCredential.id)
    }
  }

  const handleLogin = (credential: YunkeCredential) => {
    loginMutation.mutate(credential.id)
  }

  // 钉钉机器人选项
  const robotOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: '', label: '不通知' }]
    robots.forEach((robot) => {
      opts.push({ value: robot.id, label: robot.name })
    })
    return opts
  }, [robots])

  return (
    <>
      <DataTableLayout
        title="云客账号凭证管理"
        total={total}
        headerActions={
          <Button icon={<Plus style={{ width: 16, height: 16 }} />} onClick={handleCreateClick}>
            添加账号
          </Button>
        }
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索手机号或公司名..."
              style={{ width: 256 }}
              value={searchValue}
              onChange={v => setSearchValue(v)}
              onEnterPress={handleSearch}
            />
            <Select
              value={statusFilter}
              onChange={v => setStatusFilter(v as string)}
              optionList={STATUS_OPTIONS}
              style={{ width: 120 }}
            />
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={total}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 创建账号对话框 */}
      <Modal
        title="添加云客账号"
        visible={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        width={425}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button theme="outline" onClick={() => setCreateModalOpen(false)}>取消</Button>
            <Button onClick={handleCreateSubmit} loading={createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </div>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
          添加新的云客账号凭证，如果手机号已存在则更新密码
        </Text>
        <Form
          getFormApi={(api) => { createFormRef.current = api }}
          labelPosition="top"
          labelWidth="100%"
        >
          <Form.Input
            field="phone"
            label="手机号"
            placeholder="请输入手机号"
            rules={[
              { required: true, message: '手机号不能为空' },
              { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
            ]}
          />
          <Form.Input
            field="password"
            label="密码"
            mode="password"
            placeholder="请输入密码"
            rules={[{ required: true, message: '密码不能为空' }]}
          />
          <Form.Input
            field="company_code"
            label="公司代码"
            placeholder="请输入公司代码"
            rules={[{ required: true, message: '公司代码不能为空' }]}
          />
          <Form.Input
            field="company_name"
            label="公司名称"
            placeholder="请输入公司名称"
            rules={[{ required: true, message: '公司名称不能为空' }]}
          />
          <Form.Input
            field="domain"
            label="域名（可选）"
            placeholder="请输入域名"
          />
        </Form>
      </Modal>

      {/* 编辑账号对话框 */}
      <Modal
        title="编辑账号"
        visible={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        width={425}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button theme="outline" onClick={() => setEditModalOpen(false)}>取消</Button>
            <Button onClick={handleUpdateSubmit} loading={updateMutation.isPending}>
              {updateMutation.isPending ? '更新中...' : '更新'}
            </Button>
          </div>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
          修改账号信息，留空密码则不修改密码
        </Text>
        <Form
          getFormApi={(api) => { updateFormRef.current = api }}
          labelPosition="top"
          labelWidth="100%"
        >
          <Form.Input
            field="phone"
            label="手机号"
            placeholder="请输入手机号"
            rules={[
              { required: true, message: '手机号不能为空' },
              { pattern: /^1\d{10}$/, message: '请输入正确的手机号' },
            ]}
          />
          <Form.Input
            field="password"
            label="新密码（可选）"
            mode="password"
            placeholder="留空则不修改密码"
          />
          <Form.Input
            field="company_code"
            label="公司代码"
            placeholder="请输入公司代码"
            rules={[{ required: true, message: '公司代码不能为空' }]}
          />
          <Form.Input
            field="company_name"
            label="公司名称"
            placeholder="请输入公司名称"
            rules={[{ required: true, message: '公司名称不能为空' }]}
          />
          <Form.Input
            field="domain"
            label="域名（可选）"
            placeholder="请输入域名"
          />
          <Form.Select
            field="notify_robot_id"
            label="登录失败通知机器人"
            placeholder="选择通知机器人（可选）"
            optionList={robotOptions}
          />
        </Form>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        okText="删除"
        okType="danger"
        cancelText="取消"
        onOk={handleDeleteConfirm}
      >
        确定要删除账号 {selectedCredential?.phone} 吗？此操作无法撤销。
      </Modal>
    </>
  )
}
