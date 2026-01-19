/**
 * 云客账号凭证管理页面
 *
 * 管理云客登录凭证（手机号、密码、公司信息），支持 CRUD 操作和自动登录
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
  Phone,
  Building2,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { yunkeCredentialsApi } from '../api'
import type { YunkeCredential } from '../types'
import { formatTime } from '@/lib/utils/time'

// 创建表单验证
const createFormSchema = z.object({
  phone: z
    .string()
    .min(11, '手机号必须是11位')
    .max(11, '手机号必须是11位')
    .regex(/^1\d{10}$/, '请输入正确的手机号'),
  password: z.string().min(1, '密码不能为空'),
  company_code: z.string().min(1, '公司代码不能为空'),
  company_name: z.string().min(1, '公司名称不能为空'),
  domain: z.string().optional(),
})

// 更新表单验证
const updateFormSchema = z.object({
  phone: z
    .string()
    .min(11, '手机号必须是11位')
    .max(11, '手机号必须是11位')
    .regex(/^1\d{10}$/, '请输入正确的手机号'),
  password: z.string().optional(),
  company_code: z.string().min(1, '公司代码不能为空'),
  company_name: z.string().min(1, '公司名称不能为空'),
  domain: z.string().optional(),
})

type CreateFormData = z.infer<typeof createFormSchema>
type UpdateFormData = z.infer<typeof updateFormSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): YunkeCredential[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    phone: '',
    company_id: '',
    company_code: null,
    company_name: null,
    user_id: null,
    status: 0,
    last_login: null,
    created_at: null,
    updated_at: null,
  }))
}

// 状态选项
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: '1', label: '已登录' },
  { value: '0', label: '未登录' },
]

export function YunkeCredentialsPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<YunkeCredential | null>(null)

  // 创建表单
  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      phone: '',
      password: '',
      company_code: '',
      company_name: '',
      domain: '',
    },
  })

  // 更新表单
  const updateForm = useForm<UpdateFormData>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      phone: '',
      password: '',
      company_code: '',
      company_name: '',
      domain: '',
    },
  })

  // 查询账号凭证列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['yunke-credentials', page, pageSize, statusFilter],
    queryFn: async () => {
      const params: { status?: number; skip?: number; limit?: number } = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      }
      if (statusFilter !== 'all') {
        params.status = parseInt(statusFilter)
      }
      return yunkeCredentialsApi.getCredentials(params)
    },
  })

  const credentials = data?.items || []
  const total = data?.total || 0

  // 创建账号
  const createMutation = useMutation({
    mutationFn: yunkeCredentialsApi.createCredential,
    onSuccess: () => {
      toast.success('账号创建成功')
      setCreateDrawerOpen(false)
      createForm.reset()
      queryClient.invalidateQueries({ queryKey: ['yunke-credentials'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败')
    },
  })

  // 更新账号
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFormData }) =>
      yunkeCredentialsApi.updateCredential(id, {
        phone: data.phone,
        password: data.password || undefined,
        company_code: data.company_code,
        company_name: data.company_name,
        domain: data.domain || undefined,
      }),
    onSuccess: () => {
      toast.success('更新成功')
      setEditDrawerOpen(false)
      setSelectedCredential(null)
      updateForm.reset()
      queryClient.invalidateQueries({ queryKey: ['yunke-credentials'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败')
    },
  })

  // 删除账号
  const deleteMutation = useMutation({
    mutationFn: yunkeCredentialsApi.deleteCredential,
    onSuccess: () => {
      toast.success('账号删除成功')
      setDeleteDialogOpen(false)
      setSelectedCredential(null)
      queryClient.invalidateQueries({ queryKey: ['yunke-credentials'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })

  // 登录/刷新
  const loginMutation = useMutation({
    mutationFn: yunkeCredentialsApi.loginCredential,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('登录成功')
      } else {
        toast.error(result.message || '登录失败')
      }
      queryClient.invalidateQueries({ queryKey: ['yunke-credentials'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '登录失败')
    },
  })

  // 列定义
  const columns: ColumnDef<YunkeCredential>[] = useMemo(
    () => [
      {
        accessorKey: 'phone',
        header: '手机号',
        size: 150,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-28" />
          }
          return (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{row.original.phone}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'company_name',
        header: '公司',
        size: 200,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-10 w-40" />
          }
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{row.original.company_name || '-'}</div>
                <div className="text-xs text-muted-foreground">
                  {row.original.company_code || '-'}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: '状态',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          const isLoggedIn = row.original.status === 1
          return (
            <Badge variant={isLoggedIn ? 'default' : 'secondary'} className="gap-1">
              {isLoggedIn ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {isLoggedIn ? '已登录' : '未登录'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'last_login',
        header: '最后登录',
        size: 180,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          if (!row.original.last_login) {
            return <span className="text-muted-foreground">从未登录</span>
          }
          return (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {formatTime(row.original.last_login)}
            </div>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        size: 160,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-28" />
          }
          return row.original.created_at ? formatTime(row.original.created_at) : '-'
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 120,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-20" />
          }
          const credential = row.original
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLogin(credential)}
                disabled={loginMutation.isPending}
                title="登录"
              >
                <LogIn className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(credential)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteClick(credential)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [loginMutation.isPending]
  )

  // 表格数据
  const tableData = isLoading ? createSkeletonData(5) : credentials

  // 过滤数据（本地搜索）
  const filteredData = useMemo(() => {
    if (!searchValue) return tableData
    const search = searchValue.toLowerCase()
    return tableData.filter(
      (item) =>
        item.phone?.toLowerCase().includes(search) ||
        item.company_name?.toLowerCase().includes(search) ||
        item.company_code?.toLowerCase().includes(search)
    )
  }, [tableData, searchValue])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    getRowId: (row) => row.id,
  })

  // 处理函数
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleCreateClick = () => {
    createForm.reset()
    setCreateDrawerOpen(true)
  }

  const handleCreateSubmit = (data: CreateFormData) => {
    createMutation.mutate(data)
  }

  const handleEdit = (credential: YunkeCredential) => {
    setSelectedCredential(credential)
    updateForm.reset({
      phone: credential.phone,
      password: '',
      company_code: credential.company_code || '',
      company_name: credential.company_name || '',
      domain: '',
    })
    setEditDrawerOpen(true)
  }

  const handleUpdateSubmit = (data: UpdateFormData) => {
    if (selectedCredential) {
      updateMutation.mutate({ id: selectedCredential.id, data })
    }
  }

  const handleDeleteClick = (credential: YunkeCredential) => {
    setSelectedCredential(credential)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedCredential) {
      deleteMutation.mutate(selectedCredential.id)
    }
  }

  const handleLogin = (credential: YunkeCredential) => {
    loginMutation.mutate(credential.id)
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">云客账号凭证管理</h1>
            <p className="text-sm text-muted-foreground">
              管理云客登录凭证，支持创建、编辑密码、手动登录
            </p>
          </div>
          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            添加账号
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索手机号或公司名..."
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
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              搜索
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="刷新">
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
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
        {total > 0 && (
          <SimplePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
      </div>

      {/* 创建账号对话框 */}
      <Dialog open={createDrawerOpen} onOpenChange={setCreateDrawerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>添加云客账号</DialogTitle>
            <DialogDescription>
              添加新的云客账号凭证，如果手机号已存在则更新密码
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(handleCreateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>手机号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入手机号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="请输入密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="company_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>公司代码</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入公司代码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>公司名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入公司名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>域名（可选）</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入域名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDrawerOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 编辑账号对话框 */}
      <Dialog open={editDrawerOpen} onOpenChange={setEditDrawerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑账号</DialogTitle>
            <DialogDescription>
              修改账号信息，留空密码则不修改密码
            </DialogDescription>
          </DialogHeader>
          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(handleUpdateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={updateForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>手机号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入手机号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新密码（可选）</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="留空则不修改密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="company_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>公司代码</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入公司代码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>公司名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入公司名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>域名（可选）</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入域名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDrawerOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? '更新中...' : '更新'}
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
              确定要删除账号 {selectedCredential?.phone} 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
