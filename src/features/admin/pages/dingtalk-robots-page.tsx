/**
 * 钉钉机器人管理页面
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
import { Bot, Plus, Pencil, Trash2, Search, Play, CheckCircle, AlertCircle, X } from 'lucide-react'
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
import { dingtalkRobotsApi } from '../api'
import type { DingtalkRobot, DingtalkRobotCreate, DingtalkRobotUpdate, DingtalkSecurityType } from '../types'
import { SECURITY_TYPE_OPTIONS } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

// 表单验证模式
const formSchema = z.object({
  name: z.string().min(1, '请输入机器人名称').max(50, '名称最多50个字符'),
  description: z.string().max(200, '描述最多200个字符').optional(),
  webhook: z.string()
    .min(1, '请输入Webhook地址')
    .regex(/^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=/, 'Webhook地址必须是钉钉机器人的有效地址'),
  security_type: z.enum(['sign', 'keyword', 'ip']),
  secret_key: z.string().optional(),
  keywords: z.string().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).default(0),
}).refine((data) => {
  if (data.security_type === 'sign' && !data.secret_key) {
    return false
  }
  return true
}, {
  message: '使用加签验证时必须提供密钥',
  path: ['secret_key'],
}).refine((data) => {
  if (data.security_type === 'keyword' && !data.keywords) {
    return false
  }
  return true
}, {
  message: '使用关键词验证时必须提供关键词',
  path: ['keywords'],
})

type FormData = z.infer<typeof formSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): DingtalkRobot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    name: '',
    webhook: '',
    security_type: 'sign' as DingtalkSecurityType,
    supported_msg_types: [],
    is_active: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    created_by_id: '',
  }))
}

export function DingtalkRobotsPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DingtalkRobot | null>(null)
  const [deletingItem, setDeletingItem] = useState<DingtalkRobot | null>(null)
  const [testingItem, setTestingItem] = useState<DingtalkRobot | null>(null)
  const [testStatus, setTestStatus] = useState<{ tested: boolean; success: boolean; message: string }>({
    tested: false,
    success: false,
    message: '',
  })

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      webhook: '',
      security_type: 'sign',
      secret_key: '',
      keywords: '',
      is_active: true,
      sort_order: 0,
    },
  })

  const securityType = form.watch('security_type')

  // 查询数据
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dingtalk-robots', page, pageSize, searchValue],
    queryFn: async () => {
      const response = await dingtalkRobotsApi.list({
        page,
        size: pageSize,
        search: searchValue || undefined,
      })
      return response
    },
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: DingtalkRobotCreate) => dingtalkRobotsApi.create(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-dingtalk-robots'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DingtalkRobotUpdate }) =>
      dingtalkRobotsApi.update(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-dingtalk-robots'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => dingtalkRobotsApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-dingtalk-robots'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })

  // 测试
  const testMutation = useMutation({
    mutationFn: (data: { webhook: string; security_type: DingtalkSecurityType; secret_key?: string; keywords?: string[] }) =>
      dingtalkRobotsApi.test(data),
    onSuccess: () => {
      setTestStatus({
        tested: true,
        success: true,
        message: '连接测试成功，钉钉机器人可以正常发送消息',
      })
      toast.success('测试连接成功')
    },
    onError: (error: Error) => {
      setTestStatus({
        tested: true,
        success: false,
        message: error.message || '连接测试失败，请检查配置信息',
      })
      toast.error(error.message || '测试连接失败')
    },
  })

  // 安全设置类型标签
  const getSecurityTypeLabel = (type: string) => {
    const option = SECURITY_TYPE_OPTIONS.find(opt => opt.value === type)
    return option?.label || type
  }

  // 列定义
  const columns: ColumnDef<DingtalkRobot>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '机器人名称',
        size: 200,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{row.original.name}</span>
              </div>
              {row.original.description && (
                <span className="text-xs text-muted-foreground">{row.original.description}</span>
              )}
            </div>
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
        accessorKey: 'security_type',
        header: '安全设置',
        size: 120,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          return (
            <Badge variant="secondary">
              {getSecurityTypeLabel(row.original.security_type)}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        size: 160,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return formatTime(row.original.created_at)
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
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleTestClick(row.original)}
              >
                <Play className="h-4 w-4" />
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
    ],
    []
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
      name: '',
      description: '',
      webhook: '',
      security_type: 'sign',
      secret_key: '',
      keywords: '',
      is_active: true,
      sort_order: 0,
    })
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (item: DingtalkRobot) => {
    setEditingItem(item)
    form.reset({
      name: item.name,
      description: item.description || '',
      webhook: item.webhook,
      security_type: item.security_type,
      secret_key: item.secret_key || '',
      keywords: item.keywords?.join(', ') || '',
      is_active: item.is_active,
      sort_order: item.sort_order,
    })
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
  }

  // 点击删除按钮
  const handleDeleteClick = (item: DingtalkRobot) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 点击测试按钮
  const handleTestClick = (item: DingtalkRobot) => {
    setTestingItem(item)
    setTestDialogOpen(true)
  }

  // 测试表单中的连接
  const handleFormTest = async () => {
    const values = form.getValues()

    // 基本验证
    if (!values.webhook || !values.security_type) {
      toast.error('请先填写完整的机器人配置')
      return
    }

    const testData = {
      webhook: values.webhook,
      security_type: values.security_type,
      secret_key: values.security_type === 'sign' ? values.secret_key : undefined,
      keywords: values.security_type === 'keyword' && values.keywords
        ? values.keywords.split(',').map(k => k.trim()).filter(Boolean)
        : undefined,
    }

    testMutation.mutate(testData)
  }

  // 测试已保存的机器人
  const handleTestSubmit = () => {
    if (!testingItem) return

    testMutation.mutate({
      webhook: testingItem.webhook,
      security_type: testingItem.security_type,
      secret_key: testingItem.secret_key,
      keywords: testingItem.keywords,
    })
  }

  // 提交表单
  const handleSubmit = (data: FormData) => {
    // 检查是否已测试成功
    if (!editingItem && !testStatus.success) {
      toast.error('请先测试连接成功后再保存')
      return
    }

    const formData: DingtalkRobotCreate = {
      name: data.name,
      description: data.description,
      webhook: data.webhook,
      security_type: data.security_type,
      secret_key: data.security_type === 'sign' ? data.secret_key : undefined,
      keywords: data.security_type === 'keyword' && data.keywords
        ? data.keywords.split(',').map(k => k.trim()).filter(Boolean)
        : undefined,
      supported_msg_types: ['text', 'markdown'],
      is_active: data.is_active,
      sort_order: data.sort_order,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">钉钉机器人管理</h1>
            <p className="text-sm text-muted-foreground">
              管理钉钉群机器人配置
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新增机器人
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索机器人名称..."
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
            <DialogTitle>{editingItem ? '编辑机器人' : '新增机器人'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '修改钉钉机器人配置' : '创建一个新的钉钉机器人'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>机器人名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入机器人名称" {...field} />
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
                        <Textarea placeholder="请输入描述（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="webhook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook地址</FormLabel>
                      <FormControl>
                        <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="security_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>安全设置</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择安全设置类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SECURITY_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col">
                                <span>{opt.label}</span>
                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {securityType === 'sign' && (
                  <FormField
                    control={form.control}
                    name="secret_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>加签密钥</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="请输入加签密钥" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {securityType === 'keyword' && (
                  <FormField
                    control={form.control}
                    name="keywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>关键词</FormLabel>
                        <FormControl>
                          <Input placeholder="多个关键词用逗号分隔" {...field} />
                        </FormControl>
                        <FormDescription>
                          消息内容必须包含至少一个关键词才能发送成功
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>启用状态</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          设置该机器人是否启用
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

                {/* 测试连接区域 */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">测试连接</div>
                      <div className="text-sm text-muted-foreground">
                        {editingItem ? '修改配置后建议重新测试' : '必须测试成功后才能保存'}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={testStatus.tested && testStatus.success ? 'default' : 'outline'}
                      onClick={handleFormTest}
                      disabled={testMutation.isPending}
                    >
                      {testMutation.isPending ? (
                        '测试中...'
                      ) : testStatus.tested && testStatus.success ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          测试成功
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          测试连接
                        </>
                      )}
                    </Button>
                  </div>
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
                  disabled={createMutation.isPending || updateMutation.isPending || (!editingItem && !testStatus.success)}
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
              确定要删除机器人「{deletingItem?.name}」吗？此操作不可撤销。
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
      <AlertDialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>测试机器人</AlertDialogTitle>
            <AlertDialogDescription>
              将发送测试消息到钉钉群
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex gap-2">
              <span className="font-medium">机器人：</span>
              <span>{testingItem?.name}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium">安全设置：</span>
              <span>{getSecurityTypeLabel(testingItem?.security_type || '')}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTestSubmit}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? '发送中...' : '发送测试消息'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
