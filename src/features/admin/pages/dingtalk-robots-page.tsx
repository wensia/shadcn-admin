/**
 * 钉钉机器人管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Plus, Pencil, Trash2, Play, CheckCircle } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Form, Button, Modal, Input, Typography, Tag, Banner } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { dingtalkRobotsApi } from '../api'
import { SECURITY_TYPE_OPTIONS, type DingtalkRobot, type DingtalkRobotCreate, type DingtalkRobotUpdate, type DingtalkSecurityType } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

interface DingtalkRobotFormValues {
  name: string
  description?: string
  webhook: string
  security_type: DingtalkSecurityType
  secret_key?: string
  keywords?: string
  is_active: boolean
  sort_order: number
}

export function DingtalkRobotsPage() {
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
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={128} />
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot className="h-4 w-4" style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 500 }}>{record!.name}</span>
              </div>
              {record!.description && (
                <Text type="tertiary" size="small">{record!.description}</Text>
              )}
            </div>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={56} />
          }
          return <StatusBadge isActive={record!.is_active} />
        },
      },
      {
        title: '安全设置',
        dataIndex: 'security_type',
        width: 120,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={64} />
          }
          return (
            <Tag>{getSecurityTypeLabel(record!.security_type)}</Tag>
          )
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 160,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={128} />
          }
          return formatTime(record!.created_at)
        },
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 150,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={96} />
          }
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Pencil className="h-4 w-4" />}
                size="small"
                onClick={() => handleEdit(record!)}
              />
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Play className="h-4 w-4" />}
                size="small"
                onClick={() => handleTestClick(record!)}
              />
              <Button
                theme="borderless"
                type="danger"
                icon={<Trash2 className="h-4 w-4" />}
                size="small"
                onClick={() => handleDeleteClick(record!)}
              />
            </div>
          )
        },
      },
    ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 打开新增对话框
  const handleCreate = () => {
    setEditingItem(null)
    setSecurityType('sign')
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({ security_type: 'sign', is_active: true, sort_order: 0 })
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
      webhook: values.webhook,
      security_type: values.security_type as DingtalkSecurityType,
      secret_key: values.security_type === 'sign' ? values.secret_key : undefined,
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
  const handleSubmit = (values: DingtalkRobotFormValues) => {
    // 检查是否已测试成功
    if (!editingItem && !testStatus.success) {
      toast.error('请先测试连接成功后再保存')
      return
    }

    const formData: DingtalkRobotCreate = {
      name: values.name,
      description: values.description,
      webhook: values.webhook,
      security_type: values.security_type,
      secret_key: values.security_type === 'sign' ? values.secret_key : undefined,
      keywords: values.security_type === 'keyword' && values.keywords
        ? (values.keywords as string).split(',').map((k: string) => k.trim()).filter(Boolean)
        : undefined,
      supported_msg_types: ['text', 'markdown'],
      is_active: values.is_active,
      sort_order: values.sort_order,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
  }

  // security_type 选项
  const securityTypeOptions = useMemo(() =>
    SECURITY_TYPE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    })), []
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataTableLayout
        title="钉钉机器人管理"
        total={data?.total}
        headerActions={
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新增机器人
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索机器人名称..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑机器人' : '新增机器人'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        style={{ maxWidth: 600 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => formRef.current?.submitForm()}
              loading={isPending}
              disabled={!editingItem && !testStatus.success}
            >
              保存
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
          onValueChange={(values) => {
            if (values.security_type !== securityType) {
              setSecurityType(values.security_type as string)
            }
          }}
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
            optionList={securityTypeOptions}
            rules={[{ required: true, message: '请选择安全设置类型' }]}
            style={{ width: '100%' }}
          />
          {securityType === 'sign' && (
            <Form.Input
              field="secret_key"
              label="加签密钥"
              placeholder="请输入加签密钥"
              mode="password"
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, border: '1px solid var(--semi-color-border)', padding: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 500 }}>启用状态</div>
              <Text type="tertiary" size="small">设置该机器人是否启用</Text>
            </div>
            <Form.Switch field="is_active" noLabel />
          </div>

          {/* 测试连接区域 */}
          <div style={{ borderRadius: 8, border: '1px solid var(--semi-color-border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500 }}>测试连接</div>
                <Text type="tertiary" size="small">
                  {editingItem ? '修改配置后建议重新测试' : '必须测试成功后才能保存'}
                </Text>
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
              <Banner
                type={testStatus.success ? 'success' : 'danger'}
                description={testStatus.message}
              />
            )}
          </div>
        </Form>
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
              {testMutation.isPending ? '发送中...' : '发送测试消息'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontWeight: 500 }}>机器人：</span>
            <span>{testingItem?.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontWeight: 500 }}>安全设置：</span>
            <span>{getSecurityTypeLabel(testingItem?.security_type || '')}</span>
          </div>
        </div>
      </Modal>
    </>
  )
}
