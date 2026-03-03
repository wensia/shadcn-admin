/**
 * 钉钉机器人配置 - Tab 内容组件
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Plus, Pencil, Trash2, Play, CheckCircle } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { Table, Button, Input, Modal, Form, Tag, Skeleton, Typography, Tooltip } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { isSkeletonRow, SKELETON_ID_PREFIX } from '@/lib/table-utils'
import { dingtalkRobotsApi } from '../../api'
import { SECURITY_TYPE_OPTIONS, type DingtalkRobot, type DingtalkRobotCreate, type DingtalkRobotUpdate, type DingtalkSecurityType } from '../../types'
import { StatusBadge } from '../status-badge'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

// 骨架屏数据
function createSkeletonData(count: number): DingtalkRobot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    name: '',
    webhook: '',
    security_type: 'sign' as DingtalkSecurityType,
    supported_msg_types: [],
    is_active: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    created_by_id: '',
  }))
}

export function DingtalkRobotsContent() {
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi>()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DingtalkRobot | null>(null)
  const [deletingItem, setDeletingItem] = useState<DingtalkRobot | null>(null)
  const [testingItem, setTestingItem] = useState<DingtalkRobot | null>(null)
  const [securityType, setSecurityType] = useState<string>('sign')
  const [testStatus, setTestStatus] = useState<{ tested: boolean; success: boolean; message: string }>({
    tested: false,
    success: false,
    message: '',
  })

  // 查询数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-dingtalk-robots', page, pageSize, searchValue],
    queryFn: async () => {
      const response = await dingtalkRobotsApi.list({
        page,
        size: pageSize,
        search: searchValue || undefined,
      })
      return response
    },
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: DingtalkRobotCreate) => dingtalkRobotsApi.create(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-dingtalk-robots'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DingtalkRobotUpdate }) =>
      dingtalkRobotsApi.update(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-dingtalk-robots'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => dingtalkRobotsApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-dingtalk-robots'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 测试
  const testMutation = useMutation({
    mutationFn: (data: { webhook: string; security_type: DingtalkSecurityType; secret_key?: string; keywords?: string[] }) =>
      dingtalkRobotsApi.test(data),
    onSuccess: () => {
      setTestStatus({
        tested: true,
        success: true,
        message: '连接测试成功，钉钉机器人可以正常发送消息',
      })
      toast.success('测试连接成功')
    },
    onError: (error: Error) => {
      setTestStatus({
        tested: true,
        success: false,
        message: error.message || '连接测试失败，请检查配置信息',
      })
      showApiErrorToast(error, '测试连接失败')
    },
  })

  // 安全设置类型标签
  const getSecurityTypeLabel = (type: string) => {
    const option = SECURITY_TYPE_OPTIONS.find(opt => opt.value === type)
    return option?.label || type
  }

  // 列定义
  const columns: ColumnProps<DingtalkRobot>[] = [
      {
        title: '机器人名称',
        dataIndex: 'name',
        width: 200,
        render: (_: unknown, record: DingtalkRobot) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
          }
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{record.name}</span>
              </div>
              {record.description && (
                <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }} style={{ maxWidth: 160 }}>
                  {record.description}
                </Text>
              )}
            </div>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_: unknown, record: DingtalkRobot) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 56 }} />
          }
          return <StatusBadge isActive={record.is_active} />
        },
      },
      {
        title: '安全设置',
        dataIndex: 'security_type',
        width: 120,
        render: (_: unknown, record: DingtalkRobot) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
          }
          return (
            <Tag color="blue" size="small">
              {getSecurityTypeLabel(record.security_type)}
            </Tag>
          )
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 160,
        render: (_: unknown, record: DingtalkRobot) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
          }
          return formatTime(record.created_at)
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 150,
        render: (_: unknown, record: DingtalkRobot) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
          }
          return (
            <div className="flex items-center gap-1">
              <Tooltip content="编辑">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} size="small" onClick={() => handleEdit(record)} />
                </span>
              </Tooltip>
              <Tooltip content="测试">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Play className="h-4 w-4" />} size="small" onClick={() => handleTestClick(record)} />
                </span>
              </Tooltip>
              <Tooltip content="删除">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Trash2 className="h-4 w-4 text-red-500" />} size="small" onClick={() => handleDeleteClick(record)} />
                </span>
              </Tooltip>
            </div>
          )
        },
      },
    ]

  // 表格数据
  const tableData = isLoading ? createSkeletonData(5) : (data?.items || [])

  const pagination = useMemo(() => ({
    currentPage: page,
    pageSize,
    total: data?.total || 0,
    onPageChange: setPage,
    onPageSizeChange: (s: number) => { setPageSize(s); setPage(1) },
    showSizeChanger: true,
    pageSizeOpts: [10, 20, 50, 100],
    showTotal: true,
    formatPageText: (info: { currentStart: number; currentEnd: number; total: number }) =>
      `第 ${info.currentStart}–${info.currentEnd} 条，共 ${info.total} 条`,
  }), [page, pageSize, data?.total])

  // 打开新增对话框
  const handleCreate = () => {
    setEditingItem(null)
    setSecurityType('sign')
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: '',
        description: '',
        webhook: '',
        security_type: 'sign',
        secret_key: '',
        keywords: '',
        is_active: true,
        sort_order: 0,
      })
    }, 0)
  }

  // 打开编辑对话框
  const handleEdit = (item: DingtalkRobot) => {
    setEditingItem(item)
    setSecurityType(item.security_type)
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        description: item.description || '',
        webhook: item.webhook,
        security_type: item.security_type,
        secret_key: item.secret_key || '',
        keywords: item.keywords?.join(', ') || '',
        is_active: item.is_active,
        sort_order: item.sort_order,
      })
    }, 0)
  }

  // 点击删除按钮
  const handleDeleteClick = (item: DingtalkRobot) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 点击测试按钮
  const handleTestClick = (item: DingtalkRobot) => {
    setTestingItem(item)
    setTestDialogOpen(true)
  }

  // 测试表单中的连接
  const handleFormTest = async () => {
    const values = formRef.current?.getValues()
    if (!values) return

    if (!values.webhook || !values.security_type) {
      toast.error('请先填写完整的机器人配置')
      return
    }

    const testData = {
      webhook: values.webhook as string,
      security_type: values.security_type as DingtalkSecurityType,
      secret_key: values.security_type === 'sign' ? values.secret_key as string : undefined,
      keywords: values.security_type === 'keyword' && values.keywords
        ? (values.keywords as string).split(',').map((k: string) => k.trim()).filter(Boolean)
        : undefined,
    }

    testMutation.mutate(testData)
  }

  // 测试已保存的机器人
  const handleTestSubmit = () => {
    if (!testingItem) return

    testMutation.mutate({
      webhook: testingItem.webhook,
      security_type: testingItem.security_type,
      secret_key: testingItem.secret_key,
      keywords: testingItem.keywords,
    })
  }

  // 提交表单
  const handleSubmit = (formData: Record<string, unknown>) => {
    // 检查是否已测试成功
    if (!editingItem && !testStatus.success) {
      toast.error('请先测试连接成功后再保存')
      return
    }

    const submitData: DingtalkRobotCreate = {
      name: formData.name as string,
      description: formData.description as string,
      webhook: formData.webhook as string,
      security_type: formData.security_type as DingtalkSecurityType,
      secret_key: formData.security_type === 'sign' ? formData.secret_key as string : undefined,
      keywords: formData.security_type === 'keyword' && formData.keywords
        ? (formData.keywords as string).split(',').map(k => k.trim()).filter(Boolean)
        : undefined,
      supported_msg_types: ['text', 'markdown'],
      is_active: formData.is_active as boolean,
      sort_order: formData.sort_order as number,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索机器人名称..."
              style={{ width: 256 }}
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
            />
            <Button theme="outline" onClick={handleSearch}>搜索</Button>
            <Button theme="borderless" type="tertiary" icon={<IconRefresh />} onClick={() => refetch()} />
          </div>
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新增机器人
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-hidden">
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            pagination={data && data.total > 0 ? pagination : false}
            loading={false}
            empty="暂无数据"
          />
        </div>
      </div>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑机器人' : '新增机器人'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => formRef.current?.submitForm()}
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!editingItem && !testStatus.success}
            >
              保存
            </Button>
          </div>
        }
        width={600}
        style={{ maxHeight: '90vh' }}
      >
        <div className="text-sm text-gray-500 mb-4">
          {editingItem ? '修改钉钉机器人配置' : '创建一个新的钉钉机器人'}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <Form
            getFormApi={(api) => { formRef.current = api }}
            onSubmit={handleSubmit}
            labelPosition="top"
          >
            <Form.Input
              field="name"
              label="机器人名称"
              placeholder="请输入机器人名称"
              rules={[{ required: true, message: '请输入机器人名称' }]}
            />
            <Form.TextArea
              field="description"
              label="描述"
              placeholder="请输入描述（可选）"
            />
            <Form.Input
              field="webhook"
              label="Webhook地址"
              placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
              rules={[
                { required: true, message: '请输入Webhook地址' },
                { pattern: /^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=/, message: 'Webhook地址必须是钉钉机器人的有效地址' },
              ]}
            />
            <Form.Select
              field="security_type"
              label="安全设置"
              optionList={SECURITY_TYPE_OPTIONS.map(opt => ({
                value: opt.value,
                label: `${opt.label} - ${opt.description}`,
              }))}
              onChange={(v) => setSecurityType(v as string)}
              rules={[{ required: true, message: '请选择安全设置类型' }]}
            />
            {securityType === 'sign' && (
              <Form.Input
                field="secret_key"
                label="加签密钥"
                mode="password"
                placeholder="请输入加签密钥"
                rules={[{ required: true, message: '使用加签验证时必须提供密钥' }]}
              />
            )}
            {securityType === 'keyword' && (
              <Form.Input
                field="keywords"
                label="关键词"
                placeholder="多个关键词用逗号分隔"
                extraText="消息内容必须包含至少一个关键词才能发送成功"
                rules={[{ required: true, message: '使用关键词验证时必须提供关键词' }]}
              />
            )}

            <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">启用状态</div>
                <div className="text-xs text-gray-500">设置该机器人是否启用</div>
              </div>
              <Form.Switch field="is_active" noLabel />
            </div>

            {/* 测试连接区域 */}
            <div className="rounded-lg border p-4 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">测试连接</div>
                  <div className="text-sm text-gray-500">
                    {editingItem ? '修改配置后建议重新测试' : '必须测试成功后才能保存'}
                  </div>
                </div>
                <Button
                  theme={testStatus.tested && testStatus.success ? 'solid' : 'outline'}
                  type={testStatus.tested && testStatus.success ? 'primary' : 'tertiary'}
                  onClick={handleFormTest}
                  loading={testMutation.isPending}
                  icon={testStatus.tested && testStatus.success ? <CheckCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                >
                  {testStatus.tested && testStatus.success ? '测试成功' : '测试连接'}
                </Button>
              </div>
              {testStatus.tested && (
                <div className={`rounded-md border p-3 ${testStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center gap-2">
                    {testStatus.success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                    <span className={testStatus.success ? 'text-green-700' : 'text-red-700'}>{testStatus.message}</span>
                  </div>
                </div>
              )}
            </div>
          </Form>
        </div>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>
              删除
            </Button>
          </div>
        }
      >
        确定要删除机器人「{deletingItem?.name}」吗？此操作不可撤销。
      </Modal>

      {/* 测试对话框 */}
      <Modal
        title="测试机器人"
        visible={testDialogOpen}
        onCancel={() => setTestDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setTestDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={handleTestSubmit} loading={testMutation.isPending}>
              发送测试消息
            </Button>
          </div>
        }
      >
        <div className="text-sm text-gray-500 mb-4">将发送测试消息到钉钉群</div>
        <div className="space-y-2 py-2">
          <div className="flex gap-2">
            <span className="font-medium">机器人：</span>
            <span>{testingItem?.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">安全设置：</span>
            <span>{getSecurityTypeLabel(testingItem?.security_type || '')}</span>
          </div>
        </div>
      </Modal>
    </>
  )
}
