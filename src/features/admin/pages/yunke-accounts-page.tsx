/**
 * 云客账号管理页面
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User,
  Phone,
  Building2,
  Search,
  RefreshCw,
  Key,
  Link,
  Unlink,
  Copy,
  CheckCircle,
  XCircle,
  PauseCircle,
  LogIn,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { yunkeAdminApi } from '../api'
import type { YunkeSubAccount, YunkeAvailableEmployee, YunkePasswordResetResponse } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

// 登录表单验证
const loginFormSchema = z.object({
  phone: z.string().min(1, '请输入手机号').regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
  password: z.string().min(6, '密码至少6位'),
})

type LoginFormData = z.infer<typeof loginFormSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): YunkeSubAccount[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    phone: '',
    username: '',
    real_name: '',
    status: 'active' as const,
  }))
}

// 状态选项
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'paused', label: '暂停' },
  { value: 'inactive', label: '停用' },
]

export function YunkeAccountsPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [bindDialogOpen, setBindDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'resetPassword' | 'unbind' | 'autoSync' | 'batchLogin'
    account?: YunkeSubAccount
  } | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<YunkeSubAccount | null>(null)
  const [passwordResult, setPasswordResult] = useState<YunkePasswordResetResponse | null>(null)
  const [loginStatusMap, setLoginStatusMap] = useState<Map<string, { is_logged_in: boolean; message: string }>>(new Map())

  // 登录表单
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  })

  // 查询云客子账号列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['yunke-sub-accounts', page, pageSize, searchValue, statusFilter],
    queryFn: async () => {
      const params: { page?: number; page_size?: number; real_name?: string; auth_status?: string } = {
        page,
        page_size: pageSize,
      }
      if (searchValue) params.real_name = searchValue
      if (statusFilter !== 'all') params.auth_status = statusFilter
      return yunkeAdminApi.getSubAccounts(params)
    },
  })

  // 查询可绑定员工列表
  const { data: employeesData } = useQuery({
    queryKey: ['yunke-available-employees'],
    queryFn: () => yunkeAdminApi.getAvailableEmployees(),
  })

  const employees = employeesData || []
  const accounts = data?.users || []
  const total = data?.total || 0

  // 管理员登录
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => yunkeAdminApi.login({ phone: data.phone, password: data.password }),
    onSuccess: () => {
      toast.success('云客管理员登录成功')
      setLoginDialogOpen(false)
      loginForm.reset()
      refetch()
    },
    onError: (error: Error) => {
      toast.error(error.message || '登录失败')
    },
  })

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: (data: { yunke_user_id: string; phone: string }) => yunkeAdminApi.resetPassword(data),
    onSuccess: (response) => {
      setPasswordResult(response)
      setPasswordDialogOpen(true)
      toast.success('密码重置成功')
    },
    onError: (error: Error) => {
      toast.error(error.message || '密码重置失败')
    },
  })

  // 绑定员工
  const bindMutation = useMutation({
    mutationFn: (data: { yunke_phone: string; yunke_user_id: string; employee_id: string }) =>
      yunkeAdminApi.bindEmployee(data),
    onSuccess: () => {
      toast.success('绑定成功')
      setBindDialogOpen(false)
      setSelectedAccount(null)
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '绑定失败')
    },
  })

  // 解绑员工
  const unbindMutation = useMutation({
    mutationFn: (data: { employee_id: string }) => yunkeAdminApi.unbindEmployee(data),
    onSuccess: () => {
      toast.success('解绑成功')
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '解绑失败')
    },
  })

  // 自动同步绑定
  const autoSyncMutation = useMutation({
    mutationFn: () => yunkeAdminApi.autoSyncBindings(),
    onSuccess: (response) => {
      if (response.matched > 0) {
        toast.success(`同步完成：成功匹配并绑定 ${response.matched}/${response.total} 个账号`)
      } else {
        toast.info('未找到可匹配的账号，请检查姓名是否一致')
      }
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '同步失败')
    },
  })

  // 检查登录状态
  const checkLoginStatusMutation = useMutation({
    mutationFn: () => yunkeAdminApi.checkAllLoginStatus(),
    onSuccess: (response) => {
      const newMap = new Map<string, { is_logged_in: boolean; message: string }>()
      response.details.forEach((detail) => {
        newMap.set(detail.employee_id, {
          is_logged_in: detail.is_logged_in,
          message: detail.message,
        })
      })
      setLoginStatusMap(newMap)
      toast.info(`检查完成：${response.logged_in}/${response.total} 个账号已登录`)
    },
    onError: (error: Error) => {
      toast.error(error.message || '检查登录状态失败')
    },
  })

  // 批量更新登录
  const batchLoginMutation = useMutation({
    mutationFn: () => yunkeAdminApi.batchUpdateLogin(),
    onSuccess: (response) => {
      const { success, failed, skipped } = response
      if (success > 0) {
        toast.success(`成功更新 ${success} 个账号的登录状态`)
      }
      if (failed > 0) {
        toast.warning(`${failed} 个账号更新失败`)
      }
      if (skipped > 0) {
        toast.info(`${skipped} 个账号被跳过（未保存密码）`)
      }
      setTimeout(() => checkLoginStatusMutation.mutate(), 1000)
    },
    onError: (error: Error) => {
      toast.error(error.message || '批量更新失败')
    },
  })

  // 状态图标映射
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { icon: typeof CheckCircle; variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      active: { icon: CheckCircle, variant: 'default', label: '正常' },
      paused: { icon: PauseCircle, variant: 'secondary', label: '暂停' },
      inactive: { icon: XCircle, variant: 'destructive', label: '停用' },
    }
    return statusMap[status] || statusMap.active
  }

  // 列定义
  const columns: ColumnDef<YunkeSubAccount>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="全选"
          />
        ),
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-4" />
          }
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="选择行"
            />
          )
        },
        size: 40,
      },
      {
        accessorKey: 'username',
        header: '账号信息',
        size: 200,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-10 w-40" />
          }
          return (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">{row.original.real_name || row.original.username}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{row.original.phone || row.original.username}</span>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'department_name',
        header: '部门',
        size: 150,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-20" />
          }
          return (
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{row.original.department_name || '未分配'}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'position',
        header: '职位',
        size: 120,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          return (
            <Badge variant="outline">{row.original.position || '未设置'}</Badge>
          )
        },
      },
      {
        id: 'login_status',
        header: '云客登录状态',
        size: 120,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          const boundEmployee = row.original.bound_employee
          if (!boundEmployee) {
            return <Badge variant="outline">未绑定</Badge>
          }

          const status = loginStatusMap.get(boundEmployee.id)
          if (checkLoginStatusMutation.isPending) {
            return <span className="text-xs text-muted-foreground">检查中...</span>
          }
          if (!status) {
            return <Badge variant="outline">未检查</Badge>
          }

          return (
            <Badge variant={status.is_logged_in ? 'default' : 'destructive'} className="gap-1">
              {status.is_logged_in ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {status.is_logged_in ? '已登录' : '未登录'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'bound_employee',
        header: '绑定用户',
        size: 180,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-32" />
          }
          const bound = row.original.bound_employee
          if (bound) {
            return (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Link className="h-3 w-3 mr-1" />
                  {bound.name}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleUnbindClick(row.original)}
                >
                  <Unlink className="h-3 w-3" />
                </Button>
              </div>
            )
          }
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleBindClick(row.original)}
            >
              <Link className="h-3 w-3 mr-1" />
              绑定员工
            </Button>
          )
        },
      },
      {
        accessorKey: 'status',
        header: '状态',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-14" />
          }
          const statusInfo = getStatusInfo(row.original.status)
          const Icon = statusInfo.icon
          return (
            <Badge variant={statusInfo.variant} className="gap-1">
              <Icon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'last_login_time',
        header: '最后登录',
        size: 160,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-28" />
          }
          return row.original.last_login_time ? formatTime(row.original.last_login_time) : '从未登录'
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-20" />
          }
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResetPasswordClick(row.original)}
            >
              <Key className="h-4 w-4 mr-1" />
              重置密码
            </Button>
          )
        },
      },
    ],
    [loginStatusMap, checkLoginStatusMutation.isPending]
  )

  // 表格数据
  const tableData = isLoading ? createSkeletonData(5) : accounts

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.id,
  })

  const selectedCount = Object.keys(rowSelection).length

  // 处理函数
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const handleRefresh = () => {
    refetch()
    checkLoginStatusMutation.mutate()
  }

  const handleLoginClick = () => {
    setLoginDialogOpen(true)
  }

  const handleLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data)
  }

  const handleResetPasswordClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setConfirmAction({ type: 'resetPassword', account })
    setConfirmDialogOpen(true)
  }

  const handleBindClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setBindDialogOpen(true)
  }

  const handleUnbindClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setConfirmAction({ type: 'unbind', account })
    setConfirmDialogOpen(true)
  }

  const handleAutoSync = () => {
    setConfirmAction({ type: 'autoSync' })
    setConfirmDialogOpen(true)
  }

  const handleBatchLogin = () => {
    setConfirmAction({ type: 'batchLogin' })
    setConfirmDialogOpen(true)
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return

    switch (confirmAction.type) {
      case 'resetPassword':
        if (confirmAction.account) {
          resetPasswordMutation.mutate({
            yunke_user_id: confirmAction.account.id,
            phone: confirmAction.account.phone,
          })
        }
        break
      case 'unbind':
        if (confirmAction.account?.bound_employee) {
          unbindMutation.mutate({ employee_id: confirmAction.account.bound_employee.id })
        }
        break
      case 'autoSync':
        autoSyncMutation.mutate()
        break
      case 'batchLogin':
        batchLoginMutation.mutate()
        break
    }
    setConfirmDialogOpen(false)
    setConfirmAction(null)
  }

  const handleBindEmployee = (employeeId: string) => {
    if (!selectedAccount) return
    bindMutation.mutate({
      yunke_phone: selectedAccount.phone,
      yunke_user_id: selectedAccount.id,
      employee_id: employeeId,
    })
  }

  const handleCopyToClipboard = async (text: string, label: string) => {
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(text)
    if (success) {
      toast.success(`${label}已复制到剪贴板`)
    } else {
      toast.error('复制失败')
    }
  }

  const copyAllInfo = async () => {
    if (!passwordResult || !selectedAccount) return
    const allInfo = `姓名：${selectedAccount.real_name}\n账号：${selectedAccount.username}\n密码：${passwordResult.new_password}`
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(allInfo)
    if (success) {
      toast.success('已复制所有信息到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  const getConfirmMessage = () => {
    if (!confirmAction) return { title: '', description: '' }

    switch (confirmAction.type) {
      case 'resetPassword':
        return {
          title: '确认重置密码',
          description: `确定要重置用户 ${confirmAction.account?.real_name}（${confirmAction.account?.username}）的云客密码吗？系统将自动生成新的随机密码。`,
        }
      case 'unbind':
        return {
          title: '确认解绑',
          description: `确定要解绑用户 ${confirmAction.account?.real_name} 与员工 ${confirmAction.account?.bound_employee?.name} 的绑定关系吗？`,
        }
      case 'autoSync':
        return {
          title: '一键同步',
          description: '将自动匹配云客账号和CRM员工的姓名，如果姓名一致则自动绑定。是否继续？',
        }
      case 'batchLogin':
        return {
          title: '确认批量更新登录',
          description: '将为所有已绑定的员工执行云客登录并更新cookies，该操作可能需要一些时间。是否继续？',
        }
    }
  }

  const confirmMessage = getConfirmMessage()

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">云客子账号管理</h1>
            <p className="text-sm text-muted-foreground">
              管理云客子账号、绑定员工、重置密码
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleLoginClick}>
              <LogIn className="mr-2 h-4 w-4" />
              云客管理员登录
            </Button>
            <Button variant="outline" onClick={handleAutoSync} disabled={autoSyncMutation.isPending}>
              <Zap className="mr-2 h-4 w-4" />
              一键同步
            </Button>
            <Button
              variant="outline"
              onClick={() => checkLoginStatusMutation.mutate()}
              disabled={checkLoginStatusMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              检查登录状态
            </Button>
            <Button
              variant="outline"
              onClick={handleBatchLogin}
              disabled={batchLoginMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              一键更新登录
            </Button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="输入姓名搜索..."
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
            {selectedCount > 0 && (
              <Badge variant="secondary">
                已选择 {selectedCount} 个账号
              </Badge>
            )}
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
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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

      {/* 云客管理员登录对话框 */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>云客管理员登录</DialogTitle>
            <DialogDescription>
              请输入云客管理员的手机号和密码
            </DialogDescription>
          </DialogHeader>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>手机号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入云客管理员手机号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setLoginDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? '登录中...' : '登录'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 绑定员工对话框 */}
      <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>绑定员工</DialogTitle>
            <DialogDescription>
              为云客账号 {selectedAccount?.real_name}（{selectedAccount?.phone}）选择要绑定的员工
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => handleBindEmployee(emp.id)}
              >
                <div>
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {emp.username} · {emp.campus_name || '未分配校区'}
                  </div>
                  {emp.bound_yunke && (
                    <div className="text-xs text-orange-500">
                      已绑定: {emp.bound_yunke.phone}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" disabled={bindMutation.isPending}>
                  选择
                </Button>
              </div>
            ))}
            {employees.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无可绑定的员工
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindDialogOpen(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 密码重置结果对话框 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>密码重置成功</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm font-medium">姓名：</span>
              <div className="flex items-center gap-2">
                <span>{selectedAccount?.real_name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopyToClipboard(selectedAccount?.real_name || '', '姓名')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm font-medium">账号：</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded">{selectedAccount?.username}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopyToClipboard(selectedAccount?.username || '', '账号')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm font-medium">新密码：</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded font-bold">{passwordResult?.new_password}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopyToClipboard(passwordResult?.new_password || '', '密码')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={copyAllInfo}>
              <Copy className="mr-2 h-4 w-4" />
              一键复制（姓名/账号/密码）
            </Button>

            {passwordResult?.bound_employee ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>密码已同步</AlertTitle>
                <AlertDescription>
                  密码已同步到员工：{passwordResult.bound_employee.name}（{passwordResult.bound_employee.username}）
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default">
                <AlertDescription>
                  该云客账号未绑定员工，密码未同步到系统用户
                </AlertDescription>
              </Alert>
            )}

            <Alert variant="destructive">
              <AlertDescription>
                请立即将新密码告知用户，并提醒其首次登录后修改密码。
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setPasswordDialogOpen(false)}>
              我已记录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 确认对话框 */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmMessage.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
