/**
 * 定时任务管理页面 - Semi Design 版本
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Play,
  Timer,
  Calendar,
  History,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  AlertCircle,
  Activity,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Table, Button, Modal, Form, Tag, Typography, Switch, Tabs, TabPane } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconRefresh } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiSkeletonCell } from '@/lib/table-utils'
import { scheduledTasksApi } from '../api'
import {
  INTERVAL_PERIOD_OPTIONS,
  CRONTAB_PRESETS,
  type ScheduledTask,
  type ScheduledTaskCreate,
  type ScheduledTaskUpdate,
  type AvailableTask,
  type IntervalPeriod,
  type TaskExecutionHistory,
} from '../types'
import { formatTime } from '@/lib/utils/time'
import { ASRTaskForm } from '../components/asr-task-form'

const { Text } = Typography

// ASR 任务名称常量
const ASR_TASK_NAME = 'rmf.asr_transcribe'

// 骨架屏前缀（本页 id 为 number，无法使用共享 isSkeletonRow）
const SKELETON_PREFIX = '__skeleton__'
const isSkeletonRowByName = (name: string) => name.startsWith(SKELETON_PREFIX)

interface PaginationTextInfo {
  currentStart: number
  currentEnd: number
  total: number
}

interface ScheduledTaskFormValues {
  name: string
  task: string
  description?: string
  enabled: boolean
  interval_every?: number
  interval_period?: IntervalPeriod
  crontab_minute: string
  crontab_hour: string
  crontab_day_of_week: string
  crontab_day_of_month: string
  crontab_month_of_year: string
  queue?: string
  one_off: boolean
  args_json?: string
  kwargs_json?: string
}

function createSkeletonData(count: number): ScheduledTask[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `${SKELETON_PREFIX}${i}`,
    task: '',
    enabled: true,
    one_off: false,
    total_run_count: 0,
  }))
}

// 格式化调度信息
function formatSchedule(task: ScheduledTask): string {
  if (task.interval) {
    const periodMap: Record<string, string> = {
      seconds: '秒',
      minutes: '分钟',
      hours: '小时',
      days: '天',
    }
    return `每 ${task.interval.every} ${periodMap[task.interval.period] || task.interval.period}`
  }
  if (task.crontab) {
    const { minute, hour, day_of_week, day_of_month, month_of_year } = task.crontab
    return `${minute} ${hour} ${day_of_month} ${month_of_year} ${day_of_week}`
  }
  return '-'
}

// 获取调度类型
function getScheduleType(task: ScheduledTask): 'interval' | 'crontab' | null {
  if (task.interval) return 'interval'
  if (task.crontab) return 'crontab'
  return null
}

export function ScheduledTasksPage() {
  useDocumentTitle('定时任务')
  const queryClient = useQueryClient()

  // 顶层 Tab 状态
  const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks')

  // 分页状态
  const [tasksPagination, setTasksPagination] = useState({ page: 1, size: 20 })
  const [historyPagination, setHistoryPagination] = useState({ page: 1, size: 20 })

  // 状态管理
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [runDialogOpen, setRunDialogOpen] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduledTask | null>(null)
  const [deletingItem, setDeletingItem] = useState<ScheduledTask | null>(null)
  const [runningItem, setRunningItem] = useState<ScheduledTask | null>(null)
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null)
  const [viewingTaskName, setViewingTaskName] = useState<string>('')
  const [scheduleType, setScheduleType] = useState<'interval' | 'crontab'>('interval')
  const [asrTaskKwargs, setAsrTaskKwargs] = useState<Record<string, unknown>>({})

  // Semi Form ref
  const formRef = useRef<FormApi>()

  // 查询任务列表
  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-tasks', tasksPagination],
    queryFn: async () => {
      const response = await scheduledTasksApi.list({
        page: tasksPagination.page,
        page_size: tasksPagination.size,
      })
      return response
    },
  })

  // 查询可用任务
  const { data: availableTasksData } = useQuery({
    queryKey: ['available-tasks'],
    queryFn: async () => {
      const response = await scheduledTasksApi.getAvailableTasks()
      return response
    },
  })

  // 查询执行历史
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['execution-history', historyPagination],
    queryFn: async () => {
      const response = await scheduledTasksApi.getExecutionHistory({
        page: historyPagination.page,
        page_size: historyPagination.size,
      })
      return response
    },
    enabled: activeTab === 'history',
    refetchInterval: activeTab === 'history' ? 5000 : false,
  })

  // 查询统计数据
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['task-stats'],
    queryFn: async () => {
      const response = await scheduledTasksApi.getStats()
      return response
    },
    refetchInterval: 30000,
  })

  const tasks = useMemo(() => data?.items ?? [], [data?.items])
  const availableTasks = useMemo(() => availableTasksData?.items ?? [], [availableTasksData?.items])
  const executionHistory = useMemo(() => historyData?.items ?? [], [historyData?.items])

  // 查询任务执行结果
  const { data: taskResultData, isLoading: taskResultLoading, refetch: refetchTaskResult } = useQuery({
    queryKey: ['task-result', viewingTaskId],
    queryFn: async () => {
      if (!viewingTaskId) return null
      const response = await scheduledTasksApi.getTaskResult(viewingTaskId)
      return response
    },
    enabled: !!viewingTaskId && logDialogOpen,
    refetchInterval: (data) => {
      const status = data?.state?.data?.status
      if (status === 'PENDING' || status === 'STARTED') {
        return 2000
      }
      return false
    },
  })

  // 创建任务
  const createMutation = useMutation({
    mutationFn: (data: ScheduledTaskCreate) => scheduledTasksApi.create(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新任务
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ScheduledTaskUpdate }) =>
      scheduledTasksApi.update(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除任务
  const deleteMutation = useMutation({
    mutationFn: (id: number) => scheduledTasksApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 切换任务状态
  const toggleMutation = useMutation({
    mutationFn: (id: number) => scheduledTasksApi.toggle(id),
    onSuccess: (data) => {
      toast.success(data.enabled ? '任务已启用' : '任务已禁用')
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '操作失败')
    },
  })

  // 立即执行任务
  const runNowMutation = useMutation({
    mutationFn: (id: number) => scheduledTasksApi.runNow(id),
    onSuccess: (data) => {
      toast.success(`任务已提交执行`)
      setViewingTaskId(data.task_id)
      setViewingTaskName(runningItem?.name || '任务')
      setRunDialogOpen(false)
      setLogDialogOpen(true)
      setRunningItem(null)
      queryClient.invalidateQueries({ queryKey: ['execution-history'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '执行失败')
    },
  })

  // 监听 selectedTask
  const [selectedTask, setSelectedTask] = useState('')
  const isASRTask = selectedTask === ASR_TASK_NAME

  // 任务列表列定义
  const taskColumns: ColumnProps<ScheduledTask>[] = [
      {
        title: '任务名称',
        dataIndex: 'name',
        width: 200,
        render: (_: unknown, record: ScheduledTask) => {
          if (isSkeletonRowByName(record.name)) {
            return <SemiSkeletonCell width={128} />
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <div style={{ fontWeight: 500 }}>{record.name}</div>
                {record.description && (
                  <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }} style={{ maxWidth: 200 }}>
                    {record.description}
                  </Text>
                )}
              </div>
            </div>
          )
        },
      },
      {
        title: '任务路径',
        dataIndex: 'task',
        width: 250,
        render: (_: unknown, record: ScheduledTask) => {
          if (isSkeletonRowByName(record.name)) {
            return <SemiSkeletonCell width={160} />
          }
          return (
            <code style={{ fontSize: 12, backgroundColor: 'var(--semi-color-fill-0)', padding: '2px 8px', borderRadius: 4 }}>
              {record.task}
            </code>
          )
        },
      },
      {
        title: '调度配置',
        dataIndex: 'schedule',
        width: 180,
        render: (_: unknown, record: ScheduledTask) => {
          if (isSkeletonRowByName(record.name)) {
            return <SemiSkeletonCell width={112} />
          }
          const st = getScheduleType(record)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {st === 'interval' ? (
                <Timer className="h-4 w-4 text-orange-500" />
              ) : (
                <Calendar className="h-4 w-4 text-green-500" />
              )}
              <span style={{ fontSize: 14 }}>{formatSchedule(record)}</span>
            </div>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'enabled',
        width: 100,
        render: (_: unknown, record: ScheduledTask) => {
          if (isSkeletonRowByName(record.name)) {
            return <SemiSkeletonCell width={56} />
          }
          return (
            <Switch
              checked={record.enabled}
              onChange={() => toggleMutation.mutate(record.id)}
              disabled={toggleMutation.isPending}
              size="small"
            />
          )
        },
      },
      {
        title: '上次运行',
        dataIndex: 'last_run_at',
        width: 160,
        render: (_: unknown, record: ScheduledTask) => {
          if (isSkeletonRowByName(record.name)) {
            return <SemiSkeletonCell width={112} />
          }
          return record.last_run_at ? formatTime(record.last_run_at) : '-'
        },
      },
      {
        title: '运行次数',
        dataIndex: 'total_run_count',
        width: 100,
        render: (_: unknown, record: ScheduledTask) => {
          if (isSkeletonRowByName(record.name)) {
            return <SemiSkeletonCell width={48} />
          }
          return <Tag size="small">{record.total_run_count}</Tag>
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 150,
        fixed: 'right' as const,
        render: (_: unknown, record: ScheduledTask) => {
          if (isSkeletonRowByName(record.name)) {
            return <SemiSkeletonCell width={96} />
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Pencil className="h-4 w-4" />}
                size="small"
                onClick={() => handleEdit(record)}
              />
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Play className="h-4 w-4 text-green-500" />}
                size="small"
                onClick={() => handleRunClick(record)}
                disabled={runNowMutation.isPending}
              />
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Trash2 className="h-4 w-4" style={{ color: 'var(--semi-color-danger)' }} />}
                size="small"
                onClick={() => handleDeleteClick(record)}
              />
            </div>
          )
        },
      },
    ]

  // 执行记录列定义
  const historyColumns: ColumnProps<TaskExecutionHistory>[] = [
      {
        title: '任务名称',
        dataIndex: 'task_name',
        width: 160,
        render: (_: unknown, record: TaskExecutionHistory) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock className="h-4 w-4 text-blue-500" style={{ flexShrink: 0 }} />
            <Text ellipsis={{ showTooltip: true }} style={{ maxWidth: 130, fontWeight: 500 }}>
              {record.task_name}
            </Text>
          </div>
        ),
      },
      {
        title: '触发方式',
        dataIndex: 'trigger_type',
        width: 80,
        render: (_: unknown, record: TaskExecutionHistory) => (
          <Tag size="small" color={record.trigger_type === 'manual' ? undefined : 'blue'}>
            {record.trigger_type === 'manual' ? '手动' : '定时'}
          </Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        render: (_: unknown, record: TaskExecutionHistory) => (
          <TaskStatusBadge status={record.status} />
        ),
      },
      {
        title: '结果摘要',
        dataIndex: 'result',
        width: 200,
        render: (_: unknown, record: TaskExecutionHistory) => {
          const getResultSummary = () => {
            if (!record.result) return '-'
            const formatted = formatTaskResult(record.result)
            if (formatted) {
              const messageLine = formatted.lines.find(l => l.label === '执行结果')
              if (messageLine) return messageLine.value
            }
            return record.result.length > 50 ? record.result.slice(0, 50) + '...' : record.result
          }
          return (
            <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }} style={{ maxWidth: 180 }}>
              {getResultSummary()}
            </Text>
          )
        },
      },
      {
        title: '执行时间',
        dataIndex: 'created_at',
        width: 150,
        render: (_: unknown, record: TaskExecutionHistory) => (
          <span style={{ fontSize: 14 }}>{record.created_at ? formatTime(record.created_at) : '-'}</span>
        ),
      },
      {
        title: '耗时',
        dataIndex: 'duration',
        width: 80,
        render: (_: unknown, record: TaskExecutionHistory) => (
          <Text type="tertiary" size="small">
            {record.duration != null ? `${record.duration.toFixed(2)}s` : '-'}
          </Text>
        ),
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 60,
        render: (_: unknown, record: TaskExecutionHistory) => (
          <Button
            theme="borderless"
            type="tertiary"
            icon={<FileText className="h-4 w-4 text-blue-500" />}
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              handleViewLog(record)
            }}
          />
        ),
      },
    ]

  const taskDisplayData = isLoading ? createSkeletonData(5) : tasks

  const taskTablePagination = useMemo(() => ({
    currentPage: tasksPagination.page,
    pageSize: tasksPagination.size,
    total: data?.total || 0,
    onPageChange: (p: number) => setTasksPagination(prev => ({ ...prev, page: p })),
    onPageSizeChange: (s: number) => setTasksPagination({ page: 1, size: s }),
    showSizeChanger: true,
    pageSizeOpts: [10, 20, 50, 100],
    showTotal: true,
    formatPageText: (info: PaginationTextInfo) => `第 ${info.currentStart}–${info.currentEnd} 条，共 ${info.total} 条`,
  }), [tasksPagination.page, tasksPagination.size, data?.total])

  const historyTablePagination = useMemo(() => ({
    currentPage: historyPagination.page,
    pageSize: historyPagination.size,
    total: historyData?.total || 0,
    onPageChange: (p: number) => setHistoryPagination(prev => ({ ...prev, page: p })),
    onPageSizeChange: (s: number) => setHistoryPagination({ page: 1, size: s }),
    showSizeChanger: true,
    pageSizeOpts: [10, 20, 50, 100],
    showTotal: true,
    formatPageText: (info: PaginationTextInfo) => `第 ${info.currentStart}–${info.currentEnd} 条，共 ${info.total} 条`,
  }), [historyPagination.page, historyPagination.size, historyData?.total])

  // 打开新增对话框
  const handleCreate = () => {
    setEditingItem(null)
    setScheduleType('interval')
    setAsrTaskKwargs({})
    setSelectedTask('')
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({
        name: '',
        task: '',
        description: '',
        enabled: true,
        interval_every: 1,
        interval_period: 'hours',
        crontab_minute: '*',
        crontab_hour: '*',
        crontab_day_of_week: '*',
        crontab_day_of_month: '*',
        crontab_month_of_year: '*',
        queue: '',
        one_off: false,
        args_json: '',
        kwargs_json: '',
      })
    }, 0)
  }

  // 打开编辑对话框
  const handleEdit = (item: ScheduledTask) => {
    setEditingItem(item)
    const type = getScheduleType(item) || 'interval'
    setScheduleType(type)
    setSelectedTask(item.task)
    if (item.task === ASR_TASK_NAME && item.kwargs) {
      setAsrTaskKwargs(item.kwargs as Record<string, unknown>)
    } else {
      setAsrTaskKwargs({})
    }
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        task: item.task,
        description: item.description || '',
        enabled: item.enabled,
        interval_every: item.interval?.every || 1,
        interval_period: (item.interval?.period as IntervalPeriod) || 'hours',
        crontab_minute: item.crontab?.minute || '*',
        crontab_hour: item.crontab?.hour || '*',
        crontab_day_of_week: item.crontab?.day_of_week || '*',
        crontab_day_of_month: item.crontab?.day_of_month || '*',
        crontab_month_of_year: item.crontab?.month_of_year || '*',
        queue: item.queue || '',
        one_off: item.one_off,
        args_json: item.args ? JSON.stringify(item.args) : '',
        kwargs_json: item.kwargs ? JSON.stringify(item.kwargs) : '',
      })
    }, 0)
  }

  const handleDeleteClick = (item: ScheduledTask) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  const handleRunClick = (item: ScheduledTask) => {
    setRunningItem(item)
    setRunDialogOpen(true)
  }

  const handleRunConfirm = () => {
    if (runningItem) {
      runNowMutation.mutate(runningItem.id)
    }
  }

  const handleViewLog = (item: TaskExecutionHistory) => {
    setViewingTaskId(item.task_id)
    setViewingTaskName(item.task_name)
    setLogDialogOpen(true)
  }

  const handleApplyPreset = (preset: typeof CRONTAB_PRESETS[number]) => {
    formRef.current?.setValue('crontab_minute', preset.value.minute)
    formRef.current?.setValue('crontab_hour', preset.value.hour)
    formRef.current?.setValue('crontab_day_of_week', preset.value.day_of_week)
    formRef.current?.setValue('crontab_day_of_month', preset.value.day_of_month)
    formRef.current?.setValue('crontab_month_of_year', preset.value.month_of_year)
  }

  // 提交表单
  const handleFormSubmit = (values: ScheduledTaskFormValues) => {
    let args: unknown[] | undefined
    let kwargs: Record<string, unknown> | undefined

    if (isASRTask) {
      kwargs = asrTaskKwargs
    } else {
      if (values.args_json) {
        try {
          args = JSON.parse(values.args_json)
        } catch {
          toast.error('位置参数 JSON 格式错误')
          return
        }
      }
      if (values.kwargs_json) {
        try {
          kwargs = JSON.parse(values.kwargs_json)
        } catch {
          toast.error('关键字参数 JSON 格式错误')
          return
        }
      }
    }

    const taskData: ScheduledTaskCreate | ScheduledTaskUpdate = {
      name: values.name,
      task: values.task,
      description: values.description || undefined,
      enabled: values.enabled,
      queue: values.queue || undefined,
      one_off: values.one_off,
      args,
      kwargs,
    }

    if (scheduleType === 'interval') {
      taskData.interval = {
        every: values.interval_every || 1,
        period: values.interval_period || 'hours',
      }
    } else {
      taskData.crontab = {
        minute: values.crontab_minute,
        hour: values.crontab_hour,
        day_of_week: values.crontab_day_of_week,
        day_of_month: values.crontab_day_of_month,
        month_of_year: values.crontab_month_of_year,
      }
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: taskData })
    } else {
      createMutation.mutate(taskData as ScheduledTaskCreate)
    }
  }

  const currentTotal = activeTab === 'tasks' ? (data?.total || 0) : (historyData?.total || 0)
  const currentLoading = activeTab === 'tasks' ? isLoading : historyLoading
  const currentRefetch = activeTab === 'tasks'
    ? () => queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    : () => refetchHistory()

  return (
    <>
      <DataTableLayout
        title="定时任务管理"
        total={currentTotal}
        headerActions={
          activeTab === 'tasks' ? (
            <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
              新建任务
            </Button>
          ) : undefined
        }
        onRefresh={currentRefetch}
        isRefreshing={currentLoading}
        toolbar={
          <>
            {/* 统计卡片 */}
            {statsLoading ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SemiSkeletonCell width={64} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity className="h-4 w-4 text-blue-500" />
                  <Text type="tertiary" size="small">今日执行</Text>
                  <Text strong size="small">{statsData?.today?.total ?? 0}</Text>
                  <span style={{ marginLeft: 16, height: 16, width: 1, backgroundColor: 'var(--semi-color-border)', display: 'inline-block' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <Text type="tertiary" size="small">成功率</Text>
                  <Text strong size="small">{statsData?.today?.success_rate ?? 0}%</Text>
                  <Text type="tertiary" size="small" style={{ marginLeft: 4 }}>({statsData?.today?.success ?? 0} 成功 / {statsData?.today?.failure ?? 0} 失败)</Text>
                  <span style={{ marginLeft: 16, height: 16, width: 1, backgroundColor: 'var(--semi-color-border)', display: 'inline-block' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Timer className="h-4 w-4 text-purple-500" />
                  <Text type="tertiary" size="small">平均耗时</Text>
                  <Text strong size="small">{statsData?.today?.avg_duration ?? 0}s</Text>
                  <span style={{ marginLeft: 16, height: 16, width: 1, backgroundColor: 'var(--semi-color-border)', display: 'inline-block' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <Text type="tertiary" size="small">最近失败</Text>
                  <Text strong size="small">{statsData?.recent_failures?.length ?? 0}</Text>
                  {statsData?.recent_failures?.[0]?.task_name && (
                    <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }} style={{ maxWidth: 128 }}>
                      ({statsData.recent_failures[0].task_name})
                    </Text>
                  )}
                </div>
              </div>
            )}
          </>
        }
      >
        {/* 顶层 Tab */}
        <Tabs activeKey={activeTab} onChange={(v) => setActiveTab(v as 'tasks' | 'history')} className="flex-1 flex flex-col min-h-0">
          <TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Clock size={16}/>定时任务</span>} itemKey="tasks">
            <div style={{ marginTop: 16 }}>
              <Table
                columns={taskColumns}
                dataSource={taskDisplayData}
                rowKey="id"
                pagination={taskTablePagination}
              />
            </div>
          </TabPane>

          <TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><History size={16}/>执行记录</span>} itemKey="history">
            <div style={{ marginTop: 16 }}>
              <Table
                columns={historyColumns}
                dataSource={historyLoading ? [] : executionHistory}
                rowKey="id"
                pagination={historyTablePagination}
                loading={historyLoading}
                onRow={(record) => ({
                  onClick: () => handleViewLog(record as TaskExecutionHistory),
                  style: { cursor: 'pointer' },
                })}
              />
            </div>
          </TabPane>
        </Tabs>
      </DataTableLayout>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑任务' : '新建任务'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        width={600}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ overflow: 'auto', maxHeight: 'calc(90vh - 130px)' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => formRef.current?.submitForm()}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              保存
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleFormSubmit}
          labelPosition="top"
        >
          <Form.Input
            field="name"
            label="任务名称"
            placeholder="请输入任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          />

          <Form.Select
            field="task"
            label="任务函数"
            placeholder="请选择任务函数"
            rules={[{ required: true, message: '请选择任务' }]}
            onChange={(value) => setSelectedTask(value as string)}
            optionList={availableTasks.map((task: AvailableTask) => ({
              label: task.description ? `${task.name} - ${task.description}` : task.name,
              value: task.name,
            }))}
          />

          <Form.TextArea
            field="description"
            label="描述（可选）"
            placeholder="请输入任务描述"
            autosize={{ minRows: 2, maxRows: 4 }}
          />

          {/* 调度配置 */}
          <div style={{ marginTop: 8 }}>
            <Text strong size="small">调度配置</Text>
            <Tabs
              activeKey={scheduleType}
              onChange={(v) => setScheduleType(v as 'interval' | 'crontab')}
              style={{ marginTop: 8 }}
            >
              <TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Timer size={16}/>间隔调度</span>} itemKey="interval">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <span style={{ fontSize: 14 }}>每</span>
                  <Form.InputNumber
                    field="interval_every"
                    noLabel
                    min={1}
                    style={{ width: 120 }}
                  />
                  <Form.Select
                    field="interval_period"
                    noLabel
                    style={{ width: 120 }}
                    optionList={INTERVAL_PERIOD_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
                  />
                  <span style={{ fontSize: 14 }}>执行一次</span>
                </div>
              </TabPane>

              <TabPane tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Calendar size={16}/>Crontab</span>} itemKey="crontab">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CRONTAB_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="tertiary"
                        theme="outline"
                        size="small"
                        onClick={() => handleApplyPreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    <Form.Input field="crontab_minute" label="分钟" placeholder="*" labelPosition="top" />
                    <Form.Input field="crontab_hour" label="小时" placeholder="*" labelPosition="top" />
                    <Form.Input field="crontab_day_of_month" label="日期" placeholder="*" labelPosition="top" />
                    <Form.Input field="crontab_month_of_year" label="月份" placeholder="*" labelPosition="top" />
                    <Form.Input field="crontab_day_of_week" label="星期" placeholder="*" labelPosition="top" />
                  </div>
                  <Text type="tertiary" size="small">
                    格式：分钟(0-59) 小时(0-23) 日期(1-31) 月份(1-12) 星期(0-6，0=周日)
                  </Text>
                </div>
              </TabPane>
            </Tabs>
          </div>

          {/* 高级选项 */}
          <div style={{ borderTop: '1px solid var(--semi-color-border)', marginTop: 16, paddingTop: 16 }}>
            <Text strong size="small">高级选项</Text>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--semi-color-border)', borderRadius: 8, padding: 12, marginTop: 12 }}>
              <div>
                <Text strong size="small">启用任务</Text>
                <Text type="tertiary" size="small" style={{ display: 'block' }}>任务创建后是否立即启用</Text>
              </div>
              <Form.Switch field="enabled" noLabel />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--semi-color-border)', borderRadius: 8, padding: 12, marginTop: 8 }}>
              <div>
                <Text strong size="small">一次性任务</Text>
                <Text type="tertiary" size="small" style={{ display: 'block' }}>执行一次后自动禁用</Text>
              </div>
              <Form.Switch field="one_off" noLabel />
            </div>

            <Form.Input
              field="queue"
              label="任务队列（可选）"
              placeholder="默认队列"
              style={{ marginTop: 12 }}
            />

            {isASRTask ? (
              <div style={{ borderRadius: 8, border: '1px solid var(--semi-color-primary-light-default)', padding: 16, marginTop: 12, backgroundColor: 'rgba(var(--semi-blue-0), 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--semi-color-primary)' }}>
                  <Clock className="h-4 w-4" />
                  <Text strong size="small">ASR 任务参数</Text>
                </div>
                <ASRTaskForm
                  initialValues={editingItem?.kwargs as Record<string, unknown> | undefined}
                  onChange={setAsrTaskKwargs}
                />
              </div>
            ) : (
              <>
                <Form.Input
                  field="args_json"
                  label="位置参数（可选，JSON 数组）"
                  placeholder='例如：["arg1", "arg2"]'
                  style={{ marginTop: 12 }}
                />
                <Form.Input
                  field="kwargs_json"
                  label="关键字参数（可选，JSON 对象）"
                  placeholder='例如：{"key": "value"}'
                />
              </>
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
            <Button
              theme="solid"
              type="danger"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          </div>
        }
      >
        确定要删除定时任务「{deletingItem?.name}」吗？此操作不可撤销。
      </Modal>

      {/* 执行确认对话框 */}
      <Modal
        title="确认执行"
        visible={runDialogOpen}
        onCancel={() => setRunDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setRunDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={handleRunConfirm}
              loading={runNowMutation.isPending}
            >
              确认执行
            </Button>
          </div>
        }
      >
        确定要立即执行任务「{runningItem?.name}」吗？
      </Modal>

      {/* 任务执行日志对话框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText className="h-5 w-5" />
            任务执行日志
          </div>
        }
        visible={logDialogOpen}
        onCancel={() => {
          setLogDialogOpen(false)
          setViewingTaskId(null)
          setViewingTaskName('')
        }}
        width={600}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button theme="outline" icon={<IconRefresh />} onClick={() => refetchTaskResult()}>
              刷新
            </Button>
            <Button theme="solid" type="primary" onClick={() => setLogDialogOpen(false)}>关闭</Button>
          </div>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
          {viewingTaskName} - {viewingTaskId}
        </Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 执行状态 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text type="tertiary" size="small">执行状态：</Text>
            {taskResultLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TaskStatusBadge status={taskResultData?.status} />
            )}
          </div>

          {/* 完成时间 */}
          {taskResultData?.date_done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text type="tertiary" size="small">完成时间：</Text>
              <span style={{ fontSize: 14 }}>{formatTime(taskResultData.date_done)}</span>
            </div>
          )}

          {/* 执行结果 */}
          {taskResultData?.result && (() => {
            const formatted = formatTaskResult(taskResultData.result)
            if (formatted) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Text strong size="small">执行详情：</Text>
                  <div style={{ borderRadius: 6, border: '1px solid var(--semi-color-border)', backgroundColor: 'var(--semi-color-fill-0)', padding: 16 }}>
                    {formatted.lines.map((line, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, marginBottom: index < formatted.lines.length - 1 ? 8 : 0 }}>
                        <Text type="tertiary" style={{ minWidth: 80 }}>{line.label}：</Text>
                        <span style={{
                          color: line.type === 'success' ? 'var(--semi-color-success)' :
                            line.type === 'error' ? 'var(--semi-color-danger)' :
                            line.type === 'warning' ? 'var(--semi-color-warning)' : undefined,
                          fontWeight: (line.type === 'success' || line.type === 'error') ? 500 : undefined,
                        }}>
                          {line.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Text type="tertiary" size="small">执行结果：</Text>
                <div style={{ height: 200, overflow: 'auto', borderRadius: 6, border: '1px solid var(--semi-color-border)', backgroundColor: 'var(--semi-color-fill-0)', padding: 12 }}>
                  <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', margin: 0 }}>
                    {taskResultData.result}
                  </pre>
                </div>
              </div>
            )
          })()}

          {/* 错误信息 */}
          {taskResultData?.traceback && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--semi-color-danger)' }}>
                <AlertCircle className="h-4 w-4" />
                <Text size="small" style={{ color: 'var(--semi-color-danger)' }}>错误信息：</Text>
              </div>
              <div style={{ height: 200, overflow: 'auto', borderRadius: 6, border: '1px solid var(--semi-color-danger-light-default)', backgroundColor: 'rgba(var(--semi-red-0), 0.3)', padding: 12 }}>
                <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--semi-color-danger)', margin: 0 }}>
                  {taskResultData.traceback}
                </pre>
              </div>
            </div>
          )}

          {/* 轮询提示 */}
          {(taskResultData?.status === 'PENDING' || taskResultData?.status === 'STARTED') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <Text type="tertiary" size="small">任务执行中，自动更新状态...</Text>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

/**
 * 格式化任务执行结果为人类可读格式
 */
function formatTaskResult(result: string | null | undefined): { lines: Array<{ label: string; value: string; type?: 'success' | 'info' | 'warning' | 'error' }> } | null {
  if (!result) return null

  try {
    const normalized = result
      .replace(/'/g, '"')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false')
      .replace(/None/g, 'null')

    const data = JSON.parse(normalized)
    const lines: Array<{ label: string; value: string; type?: 'success' | 'info' | 'warning' | 'error' }> = []

    if (typeof data.success === 'boolean') {
      lines.push({
        label: '执行状态',
        value: data.success ? '成功' : '失败',
        type: data.success ? 'success' : 'error'
      })
    }

    if (data.message) {
      lines.push({ label: '执行结果', value: data.message, type: 'info' })
    }

    if (data.time_range) {
      const { start, end } = data.time_range
      if (start && end) {
        lines.push({ label: '时间范围', value: `${start} ~ ${end}`, type: 'info' })
      }
    }

    if (typeof data.total_fetched === 'number') {
      lines.push({ label: '获取记录数', value: `${data.total_fetched} 条` })
    }
    if (typeof data.total_inserted === 'number') {
      lines.push({
        label: '新增记录',
        value: `${data.total_inserted} 条`,
        type: data.total_inserted > 0 ? 'success' : 'info'
      })
    }
    if (typeof data.total_skipped === 'number') {
      lines.push({ label: '跳过记录', value: `${data.total_skipped} 条（已存在）` })
    }

    if (typeof data.success_count === 'number' && typeof data.failed_count === 'number') {
      lines.push({ label: '成功数', value: `${data.success_count} 个`, type: 'success' })
      if (data.failed_count > 0) {
        lines.push({ label: '失败数', value: `${data.failed_count} 个`, type: 'error' })
      }
    }

    if (typeof data.timeout_count === 'number') {
      lines.push({ label: '清理数量', value: `${data.timeout_count} 条` })
    }
    if (typeof data.cleaned_count === 'number') {
      lines.push({ label: '清理数量', value: `${data.cleaned_count} 条` })
    }

    if (data.synced_at || data.refreshed_at || data.cleaned_at) {
      const timestamp = data.synced_at || data.refreshed_at || data.cleaned_at
      const date = new Date(timestamp)
      lines.push({
        label: '执行时间',
        value: date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      })
    }

    return lines.length > 0 ? { lines } : null
  } catch {
    return null
  }
}

/**
 * 任务状态徽章组件 - Semi Tag 版本
 */
function TaskStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case 'SUCCESS':
      return (
        <Tag color="green" size="small">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle className="h-3 w-3" />
            成功
          </span>
        </Tag>
      )
    case 'FAILURE':
      return (
        <Tag color="red" size="small">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircle className="h-3 w-3" />
            失败
          </span>
        </Tag>
      )
    case 'PENDING':
      return (
        <Tag size="small">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock className="h-3 w-3" />
            等待中
          </span>
        </Tag>
      )
    case 'STARTED':
      return (
        <Tag color="blue" size="small">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Loader2 className="h-3 w-3 animate-spin" />
            执行中
          </span>
        </Tag>
      )
    case 'RETRY':
      return (
        <Tag size="small">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconRefresh size="extra-small" />
            重试中
          </span>
        </Tag>
      )
    case 'REVOKED':
      return (
        <Tag size="small">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircle className="h-3 w-3" />
            已撤销
          </span>
        </Tag>
      )
    default:
      return (
        <Tag size="small">未知</Tag>
      )
  }
}
