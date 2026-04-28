/**
 * Webhook钩子配置页面
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Webhook,
  Pencil,
  Trash2,
  Play,
  Copy,
  X,
  Info,
  Bot,
  Building2,
  Plus,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Button, Input, Select, Modal, Form, Typography, Tag, TextArea, Tabs } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { webhookHooksApi, dingtalkRobotsApi, adminApi } from '../api'
import type {
  WebhookHook,
  WebhookHookUpdate,
  DingtalkRobot,
  CampusItem,
  RobotInfo,
} from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'
import { MultiSelect } from '@/components/multi-select'

const { Text } = Typography

// 校区机器人映射规则
interface CampusRobotRule {
  campus_id: string
  robot_ids: string[]
}

interface WebhookExtraConfig {
  campus_robot_map?: Array<CampusRobotRule & { campus_name?: string }>
}

interface WebhookHookFormValues {
  name?: string
  hook_key?: string
  description?: string
  message_type?: 'text' | 'markdown'
  message_template?: string
  is_active?: boolean
  sort_order?: number
}

// 状态筛选选项
const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '禁用' },
]


export function WebhookHooksPage() {
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WebhookHook | null>(null)
  const [deletingItem, setDeletingItem] = useState<WebhookHook | null>(null)
  const [testingItem, setTestingItem] = useState<WebhookHook | null>(null)
  const [testDataString, setTestDataString] = useState('')

  // 校区机器人规则（手动管理）
  const [campusRobotRules, setCampusRobotRules] = useState<CampusRobotRule[]>([])
  // 全局机器人选择
  const [selectedRobotIds, setSelectedRobotIds] = useState<string[]>([])

  // 查询钩子列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-webhook-hooks', searchValue, statusFilter],
    queryFn: async () => {
      const params: { search?: string; is_active?: boolean } = {}
      if (searchValue) params.search = searchValue
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active'
      return webhookHooksApi.list(params)
    },
  })

  // 查询钉钉机器人列表
  const { data: robotsData } = useQuery({
    queryKey: ['admin-dingtalk-robots-active'],
    queryFn: () => dingtalkRobotsApi.getActive(),
  })

  // 查询校区列表
  const { data: campusesData } = useQuery({
    queryKey: ['admin-campuses-active'],
    queryFn: async () => {
      const response = await adminApi.getCampuses({ size: 200, is_active: true })
      return response.data
    },
  })

  const robots = useMemo<DingtalkRobot[]>(() => robotsData ?? [], [robotsData])
  const campuses = useMemo<CampusItem[]>(() => campusesData?.items ?? [], [campusesData?.items])

  // 机器人选项
  const robotOptions = useMemo(() => {
    return robots.map((r: DingtalkRobot) => ({
      value: r.id,
      label: r.name,
    }))
  }, [robots])

  // 校区选项
  const campusOptions = useMemo(() => {
    return campuses.map((c: CampusItem) => ({
      value: c.id,
      label: c.name,
    }))
  }, [campuses])

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WebhookHookUpdate }) =>
      webhookHooksApi.update(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-webhook-hooks'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhookHooksApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-webhook-hooks'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 测试
  const testMutation = useMutation({
    mutationFn: ({ id, testData }: { id: string; testData: Record<string, unknown> }) =>
      webhookHooksApi.test(id, { test_data: testData }),
    onSuccess: (response) => {
      if (response.success) {
        toast.success(`测试成功！成功发送 ${response.sent_count} 个，失败 ${response.failed_count} 个`)
      } else {
        toast.warning(response.message)
      }
      setTestDialogOpen(false)
      setTestingItem(null)
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '测试失败')
    },
  })

  // 列定义
  const columns: ColumnProps<WebhookHook>[] = [
    {
      title: '钩子名称',
      dataIndex: 'name',
      width: 200,
      render: (_text: string, record: WebhookHook) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-blue-500" />
              <Text strong>{record.name}</Text>
            </div>
            <code style={{ fontSize: 12, color: 'var(--semi-color-text-2)', background: 'var(--semi-color-fill-0)', padding: '2px 6px', borderRadius: 4, width: 'fit-content' }}>
              {record.hook_key}
            </code>
          </div>
        )
      },
    },
      {
        title: '描述',
        dataIndex: 'description',
        width: 250,
        render: (text: string, record: WebhookHook) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
          return (
            <Text type="tertiary" ellipsis={{ showTooltip: true }} style={{ maxWidth: 250 }}>
            {text || '-'}
          </Text>
        )
      },
    },
      {
        title: '关联机器人',
        dataIndex: 'robots',
        width: 200,
        render: (_value: RobotInfo[] | undefined, record: WebhookHook) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          const hookRobots = record.robots || []
          if (hookRobots.length === 0) {
            return <Tag size="small">未配置</Tag>
          }
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {hookRobots.slice(0, 2).map((robot) => (
                <Tag key={robot.id} size="small" color={robot.is_active ? 'blue' : 'grey'}>
                  <Bot className="h-3 w-3 mr-1 inline" />
                  {robot.name}
              </Tag>
            ))}
            {hookRobots.length > 2 && (
              <Tag size="small">+{hookRobots.length - 2}</Tag>
            )}
          </div>
        )
      },
    },
      {
        title: '校区匹配',
        dataIndex: 'extra_config',
        width: 140,
        render: (_value: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          const rules = (record.extra_config as WebhookExtraConfig | undefined)?.campus_robot_map || []
          if (rules.length === 0) {
            return <Tag size="small">未配置</Tag>
          }
        return (
          <Tag size="small" color="grey">
            <Building2 className="h-3 w-3 mr-1 inline" />
            {rules.length} 条规则
          </Tag>
        )
      },
    },
      {
        title: '消息格式',
        dataIndex: 'message_type',
        width: 100,
        render: (text: string, record: WebhookHook) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Tag size="small" color={text === 'markdown' ? 'blue' : 'grey'}>
            {text === 'markdown' ? 'Markdown' : '文本'}
          </Tag>
        )
      },
    },
      {
        title: '触发次数',
        dataIndex: 'trigger_count',
        width: 100,
        render: (text: number, record: WebhookHook) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
          return <Text strong>{text || 0}</Text>
        },
    },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 80,
        render: (_value: boolean, record: WebhookHook) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
          return <StatusBadge isActive={record.is_active} />
        },
    },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 160,
        render: (text: string, record: WebhookHook) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
          return <Text type="tertiary">{formatTime(text)}</Text>
        },
    },
      {
        title: '操作',
        dataIndex: 'id',
        width: 150,
        fixed: 'right' as const,
        render: (_value: string, record: WebhookHook) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
          return (
            <div style={{ display: 'flex', gap: 4 }}>
            <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} size="small" onClick={() => handleEdit(record)} />
            <Button theme="borderless" type="tertiary" icon={<Play className="h-4 w-4" />} size="small" onClick={() => handleTestClick(record)} />
            <Button theme="borderless" type="tertiary" icon={<Copy className="h-4 w-4" />} size="small" onClick={() => handleCopyHookKey(record.hook_key)} />
            <Button theme="borderless" type="danger" icon={<Trash2 className="h-4 w-4" />} size="small" onClick={() => handleDeleteClick(record)} />
          </div>
          )
        },
      },
  ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 打开编辑对话框
  const handleEdit = (item: WebhookHook) => {
    setEditingItem(item)
    const campusRules = (item.extra_config as WebhookExtraConfig | undefined)?.campus_robot_map || []
    setCampusRobotRules(campusRules.map(rule => ({
      campus_id: rule.campus_id || '',
      robot_ids: rule.robot_ids || [],
    })))
    setSelectedRobotIds(item.robot_ids || [])
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        hook_key: item.hook_key,
        description: item.description || '',
        message_type: item.message_type,
        message_template: item.message_template || '',
        is_active: item.is_active,
        sort_order: item.sort_order,
      })
    }, 0)
  }

  // 点击删除按钮
  const handleDeleteClick = (item: WebhookHook) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = () => {
    if (deletingItem?.id) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 点击测试按钮
  const handleTestClick = (item: WebhookHook) => {
    setTestingItem(item)
    setTestDataString(JSON.stringify({
      user: '测试用户',
      action: `测试钩子 [${item.name}]`,
      time: new Date().toLocaleString(),
      hook_key: item.hook_key,
    }, null, 2))
    setTestDialogOpen(true)
  }

  // 发送测试
  const handleTestSubmit = () => {
    if (!testingItem?.id) return

    let testData: Record<string, unknown> = {}
    try {
      testData = JSON.parse(testDataString)
    } catch {
      toast.error('测试数据格式错误，请输入有效的JSON')
      return
    }

    testMutation.mutate({ id: testingItem.id, testData })
  }

  // 复制钩子标识
  const handleCopyHookKey = async (hookKey: string) => {
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(hookKey)
    if (success) {
      toast.success('钩子标识已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  // 提交表单
  const handleSubmit = (values: WebhookHookFormValues) => {
    if (!editingItem?.id) return

    // 处理校区机器人映射规则
    const campusRobotMap = campusRobotRules
      .filter((rule) => rule.campus_id && rule.robot_ids.length > 0)
      .map((rule) => ({
        campus_id: rule.campus_id,
        campus_name: campusOptions.find((c) => c.value === rule.campus_id)?.label,
        robot_ids: rule.robot_ids,
      }))

    const updateData: WebhookHookUpdate = {
      name: values.name,
      description: values.description,
      robot_ids: selectedRobotIds,
      message_template: values.message_template,
      message_type: values.message_type,
      is_active: values.is_active,
      sort_order: values.sort_order,
      extra_config: campusRobotMap.length > 0 ? { campus_robot_map: campusRobotMap } : undefined,
    }

    updateMutation.mutate({ id: editingItem.id, data: updateData })
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
  }

  // 添加校区规则
  const handleAddCampusRule = () => {
    setCampusRobotRules(prev => [...prev, { campus_id: '', robot_ids: [] }])
  }

  // 移除校区规则
  const handleRemoveCampusRule = (index: number) => {
    setCampusRobotRules(prev => prev.filter((_, i) => i !== index))
  }

  // 更新校区规则
  const updateCampusRule = (
    index: number,
    key: keyof CampusRobotRule,
    value: CampusRobotRule[keyof CampusRobotRule]
  ) => {
    setCampusRobotRules(prev => prev.map((r, i) => i === index ? { ...r, [key]: value } : r))
  }

  return (
    <>
      <DataTableLayout
        title="钩子配置管理"
        total={data?.total}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索钩子名称或标识..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 260 }}
            />
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as string)}
              optionList={statusOptions}
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
        />
      </DataTableLayout>

      {/* 编辑对话框 */}
      <Modal
        title="配置钩子"
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        width={700}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={updateMutation.isPending}>保存配置</Button>
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
            <Tabs.TabPane tab="基本配置" itemKey="basic">
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16, paddingBottom: 24 }}>
                <Form.Input field="name" label="钩子名称" placeholder="钩子名称" disabled />
                <Form.Input field="hook_key" label="钩子标识" placeholder="唯一标识" disabled />
                <Form.TextArea field="description" label="描述" placeholder="钩子描述" rows={2} disabled />

                {/* 关联机器人 - 使用 MultiSelect */}
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>关联机器人</Text>
                  <MultiSelect
                    options={robotOptions}
                    value={selectedRobotIds}
                    onValueChange={setSelectedRobotIds}
                    placeholder="选择关联的钉钉机器人"
                  />
                  <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 4 }}>
                    选择触发此钩子时发送消息的机器人
                  </Text>
                </div>

                <Form.RadioGroup field="message_type" label="消息格式" direction="horizontal"
                  options={[
                    { value: 'text', label: '文本' },
                    { value: 'markdown', label: 'Markdown' },
                  ]}
                />
                <Form.TextArea field="message_template" label="消息模板" placeholder="消息模板，支持变量替换，如：${user} 执行了 ${action}" rows={4} />
                <Text type="tertiary" size="small" style={{ display: 'block', marginTop: -8, marginBottom: 12 }}>
                  支持变量替换：使用 {'${变量名}'} 格式，如 {'${user}'}、{'${time}'}、{'${data}'}
                </Text>
                <Form.Switch field="is_active" label="启用状态" extraText="设置该钩子是否启用" />
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab={<span>校区匹配规则{campusRobotRules.length > 0 && <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>({campusRobotRules.length})</span>}</span>} itemKey="campus-rules">
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16, paddingBottom: 24 }}>
                <div style={{ padding: '8px 12px', background: 'var(--semi-color-fill-0)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Info className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
                  <Text type="tertiary" size="small">
                    如果设置了规则，钩子会优先匹配顾问所属校区对应的机器人；
                    当没有匹配规则时，会发送给上方选择的默认机器人列表。
                  </Text>
                </div>

                {campusRobotRules.map((rule, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, border: '1px solid var(--semi-color-border)', borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <Text size="small" type="tertiary" style={{ display: 'block', marginBottom: 4 }}>校区</Text>
                        <Select
                          value={rule.campus_id}
                          onChange={(v) => updateCampusRule(index, 'campus_id', (Array.isArray(v) ? v[0] : v) || '')}
                          optionList={campusOptions}
                          placeholder="选择校区"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <Text size="small" type="tertiary" style={{ display: 'block', marginBottom: 4 }}>机器人</Text>
                        <MultiSelect
                          options={robotOptions}
                          value={rule.robot_ids}
                          onValueChange={(v) => updateCampusRule(index, 'robot_ids', v)}
                          placeholder="选择机器人"
                        />
                      </div>
                    </div>
                    <Button theme="borderless" type="tertiary" icon={<X className="h-4 w-4" />} size="small" style={{ marginTop: 24 }} onClick={() => handleRemoveCampusRule(index)} />
                  </div>
                ))}

                <Button theme="outline" size="small" icon={<Plus className="h-4 w-4" />} onClick={handleAddCampusRule}>
                  新增匹配规则
                </Button>
              </div>
            </Tabs.TabPane>
          </Tabs>
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
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>删除</Button>
          </div>
        }
      >
        确定要删除钩子「{deletingItem?.name}」吗？此操作不可撤销。
      </Modal>

      {/* 测试对话框 */}
      <Modal
        title="测试钩子"
        visible={testDialogOpen}
        onCancel={() => setTestDialogOpen(false)}
        width={600}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setTestDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={handleTestSubmit} loading={testMutation.isPending}>
              {testMutation.isPending ? '发送中...' : '发送测试消息'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '8px 12px', background: 'var(--semi-color-fill-0)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
            <Text type="tertiary" size="small">将使用测试数据触发钩子，发送消息到配置的钉钉群</Text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Text strong>钩子名称：</Text>
              <Text>{testingItem?.name}</Text>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Text strong>钩子标识：</Text>
              <code style={{ fontSize: 13, background: 'var(--semi-color-fill-0)', padding: '2px 6px', borderRadius: 4 }}>
                {testingItem?.hook_key}
              </code>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Text strong>关联机器人数：</Text>
              <Text>{testingItem?.robot_ids?.length || 0} 个</Text>
            </div>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>测试数据 (JSON格式)</Text>
            <TextArea
              value={testDataString}
              onChange={(v) => setTestDataString(v)}
              rows={6}
              placeholder='{"user": "测试用户", "action": "测试动作", "time": "2024-01-01 12:00:00"}'
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
