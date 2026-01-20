/**
 * 定时任务管理页面
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { scheduledTasksApi } from '../api'
import type {
  ScheduledTask,
  ScheduledTaskCreate,
  ScheduledTaskUpdate,
  AvailableTask,
  IntervalPeriod,
  TaskExecutionHistory,
} from '../types'
import { INTERVAL_PERIOD_OPTIONS, CRONTAB_PRESETS } from '../types'
import { formatTime } from '@/lib/utils/time'

// 表单验证模式
const formSchema = z.object({
  name: z.string().min(1, '请输入任务名称').max(100, '名称最多100个字符'),
  task: z.string().min(1, '请选择任务'),
  description: z.string().default(''),
  enabled: z.boolean().default(true),
  schedule_type: z.enum(['interval', 'crontab']).default('interval'),
  // Interval 配置
  interval_every: z.coerce.number().int().min(1, '间隔值必须大于0').default(1),
  interval_period: z.enum(['seconds', 'minutes', 'hours', 'days']).default('hours'),
  // Crontab 配置
  crontab_minute: z.string().default('*'),
  crontab_hour: z.string().default('*'),
  crontab_day_of_week: z.string().default('*'),
  crontab_day_of_month: z.string().default('*'),
  crontab_month_of_year: z.string().default('*'),
  // 高级配置
  queue: z.string().default(''),
  one_off: z.boolean().default(false),
  args_json: z.string().default(''),
  kwargs_json: z.string().default(''),
})

type FormData = z.infer<typeof formSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
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
  const queryClient = useQueryClient()

  // 顶层 Tab 状态
  const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks')

  // 状态管理
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [runDialogOpen, setRunDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduledTask | null>(null)
  const [deletingItem, setDeletingItem] = useState<ScheduledTask | null>(null)
  const [runningItem, setRunningItem] = useState<ScheduledTask | null>(null)
  const [scheduleType, setScheduleType] = useState<'interval' | 'crontab'>('interval')

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      task: '',
      description: '',
      enabled: true,
      schedule_type: 'interval',
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
    },
  })

  // 查询任务列表
  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-tasks'],
    queryFn: async () => {
      const response = await scheduledTasksApi.list()
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
    queryKey: ['execution-history'],
    queryFn: async () => {
      const response = await scheduledTasksApi.getExecutionHistory()
      return response
    },
    enabled: activeTab === 'history',
  })

  const tasks = data?.items || []
  const availableTasks = availableTasksData?.items || []
  const executionHistory = historyData?.items || []

  // 创建任务
  const createMutation = useMutation({
    mutationFn: (data: ScheduledTaskCreate) => scheduledTasksApi.create(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败')
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
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败')
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
      toast.error(error.message || '删除失败')
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
      toast.error(error.message || '操作失败')
    },
  })

  // 立即执行任务
  const runNowMutation = useMutation({
    mutationFn: (id: number) => scheduledTasksApi.runNow(id),
    onSuccess: (data) => {
      toast.success(`任务已提交执行，任务ID: ${data.task_id}`)
      setRunDialogOpen(false)
      setRunningItem(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || '执行失败')
    },
  })

  // 列定义
  const columns: ColumnDef<ScheduledTask>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '任务名称',
        size: 200,
        cell: ({ row }) => {
          if (row.original.name.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">{row.original.name}</div>
                {row.original.description && (
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {row.original.description}
                  </div>
                )}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'task',
        header: '任务路径',
        size: 250,
        cell: ({ row }) => {
          if (row.original.name.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-40" />
          }
          return (
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {row.original.task}
            </code>
          )
        },
      },
      {
        accessorKey: 'schedule',
        header: '调度配置',
        size: 180,
        cell: ({ row }) => {
          if (row.original.name.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-28" />
          }
          const scheduleType = getScheduleType(row.original)
          return (
            <div className="flex items-center gap-2">
              {scheduleType === 'interval' ? (
                <Timer className="h-4 w-4 text-orange-500" />
              ) : (
                <Calendar className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm">{formatSchedule(row.original)}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'enabled',
        header: '状态',
        size: 100,
        cell: ({ row }) => {
          if (row.original.name.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-14 rounded-full" />
          }
          return (
            <Switch
              checked={row.original.enabled}
              onCheckedChange={() => toggleMutation.mutate(row.original.id)}
              disabled={toggleMutation.isPending}
            />
          )
        },
      },
      {
        accessorKey: 'last_run_at',
        header: '上次运行',
        size: 160,
        cell: ({ row }) => {
          if (row.original.name.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-28" />
          }
          return row.original.last_run_at
            ? formatTime(row.original.last_run_at)
            : '-'
        },
      },
      {
        accessorKey: 'total_run_count',
        header: '运行次数',
        size: 100,
        cell: ({ row }) => {
          if (row.original.name.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-12" />
          }
          return (
            <Badge variant="secondary">{row.original.total_run_count}</Badge>
          )
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 150,
        cell: ({ row }) => {
          if (row.original.name.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-24" />
          }
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(row.original)}
                title="编辑"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRunClick(row.original)}
                disabled={runNowMutation.isPending}
                title="立即执行"
              >
                <Play className="h-4 w-4 text-green-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(row.original)}
                title="删除"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )
        },
      },
    ],
    [toggleMutation.isPending, runNowMutation.isPending]
  )

  // 表格数据
  const tableData = isLoading ? createSkeletonData(5) : tasks

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  })

  // 打开新增对话框
  const handleCreate = () => {
    setEditingItem(null)
    setScheduleType('interval')
    form.reset({
      name: '',
      task: '',
      description: '',
      enabled: true,
      schedule_type: 'interval',
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
    setDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (item: ScheduledTask) => {
    setEditingItem(item)
    const type = getScheduleType(item) || 'interval'
    setScheduleType(type)
    form.reset({
      name: item.name,
      task: item.task,
      description: item.description || '',
      enabled: item.enabled,
      schedule_type: type,
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
    setDialogOpen(true)
  }

  // 点击删除按钮
  const handleDeleteClick = (item: ScheduledTask) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 点击执行按钮
  const handleRunClick = (item: ScheduledTask) => {
    setRunningItem(item)
    setRunDialogOpen(true)
  }

  // 确认执行
  const handleRunConfirm = () => {
    if (runningItem) {
      runNowMutation.mutate(runningItem.id)
    }
  }

  // 应用 Crontab 预设
  const handleApplyPreset = (preset: typeof CRONTAB_PRESETS[number]) => {
    form.setValue('crontab_minute', preset.value.minute)
    form.setValue('crontab_hour', preset.value.hour)
    form.setValue('crontab_day_of_week', preset.value.day_of_week)
    form.setValue('crontab_day_of_month', preset.value.day_of_month)
    form.setValue('crontab_month_of_year', preset.value.month_of_year)
  }

  // 提交表单
  const handleSubmit = (data: FormData) => {
    // 解析 JSON 参数
    let args: unknown[] | undefined
    let kwargs: Record<string, unknown> | undefined

    if (data.args_json) {
      try {
        args = JSON.parse(data.args_json)
      } catch {
        toast.error('位置参数 JSON 格式错误')
        return
      }
    }

    if (data.kwargs_json) {
      try {
        kwargs = JSON.parse(data.kwargs_json)
      } catch {
        toast.error('关键字参数 JSON 格式错误')
        return
      }
    }

    const taskData: ScheduledTaskCreate | ScheduledTaskUpdate = {
      name: data.name,
      task: data.task,
      description: data.description || undefined,
      enabled: data.enabled,
      queue: data.queue || undefined,
      one_off: data.one_off,
      args,
      kwargs,
    }

    // 根据调度类型设置配置
    if (scheduleType === 'interval') {
      taskData.interval = {
        every: data.interval_every || 1,
        period: data.interval_period || 'hours',
      }
    } else {
      taskData.crontab = {
        minute: data.crontab_minute,
        hour: data.crontab_hour,
        day_of_week: data.crontab_day_of_week,
        day_of_month: data.crontab_day_of_month,
        month_of_year: data.crontab_month_of_year,
      }
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: taskData })
    } else {
      createMutation.mutate(taskData as ScheduledTaskCreate)
    }
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">定时任务管理</h1>
            <p className="text-sm text-muted-foreground">
              管理 Celery Beat 定时任务
            </p>
          </div>
          {activeTab === 'tasks' && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              新建任务
            </Button>
          )}
          {activeTab === 'history' && (
            <Button variant="outline" onClick={() => refetchHistory()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          )}
        </div>

        {/* 顶层 Tab */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tasks' | 'history')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-fit">
            <TabsTrigger value="tasks" className="gap-2">
              <Clock className="h-4 w-4" />
              定时任务
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              执行记录
            </TabsTrigger>
          </TabsList>

          {/* 定时任务 Tab */}
          <TabsContent value="tasks" className="flex-1 mt-4 min-h-0">
            <div className="h-full overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} style={{ width: header.getSize() }}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        暂无定时任务
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* 执行记录 Tab */}
          <TabsContent value="history" className="flex-1 mt-4 min-h-0">
            <div className="h-full overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 200 }}>任务名称</TableHead>
                    <TableHead style={{ width: 250 }}>任务路径</TableHead>
                    <TableHead style={{ width: 100 }}>状态</TableHead>
                    <TableHead style={{ width: 160 }}>最后执行时间</TableHead>
                    <TableHead style={{ width: 100 }}>执行次数</TableHead>
                    <TableHead style={{ width: 160 }}>最后修改时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      </TableRow>
                    ))
                  ) : executionHistory.length > 0 ? (
                    executionHistory.map((item: TaskExecutionHistory) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {item.task}
                          </code>
                        </TableCell>
                        <TableCell>
                          {item.enabled ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              启用
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              禁用
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.last_run_at ? formatTime(item.last_run_at) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.total_run_count}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.date_changed ? formatTime(item.date_changed) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        暂无执行记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editingItem ? '编辑任务' : '新建任务'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '修改定时任务配置' : '创建一个新的定时任务'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
                {/* 基本信息 */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>任务名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入任务名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="task"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>任务函数</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择任务函数" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTasks.map((task: AvailableTask) => (
                            <SelectItem key={task.name} value={task.name}>
                              <div>
                                <div className="font-medium">{task.name}</div>
                                {task.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {task.description}
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>描述（可选）</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="请输入任务描述"
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 调度配置 */}
                <div className="space-y-3">
                  <FormLabel>调度配置</FormLabel>
                  <Tabs
                    value={scheduleType}
                    onValueChange={(v) => setScheduleType(v as 'interval' | 'crontab')}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="interval">
                        <Timer className="h-4 w-4 mr-2" />
                        间隔调度
                      </TabsTrigger>
                      <TabsTrigger value="crontab">
                        <Calendar className="h-4 w-4 mr-2" />
                        Crontab
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="interval" className="space-y-3 mt-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">每</span>
                        <FormField
                          control={form.control}
                          name="interval_every"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(parseInt(e.target.value) || 1)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="interval_period"
                          render={({ field }) => (
                            <FormItem className="w-32">
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {INTERVAL_PERIOD_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <span className="text-sm">执行一次</span>
                      </div>
                    </TabsContent>

                    <TabsContent value="crontab" className="space-y-3 mt-3">
                      {/* 预设模板 */}
                      <div className="flex flex-wrap gap-2">
                        {CRONTAB_PRESETS.map((preset) => (
                          <Button
                            key={preset.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplyPreset(preset)}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>

                      {/* Crontab 字段 */}
                      <div className="grid grid-cols-5 gap-2">
                        <FormField
                          control={form.control}
                          name="crontab_minute"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">分钟</FormLabel>
                              <FormControl>
                                <Input placeholder="*" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crontab_hour"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">小时</FormLabel>
                              <FormControl>
                                <Input placeholder="*" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crontab_day_of_month"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">日期</FormLabel>
                              <FormControl>
                                <Input placeholder="*" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crontab_month_of_year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">月份</FormLabel>
                              <FormControl>
                                <Input placeholder="*" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crontab_day_of_week"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">星期</FormLabel>
                              <FormControl>
                                <Input placeholder="*" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        格式：分钟(0-59) 小时(0-23) 日期(1-31) 月份(1-12) 星期(0-6，0=周日)
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* 高级选项 */}
                <div className="space-y-3 pt-2 border-t">
                  <FormLabel>高级选项</FormLabel>

                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>启用任务</FormLabel>
                          <FormDescription>
                            任务创建后是否立即启用
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="one_off"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>一次性任务</FormLabel>
                          <FormDescription>
                            执行一次后自动禁用
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="queue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>任务队列（可选）</FormLabel>
                        <FormControl>
                          <Input placeholder="默认队列" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="args_json"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>位置参数（可选，JSON 数组）</FormLabel>
                        <FormControl>
                          <Input placeholder='例如：["arg1", "arg2"]' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="kwargs_json"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>关键字参数（可选，JSON 对象）</FormLabel>
                        <FormControl>
                          <Input placeholder='例如：{"key": "value"}' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? '保存中...'
                    : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除定时任务「{deletingItem?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 执行确认对话框 */}
      <AlertDialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认执行</AlertDialogTitle>
            <AlertDialogDescription>
              确定要立即执行任务「{runningItem?.name}」吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRunConfirm}>
              {runNowMutation.isPending ? '执行中...' : '确认执行'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
