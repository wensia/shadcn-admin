/**
 * 员工管理页面
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, User, Filter, KeyRound, RefreshCw } from 'lucide-react'
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
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { adminApi } from '../api'
import type { EmployeeItem, EmployeeCreate, EmployeeUpdate } from '../types'
import { StatusBadge, EmployeeStatusBadge, SuperuserBadge } from '../components/status-badge'

// 表单验证 schema
const formSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50, '用户名不能超过50个字符'),
  name: z.string().min(1, '请输入姓名').max(50, '姓名不能超过50个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
  phone: z.string().max(20, '手机号不能超过20个字符').optional(),
  is_active: z.boolean().default(true),
  is_superuser: z.boolean().default(false),
  joined_at: z.string().optional(),
  reports_to: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

// 快速创建表单 schema
const quickCreateSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50, '用户名不能超过50个字符'),
  name: z.string().min(1, '请输入姓名').max(50, '姓名不能超过50个字符'),
  password: z.string().min(6, '密码至少6个字符'),
})

type QuickCreateFormData = z.infer<typeof quickCreateSchema>

const pageSize = 20

export function EmployeesPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [quickCreateDialogOpen, setQuickCreateDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EmployeeItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<EmployeeItem | null>(null)
  const [resetPasswordItem, setResetPasswordItem] = useState<EmployeeItem | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      phone: '',
      is_active: true,
      is_superuser: false,
      joined_at: '',
      reports_to: '',
    },
  })

  // 快速创建表单
  const quickCreateForm = useForm<QuickCreateFormData>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: {
      username: '',
      name: '',
      password: '',
    },
  })

  // 获取员工列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-employees', page, pageSize, searchValue, statusFilter],
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
      const response = await adminApi.getEmployees(params)
      return response.data
    },
  })

  // 获取员工列表用于上级选择
  const { data: managersData } = useQuery({
    queryKey: ['admin-employees-managers'],
    queryFn: async () => {
      const response = await adminApi.getEmployees({ size: 100, is_active: true })
      return response.data
    },
  })

  const managers = managersData?.items || []

  // 创建员工
  const createMutation = useMutation({
    mutationFn: (data: EmployeeCreate) => adminApi.createEmployee(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })

  // 快速创建员工
  const quickCreateMutation = useMutation({
    mutationFn: (data: { username: string; name: string; password: string }) =>
      adminApi.quickCreateEmployee(data),
    onSuccess: () => {
      toast.success('创建成功')
      setQuickCreateDialogOpen(false)
      quickCreateForm.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })

  // 更新员工
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeUpdate }) =>
      adminApi.updateEmployee(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })

  // 删除员工
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteEmployee(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminApi.resetEmployeePassword(id, password),
    onSuccess: () => {
      toast.success('密码重置成功')
      setResetPasswordDialogOpen(false)
      setResetPasswordItem(null)
      setNewPassword('')
    },
    onError: (error: Error) => {
      toast.error(`密码重置失败: ${error.message}`)
    },
  })

  // 表格列定义
  const columns: ColumnDef<EmployeeItem>[] = useMemo(
    () => [
      {
        accessorKey: 'username',
        header: '用户名',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-20" />
          }
          return (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{row.original.username}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'name',
        header: '姓名',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-16" />
          }
          return row.original.name
        },
      },
      {
        accessorKey: 'phone',
        header: '手机号',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          return row.original.phone || '-'
        },
      },
      {
        accessorKey: 'email',
        header: '邮箱',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-32" />
          }
          return row.original.email || '-'
        },
      },
      {
        accessorKey: 'is_superuser',
        header: '权限',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-16" />
          }
          return <SuperuserBadge isSuperuser={row.original.is_superuser} />
        },
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-14" />
          }
          return <EmployeeStatusBadge isActive={row.original.is_active} />
        },
      },
      {
        accessorKey: 'joined_at',
        header: '入职日期',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          return row.original.joined_at
            ? new Date(row.original.joined_at).toLocaleDateString('zh-CN')
            : '-'
        },
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return (
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            )
          }
          return (
            <div className="flex gap-1">
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
                onClick={() => handleResetPassword(row.original)}
                title="重置密码"
              >
                <KeyRound className="h-4 w-4" />
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

  // 生成骨架屏数据
  const skeletonData: EmployeeItem[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `__skeleton__${i}`,
        username: '',
        name: '',
        email: '',
        phone: '',
        is_active: true,
        is_superuser: false,
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
      username: '',
      name: '',
      email: '',
      phone: '',
      is_active: true,
      is_superuser: false,
      joined_at: '',
      reports_to: '',
    })
    setDialogOpen(true)
  }

  // 处理快速创建
  const handleQuickCreate = () => {
    quickCreateForm.reset({
      username: '',
      name: '',
      password: '',
    })
    setQuickCreateDialogOpen(true)
  }

  // 处理编辑
  const handleEdit = (item: EmployeeItem) => {
    setEditingItem(item)
    form.reset({
      username: item.username,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      is_active: item.is_active,
      is_superuser: item.is_superuser,
      joined_at: item.joined_at || '',
      reports_to: item.reports_to || '',
    })
    setDialogOpen(true)
  }

  // 处理重置密码
  const handleResetPassword = (item: EmployeeItem) => {
    setResetPasswordItem(item)
    setNewPassword('')
    setResetPasswordDialogOpen(true)
  }

  // 处理删除点击
  const handleDeleteClick = (item: EmployeeItem) => {
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
    const submitData = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      joined_at: data.joined_at || undefined,
      reports_to: data.reports_to || undefined,
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: submitData as EmployeeUpdate,
      })
    } else {
      createMutation.mutate(submitData as EmployeeCreate)
    }
  }

  // 处理快速创建提交
  const handleQuickCreateSubmit = (data: QuickCreateFormData) => {
    quickCreateMutation.mutate(data)
  }

  // 处理重置密码确认
  const handleResetPasswordConfirm = () => {
    if (resetPasswordItem && newPassword) {
      resetPasswordMutation.mutate({
        id: resetPasswordItem.id,
        password: newPassword,
      })
    }
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
            <h1 className="text-2xl font-bold">员工管理</h1>
            <p className="text-sm text-muted-foreground">
              管理系统中的员工账号和权限
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleQuickCreate}>
              <Plus className="mr-2 h-4 w-4" />
              快速创建
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              新建员工
            </Button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、姓名、手机号..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}>
              <SelectTrigger className="w-[120px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">在职</SelectItem>
                <SelectItem value="inactive">离职</SelectItem>
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
        <DialogContent className="max-w-lg max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {editingItem ? '编辑员工' : '新建员工'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? '修改员工信息'
                : '创建一个新的员工账号'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入用户名"
                          {...field}
                          disabled={!!editingItem}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入手机号（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入邮箱（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="joined_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>入职日期</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reports_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>上级</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择上级（可选）" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">无</SelectItem>
                          {managers
                            .filter((m) => m.id !== editingItem?.id)
                            .map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.name} ({manager.username})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>在职状态</FormLabel>
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
                  name="is_superuser"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>超级管理员</FormLabel>
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

      {/* 快速创建对话框 */}
      <Dialog open={quickCreateDialogOpen} onOpenChange={setQuickCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>快速创建员工</DialogTitle>
            <DialogDescription>
              快速创建一个新员工账号，只需填写基本信息
            </DialogDescription>
          </DialogHeader>
          <Form {...quickCreateForm}>
            <form onSubmit={quickCreateForm.handleSubmit(handleQuickCreateSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
              <FormField
                control={quickCreateForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入用户名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={quickCreateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={quickCreateForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>初始密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="请输入初始密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
              <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickCreateDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={quickCreateMutation.isPending}
                >
                  {quickCreateMutation.isPending ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              为员工「{resetPasswordItem?.name}」设置新密码
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">新密码</label>
              <Input
                type="password"
                placeholder="请输入新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleResetPasswordConfirm}
              disabled={!newPassword || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? '重置中...' : '确认重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除员工「{deletingItem?.name}」吗？此操作不可撤销。
              删除后该员工将无法登录系统。
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
