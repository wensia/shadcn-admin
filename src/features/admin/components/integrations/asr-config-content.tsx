/**
 * ASR 配置内容组件
 * 用于集成配置页面的 Tab 内容
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
import { showApiErrorToast } from '@/lib/api/error-toast'

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
import { asrConfigApi, type ASRConfigCreate, type ASRConfigUpdate } from '../../api'
import { ASR_PROVIDER_OPTIONS, type ASRConfigItem, type ASRProvider } from '../../types'
import { StatusBadge } from '../../components/status-badge'
import { formatTime } from '@/lib/utils/time'

// 提供商字段配置
const PROVIDER_FIELD_CONFIGS: Record<ASRProvider, {
  required: string[]
  optional: string[]
  toggles: string[]  // 布尔开关类型的字段
  labels: Record<string, string>
  descriptions?: Record<string, string>
}> = {
  volcengine: {
    // 按照火山引擎官方文档：https://www.volcengine.com/docs/6561/1354868
    // 控制台显示名称：APP ID, Access Token, Secret Key
    required: ['app_id', 'access_token'],
    optional: ['resource_id'],
    toggles: ['enable_emotion_detection', 'enable_channel_split', 'enable_speaker_info', 'enable_itn', 'enable_punc'],
    labels: {
      app_id: 'APP ID',
      access_token: 'Access Token',
      resource_id: '资源 ID (X-Api-Resource-Id)',
      enable_emotion_detection: '启用情绪检测',
      enable_channel_split: '启用双声道识别',
      enable_speaker_info: '启用说话人分离',
      enable_itn: '启用文本规范化',
      enable_punc: '启用标点符号',
    },
    descriptions: {
      app_id: '火山引擎控制台获取，对应 HTTP 头 X-Api-App-Key',
      access_token: '火山引擎控制台获取，对应 HTTP 头 X-Api-Access-Key',
      resource_id: '仅支持 volc.seedasr.auc（豆包录音文件识别模型2.0）',
      enable_emotion_detection: '识别说话人情绪（angry/happy/neutral/sad/surprise）',
      enable_channel_split: '区分左右声道，适合双人对话录音',
      enable_speaker_info: '说话人聚类分离（最多10人）',
      enable_itn: '数字、时间等文本规范化',
      enable_punc: '自动添加标点符号',
    }
  },
  tencent: {
    required: ['secret_id', 'secret_key', 'app_id'],
    optional: ['engine_type'],
    toggles: [],
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
    toggles: [],
    labels: {
      access_key_id: 'Access Key ID',
      access_key_secret: 'Access Key Secret',
      app_key: 'App Key',
    }
  },
}

// 火山引擎默认值
const VOLCENGINE_DEFAULTS = {
  resource_id: 'volc.seedasr.auc',
  enable_emotion_detection: true,
  enable_channel_split: true,
  enable_speaker_info: false,
  enable_itn: true,
  enable_punc: true,
}

// 表单验证模式
const formSchema = z.object({
  provider: z.enum(['volcengine', 'tencent', 'alibaba']),
  name: z.string().min(1, '请输入配置名称').max(100, '名称最多100个字符'),
  notes: z.string().max(500, '备注最多500个字符').optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // 火山引擎字段（控制台显示名称：APP ID, Access Token）
  volcengine_app_id: z.string().optional(),
  volcengine_access_token: z.string().optional(),
  volcengine_resource_id: z.string().optional(),
  volcengine_enable_emotion_detection: z.boolean().optional(),
  volcengine_enable_channel_split: z.boolean().optional(),
  volcengine_enable_speaker_info: z.boolean().optional(),
  volcengine_enable_itn: z.boolean().optional(),
  volcengine_enable_punc: z.boolean().optional(),
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
    credentials: {},
    is_active: true,
    is_default: false,
    last_verified_at: null,
    notes: null,
  }))
}

export function ASRConfigContent() {
  const queryClient = useQueryClient()

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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-asr-configs', page, pageSize, searchValue],
    queryFn: async () => {
      const response = await asrConfigApi.list({
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
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
      showApiErrorToast(error, '创建失败')
    },
  })

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
      showApiErrorToast(error, '更新失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => asrConfigApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-asr-configs'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

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
      showApiErrorToast(error, '测试失败')
    },
  })

  const getProviderLabel = (provider: string) => {
    const option = ASR_PROVIDER_OPTIONS.find(opt => opt.value === provider)
    return option?.label || provider
  }

  const getProviderBadgeVariant = (provider: string): 'default' | 'secondary' | 'outline' => {
    switch (provider) {
      case 'volcengine': return 'default'
      case 'tencent': return 'secondary'
      case 'alibaba': return 'outline'
      default: return 'secondary'
    }
  }

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
              <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="编辑">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleTest(row.original.id)} disabled={testMutation.isPending} title="测试">
                <Play className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(row.original)} title="删除">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )
        },
      },
    ],
    [testMutation.isPending]
  )

  const tableData = isLoading ? createSkeletonData(5) : (data?.items || [])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  const handleCreate = () => {
    setEditingItem(null)
    form.reset({
      provider: 'volcengine',
      name: '',
      notes: '',
      is_default: false,
      is_active: true,
      // 火山引擎默认值
      volcengine_resource_id: VOLCENGINE_DEFAULTS.resource_id,
      volcengine_enable_emotion_detection: VOLCENGINE_DEFAULTS.enable_emotion_detection,
      volcengine_enable_channel_split: VOLCENGINE_DEFAULTS.enable_channel_split,
      volcengine_enable_speaker_info: VOLCENGINE_DEFAULTS.enable_speaker_info,
      volcengine_enable_itn: VOLCENGINE_DEFAULTS.enable_itn,
      volcengine_enable_punc: VOLCENGINE_DEFAULTS.enable_punc,
    })
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
  }

  const handleEdit = (item: ASRConfigItem) => {
    setEditingItem(item)
    const provider = item.provider as ASRProvider

    const formValues: FormData = {
      provider,
      name: item.name,
      notes: item.notes || '',
      is_default: item.is_default,
      is_active: item.is_active,
    }

    if (provider === 'volcengine') {
      formValues.volcengine_app_id = String(item.credentials.app_id || '')
      formValues.volcengine_access_token = String(item.credentials.access_token || '')
      formValues.volcengine_resource_id = String(item.credentials.resource_id || VOLCENGINE_DEFAULTS.resource_id)
      // 布尔值字段（现在返回的是原始 boolean 类型）
      formValues.volcengine_enable_emotion_detection = Boolean(item.credentials.enable_emotion_detection)
      formValues.volcengine_enable_channel_split = Boolean(item.credentials.enable_channel_split)
      formValues.volcengine_enable_speaker_info = Boolean(item.credentials.enable_speaker_info)
      formValues.volcengine_enable_itn = Boolean(item.credentials.enable_itn)
      formValues.volcengine_enable_punc = Boolean(item.credentials.enable_punc)
    } else if (provider === 'tencent') {
      formValues.tencent_secret_id = String(item.credentials.secret_id || '')
      formValues.tencent_secret_key = String(item.credentials.secret_key || '')
      formValues.tencent_app_id = String(item.credentials.app_id || '')
      formValues.tencent_engine_type = String(item.credentials.engine_type || '')
    } else if (provider === 'alibaba') {
      formValues.alibaba_access_key_id = String(item.credentials.access_key_id || '')
      formValues.alibaba_access_key_secret = String(item.credentials.access_key_secret || '')
      formValues.alibaba_app_key = String(item.credentials.app_key || '')
    }

    form.reset(formValues)
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
  }

  const handleDeleteClick = (item: ASRConfigItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  const handleTest = (id: string) => {
    testMutation.mutate(id)
  }

  const handleSubmit = (formData: FormData) => {
    const provider = formData.provider
    const config = PROVIDER_FIELD_CONFIGS[provider]

    const credentials: Record<string, string | boolean> = {}

    if (provider === 'volcengine') {
      if (formData.volcengine_app_id) credentials.app_id = formData.volcengine_app_id
      if (formData.volcengine_access_token) credentials.access_token = formData.volcengine_access_token
      // 资源 ID 固定为 volc.seedasr.auc
      credentials.resource_id = VOLCENGINE_DEFAULTS.resource_id
      // 布尔开关
      credentials.enable_emotion_detection = formData.volcengine_enable_emotion_detection ?? VOLCENGINE_DEFAULTS.enable_emotion_detection
      credentials.enable_channel_split = formData.volcengine_enable_channel_split ?? VOLCENGINE_DEFAULTS.enable_channel_split
      credentials.enable_speaker_info = formData.volcengine_enable_speaker_info ?? VOLCENGINE_DEFAULTS.enable_speaker_info
      credentials.enable_itn = formData.volcengine_enable_itn ?? VOLCENGINE_DEFAULTS.enable_itn
      credentials.enable_punc = formData.volcengine_enable_punc ?? VOLCENGINE_DEFAULTS.enable_punc
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
      const updateData: ASRConfigUpdate = {
        name: formData.name,
        notes: formData.notes,
        is_active: formData.is_active,
        is_default: formData.is_default,
      }

      // 过滤掉脱敏的凭证值
      const filteredCredentials: Record<string, string | boolean> = {}
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === 'boolean') {
          filteredCredentials[key] = value
        } else if (value && !String(value).includes('***')) {
          filteredCredentials[key] = value
        }
      }
      if (Object.keys(filteredCredentials).length > 0) {
        updateData.credentials = filteredCredentials
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

  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const renderCredentialFields = () => {
    const config = PROVIDER_FIELD_CONFIGS[selectedProvider]
    const prefix = selectedProvider

    const renderTextField = (fieldKey: string, required: boolean) => {
      const formKey = `${prefix}_${fieldKey}` as keyof FormData
      const label = config.labels[fieldKey]
      const description = config.descriptions?.[fieldKey]
      const isPasswordField = fieldKey.includes('secret') || fieldKey.includes('token') || fieldKey.includes('key')
      const isDisabled = fieldKey === 'resource_id' && prefix === 'volcengine'  // 资源 ID 只读

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
                  disabled={isDisabled}
                  {...field}
                  value={field.value as string || ''}
                />
              </FormControl>
              {description && <FormDescription>{description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    const renderToggleField = (fieldKey: string) => {
      const formKey = `${prefix}_${fieldKey}` as keyof FormData
      const label = config.labels[fieldKey]
      const description = config.descriptions?.[fieldKey]

      return (
        <FormField
          key={formKey}
          control={form.control}
          name={formKey}
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">{label}</FormLabel>
                {description && <FormDescription className="text-xs">{description}</FormDescription>}
              </div>
              <FormControl>
                <Switch
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )
    }

    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">凭证信息</div>
        {config.required.map(field => renderTextField(field, true))}
        {config.optional.map(field => renderTextField(field, false))}

        {config.toggles.length > 0 && (
          <>
            <div className="text-sm font-medium text-muted-foreground pt-2">功能配置</div>
            {config.toggles.map(field => renderToggleField(field))}
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
            <Button variant="outline" onClick={handleSearch}>搜索</Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="刷新">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新增配置
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
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!editingItem}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择服务提供商" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ASR_PROVIDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                        <FormDescription>使用此配置作为默认 ASR 服务</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                          <FormDescription>设置该配置是否启用</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {testStatus.tested && (
                  <Alert variant={testStatus.success ? 'default' : 'destructive'}>
                    {testStatus.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>{testStatus.message}</AlertDescription>
                  </Alert>
                )}
              </div>
              <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
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
    </>
  )
}
