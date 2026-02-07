/**
 * Webhook钩子配置页面
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Webhook,
  Plus,
  Pencil,
  Trash2,
  Search,
  Play,
  Copy,
  X,
  Info,
  Bot,
  Building2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { webhookHooksApi, dingtalkRobotsApi, adminApi } from '../api'
import type {
  WebhookHook,
  WebhookHookUpdate,
  DingtalkRobot,
  CampusItem,
} from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'
import { MultiSelect } from '@/components/multi-select'

// 校区机器人映射规则
interface CampusRobotRule {
  campus_id: string
  robot_ids: string[]
}

// 表单验证模式
const formSchema = z.object({
  name: z.string().min(1, '请输入钩子名称').max(50, '名称最多50个字符'),
  hook_key: z.string().min(1, '钩子标识不能为空'),
  description: z.string().max(500, '描述最多500个字符').optional(),
  robot_ids: z.array(z.string()).default([]),
  message_template: z.string().optional(),
  message_type: z.enum(['text', 'markdown']).default('text'),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).default(0),
  campus_robot_rules: z.array(z.object({
    campus_id: z.string(),
    robot_ids: z.array(z.string()),
  })).default([]),
})

type FormData = z.infer<typeof formSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): WebhookHook[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    name: '',
    hook_key: '',
    robot_ids: [],
    message_type: 'text' as const,
    is_active: true,
    sort_order: 0,
    trigger_count: 0,
  }))
}

export function WebhookHooksPage() {
  const queryClient = useQueryClient()

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

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      hook_key: '',
      description: '',
      robot_ids: [],
      message_template: '',
      message_type: 'text',
      is_active: true,
      sort_order: 0,
      campus_robot_rules: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'campus_robot_rules',
  })

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

  const robots = robotsData || []
  const campuses = campusesData?.items || []

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
      form.reset()
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
  const columns: ColumnDef<WebhookHook>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '钩子名称',
        size: 200,
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-10 w-40" />
          }
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{row.original.name}</span>
              </div>
              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
                {row.original.hook_key}
              </code>
            </div>
          )
        },
      },
      {
        accessorKey: 'description',
        header: '描述',
        size: 250,
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return (
            <span className="text-sm text-muted-foreground line-clamp-2">
              {row.original.description || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'robots',
        header: '关联机器人',
        size: 200,
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-24" />
          }
          const hookRobots = row.original.robots || []
          if (hookRobots.length === 0) {
            return <Badge variant="outline">未配置</Badge>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {hookRobots.slice(0, 2).map((robot) => (
                <Badge
                  key={robot.id}
                  variant={robot.is_active ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  <Bot className="h-3 w-3 mr-1" />
                  {robot.name}
                </Badge>
              ))}
              {hookRobots.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{hookRobots.length - 2}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        id: 'campus_rules',
        header: '校区匹配',
        size: 140,
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          const rules = (row.original.extra_config as { campus_robot_map?: CampusRobotRule[] })?.campus_robot_map || []
          if (rules.length === 0) {
            return <Badge variant="outline">未配置</Badge>
          }
          return (
            <Badge variant="secondary" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {rules.length} 条规则
            </Badge>
          )
        },
      },
      {
        accessorKey: 'message_type',
        header: '消息格式',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          return (
            <Badge variant={row.original.message_type === 'markdown' ? 'default' : 'secondary'}>
              {row.original.message_type === 'markdown' ? 'Markdown' : '文本'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'trigger_count',
        header: '触发次数',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-12" />
          }
          return (
            <span className="text-sm font-medium">
              {row.original.trigger_count || 0}
            </span>
          )
        },
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        size: 80,
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-14 rounded-full" />
          }
          return <StatusBadge isActive={row.original.is_active} />
        },
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        size: 160,
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return formatTime(row.original.created_at)
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 150,
        meta: { sticky: 'right' },
        cell: ({ row }) => {
          if (row.original.id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-28" />
          }
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(row.original)}
                title="配置"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleTestClick(row.original)}
                title="测试"
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopyHookKey(row.original.hook_key)}
                title="复制标识"
              >
                <Copy className="h-4 w-4" />
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
    []
  )

  // 分页数据
  const allHooks = data?.items || []
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

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  // 打开编辑对话框
  const handleEdit = (item: WebhookHook) => {
    setEditingItem(item)
    const campusRules = (item.extra_config as { campus_robot_map?: Array<{ campus_id: string; campus_name?: string; robot_ids: string[] }> })?.campus_robot_map || []
    form.reset({
      name: item.name,
      hook_key: item.hook_key,
      description: item.description || '',
      robot_ids: item.robot_ids || [],
      message_template: item.message_template || '',
      message_type: item.message_type,
      is_active: item.is_active,
      sort_order: item.sort_order,
      campus_robot_rules: campusRules.map((rule) => ({
        campus_id: rule.campus_id || '',
        robot_ids: rule.robot_ids || [],
      })),
    })
    setDialogOpen(true)
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
  const handleSubmit = (data: FormData) => {
    if (!editingItem?.id) return

    // 处理校区机器人映射规则
    const campusRobotMap = data.campus_robot_rules
      .filter((rule) => rule.campus_id && rule.robot_ids.length > 0)
      .map((rule) => ({
        campus_id: rule.campus_id,
        campus_name: campusOptions.find((c) => c.value === rule.campus_id)?.label,
        robot_ids: rule.robot_ids,
      }))

    const updateData: WebhookHookUpdate = {
      name: data.name,
      description: data.description,
      robot_ids: data.robot_ids,
      message_template: data.message_template,
      message_type: data.message_type,
      is_active: data.is_active,
      sort_order: data.sort_order,
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
    append({ campus_id: '', robot_ids: [] })
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">钩子配置管理</h1>
            <p className="text-sm text-muted-foreground">
              配置Webhook钩子的机器人和消息模板
            </p>
          </div>
          <Alert className="w-auto">
            <Info className="h-4 w-4" />
            <AlertDescription>
              钩子已预定义，点击配置按钮设置机器人和消息模板
            </AlertDescription>
          </Alert>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索钩子名称或标识..."
                className="pl-8"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="inactive">禁用</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              搜索
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSticky = (header.column.columnDef.meta as { sticky?: string })?.sticky === 'right'
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={isSticky ? 'sticky right-0 bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]' : ''}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const isSticky = (cell.column.columnDef.meta as { sticky?: string })?.sticky === 'right'
                      return (
                        <TableCell
                          key={cell.id}
                          className={isSticky ? 'sticky right-0 bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]' : ''}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {filteredHooks.length > 0 && (
          <SimplePagination
            page={page}
            pageSize={pageSize}
            total={filteredHooks.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>配置钩子</DialogTitle>
            <DialogDescription>
              配置钩子的机器人关联和消息模板
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
                <TabsList className="mx-6 grid w-auto grid-cols-2">
                  <TabsTrigger value="basic">基本配置</TabsTrigger>
                  <TabsTrigger value="campus-rules">
                    校区匹配规则
                    {fields.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({fields.length})
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="flex-1 overflow-y-auto px-6 mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>钩子名称</FormLabel>
                        <FormControl>
                          <Input placeholder="钩子名称" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hook_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>钩子标识</FormLabel>
                        <FormControl>
                          <Input placeholder="唯一标识" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>描述</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="钩子描述"
                            rows={2}
                            {...field}
                            disabled
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="robot_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>关联机器人</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={robotOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="选择关联的钉钉机器人"
                          />
                        </FormControl>
                        <FormDescription>
                          选择触发此钩子时发送消息的机器人
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>消息格式</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="text" id="text" />
                              <Label htmlFor="text">文本</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="markdown" id="markdown" />
                              <Label htmlFor="markdown">Markdown</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>消息模板</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="消息模板，支持变量替换，如：${user} 执行了 ${action}"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          支持变量替换：使用 {'${变量名}'} 格式，如 {'${user}'}、{'${time}'}、{'${data}'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>启用状态</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            设置该钩子是否启用
                          </div>
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
                </TabsContent>

                <TabsContent value="campus-rules" className="flex-1 overflow-y-auto px-6 mt-4 space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      如果设置了规则，钩子会优先匹配顾问所属校区对应的机器人；
                      当没有匹配规则时，会发送给上方选择的默认机器人列表。
                    </AlertDescription>
                  </Alert>

                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2 p-3 border rounded-lg">
                      <div className="flex-1 space-y-3">
                        <FormField
                          control={form.control}
                          name={`campus_robot_rules.${index}.campus_id`}
                          render={({ field: selectField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">校区</FormLabel>
                              <Select
                                value={selectField.value}
                                onValueChange={selectField.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择校区" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {campusOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`campus_robot_rules.${index}.robot_ids`}
                          render={({ field: multiField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">机器人</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={robotOptions}
                                  value={multiField.value}
                                  onValueChange={multiField.onChange}
                                  placeholder="选择机器人"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 mt-6"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCampusRule}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新增匹配规则
                  </Button>
                </TabsContent>
              </Tabs>

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
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? '保存中...' : '保存配置'}
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
              确定要删除钩子「{deletingItem?.name}」吗？此操作不可撤销。
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

      {/* 测试对话框 */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>测试钩子</DialogTitle>
            <DialogDescription>
              将使用测试数据触发钩子，发送消息到配置的钉钉群
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                将使用测试数据触发钩子，发送消息到配置的钉钉群
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="font-medium">钩子名称：</span>
                <span>{testingItem?.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium">钩子标识：</span>
                <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                  {testingItem?.hook_key}
                </code>
              </div>
              <div className="flex gap-2">
                <span className="font-medium">关联机器人数：</span>
                <span>{testingItem?.robot_ids?.length || 0} 个</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>测试数据 (JSON格式)</Label>
              <Textarea
                value={testDataString}
                onChange={(e) => setTestDataString(e.target.value)}
                rows={6}
                placeholder='{"user": "测试用户", "action": "测试动作", "time": "2024-01-01 12:00:00"}'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleTestSubmit} disabled={testMutation.isPending}>
              {testMutation.isPending ? '发送中...' : '发送测试消息'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
