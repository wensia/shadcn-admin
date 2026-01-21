/**
 * ASR 配置管理页面
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
import { Mic, Plus, Pencil, Trash2, Search, Play, CheckCircle, AlertCircle, RefreshCw, Star } from 'lucide-react'
import { toast } from 'sonner'

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
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { asrConfigApi, type ASRConfigCreate, type ASRConfigUpdate, type ASRProviderFields } from '../api'
import type { ASRConfigItem, ASRProvider } from '../types'
import { ASR_PROVIDER_OPTIONS } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

// 提供商字段配置（本地定义，不依赖后端）
const PROVIDER_FIELD_CONFIGS: Record<ASRProvider, { required: string[]; optional: string[]; labels: Record<string, string> }> = {
  volcengine: {
    required: ['app_id', 'access_token'],
    optional: ['cluster'],
    labels: {
      app_id: 'App ID',
      access_token: 'Access Token',
      cluster: '集群 ID',
    }
  },
  tencent: {
    required: ['secret_id', 'secret_key', 'app_id'],
    optional: ['engine_type'],
    labels: {
      secret_id: 'Secret ID',
      secret_key: 'Secret Key',
      app_id: 'App ID',
      engine_type: '引擎类型',
    }
  },
  alibaba: {
    required: ['access_key_id', 'access_key_secret', 'app_key'],
    optional: [],
    labels: {
      access_key_id: 'Access Key ID',
      access_key_secret: 'Access Key Secret',
      app_key: 'App Key',
    }
  },
}

// 表单验证模式
const formSchema = z.object({
  provider: z.enum(['volcengine', 'tencent', 'alibaba']),
  name: z.string().min(1, '请输入配置名称').max(100, '名称最多100个字符'),
  notes: z.string().max(500, '备注最多500个字符').optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // 火山引擎字段
  volcengine_app_id: z.string().optional(),
  volcengine_access_token: z.string().optional(),
  volcengine_cluster: z.string().optional(),
  // 腾讯云字段
  tencent_secret_id: z.string().optional(),
  tencent_secret_key: z.string().optional(),
  tencent_app_id: z.string().optional(),
  tencent_engine_type: z.string().optional(),
  // 阿里云字段
  alibaba_access_key_id: z.string().optional(),
  alibaba_access_key_secret: z.string().optional(),
  alibaba_app_key: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): ASRConfigItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    provider: 'volcengine' as ASRProvider,
    name: '',
    credentials_masked: {},
    is_active: true,
    is_default: false,
    last_verified_at: null,
    notes: null,
  }))
}

export function ASRConfigPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ASRConfigItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<ASRConfigItem | null>(null)
  const [testStatus, setTestStatus] = useState<{ tested: boolean; success: boolean; message: string }>({
    tested: false,
    success: false,
    message: '',
  })

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: 'volcengine',
      name: '',
      notes: '',
      is_default: false,
      is_active: true,
    },
  })

  const selectedProvider = form.watch('provider')

  // 查询数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-asr-configs', page, pageSize, searchValue],
    queryFn: async () => {
      const response = await asrConfigApi.list({
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
      // 客户端搜索过滤
      if (searchValue) {
        const filtered = response.items.filter(item =>
          item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.provider.toLowerCase().includes(searchValue.toLowerCase())
        )
        return { items: filtered, total: filtered.length }
      }
      return response
    },
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: ASRConfigCreate) => asrConfigApi.create(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-asr-configs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ASRConfigUpdate }) =>
      asrConfigApi.update(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-asr-configs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => asrConfigApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-asr-configs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })

  // 测试
  const testMutation = useMutation({
    mutationFn: (id: string) => asrConfigApi.test(id),
    onSuccess: (result) => {
      setTestStatus({
        tested: true,
        success: result.success,
        message: result.message || 'ASR 配置测试成功',
      })
      if (result.success) {
        toast.success('测试成功')
      } else {
        toast.error(result.message || '测试失败')
      }
    },
    onError: (error: Error) => {
      setTestStatus({
        tested: true,
        success: false,
        message: error.message || 'ASR 配置测试失败',
      })
      toast.error(error.message || '测试失败')
    },
  })

  // 提供商标签
  const getProviderLabel = (provider: string) => {
    const option = ASR_PROVIDER_OPTIONS.find(opt => opt.value === provider)
    return option?.label || provider
  }

  // 提供商徽章颜色
  const getProviderBadgeVariant = (provider: string): 'default' | 'secondary' | 'outline' => {
    switch (provider) {
      case 'volcengine':
        return 'default'
      case 'tencent':
        return 'secondary'
      case 'alibaba':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  // 列定义
  const columns: ColumnDef<ASRConfigItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '配置名称',
        size: 250,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-40" />
          }
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{row.original.name}</span>
                {row.original.is_default && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              {row.original.notes && (
                <span className="text-xs text-muted-foreground line-clamp-1">{row.original.notes}</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'provider',
        header: '提供商',
        size: 120,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          return (
            <Badge variant={getProviderBadgeVariant(row.original.provider)}>
              {getProviderLabel(row.original.provider)}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-14 rounded-full" />
          }
          return <StatusBadge isActive={row.original.is_active} />
        },
      },
      {
        accessorKey: 'last_verified_at',
        header: '最后验证',
        size: 160,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return row.original.last_verified_at
            ? formatTime(row.original.last_verified_at)
            : <span className="text-muted-foreground">未验证</span>
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 150,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
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
                onClick={() => handleTest(row.original.id)}
                disabled={testMutation.isPending}
                title="测试"
              >
                <Play className="h-4 w-4" />
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
    [testMutation.isPending]
  )

  // 表格数据
  const tableData = isLoading ? createSkeletonData(5) : (data?.items || [])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  // 打开新增对话框
  const handleCreate = () => {
    setEditingItem(null)
    form.reset({
      provider: 'volcengine',
      name: '',
      notes: '',
      is_default: false,
      is_active: true,
    })
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (item: ASRConfigItem) => {
    setEditingItem(item)
    const provider = item.provider as ASRProvider

    // 构建表单默认值
    const formValues: FormData = {
      provider,
      name: item.name,
      notes: item.notes || '',
      is_default: item.is_default,
      is_active: item.is_active,
    }

    // 根据提供商填充凭证字段（编辑时显示掩码值）
    if (provider === 'volcengine') {
      formValues.volcengine_app_id = item.credentials_masked.app_id || ''
      formValues.volcengine_access_token = item.credentials_masked.access_token || ''
      formValues.volcengine_cluster = item.credentials_masked.cluster || ''
    } else if (provider === 'tencent') {
      formValues.tencent_secret_id = item.credentials_masked.secret_id || ''
      formValues.tencent_secret_key = item.credentials_masked.secret_key || ''
      formValues.tencent_app_id = item.credentials_masked.app_id || ''
      formValues.tencent_engine_type = item.credentials_masked.engine_type || ''
    } else if (provider === 'alibaba') {
      formValues.alibaba_access_key_id = item.credentials_masked.access_key_id || ''
      formValues.alibaba_access_key_secret = item.credentials_masked.access_key_secret || ''
      formValues.alibaba_app_key = item.credentials_masked.app_key || ''
    }

    form.reset(formValues)
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
  }

  // 点击删除按钮
  const handleDeleteClick = (item: ASRConfigItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 测试配置
  const handleTest = (id: string) => {
    testMutation.mutate(id)
  }

  // 提交表单
  const handleSubmit = (formData: FormData) => {
    const provider = formData.provider
    const config = PROVIDER_FIELD_CONFIGS[provider]

    // 构建凭证对象
    const credentials: Record<string, string> = {}

    if (provider === 'volcengine') {
      if (formData.volcengine_app_id) credentials.app_id = formData.volcengine_app_id
      if (formData.volcengine_access_token) credentials.access_token = formData.volcengine_access_token
      if (formData.volcengine_cluster) credentials.cluster = formData.volcengine_cluster
    } else if (provider === 'tencent') {
      if (formData.tencent_secret_id) credentials.secret_id = formData.tencent_secret_id
      if (formData.tencent_secret_key) credentials.secret_key = formData.tencent_secret_key
      if (formData.tencent_app_id) credentials.app_id = formData.tencent_app_id
      if (formData.tencent_engine_type) credentials.engine_type = formData.tencent_engine_type
    } else if (provider === 'alibaba') {
      if (formData.alibaba_access_key_id) credentials.access_key_id = formData.alibaba_access_key_id
      if (formData.alibaba_access_key_secret) credentials.access_key_secret = formData.alibaba_access_key_secret
      if (formData.alibaba_app_key) credentials.app_key = formData.alibaba_app_key
    }

    // 验证必填字段
    for (const field of config.required) {
      if (!credentials[field]) {
        toast.error(`请填写必填字段: ${config.labels[field]}`)
        return
      }
    }

    if (editingItem) {
      // 更新时，只有当凭证字段有值且不是掩码值时才更新凭证
      const updateData: ASRConfigUpdate = {
        name: formData.name,
        notes: formData.notes,
        is_active: formData.is_active,
        is_default: formData.is_default,
      }

      // 检查凭证是否有实际更新（不是掩码值）
      const hasCredentialUpdate = Object.values(credentials).some(v => v && !v.includes('***'))
      if (hasCredentialUpdate) {
        // 过滤掉掩码值
        const filteredCredentials: Record<string, string> = {}
        for (const [key, value] of Object.entries(credentials)) {
          if (value && !value.includes('***')) {
            filteredCredentials[key] = value
          }
        }
        if (Object.keys(filteredCredentials).length > 0) {
          updateData.credentials = filteredCredentials
        }
      }

      updateMutation.mutate({ id: editingItem.id, data: updateData })
    } else {
      const createData: ASRConfigCreate = {
        provider,
        name: formData.name,
        credentials,
        is_default: formData.is_default,
        notes: formData.notes,
      }
      createMutation.mutate(createData)
    }
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  // 渲染凭证字段
  const renderCredentialFields = () => {
    const config = PROVIDER_FIELD_CONFIGS[selectedProvider]
    const prefix = selectedProvider

    const renderField = (fieldKey: string, required: boolean) => {
      const formKey = `${prefix}_${fieldKey}` as keyof FormData
      const label = config.labels[fieldKey]
      const isPasswordField = fieldKey.includes('secret') || fieldKey.includes('token') || fieldKey.includes('key')

      return (
        <FormField
          key={formKey}
          control={form.control}
          name={formKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <Input
                  type={isPasswordField ? 'password' : 'text'}
                  placeholder={`请输入${label}`}
                  {...field}
                  value={field.value as string || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">凭证信息</div>
        {config.required.map(field => renderField(field, true))}
        {config.optional.map(field => renderField(field, false))}
      </div>
    )
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ASR 配置管理</h1>
            <p className="text-sm text-muted-foreground">
              管理语音识别服务配置（火山引擎、腾讯云、阿里云）
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新增配置
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索配置名称或提供商..."
                className="pl-8"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
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
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {data && data.total > 0 && (
          <SimplePagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editingItem ? '编辑 ASR 配置' : '新增 ASR 配置'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '修改语音识别服务配置' : '添加一个新的语音识别服务配置'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>服务提供商</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!editingItem}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择服务提供商" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ASR_PROVIDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>配置名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入配置名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 凭证字段 */}
                {renderCredentialFields()}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>备注</FormLabel>
                      <FormControl>
                        <Textarea placeholder="请输入备注（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>设为默认</FormLabel>
                        <FormDescription>
                          使用此配置作为默认 ASR 服务
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

                {editingItem && (
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>启用状态</FormLabel>
                          <FormDescription>
                            设置该配置是否启用
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
                )}

                {/* 测试结果提示 */}
                {testStatus.tested && (
                  <Alert variant={testStatus.success ? 'default' : 'destructive'}>
                    {testStatus.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{testStatus.message}</AlertDescription>
                  </Alert>
                )}
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
              确定要删除 ASR 配置「{deletingItem?.name}」吗？此操作不可撤销。
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
