/**
 * 来源渠道管理页面
 */

import { useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Share2, Filter, X, Settings2, RefreshCw, Copy, Link, Bot, Bell } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import adminApi, { sourceChannelApi, dingtalkRobotsApi } from '../api'
import type { SourceChannel, DingtalkRobot } from '../types'
import { StatusBadge, SourceChannelCategoryBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'

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

// 额外字段选项的 schema
const fieldOptionSchema = z.object({
  label: z.string().min(1, '请输入选项标签'),
  value: z.string().min(1, '请输入选项值'),
})

// 额外字段的 schema
const extraFieldSchema = z.object({
  field_name: z.string().min(1, '请输入字段名称'),
  field_label: z.string().min(1, '请输入字段标签'),
  field_type: z.enum(['text', 'number', 'date', 'datetime', 'select', 'textarea']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(fieldOptionSchema).optional(),
})

// 表单验证 schema
const formSchema = z.object({
  name: z.string().min(1, '请输入渠道名称').max(50, '渠道名称不能超过50个字符'),
  category: z.enum(['ONLINE', 'OFFLINE', 'REFERRAL', 'EVENT', 'OTHER']),
  description: z.string().max(200, '描述不能超过200个字符').optional(),
  sort_order: z.number().min(0, '排序值不能小于0').default(0),
  is_active: z.boolean().default(true),
  extra_fields: z.array(extraFieldSchema).default([]),
  // 快速录入 & 钉钉通知配置
  channel_config: z.object({
    submit_campus_id: z.string().optional(),
    dingtalk_notify: z.object({
      enabled: z.boolean().default(false),
      robot_id: z.string().nullable().optional(),
      notify_on_submit: z.boolean().default(true),
      notify_on_collision: z.boolean().default(false),
    }).default({
      enabled: false,
      robot_id: null,
      notify_on_submit: true,
      notify_on_collision: false,
    }),
  }).default({}),
})

type FormData = z.infer<typeof formSchema>

const pageSize = 20

export function SourceChannelsPage() {
  useDocumentTitle('来源渠道管理')
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SourceChannel | null>(null)
  const [deletingItem, setDeletingItem] = useState<SourceChannel | null>(null)

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: 'ONLINE',
      description: '',
      sort_order: 0,
      is_active: true,
      extra_fields: [],
      channel_config: {
        submit_campus_id: '',
        dingtalk_notify: {
          enabled: false,
          robot_id: null,
          notify_on_submit: true,
          notify_on_collision: false,
        },
      },
    },
  })

  // 额外字段数组管理
  const { fields: extraFields, append: appendExtraField, remove: removeExtraField } = useFieldArray({
    control: form.control,
    name: 'extra_fields',
  })

  // 获取来源渠道列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-source-channels', page, pageSize, searchValue, statusFilter, categoryFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (searchValue) {
        params.search = searchValue
      }
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active'
      }
      if (categoryFilter !== 'all') {
        params.category = categoryFilter
      }
      const response = await sourceChannelApi.getChannelsPaginated(params)
      return response
    },
  })

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

  // 获取员工列表（用于选择添加令牌的员工）
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-simple-for-token'],
    queryFn: async () => {
      const res = await adminApi.getEmployees({ size: 200, is_active: true })
      return res?.data?.items || []
    },
    enabled: dialogOpen,
  })

  // 添加员工令牌状态
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

  // 添加员工令牌
  const addTokenMutation = useMutation({
    mutationFn: ({ channelId, employeeId, employeeName }: { channelId: string; employeeId: string; employeeName: string }) =>
      sourceChannelApi.addSubmitToken(channelId, employeeId, employeeName),
    onSuccess: () => {
      toast.success('令牌已添加')
      setSelectedEmployeeId('')
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
      // 刷新编辑项数据
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
    mutationFn: (data: FormData) => sourceChannelApi.createChannel(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新来源渠道
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      sourceChannelApi.updateChannel(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
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

  // 判断是否为骨架屏数据
  const isSkeleton = (id?: string) => id?.startsWith('__skeleton__') ?? false

  // 表格列定义
  const columns: ColumnDef<SourceChannel>[] = [
    {
      accessorKey: 'name',
      header: '渠道名称',
      cell: ({ row }) => {
        if (isSkeleton(row.original.id)) {
          return <Skeleton className="h-4 w-24" />
        }
        return (
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-indigo-500" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'category',
      header: '分类',
      cell: ({ row }) => {
        if (isSkeleton(row.original.id)) {
          return <Skeleton className="h-5 w-16" />
        }
        return <SourceChannelCategoryBadge category={row.original.category?.toUpperCase() || 'OTHER'} />
      },
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => {
        if (isSkeleton(row.original.id)) {
          return <Skeleton className="h-4 w-32" />
        }
        return row.original.description || '-'
      },
    },
    {
      accessorKey: 'extra_fields',
      header: '额外字段',
      cell: ({ row }) => {
        if (isSkeleton(row.original.id)) {
          return <Skeleton className="h-4 w-8" />
        }
        const fields = row.original.extra_fields || row.original.channel_config?.fields || []
        return fields.length > 0 ? `${fields.length} 个` : '-'
      },
    },
    {
      accessorKey: 'sort_order',
      header: '排序',
      cell: ({ row }) => {
        if (isSkeleton(row.original.id)) {
          return <Skeleton className="h-4 w-8" />
        }
        return row.original.sort_order ?? 0
      },
    },
    {
      accessorKey: 'is_active',
      header: '状态',
      cell: ({ row }) => {
        if (isSkeleton(row.original.id)) {
          return <Skeleton className="h-5 w-14" />
        }
        return <StatusBadge isActive={row.original.is_active ?? true} />
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        if (isSkeleton(row.original.id)) {
          return (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          )
        }
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteClick(row.original)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      },
    },
  ]

  // 生成骨架屏数据
  const skeletonData: SourceChannel[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `__skeleton__${i}`,
        name: '',
        category: 'online' as const,
        is_active: true,
        sort_order: 0,
      })),
    []
  )

  const tableData = isLoading ? skeletonData : (data?.items || [])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    form.reset({
      name: '',
      category: 'ONLINE',
      description: '',
      sort_order: 0,
      is_active: true,
      extra_fields: [],
      channel_config: {
        submit_campus_id: '',
        dingtalk_notify: {
          enabled: false,
          robot_id: null,
          notify_on_submit: true,
          notify_on_collision: false,
        },
      },
    })
    setDialogOpen(true)
  }

  // 处理编辑
  const handleEdit = (item: SourceChannel) => {
    setEditingItem(item)
    // 获取额外字段数据，兼容多种格式
    let extraFieldsData: FormData['extra_fields'] = []
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

    const config = item.channel_config || {}
    form.reset({
      name: item.name,
      category: (item.category?.toUpperCase() || 'ONLINE') as FormData['category'],
      description: item.description || '',
      sort_order: item.sort_order,
      is_active: item.is_active,
      extra_fields: extraFieldsData,
      channel_config: {
        submit_campus_id: config.submit_campus_id || '',
        dingtalk_notify: {
          enabled: config.dingtalk_notify?.enabled || false,
          robot_id: config.dingtalk_notify?.robot_id || null,
          notify_on_submit: config.dingtalk_notify?.notify_on_submit ?? true,
          notify_on_collision: config.dingtalk_notify?.notify_on_collision ?? false,
        },
      },
    })
    setDialogOpen(true)
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
  const handleSubmit = (data: FormData) => {
    // 过滤掉无效的额外字段（必须有 field_name 和 field_label）
    const submitData = {
      ...data,
      extra_fields: data.extra_fields.filter(
        field => field.field_name.trim() && field.field_label.trim()
      ).map(field => ({
        ...field,
        options: field.field_type === 'select' ? field.options : undefined,
      })),
      channel_config: {
        ...(data.channel_config || {}),
        submit_campus_id: data.channel_config?.submit_campus_id || undefined,
      },
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: submitData,
      })
    } else {
      createMutation.mutate(submitData)
    }
  }

  // 添加员工令牌
  const handleAddEmployeeToken = () => {
    if (!editingItem || !selectedEmployeeId) return
    const emp = employees.find((e: { id: string }) => e.id === selectedEmployeeId)
    if (!emp) return
    addTokenMutation.mutate({
      channelId: editingItem.id,
      employeeId: emp.id,
      employeeName: (emp as { id: string; name: string }).name,
    })
  }

  // 复制员工录入链接
  const handleCopyTokenLink = (token: string) => {
    const link = `${window.location.origin}/lead-submit?token=${token}`
    navigator.clipboard.writeText(link)
    toast.success('链接已复制到剪贴板')
  }

  // 添加新的额外字段
  const handleAddExtraField = () => {
    appendExtraField({
      field_name: '',
      field_label: '',
      field_type: 'text',
      required: false,
      placeholder: '',
      options: [],
    })
  }

  // 为选择框添加选项
  const handleAddOption = (fieldIndex: number) => {
    const currentOptions = form.getValues(`extra_fields.${fieldIndex}.options`) || []
    form.setValue(`extra_fields.${fieldIndex}.options`, [
      ...currentOptions,
      { label: '', value: '' },
    ])
  }

  // 移除选择框选项
  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`extra_fields.${fieldIndex}.options`) || []
    form.setValue(
      `extra_fields.${fieldIndex}.options`,
      currentOptions.filter((_, i) => i !== optionIndex)
    )
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">来源渠道管理</h1>
            <p className="text-sm text-muted-foreground">
              管理线索来源渠道配置，支持线上、线下、推荐等多种渠道类型
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建渠道
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索渠道名称..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="筛选分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {CHANNEL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">已启用</SelectItem>
                <SelectItem value="inactive">已停用</SelectItem>
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
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
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
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {totalPages > 0 && (
          <SimplePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {editingItem ? '编辑来源渠道' : '新建来源渠道'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? '修改来源渠道信息'
                : '创建一个新的来源渠道'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
                <TabsList className="mx-6 mt-2 grid w-auto grid-cols-4">
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  <TabsTrigger value="submit-config">
                    <Link className="mr-1 h-3 w-3" />
                    快速录入
                  </TabsTrigger>
                  <TabsTrigger value="dingtalk-notify">
                    <Bell className="mr-1 h-3 w-3" />
                    钉钉通知
                  </TabsTrigger>
                  <TabsTrigger value="extra-fields">
                    额外字段
                    {extraFields.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({extraFields.length})
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* 基本信息 Tab */}
                <TabsContent value="basic" className="flex-1 overflow-y-auto px-6 mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>渠道名称</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入渠道名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>渠道分类</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择渠道分类" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CHANNEL_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
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
                        <FormLabel>描述</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="请输入描述（可选）"
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>排序值</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="请输入排序值"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
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
                            设置该渠道是否启用
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

                {/* 快速录入配置 Tab */}
                <TabsContent value="submit-config" className="flex-1 overflow-y-auto px-6 mt-4 space-y-4">
                  {/* 归属校区 */}
                  <FormField
                    control={form.control}
                    name="channel_config.submit_campus_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>归属校区</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择线索归属校区" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {campuses.map((campus: { id: string; name: string }) => (
                              <SelectItem key={campus.id} value={campus.id}>
                                {campus.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 员工提交令牌管理 */}
                  <div className="space-y-3">
                    <Label>员工专属链接</Label>

                    {!editingItem ? (
                      <p className="text-xs text-muted-foreground">请先保存渠道后再管理员工令牌</p>
                    ) : (
                      <>
                        {/* 添加员工 */}
                        <div className="flex gap-2">
                          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="选择员工" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp: { id: string; name: string }) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddEmployeeToken}
                            disabled={!selectedEmployeeId || addTokenMutation.isPending}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            生成链接
                          </Button>
                        </div>

                        {/* 已有令牌列表 */}
                        {(() => {
                          const submitTokens = editingItem?.channel_config?.submit_tokens || {}
                          const tokenEntries = Object.entries(submitTokens)
                          if (tokenEntries.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-6 text-center border rounded-lg border-dashed">
                                <Link className="h-6 w-6 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">暂无员工链接</p>
                                <p className="text-xs text-muted-foreground mt-1">选择员工并点击生成链接</p>
                              </div>
                            )
                          }
                          return (
                            <div className="space-y-2">
                              {tokenEntries.map(([tok, info]) => (
                                <Card key={tok} className="p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-sm">{(info as { employee_name: string }).employee_name}</div>
                                      <div className="text-xs text-muted-foreground font-mono truncate">
                                        {`${window.location.origin}/lead-submit?token=${tok}`}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleCopyTokenLink(tok)}
                                        title="复制链接"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => removeTokenMutation.mutate({ channelId: editingItem.id, token: tok })}
                                        title="移除"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* 钉钉通知配置 Tab */}
                <TabsContent value="dingtalk-notify" className="flex-1 overflow-y-auto px-6 mt-4 space-y-4">
                  {/* 启用开关 */}
                  <FormField
                    control={form.control}
                    name="channel_config.dingtalk_notify.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>启用钉钉通知</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            新线索提交时自动发送通知到钉钉群
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

                  {/* 选择机器人（启用后显示） */}
                  {form.watch('channel_config.dingtalk_notify.enabled') && (
                    <>
                      <FormField
                        control={form.control}
                        name="channel_config.dingtalk_notify.robot_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>通知机器人</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <Bot className="mr-2 h-4 w-4" />
                                  <SelectValue placeholder="选择钉钉机器人" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {robots.map((robot: DingtalkRobot) => (
                                  <SelectItem key={robot.id} value={robot.id}>
                                    {robot.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {robots.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                暂无可用机器人，请先在钉钉机器人管理中创建
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* 通知场景 */}
                      <FormField
                        control={form.control}
                        name="channel_config.dingtalk_notify.notify_on_submit"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <FormLabel>新线索录入通知</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                有新线索成功录入时发送通知
                              </div>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="channel_config.dingtalk_notify.notify_on_collision"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <FormLabel>撞量通知</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                线索撞量时发送通知（包括成功接管和正在跟进中）
                              </div>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </TabsContent>

                {/* 额外字段配置 Tab */}
                <TabsContent value="extra-fields" className="flex-1 overflow-y-auto px-6 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Settings2 className="h-4 w-4" />
                      <span>配置该来源渠道特有的额外字段</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddExtraField}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      添加字段
                    </Button>
                  </div>

                  {extraFields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
                      <Settings2 className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">暂无额外字段</p>
                      <p className="text-xs text-muted-foreground mt-1">点击上方按钮添加字段</p>
                    </div>
                  ) : (
                    extraFields.map((field, index) => {
                      const fieldType = form.watch(`extra_fields.${index}.field_type`)
                      const options = form.watch(`extra_fields.${index}.options`) || []

                      return (
                        <Card key={field.id} className="relative">
                          <CardHeader className="pb-3 pt-4 px-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium">
                                字段 {index + 1}
                              </CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeExtraField(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 space-y-3">
                            {/* 第一行：字段名和标签 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">字段名称（英文）</Label>
                                <Input
                                  placeholder="如: phone, wechat"
                                  {...form.register(`extra_fields.${index}.field_name`)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">字段标签（中文）</Label>
                                <Input
                                  placeholder="如: 手机号, 微信号"
                                  {...form.register(`extra_fields.${index}.field_label`)}
                                />
                              </div>
                            </div>

                            {/* 第二行：类型、必填、占位符 */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">字段类型</Label>
                                <Select
                                  value={fieldType}
                                  onValueChange={(value) => form.setValue(`extra_fields.${index}.field_type`, value as FormData['extra_fields'][0]['field_type'])}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_TYPE_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">占位符</Label>
                                <Input
                                  placeholder="请输入..."
                                  {...form.register(`extra_fields.${index}.placeholder`)}
                                />
                              </div>
                              <div className="flex items-end pb-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`required-${index}`}
                                    checked={form.watch(`extra_fields.${index}.required`)}
                                    onCheckedChange={(checked) => form.setValue(`extra_fields.${index}.required`, !!checked)}
                                  />
                                  <Label htmlFor={`required-${index}`} className="text-xs cursor-pointer">
                                    必填
                                  </Label>
                                </div>
                              </div>
                            </div>

                            {/* 选择框选项配置 */}
                            {fieldType === 'select' && (
                              <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">选项配置</Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => handleAddOption(index)}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    添加选项
                                  </Button>
                                </div>
                                {options.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    暂无选项，请添加
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {options.map((_, optIndex) => (
                                      <div key={optIndex} className="flex items-center gap-2">
                                        <Input
                                          placeholder="选项标签"
                                          className="h-8 text-xs"
                                          {...form.register(`extra_fields.${index}.options.${optIndex}.label`)}
                                        />
                                        <Input
                                          placeholder="选项值"
                                          className="h-8 text-xs"
                                          {...form.register(`extra_fields.${index}.options.${optIndex}.value`)}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 shrink-0"
                                          onClick={() => handleRemoveOption(index, optIndex)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
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
              确定要删除渠道「{deletingItem?.name}」吗？此操作不可撤销。
              如果该渠道下存在线索，则无法删除。
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
    </Main>
  )
}
