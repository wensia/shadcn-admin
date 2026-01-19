/**
 * 云客子账号管理页面
 * 按凭证分 Tab 展示子账号
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
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { yunkeApi, yunkeCredentialsApi } from '../api'
import type { YunkeSubAccount, YunkeAvailableEmployee, YunkePasswordResetResponse, YunkeCredential } from '../types'

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

// 子账号表格组件
function SubAccountsTable({
  credential,
  searchValue,
}: {
  credential: YunkeCredential
  searchValue: string
}) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [bindDialogOpen, setBindDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'resetPassword' | 'unbind'
    account?: YunkeSubAccount
  } | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<YunkeSubAccount | null>(null)
  const [passwordResult, setPasswordResult] = useState<YunkePasswordResetResponse | null>(null)
  const [loginStatusMap, setLoginStatusMap] = useState<Map<string, { is_logged_in: boolean; message: string }>>(new Map())

  // 查询子账号列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['yunke-sub-accounts', credential.id, page, pageSize, searchValue],
    queryFn: async () => {
      const params: { page?: number; page_size?: number; real_name?: string } = {
        page,
        page_size: pageSize,
      }
      if (searchValue) params.real_name = searchValue
      return yunkeCredentialsApi.getSubAccountsByCredential(credential.id, params)
    },
    enabled: credential.status === 1,
  })

  // 查询可绑定员工列表
  const { data: employeesData } = useQuery({
    queryKey: ['yunke-available-employees'],
    queryFn: () => yunkeApi.getAvailableEmployees(),
  })

  const employees = employeesData || []
  const accounts = data?.users || []
  const total = data?.total || 0

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: (data: { yunke_user_id: string; phone: string }) => yunkeApi.resetPassword(data),
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
      yunkeApi.bindEmployee(data),
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
    mutationFn: (data: { employee_id: string }) => yunkeApi.unbindEmployee(data),
    onSuccess: () => {
      toast.success('解绑成功')
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '解绑失败')
    },
  })

  // 状态图标映射
  const getStatusInfo = (status: string | number) => {
    const statusMap: Record<string, { icon: typeof CheckCircle; variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      active: { icon: CheckCircle, variant: 'default', label: '正常' },
      '1': { icon: CheckCircle, variant: 'default', label: '正常' },
      paused: { icon: PauseCircle, variant: 'secondary', label: '暂停' },
      inactive: { icon: XCircle, variant: 'destructive', label: '停用' },
      '0': { icon: XCircle, variant: 'destructive', label: '停用' },
    }
    return statusMap[String(status)] || statusMap.active
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
            <Badge variant="outline">{row.original.position || row.original.role_name || '未设置'}</Badge>
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
        accessorKey: 'login_status',
        header: '登录状态',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          const loginStatus = row.original.login_status
          const bound = row.original.bound_employee

          // 未绑定员工
          if (!bound) {
            return (
              <span className="text-xs text-muted-foreground">未绑定</span>
            )
          }

          // 已登录
          if (loginStatus?.is_logged_in) {
            return (
              <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
                <CheckCircle className="h-3 w-3" />
                已登录
              </Badge>
            )
          }

          // 未登录但有密码
          if (loginStatus?.has_password) {
            return (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                未登录
              </Badge>
            )
          }

          // 无密码
          return (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              无密码
            </Badge>
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
    [loginStatusMap]
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

  // 处理函数
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
    }
  }

  const confirmMessage = getConfirmMessage()

  // 凭证未登录时显示提示
  if (credential.status !== 1) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">凭证未登录</p>
        <p className="text-sm">请先在「账号凭证管理」页面登录此凭证</p>
      </div>
    )
  }

  return (
    <>
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
    </>
  )
}

// 主页面组件
export function YunkeAccountsPage() {
  const queryClient = useQueryClient()
  const [searchValue, setSearchValue] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeTab, setActiveTab] = useState<string>('')

  // 查询凭证列表
  const { data: credentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ['yunke-credentials-for-tabs'],
    queryFn: () => yunkeCredentialsApi.getCredentials({ limit: 100 }),
  })

  const credentials = credentialsData?.items || []

  // 设置默认 Tab
  useMemo(() => {
    if (credentials.length > 0 && !activeTab) {
      setActiveTab(credentials[0].id)
    }
  }, [credentials, activeTab])

  const handleSearch = () => {
    setSearchValue(searchInput)
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
    queryClient.invalidateQueries({ queryKey: ['yunke-credentials-for-tabs'] })
  }

  // 加载状态
  if (credentialsLoading) {
    return (
      <Main fixed>
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">云客子账号管理</h1>
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </Main>
    )
  }

  // 无凭证时显示提示
  if (credentials.length === 0) {
    return (
      <Main fixed>
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">云客子账号管理</h1>
              <p className="text-sm text-muted-foreground">管理云客子账号、绑定员工、重置密码</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium mb-2">暂无账号凭证</p>
            <p className="text-sm mb-4">请先在「账号凭证管理」页面添加云客账号</p>
            <Button variant="outline" onClick={() => window.location.href = '/yunke/credentials'}>
              前往添加凭证
            </Button>
          </div>
        </div>
      </Main>
    )
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div>
          <h1 className="text-2xl font-bold">云客子账号管理</h1>
          <p className="text-sm text-muted-foreground">
            共 {credentials.length} 个凭证，管理子账号、绑定员工、重置密码
          </p>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="输入姓名搜索..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab 切换 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="border-b">
            <TabsList className="h-auto bg-transparent p-0 gap-0">
              {credentials.map((cred) => (
                <TabsTrigger
                  key={cred.id}
                  value={cred.id}
                  className="relative rounded-none border-b-2 border-transparent px-4 py-2.5 font-medium text-muted-foreground transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        cred.status === 1 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="max-w-[180px] truncate">
                      {cred.company_name || cred.phone}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {credentials.map((cred) => (
            <TabsContent
              key={cred.id}
              value={cred.id}
              className="flex-1 flex flex-col gap-4 mt-4 min-h-0"
            >
              {/* 凭证信息卡片 */}
              <div className="flex items-center gap-6 px-4 py-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{cred.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{cred.company_name || '未设置公司'}</span>
                </div>
                <Badge
                  variant={cred.status === 1 ? 'default' : 'destructive'}
                  className="ml-auto"
                >
                  {cred.status === 1 ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      已登录
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      未登录
                    </>
                  )}
                </Badge>
              </div>

              {/* 子账号表格 */}
              <SubAccountsTable credential={cred} searchValue={searchValue} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Main>
  )
}
