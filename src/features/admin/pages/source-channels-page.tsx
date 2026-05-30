/**
 * 来源渠道管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { Plus, Pencil, Trash2, Share2, Filter, X, Settings2, Copy, Link, Bot, Bell, UserPlus } from 'lucide-react'
import { Button, Input, Select, Modal, Form, Tabs, TabPane, Typography, Checkbox as SemiCheckbox } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import adminApi, { sourceChannelApi, dingtalkRobotsApi } from '../api'
import type { SourceChannel, DingtalkRobot } from '../types'
import { StatusBadge, SourceChannelCategoryBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { EmployeeSelectorDialog } from '@/components/employee-selector-dialog'

const { Text } = Typography

// 渠道分类选项
const CHANNEL_CATEGORIES = [
  { value: 'ONLINE', label: '线上渠道' },
  { value: 'OFFLINE', label: '线下渠道' },
  { value: 'REFERRAL', label: '推荐渠道' },
  { value: 'EVENT', label: '活动渠道' },
  { value: 'OTHER', label: '其他渠道' },
] as const

// 额外字段类型选项
const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'datetime', label: '日期时间' },
  { value: 'select', label: '选择框' },
  { value: 'textarea', label: '文本域' },
] as const

// 分类筛选选项
const categoryFilterOptions = [
  { value: 'all', label: '全部分类' },
  ...CHANNEL_CATEGORIES.map(c => ({ value: c.value, label: c.label })),
]

// 状态筛选选项
const statusFilterOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '已启用' },
  { value: 'inactive', label: '已停用' },
]

type ChannelCategoryValue = (typeof CHANNEL_CATEGORIES)[number]['value']
type ExtraFieldType = (typeof FIELD_TYPE_OPTIONS)[number]['value']

interface SourceChannelDingtalkNotifyConfig {
  enabled: boolean
  robot_id: string | null
  notify_on_submit: boolean
  notify_on_collision: boolean
  notify_on_followup?: boolean
}

type SourceChannelConfig = Omit<NonNullable<SourceChannel['channel_config']>, 'dingtalk_notify'> & {
  dingtalk_notify?: SourceChannelDingtalkNotifyConfig
}

type SubmitTokenInfo = NonNullable<SourceChannelConfig['submit_tokens']>[string]

// 额外字段类型
interface ExtraFieldItem {
  field_name: string
  field_label: string
  field_type: ExtraFieldType
  required: boolean
  placeholder?: string
  options?: Array<{ label: string; value: string }>
}

interface SourceChannelFormValues {
  name: string
  category: ChannelCategoryValue
  description?: string
  sort_order?: number
  is_active: boolean
  'channel_config.submit_campus_id'?: string
  'channel_config.dingtalk_notify.enabled'?: boolean
  'channel_config.dingtalk_notify.robot_id'?: string
  'channel_config.dingtalk_notify.notify_on_submit'?: boolean
  'channel_config.dingtalk_notify.notify_on_collision'?: boolean
  'channel_config.dingtalk_notify.notify_on_followup'?: boolean
}

interface SourceChannelSubmitData {
  name: string
  category: ChannelCategoryValue
  description?: string
  sort_order?: number
  is_active: boolean
  extra_fields: ExtraFieldItem[]
  channel_config: {
    submit_campus_id?: string
    dingtalk_notify: SourceChannelDingtalkNotifyConfig
  }
}

const PAGE_SIZE = 20

export function SourceChannelsPage() {
  useDocumentTitle('来源渠道管理')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SourceChannel | null>(null)
  const [deletingItem, setDeletingItem] = useState<SourceChannel | null>(null)

  // 额外字段状态（Semi Form 不支持 fieldArray，手动管理）
  const [extraFields, setExtraFields] = useState<ExtraFieldItem[]>([])

  // 获取来源渠道列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-source-channels', page, pageSize, searchValue, statusFilter, categoryFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (searchValue) params.search = searchValue
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active'
      if (categoryFilter !== 'all') params.category = categoryFilter
      return sourceChannelApi.getChannelsPaginated(params)
    },
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 获取校区列表（快速录入配置需要）
  const { data: campuses = [] } = useQuery({
    queryKey: ['campuses-simple'],
    queryFn: async () => {
      const res = await adminApi.getCampusesSimple()
      return res?.data || []
    },
    enabled: dialogOpen,
  })

  // 获取启用的钉钉机器人列表
  const { data: robots = [] } = useQuery({
    queryKey: ['dingtalk-robots-active'],
    queryFn: () => dingtalkRobotsApi.getActive(),
    enabled: dialogOpen,
  })

  // 员工选择弹窗状态
  const [employeeSelectorOpen, setEmployeeSelectorOpen] = useState(false)

  // 添加员工令牌
  const addTokenMutation = useMutation({
    mutationFn: ({ channelId, employeeId, employeeName }: { channelId: string; employeeId: string; employeeName: string }) =>
      sourceChannelApi.addSubmitToken(channelId, employeeId, employeeName),
    onSuccess: () => {
      toast.success('令牌已添加')
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
      if (editingItem) {
        sourceChannelApi.getChannelById(editingItem.id).then(ch => {
          if (ch) setEditingItem(ch)
        })
      }
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '添加令牌失败')
    },
  })

  // 移除员工令牌
  const removeTokenMutation = useMutation({
    mutationFn: ({ channelId, token }: { channelId: string; token: string }) =>
      sourceChannelApi.removeSubmitToken(channelId, token),
    onSuccess: () => {
      toast.success('令牌已移除')
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
      if (editingItem) {
        sourceChannelApi.getChannelById(editingItem.id).then(ch => {
          if (ch) setEditingItem(ch)
        })
      }
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '移除令牌失败')
    },
  })

  // 创建来源渠道
  const createMutation = useMutation({
    mutationFn: (data: SourceChannelSubmitData) => sourceChannelApi.createChannel(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新来源渠道
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SourceChannelSubmitData }) =>
      sourceChannelApi.updateChannel(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除来源渠道
  const deleteMutation = useMutation({
    mutationFn: (id: string) => sourceChannelApi.deleteChannel(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 列定义
  const columns: ColumnProps<SourceChannel>[] = [
    {
      title: '渠道名称',
      dataIndex: 'name',
      width: 200,
      render: (text: string, record: SourceChannel) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return (
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-indigo-500" />
            <Text strong>{text}</Text>
          </div>
        )
      },
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (_category: string, record: SourceChannel) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <SourceChannelCategoryBadge category={record.category?.toUpperCase() || 'OTHER'} />
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 250,
      render: (text: string, record: SourceChannel) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
        return (
          <Text type="tertiary" ellipsis={{ showTooltip: true }} style={{ maxWidth: 250 }}>
            {text || '-'}
          </Text>
        )
      },
    },
    {
      title: '额外字段',
      dataIndex: 'extra_fields',
      width: 100,
      render: (_fields: SourceChannel['extra_fields'], record: SourceChannel) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
        const fields = record.extra_fields || record.channel_config?.fields || []
        return fields.length > 0 ? `${fields.length} 个` : '-'
      },
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 80,
      render: (text: number, record: SourceChannel) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
        return text ?? 0
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (_isActive: boolean, record: SourceChannel) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return <StatusBadge isActive={record.is_active ?? true} />
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 120,
      render: (_id: string, record: SourceChannel) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} onClick={() => handleEdit(record)} />
            <Button theme="borderless" type="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDeleteClick(record)} />
          </div>
        )
      },
    },
  ]

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    setExtraFields([])
    setDingtalkEnabled(false)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({
        category: 'ONLINE',
        sort_order: 0,
        is_active: true,
        'channel_config.submit_campus_id': '',
        'channel_config.dingtalk_notify.enabled': false,
        'channel_config.dingtalk_notify.robot_id': '',
        'channel_config.dingtalk_notify.notify_on_submit': true,
        'channel_config.dingtalk_notify.notify_on_collision': false,
        'channel_config.dingtalk_notify.notify_on_followup': false,
      })
    }, 0)
  }

  // 处理编辑
  const handleEdit = (item: SourceChannel) => {
    setEditingItem(item)

    // 获取额外字段数据
    let extraFieldsData: ExtraFieldItem[] = []
    if (item.extra_fields && Array.isArray(item.extra_fields)) {
      extraFieldsData = item.extra_fields.map(field => ({
        field_name: field.field_name || '',
        field_label: field.field_label || '',
        field_type: field.field_type || 'text',
        required: field.required || false,
        placeholder: field.placeholder || '',
        options: field.options || [],
      }))
    } else if (item.channel_config?.fields && Array.isArray(item.channel_config.fields)) {
      extraFieldsData = item.channel_config.fields.map(field => ({
        field_name: field.field_name || '',
        field_label: field.field_label || '',
        field_type: field.field_type || 'text',
        required: field.required || false,
        placeholder: field.placeholder || '',
        options: field.options || [],
      }))
    }
    setExtraFields(extraFieldsData)

    const config = (item.channel_config ?? {}) as SourceChannelConfig
    setDingtalkEnabled(config.dingtalk_notify?.enabled ?? false)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        category: (item.category?.toUpperCase() || 'ONLINE'),
        description: item.description || '',
        sort_order: item.sort_order,
        is_active: item.is_active,
        'channel_config.submit_campus_id': config.submit_campus_id || '',
        'channel_config.dingtalk_notify.enabled': config.dingtalk_notify?.enabled || false,
        'channel_config.dingtalk_notify.robot_id': config.dingtalk_notify?.robot_id || '',
        'channel_config.dingtalk_notify.notify_on_submit': config.dingtalk_notify?.notify_on_submit ?? true,
        'channel_config.dingtalk_notify.notify_on_collision': config.dingtalk_notify?.notify_on_collision ?? false,
        'channel_config.dingtalk_notify.notify_on_followup': config.dingtalk_notify?.notify_on_followup ?? false,
      })
    }, 0)
  }

  // 处理删除点击
  const handleDeleteClick = (item: SourceChannel) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 处理表单提交
  const handleSubmit = (values: SourceChannelFormValues) => {
    // 过滤掉无效的额外字段
    const validExtraFields = extraFields
      .filter(field => field.field_name.trim() && field.field_label.trim())
      .map(field => ({
        ...field,
        options: field.field_type === 'select' ? field.options : undefined,
      }))

    const submitData: SourceChannelSubmitData = {
      name: values.name,
      category: values.category,
      description: values.description,
      sort_order: values.sort_order,
      is_active: values.is_active,
      extra_fields: validExtraFields,
      channel_config: {
        submit_campus_id: values['channel_config.submit_campus_id'] || undefined,
        dingtalk_notify: {
          enabled: values['channel_config.dingtalk_notify.enabled'] || false,
          robot_id: values['channel_config.dingtalk_notify.robot_id'] || null,
          notify_on_submit: values['channel_config.dingtalk_notify.notify_on_submit'] ?? true,
          notify_on_collision: values['channel_config.dingtalk_notify.notify_on_collision'] ?? false,
          notify_on_followup: values['channel_config.dingtalk_notify.notify_on_followup'] ?? false,
        },
      },
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  // 通过员工选择弹窗选择后直接生成链接
  const handleEmployeeSelected = (employee: { id: string; name: string }) => {
    if (!editingItem) return
    addTokenMutation.mutate({
      channelId: editingItem.id,
      employeeId: employee.id,
      employeeName: employee.name,
    })
  }

  // 复制员工录入链接
  const handleCopyTokenLink = async (token: string) => {
    const link = `${window.location.origin}/lead-submit?token=${token}`
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(link)
    if (success) {
      toast.success('链接已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  // 添加新的额外字段
  const handleAddExtraField = () => {
    setExtraFields(prev => [...prev, {
      field_name: '',
      field_label: '',
      field_type: 'text',
      required: false,
      placeholder: '',
      options: [],
    }])
  }

  // 移除额外字段
  const handleRemoveExtraField = (index: number) => {
    setExtraFields(prev => prev.filter((_, i) => i !== index))
  }

  // 更新额外字段
  const updateExtraField = <K extends keyof ExtraFieldItem>(index: number, key: K, value: ExtraFieldItem[K]) => {
    setExtraFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f))
  }

  // 为选择框添加选项
  const handleAddOption = (fieldIndex: number) => {
    setExtraFields(prev => prev.map((f, i) => {
      if (i !== fieldIndex) return f
      return { ...f, options: [...(f.options || []), { label: '', value: '' }] }
    }))
  }

  // 移除选择框选项
  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    setExtraFields(prev => prev.map((f, i) => {
      if (i !== fieldIndex) return f
      return { ...f, options: (f.options || []).filter((_, oi) => oi !== optionIndex) }
    }))
  }

  // 更新选择框选项
  const updateOption = (fieldIndex: number, optionIndex: number, key: 'label' | 'value', value: string) => {
    setExtraFields(prev => prev.map((f, i) => {
      if (i !== fieldIndex) return f
      return {
        ...f,
        options: (f.options || []).map((opt, oi) => oi === optionIndex ? { ...opt, [key]: value } : opt),
      }
    }))
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  // 钉钉通知启用状态（需要在表单外追踪以条件渲染）
  const [dingtalkEnabled, setDingtalkEnabled] = useState(false)

  return (
    <>
      <DataTableLayout
        title="来源渠道管理"
        total={data?.total}
        headerActions={
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新建渠道
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索渠道名称..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 220 }}
            />
            <Select
              value={categoryFilter}
              onChange={(v) => { setCategoryFilter(v as string); setPage(1) }}
              optionList={categoryFilterOptions}
              style={{ width: 140 }}
              prefix={<Filter className="h-3.5 w-3.5" />}
            />
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
              optionList={statusFilterOptions}
              style={{ width: 130 }}
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
          emptyText="暂无数据"
        />
      </DataTableLayout>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑来源渠道' : '新建来源渠道'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        width={720}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={isPending}>保存</Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          <Tabs defaultActiveKey="basic" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
            <TabPane tab="基本信息" itemKey="basic">
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16, paddingBottom: 24 }}>
                <Form.Input field="name" label="渠道名称" placeholder="请输入渠道名称" rules={[{ required: true, message: '请输入渠道名称' }, { max: 50, message: '名称最多50个字符' }]} />
                <Form.Select field="category" label="渠道分类" placeholder="请选择渠道分类" optionList={CHANNEL_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} rules={[{ required: true, message: '请选择渠道分类' }]} />
                <Form.TextArea field="description" label="描述" placeholder="请输入描述（可选）" rows={3} rules={[{ max: 200, message: '描述最多200个字符' }]} />
                <Form.InputNumber field="sort_order" label="排序值" min={0} style={{ width: '100%' }} />
                <Form.Switch field="is_active" label="启用状态" />
              </div>
            </TabPane>

            {/* 快速录入配置 Tab */}
            <TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Link size={12} />快速录入</span>} itemKey="submit-config">
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16, paddingBottom: 24 }}>
                {/* 归属校区 */}
                <Form.Select
                  field="channel_config.submit_campus_id"
                  label="归属校区"
                  placeholder="选择线索归属校区"
                  optionList={campuses.map((campus: { id: string; name: string }) => ({ value: campus.id, label: campus.name }))}
                  showClear
                />

                {/* 员工提交令牌管理 */}
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>员工专属链接</Text>

                  {!editingItem ? (
                    <Text type="tertiary" size="small">请先保存渠道后再管理员工令牌</Text>
                  ) : (
                    <>
                      <Button
                        theme="outline"
                        icon={<UserPlus className="h-4 w-4" />}
                        onClick={() => setEmployeeSelectorOpen(true)}
                        disabled={addTokenMutation.isPending}
                        block
                      >
                        选择员工并生成链接
                      </Button>

                      {(() => {
                        const submitTokens = editingItem?.channel_config?.submit_tokens || {}
                        const tokenEntries = Object.entries(submitTokens) as Array<[string, SubmitTokenInfo]>
                        if (tokenEntries.length === 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', textAlign: 'center', border: '1px dashed var(--semi-color-border)', borderRadius: 6, marginTop: 12 }}>
                              <Link className="h-6 w-6" style={{ color: 'var(--semi-color-text-2)', marginBottom: 8 }} />
                              <Text type="tertiary" size="small">暂无员工链接</Text>
                              <Text type="tertiary" size="small" style={{ marginTop: 4 }}>选择员工并点击生成链接</Text>
                            </div>
                          )
                        }
                        return (
                          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {tokenEntries.map(([tok, info]) => (
                              <div key={tok} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 12, border: '1px solid var(--semi-color-border)', borderRadius: 6 }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <Text strong size="small">{info.employee_name}</Text>
                                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--semi-color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {`${window.location.origin}/lead-submit?token=${tok}`}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                  <Button theme="borderless" type="tertiary" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => handleCopyTokenLink(tok)} />
                                  <Button theme="borderless" type="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => removeTokenMutation.mutate({ channelId: editingItem.id, token: tok })} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
            </TabPane>

            {/* 钉钉通知配置 Tab */}
            <TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Bell size={12} />钉钉通知</span>} itemKey="dingtalk-notify">
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16, paddingBottom: 24 }}>
                <Form.Switch
                  field="channel_config.dingtalk_notify.enabled"
                  label="启用钉钉通知"
                  extraText="新线索提交时自动发送通知到钉钉群"
                  onChange={(v) => setDingtalkEnabled(v as boolean)}
                />

                {dingtalkEnabled && (
                  <>
                    <Form.Select
                      field="channel_config.dingtalk_notify.robot_id"
                      label="通知机器人"
                      placeholder="选择钉钉机器人"
                      optionList={robots.map((robot: DingtalkRobot) => ({ value: robot.id, label: robot.name }))}
                      prefix={<Bot className="h-4 w-4" />}
                      showClear
                    />
                    {robots.length === 0 && (
                      <Text type="tertiary" size="small" style={{ display: 'block', marginTop: -8, marginBottom: 12 }}>
                        暂无可用机器人，请先在钉钉机器人管理中创建
                      </Text>
                    )}

                    <Form.Switch
                      field="channel_config.dingtalk_notify.notify_on_submit"
                      label="新线索录入通知"
                      extraText="有新线索成功录入时发送通知"
                    />
                    <Form.Switch
                      field="channel_config.dingtalk_notify.notify_on_collision"
                      label="撞量通知"
                      extraText="线索撞量时发送通知（包括成功接管和正在跟进中）"
                    />
                    <Form.Switch
                      field="channel_config.dingtalk_notify.notify_on_followup"
                      label="跟进结果回传"
                      extraText="课程顾问添加跟进记录后，自动将结果回传到渠道方钉钉群（脱敏信息）"
                    />
                  </>
                )}
              </div>
            </TabPane>

            {/* 额外字段配置 Tab */}
            <TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>额外字段{extraFields.length > 0 && <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>({extraFields.length})</span>}</span>} itemKey="extra-fields">
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16, paddingBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--semi-color-text-2)', fontSize: 14 }}>
                    <Settings2 className="h-4 w-4" />
                    <span>配置该来源渠道特有的额外字段</span>
                  </div>
                  <Button theme="outline" icon={<Plus className="h-4 w-4" />} onClick={handleAddExtraField}>
                    添加字段
                  </Button>
                </div>

                {extraFields.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center', border: '1px dashed var(--semi-color-border)', borderRadius: 6 }}>
                    <Settings2 className="h-8 w-8" style={{ color: 'var(--semi-color-text-2)', marginBottom: 8 }} />
                    <Text type="tertiary" size="small">暂无额外字段</Text>
                    <Text type="tertiary" size="small" style={{ marginTop: 4 }}>点击上方按钮添加字段</Text>
                  </div>
                ) : (
                  extraFields.map((field, index) => (
                    <div key={index} style={{ border: '1px solid var(--semi-color-border)', borderRadius: 6, marginBottom: 12, padding: 16, position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text strong size="small">字段 {index + 1}</Text>
                        <Button theme="borderless" type="tertiary" icon={<X className="h-4 w-4" />} onClick={() => handleRemoveExtraField(index)} />
                      </div>

                      {/* 第一行：字段名和标签 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <Text size="small" type="tertiary" style={{ display: 'block', marginBottom: 4 }}>字段名称（英文）</Text>
                          <Input placeholder="如: phone, wechat" value={field.field_name} onChange={(v) => updateExtraField(index, 'field_name', v)} />
                        </div>
                        <div>
                          <Text size="small" type="tertiary" style={{ display: 'block', marginBottom: 4 }}>字段标签（中文）</Text>
                          <Input placeholder="如: 手机号, 微信号" value={field.field_label} onChange={(v) => updateExtraField(index, 'field_label', v)} />
                        </div>
                      </div>

                      {/* 第二行：类型、占位符、必填 */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                        <div>
                          <Text size="small" type="tertiary" style={{ display: 'block', marginBottom: 4 }}>字段类型</Text>
                          <Select
                            value={field.field_type}
                            onChange={(v) => updateExtraField(index, 'field_type', ((Array.isArray(v) ? v[0] : v) || 'text') as ExtraFieldType)}
                            optionList={FIELD_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <Text size="small" type="tertiary" style={{ display: 'block', marginBottom: 4 }}>占位符</Text>
                          <Input placeholder="请输入..." value={field.placeholder || ''} onChange={(v) => updateExtraField(index, 'placeholder', v)} />
                        </div>
                        <div style={{ paddingBottom: 4 }}>
                          <SemiCheckbox
                            checked={field.required}
                            onChange={(e) => updateExtraField(index, 'required', (e.target as HTMLInputElement).checked)}
                          >
                            必填
                          </SemiCheckbox>
                        </div>
                      </div>

                      {/* 选择框选项配置 */}
                      {field.field_type === 'select' && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--semi-color-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text size="small" type="tertiary">选项配置</Text>
                            <Button theme="borderless" type="tertiary" icon={<Plus className="h-3 w-3" />} onClick={() => handleAddOption(index)}>
                              添加选项
                            </Button>
                          </div>
                          {(!field.options || field.options.length === 0) ? (
                            <Text type="tertiary" size="small" style={{ display: 'block', textAlign: 'center', padding: '8px 0' }}>
                              暂无选项，请添加
                            </Text>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {field.options.map((opt, optIndex) => (
                                <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Input placeholder="选项标签" value={opt.label} onChange={(v) => updateOption(index, optIndex, 'label', v)} style={{ flex: 1 }} />
                                  <Input placeholder="选项值" value={opt.value} onChange={(v) => updateOption(index, optIndex, 'value', v)} style={{ flex: 1 }} />
                                  <Button theme="borderless" type="tertiary" icon={<X className="h-3 w-3" />} onClick={() => handleRemoveOption(index, optIndex)} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>删除</Button>
          </div>
        }
      >
        确定要删除渠道「{deletingItem?.name}」吗？此操作不可撤销。
        如果该渠道下存在线索，则无法删除。
      </Modal>

      {/* 员工选择弹窗 */}
      <EmployeeSelectorDialog
        open={employeeSelectorOpen}
        onOpenChange={setEmployeeSelectorOpen}
        onSelect={handleEmployeeSelected}
        title="选择员工"
        description="选择员工后将自动生成专属提交链接"
        confirmText="选择并生成链接"
        filterByAdvisorPosition={false}
      />
    </>
  )
}
