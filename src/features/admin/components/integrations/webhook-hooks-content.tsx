/**
 * Webhook钩子配置 - Tab 内容组件
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Webhook,
  Plus,
  Pencil,
  Trash2,
  Play,
  Copy,
  X,
  Info,
  Bot,
  Building2,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { Table, Button, Input, TextArea, Modal, Form, Select, Tag, Skeleton, Typography, Tooltip, Radio, Tabs, TabPane } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { isSkeletonRow, SKELETON_ID_PREFIX } from '@/lib/table-utils'
import { webhookHooksApi, dingtalkRobotsApi, adminApi } from '../../api'
import type {
  WebhookHook,
  WebhookHookUpdate,
  DingtalkRobot,
  CampusItem,
} from '../../types'
import { StatusBadge } from '../status-badge'
import { formatTime } from '@/lib/utils/time'
import { MultiSelect } from '@/components/multi-select'

const { Text } = Typography

// 校区机器人映射规则
interface CampusRobotRule {
  campus_id: string
  robot_ids: string[]
}

// 骨架屏数据
function createSkeletonData(count: number): WebhookHook[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    name: '',
    hook_key: '',
    robot_ids: [],
    message_type: 'text' as const,
    is_active: true,
    sort_order: 0,
    trigger_count: 0,
  }))
}

export function WebhookHooksContent() {
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi>()

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
  // 校区规则状态 (替代 useFieldArray)
  const [campusRobotRules, setCampusRobotRules] = useState<CampusRobotRule[]>([])

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
  const columns: ColumnProps<WebhookHook>[] = useMemo(
    () => [
      {
        title: '钩子名称',
        dataIndex: 'name',
        width: 200,
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={2} style={{ width: 160 }} />
          }
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{record.name}</span>
              </div>
              <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded w-fit">
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
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
          }
          return (
            <Text type="tertiary" size="small" ellipsis={{ showTooltip: true, rows: 2 }} style={{ maxWidth: 230 }}>
              {record.description || '-'}
            </Text>
          )
        },
      },
      {
        title: '关联机器人',
        dataIndex: 'robots',
        width: 200,
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
          }
          const hookRobots = record.robots || []
          if (hookRobots.length === 0) {
            return <Tag>未配置</Tag>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {hookRobots.slice(0, 2).map((robot) => (
                <Tag
                  key={robot.id}
                  color={robot.is_active ? 'blue' : 'grey'}
                  size="small"
                >
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
        dataIndex: 'campus_rules',
        width: 140,
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
          }
          const rules = (record.extra_config as { campus_robot_map?: CampusRobotRule[] })?.campus_robot_map || []
          if (rules.length === 0) {
            return <Tag>未配置</Tag>
          }
          return (
            <Tag color="blue" size="small">
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
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
          }
          return (
            <Tag color={record.message_type === 'markdown' ? 'blue' : 'grey'} size="small">
              {record.message_type === 'markdown' ? 'Markdown' : '文本'}
            </Tag>
          )
        },
      },
      {
        title: '触发次数',
        dataIndex: 'trigger_count',
        width: 100,
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={1} style={{ width: 48 }} />
          }
          return (
            <span className="text-sm font-medium">
              {record.trigger_count || 0}
            </span>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 80,
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={1} style={{ width: 56 }} />
          }
          return <StatusBadge isActive={record.is_active} />
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 160,
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
          }
          return formatTime(record.created_at)
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 150,
        fixed: 'right' as const,
        render: (_: unknown, record: WebhookHook) => {
          if (isSkeletonRow(record.id || '')) {
            return <Skeleton.Paragraph rows={1} style={{ width: 112 }} />
          }
          return (
            <div className="flex items-center gap-1">
              <Tooltip content="配置">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} size="small" onClick={() => handleEdit(record)} />
                </span>
              </Tooltip>
              <Tooltip content="测试">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Play className="h-4 w-4" />} size="small" onClick={() => handleTestClick(record)} />
                </span>
              </Tooltip>
              <Tooltip content="复制标识">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Copy className="h-4 w-4" />} size="small" onClick={() => handleCopyHookKey(record.hook_key)} />
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
    ],
    []
  )

  // 分页数据
  const allHooks = useMemo<WebhookHook[]>(() => data?.items ?? [], [data?.items])
  const filteredHooks = useMemo(() => {
    let result = allHooks
    if (searchValue) {
      const keyword = searchValue.toLowerCase()
      result = result.filter(
        (hook) =>
          hook.name.toLowerCase().includes(keyword) ||
          hook.hook_key.toLowerCase().includes(keyword) ||
          hook.description?.toLowerCase().includes(keyword)
      )
    }
    return result
  }, [allHooks, searchValue])

  const paginatedHooks = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredHooks.slice(start, start + pageSize)
  }, [filteredHooks, page, pageSize])

  const tableData = isLoading ? createSkeletonData(5) : paginatedHooks

  const pagination = useMemo(() => ({
    currentPage: page,
    pageSize,
    total: filteredHooks.length,
    onPageChange: setPage,
    onPageSizeChange: (s: number) => { setPageSize(s); setPage(1) },
    showSizeChanger: true,
    pageSizeOpts: [10, 20, 50, 100],
    showTotal: true,
    formatPageText: (info: { currentStart: number; currentEnd: number; total: number }) =>
      `第 ${info.currentStart}–${info.currentEnd} 条，共 ${info.total} 条`,
  }), [page, pageSize, filteredHooks.length])

  // 打开编辑对话框
  const handleEdit = (item: WebhookHook) => {
    setEditingItem(item)
    const campusRules = (item.extra_config as { campus_robot_map?: Array<{ campus_id: string; campus_name?: string; robot_ids: string[] }> })?.campus_robot_map || []
    setCampusRobotRules(campusRules.map((rule) => ({
      campus_id: rule.campus_id || '',
      robot_ids: rule.robot_ids || [],
    })))
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        hook_key: item.hook_key,
        description: item.description || '',
        robot_ids: item.robot_ids || [],
        message_template: item.message_template || '',
        message_type: item.message_type,
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
  const handleSubmit = (formData: Record<string, unknown>) => {
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
      name: formData.name as string,
      description: formData.description as string,
      robot_ids: formData.robot_ids as string[],
      message_template: formData.message_template as string,
      message_type: formData.message_type as 'text' | 'markdown',
      is_active: formData.is_active as boolean,
      sort_order: formData.sort_order as number,
      extra_config: campusRobotMap.length > 0 ? { campus_robot_map: campusRobotMap } : undefined,
    }

    updateMutation.mutate({ id: editingItem.id, data: updateData })
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
  }

  // 校区规则操作
  const handleAddCampusRule = () => {
    setCampusRobotRules(prev => [...prev, { campus_id: '', robot_ids: [] }])
  }

  const handleRemoveCampusRule = (index: number) => {
    setCampusRobotRules(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateCampusRule = (index: number, field: 'campus_id' | 'robot_ids', value: string | string[]) => {
    setCampusRobotRules(prev => prev.map((rule, i) => i === index ? { ...rule, [field]: value } : rule))
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        {/* 工具栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索钩子名称或标识..."
              style={{ width: 256 }}
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
            />
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as string)}
              style={{ width: 120 }}
              optionList={[
                { value: 'all', label: '全部状态' },
                { value: 'active', label: '启用' },
                { value: 'inactive', label: '禁用' },
              ]}
            />
            <Button theme="outline" onClick={handleSearch}>搜索</Button>
            <Button theme="borderless" type="tertiary" icon={<IconRefresh />} onClick={() => refetch()} />
          </div>
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-blue-700">钩子已预定义，点击配置按钮设置机器人和消息模板</span>
          </div>
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-hidden">
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            pagination={filteredHooks.length > 0 ? pagination : false}
            loading={false}
            empty="暂无数据"
          />
        </div>
      </div>

      {/* 编辑对话框 */}
      <Modal
        title="配置钩子"
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={updateMutation.isPending}>
              保存配置
            </Button>
          </div>
        }
        width={700}
        style={{ maxHeight: '90vh' }}
      >
        <div className="text-sm text-gray-500 mb-4">配置钩子的机器人关联和消息模板</div>
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <Tabs defaultActiveKey="basic">
            <TabPane tab="基本配置" itemKey="basic">
              <div className="mt-4 space-y-4">
                <Form.Input field="name" label="钩子名称" placeholder="钩子名称" disabled />
                <Form.Input field="hook_key" label="钩子标识" placeholder="唯一标识" disabled />
                <Form.TextArea field="description" label="描述" placeholder="钩子描述" disabled />

                <div>
                  <div className="text-sm font-medium mb-2">关联机器人</div>
                  <Form.Slot label="">
                    {({ values }: { values: Record<string, unknown> }) => (
                      <MultiSelect
                        options={robotOptions}
                        value={(values.robot_ids as string[]) || []}
                        onValueChange={(v) => formRef.current?.setValue('robot_ids', v)}
                        placeholder="选择关联的钉钉机器人"
                      />
                    )}
                  </Form.Slot>
                  <div className="text-xs text-gray-500 mt-1">选择触发此钩子时发送消息的机器人</div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">消息格式</div>
                  <Form.RadioGroup field="message_type" direction="horizontal">
                    <Radio value="text">文本</Radio>
                    <Radio value="markdown">Markdown</Radio>
                  </Form.RadioGroup>
                </div>

                <Form.TextArea
                  field="message_template"
                  label="消息模板"
                  placeholder={'消息模板，支持变量替换，如：${user} 执行了 ${action}'}
                  rows={4}
                  extraText={'支持变量替换：使用 ${变量名} 格式，如 ${user}、${time}、${data}'}
                />

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">启用状态</div>
                    <div className="text-xs text-gray-500">设置该钩子是否启用</div>
                  </div>
                  <Form.Switch field="is_active" noLabel />
                </div>
              </div>
            </TabPane>

            <TabPane
              tab={
                <span>
                  校区匹配规则
                  {campusRobotRules.length > 0 && (
                    <span className="ml-1 text-xs text-gray-400">
                      ({campusRobotRules.length})
                    </span>
                  )}
                </span>
              }
              itemKey="campus-rules"
            >
              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-700">
                    如果设置了规则，钩子会优先匹配顾问所属校区对应的机器人；
                    当没有匹配规则时，会发送给上方选择的默认机器人列表。
                  </span>
                </div>

                {campusRobotRules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="text-xs font-medium mb-1">校区</div>
                        <Select
                          value={rule.campus_id}
                          onChange={(v) => handleUpdateCampusRule(index, 'campus_id', v as string)}
                          optionList={campusOptions}
                          placeholder="选择校区"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-medium mb-1">机器人</div>
                        <MultiSelect
                          options={robotOptions}
                          value={rule.robot_ids}
                          onValueChange={(v) => handleUpdateCampusRule(index, 'robot_ids', v)}
                          placeholder="选择机器人"
                        />
                      </div>
                    </div>
                    <Button
                      theme="borderless"
                      type="tertiary"
                      icon={<X className="h-4 w-4" />}
                      size="small"
                      className="shrink-0 mt-6"
                      onClick={() => handleRemoveCampusRule(index)}
                    />
                  </div>
                ))}

                <Button
                  theme="outline"
                  size="small"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={handleAddCampusRule}
                >
                  新增匹配规则
                </Button>
              </div>
            </TabPane>
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
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>
              删除
            </Button>
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
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setTestDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={handleTestSubmit} loading={testMutation.isPending}>
              发送测试消息
            </Button>
          </div>
        }
        width={600}
      >
        <div className="text-sm text-gray-500 mb-4">
          将使用测试数据触发钩子，发送消息到配置的钉钉群
        </div>
        <div className="space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-700">将使用测试数据触发钩子，发送消息到配置的钉钉群</span>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="font-medium">钩子名称：</span>
              <span>{testingItem?.name}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium">钩子标识：</span>
              <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">
                {testingItem?.hook_key}
              </code>
            </div>
            <div className="flex gap-2">
              <span className="font-medium">关联机器人数：</span>
              <span>{testingItem?.robot_ids?.length || 0} 个</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">测试数据 (JSON格式)</div>
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
