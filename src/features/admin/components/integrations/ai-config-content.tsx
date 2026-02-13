/**
 * AI 配置内容组件
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
import { BrainCircuit, Plus, Pencil, Trash2, Search, Play, CheckCircle, AlertCircle, RefreshCw, Star } from 'lucide-react'
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
import { aiConfigApi, type AIConfigCreate, type AIConfigUpdate } from '../../api'
import { AI_PROVIDER_OPTIONS, type AIConfigItem, type AIProvider } from '../../types'
import { StatusBadge } from '../../components/status-badge'

// 提供商默认值
const PROVIDER_DEFAULTS: Record<AIProvider, { base_url: string; default_model: string }> = {
  doubao: {
    base_url: 'https://ark.cn-beijing.volces.com/api/v3',
    default_model: 'doubao-seed-1-8-251228',
  },
  deepseek: {
    base_url: 'https://api.deepseek.com/v1',
    default_model: 'deepseek-chat',
  },
  kimi: {
    base_url: 'https://api.moonshot.cn/v1',
    default_model: 'moonshot-v1-8k',
  },
  openai: {
    base_url: '',
    default_model: 'gemini-2.5-flash',
  },
}

// 表单验证模式
const formSchema = z.object({
  provider: z.enum(['doubao', 'deepseek', 'kimi', 'openai']),
  name: z.string().min(1, '请输入配置名称').max(100, '名称最多100个字符'),
  api_key: z.string().min(1, '请输入 API 密钥'),
  base_url: z.string().optional(),
  default_model: z.string().optional(),
  endpoint_id: z.string().optional(),
  notes: z.string().max(500, '备注最多500个字符').optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof formSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): AIConfigItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    provider: 'doubao' as AIProvider,
    name: '',
    api_key_masked: '',
    base_url: '',
    default_model: null,
    endpoint_id: null,
    is_active: true,
    is_default: false,
    notes: null,
  }))
}

export function AIConfigContent() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AIConfigItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<AIConfigItem | null>(null)
  const [testStatus, setTestStatus] = useState<{ tested: boolean; success: boolean; message: string }>({
    tested: false,
    success: false,
    message: '',
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: 'doubao',
      name: '',
      api_key: '',
      base_url: PROVIDER_DEFAULTS.doubao.base_url,
      default_model: PROVIDER_DEFAULTS.doubao.default_model,
      endpoint_id: '',
      notes: '',
      is_default: false,
      is_active: true,
    },
  })

  const selectedProvider = form.watch('provider')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-ai-configs', page, pageSize, searchValue],
    queryFn: async () => {
      const response = await aiConfigApi.list({
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
    mutationFn: (data: AIConfigCreate) => aiConfigApi.create(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs-all'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AIConfigUpdate }) =>
      aiConfigApi.update(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs-all'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiConfigApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs-all'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => aiConfigApi.test(id),
    onSuccess: (result) => {
      setTestStatus({
        tested: true,
        success: result.success,
        message: result.message || 'AI 配置测试成功',
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
        message: error.message || 'AI 配置测试失败',
      })
      showApiErrorToast(error, '测试失败')
    },
  })

  const getProviderLabel = (provider: string) =>
    AI_PROVIDER_OPTIONS.find(opt => opt.value === provider)?.label || provider

  const getProviderBadgeVariant = (provider: string): 'default' | 'secondary' | 'outline' =>
    provider === 'doubao' ? 'default' : provider === 'kimi' ? 'outline' : 'secondary'

  const columns: ColumnDef<AIConfigItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '配置名称',
        size: 220,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-40" />
          }
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-purple-500" />
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
        size: 140,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-20" />
          }
          return (
            <Badge variant={getProviderBadgeVariant(row.original.provider)}>
              {getProviderLabel(row.original.provider)}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'default_model',
        header: '模型',
        size: 200,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return (
            <span className="font-mono text-xs">
              {row.original.default_model || row.original.endpoint_id || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'api_key_masked',
        header: 'API Key',
        size: 140,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-24" />
          }
          return (
            <span className="font-mono text-xs text-muted-foreground">
              {row.original.api_key_masked}
            </span>
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

  const tableData = isLoading ? createSkeletonData(3) : (data?.items || [])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  const handleCreate = () => {
    setEditingItem(null)
    const defaults = PROVIDER_DEFAULTS.doubao
    form.reset({
      provider: 'doubao',
      name: '',
      api_key: '',
      base_url: defaults.base_url,
      default_model: defaults.default_model,
      endpoint_id: '',
      notes: '',
      is_default: false,
      is_active: true,
    })
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
  }

  const handleEdit = (item: AIConfigItem) => {
    setEditingItem(item)
    form.reset({
      provider: item.provider,
      name: item.name,
      api_key: item.api_key_masked,
      base_url: item.base_url,
      default_model: item.default_model || '',
      endpoint_id: item.endpoint_id || '',
      notes: item.notes || '',
      is_default: item.is_default,
      is_active: item.is_active,
    })
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
  }

  const handleDeleteClick = (item: AIConfigItem) => {
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

  // 提供商切换时更新默认值
  const handleProviderChange = (provider: AIProvider) => {
    form.setValue('provider', provider)
    if (!editingItem) {
      const defaults = PROVIDER_DEFAULTS[provider]
      form.setValue('base_url', defaults.base_url)
      form.setValue('default_model', defaults.default_model)
      form.setValue('endpoint_id', '')
    }
  }

  const handleSubmit = (formData: FormData) => {
    if (editingItem) {
      const updateData: AIConfigUpdate = {
        name: formData.name,
        base_url: formData.base_url,
        default_model: formData.default_model,
        endpoint_id: formData.endpoint_id || undefined,
        is_active: formData.is_active,
        is_default: formData.is_default,
        notes: formData.notes,
      }
      // 只有非脱敏值才更新 api_key
      if (formData.api_key && !formData.api_key.includes('***')) {
        updateData.api_key = formData.api_key
      }
      updateMutation.mutate({ id: editingItem.id, data: updateData })
    } else {
      const createData: AIConfigCreate = {
        provider: formData.provider,
        name: formData.name,
        api_key: formData.api_key,
        base_url: formData.base_url,
        default_model: formData.default_model,
        endpoint_id: formData.endpoint_id || undefined,
        is_default: formData.is_default,
        notes: formData.notes,
      }
      createMutation.mutate(createData)
    }
  }

  const handleSearch = () => { setPage(1); refetch() }

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
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editingItem ? '编辑 AI 配置' : '新增 AI 配置'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '修改 AI 大模型服务配置' : '添加一个新的 AI 大模型服务配置'}
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
                        onValueChange={(v) => handleProviderChange(v as AIProvider)}
                        value={field.value}
                        disabled={!!editingItem}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择服务提供商" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AI_PROVIDER_OPTIONS.map((opt) => (
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
                        <Input placeholder="例如：豆包通话分析" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        API Key <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请输入 API Key"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {selectedProvider === 'doubao'
                          ? '火山引擎方舟平台 API Key'
                          : selectedProvider === 'deepseek'
                            ? 'DeepSeek 平台 API Key'
                            : selectedProvider === 'openai'
                              ? 'OpenAI 兼容 API Key（如 Antigravity Manager）'
                              : 'Moonshot 平台 API Key'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="base_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL</FormLabel>
                      <FormControl>
                        <Input placeholder="API 基础地址" {...field} />
                      </FormControl>
                      <FormDescription>
                        默认: {PROVIDER_DEFAULTS[selectedProvider as AIProvider]?.base_url || ''}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="default_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>默认模型</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            selectedProvider === 'doubao'
                              ? '例如: doubao-seed-1-8-251228'
                              : selectedProvider === 'openai'
                                ? '例如: gemini-2.5-flash'
                                : '模型名称'
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {selectedProvider === 'doubao'
                          ? '可直接使用模型名称（如 doubao-seed-1-8-251228），也可使用端点 ID'
                          : selectedProvider === 'openai'
                            ? '反向代理中配置的模型名称（如 gemini-2.5-flash）'
                            : '调用时使用的模型名称'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProvider === 'doubao' && (
                  <FormField
                    control={form.control}
                    name="endpoint_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>端点 ID（可选）</FormLabel>
                        <FormControl>
                          <Input placeholder="ep-xxxxxx" {...field} />
                        </FormControl>
                        <FormDescription>
                          火山方舟端点 ID，如已填写默认模型名称则可留空
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                        <FormDescription>使用此配置作为默认 AI 服务</FormDescription>
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
              确定要删除 AI 配置「{deletingItem?.name}」吗？此操作不可撤销。
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
