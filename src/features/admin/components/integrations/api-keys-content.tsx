/**
 * API密钥管理 - Tab 内容组件
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
  Key,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'

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
  FormDescription,
} from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { apiKeysApi } from '../../api'
import type { EmployeeApiKeyInfo, ApiKeyCreateResponse, ApiKeyInfo } from '../../types'
import { DEFAULT_API_SCOPES } from '../../types'
import { formatTime } from '@/lib/utils/time'

// 创建密钥表单验证
const createFormSchema = z.object({
  name: z.string().min(1, '请输入密钥名称').max(100, '名称最多100个字符'),
  expires_in_days: z.coerce.number().int().min(1, '至少1天').max(3650, '最长10年').default(365),
  scopes: z.record(z.array(z.string())).default({}),
})

type CreateFormData = z.infer<typeof createFormSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): EmployeeApiKeyInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    employee_id: `${SKELETON_PREFIX}${i}`,
    username: '',
    name: '',
    is_active: true,
    has_api_key: false,
  }))
}

// 权限名称映射
const PERMISSION_LABELS: Record<string, string> = {
  read: '查看',
  create: '创建',
  update: '更新',
  delete: '删除',
}

export function ApiKeysContent() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [keyResultDialogOpen, setKeyResultDialogOpen] = useState(false)
  const [scopesDialogOpen, setScopesDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeApiKeyInfo | null>(null)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResponse | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<Record<string, string[]>>({})
  // 配置密钥对话框相关状态
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [employeeSearchValue, setEmployeeSearchValue] = useState('')
  const [configSelectedEmployee, setConfigSelectedEmployee] = useState<EmployeeApiKeyInfo | null>(null)

  // 表单
  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: '',
      expires_in_days: 365,
      scopes: {},
    },
  })

  // 查询已配置密钥的员工列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-api-keys', page, pageSize, searchValue],
    queryFn: async () => {
      const params: { page?: number; size?: number; search?: string; has_api_key?: boolean } = {
        page,
        size: pageSize,
        has_api_key: true, // 只查询已配置密钥的用户
      }
      if (searchValue) params.search = searchValue
      return apiKeysApi.list(params)
    },
  })

  // 查询未配置密钥的员工列表（用于配置密钥对话框）
  const { data: availableEmployees, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['admin-api-keys-available', employeeSearchValue],
    queryFn: async () => {
      const params: { page?: number; size?: number; search?: string; has_api_key?: boolean } = {
        page: 1,
        size: 50,
        has_api_key: false, // 只查询未配置密钥的用户
      }
      if (employeeSearchValue) params.search = employeeSearchValue
      return apiKeysApi.list(params)
    },
    enabled: configDialogOpen, // 只在对话框打开时查询
  })

  const employees = data?.items || []
  const total = data?.total || 0

  // 创建密钥
  const createMutation = useMutation({
    mutationFn: (data: { employeeId: string; formData: CreateFormData }) =>
      apiKeysApi.create(data.employeeId, {
        name: data.formData.name,
        scopes: Object.keys(data.formData.scopes).length > 0 ? data.formData.scopes : undefined,
        expires_in_days: data.formData.expires_in_days,
      }),
    onSuccess: (response) => {
      setCreatedKey(response)
      setKeyResultDialogOpen(true)
      createForm.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败')
    },
  })

  // 重新生成密钥
  const regenerateMutation = useMutation({
    mutationFn: (employeeId: string) => apiKeysApi.regenerate(employeeId),
    onSuccess: (response) => {
      setCreatedKey(response)
      setKeyResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '重新生成失败')
    },
  })

  // 删除密钥
  const deleteMutation = useMutation({
    mutationFn: (employeeId: string) => apiKeysApi.delete(employeeId),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setSelectedEmployee(null)
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })

  // 更新权限
  const updateScopesMutation = useMutation({
    mutationFn: (data: { employeeId: string; scopes: Record<string, string[]> }) =>
      apiKeysApi.updateScopes(data.employeeId, { scopes: data.scopes }),
    onSuccess: () => {
      toast.success('权限更新成功')
      setScopesDialogOpen(false)
      setSelectedEmployee(null)
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新权限失败')
    },
  })

  // 渲染权限标签
  const renderScopes = (apiKey?: ApiKeyInfo) => {
    if (!apiKey?.scopes || Object.keys(apiKey.scopes).length === 0) {
      return <Badge variant="outline">无权限</Badge>
    }

    const scopeEntries = Object.entries(apiKey.scopes)
    const displayScopes = scopeEntries.slice(0, 2)
    const remainingCount = scopeEntries.length - 2

    return (
      <div className="flex flex-wrap gap-1">
        {displayScopes.map(([scope, permissions]) => {
          const scopeInfo = DEFAULT_API_SCOPES[scope as keyof typeof DEFAULT_API_SCOPES]
          return (
            <Badge key={scope} variant="secondary" className="text-xs">
              {scopeInfo?.description || scope}
              <span className="ml-1 text-muted-foreground">
                ({permissions.length})
              </span>
            </Badge>
          )
        })}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount}
          </Badge>
        )}
      </div>
    )
  }

  // 列定义
  const columns: ColumnDef<EmployeeApiKeyInfo>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '员工信息',
        size: 180,
        cell: ({ row }) => {
          if (row.original.employee_id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-10 w-36" />
          }
          return (
            <div>
              <div className="font-medium">{row.original.name}</div>
              <div className="text-sm text-muted-foreground">{row.original.username}</div>
            </div>
          )
        },
      },
      {
        id: 'api_key_status',
        header: 'API密钥状态',
        size: 140,
        cell: ({ row }) => {
          if (row.original.employee_id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-20" />
          }
          if (!row.original.has_api_key) {
            return <Badge variant="outline">未创建</Badge>
          }
          const apiKey = row.original.api_key
          if (apiKey?.is_expired) {
            return (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                已过期
              </Badge>
            )
          }
          return (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              有效
            </Badge>
          )
        },
      },
      {
        accessorKey: 'api_key.name',
        header: '密钥名称',
        size: 150,
        cell: ({ row }) => {
          if (row.original.employee_id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-24" />
          }
          if (!row.original.has_api_key) {
            return <span className="text-muted-foreground">-</span>
          }
          return (
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span>{row.original.api_key?.name || '-'}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'api_key.prefix',
        header: '密钥前缀',
        size: 120,
        cell: ({ row }) => {
          if (row.original.employee_id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-20" />
          }
          if (!row.original.api_key?.prefix) {
            return <span className="text-muted-foreground">-</span>
          }
          return (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
              {row.original.api_key.prefix}...
            </code>
          )
        },
      },
      {
        id: 'scopes',
        header: '权限范围',
        size: 200,
        cell: ({ row }) => {
          if (row.original.employee_id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          if (!row.original.has_api_key) {
            return <span className="text-muted-foreground">-</span>
          }
          return renderScopes(row.original.api_key)
        },
      },
      {
        accessorKey: 'api_key.expires_at',
        header: '过期时间',
        size: 160,
        cell: ({ row }) => {
          if (row.original.employee_id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-28" />
          }
          if (!row.original.api_key?.expires_at) {
            return <span className="text-muted-foreground">-</span>
          }
          return (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className={row.original.api_key.is_expired ? 'text-destructive' : ''}>
                {formatTime(row.original.api_key.expires_at)}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'api_key.last_used_at',
        header: '最后使用',
        size: 160,
        cell: ({ row }) => {
          if (row.original.employee_id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-28" />
          }
          if (!row.original.api_key?.last_used_at) {
            return <span className="text-muted-foreground">从未使用</span>
          }
          return formatTime(row.original.api_key.last_used_at)
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 140,
        cell: ({ row }) => {
          if (row.original.employee_id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-24" />
          }

          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleScopesClick(row.original)}
                title="编辑权限"
              >
                <Shield className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRegenerateClick(row.original)}
                title="重新生成"
              >
                <RefreshCw className="h-4 w-4" />
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

  // 表格数据
  const tableData = isLoading ? createSkeletonData(5) : employees

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    getRowId: (row) => row.employee_id,
  })

  // 处理函数
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const handleRegenerateClick = (employee: EmployeeApiKeyInfo) => {
    setSelectedEmployee(employee)
    regenerateMutation.mutate(employee.employee_id)
  }

  const handleDeleteClick = (employee: EmployeeApiKeyInfo) => {
    setSelectedEmployee(employee)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!selectedEmployee) return
    deleteMutation.mutate(selectedEmployee.employee_id)
  }

  const handleScopesClick = (employee: EmployeeApiKeyInfo) => {
    setSelectedEmployee(employee)
    setSelectedScopes(employee.api_key?.scopes || {})
    setScopesDialogOpen(true)
  }

  const handleScopesSubmit = () => {
    if (!selectedEmployee) return
    updateScopesMutation.mutate({
      employeeId: selectedEmployee.employee_id,
      scopes: selectedScopes,
    })
  }

  const toggleScope = (scope: string, permission: string) => {
    setSelectedScopes((prev) => {
      const current = prev[scope] || []
      if (current.includes(permission)) {
        const newPermissions = current.filter((p) => p !== permission)
        if (newPermissions.length === 0) {
          const { [scope]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [scope]: newPermissions }
      } else {
        return { ...prev, [scope]: [...current, permission] }
      }
    })
  }

  const handleCopyToClipboard = async (text: string) => {
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(text)
    if (success) {
      toast.success('API密钥已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        {/* 工具栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名或用户名..."
                className="pl-8"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              搜索
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="刷新">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setConfigDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            配置密钥
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

      {/* 密钥结果对话框 */}
      <Dialog open={keyResultDialogOpen} onOpenChange={setKeyResultDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              API密钥已生成
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>重要提示</AlertTitle>
              <AlertDescription>
                请立即复制并安全保存此API密钥，它只会显示一次！关闭此对话框后将无法再次查看完整密钥。
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                <span className="text-sm font-medium">员工：</span>
                <span>{createdKey?.name}（{createdKey?.username}）</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                <span className="text-sm font-medium">密钥名称：</span>
                <span>{createdKey?.info.name}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                <span className="text-sm font-medium">API密钥：</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm break-all flex-1">
                      {showKey ? createdKey?.api_key : '••••••••••••••••••••••••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCopyToClipboard(createdKey?.api_key || '')}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    复制API密钥
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setKeyResultDialogOpen(false)
              setCreatedKey(null)
              setShowKey(false)
            }}>
              我已安全保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑权限对话框 */}
      <Dialog open={scopesDialogOpen} onOpenChange={setScopesDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>编辑API密钥权限</DialogTitle>
            <DialogDescription>
              修改员工 {selectedEmployee?.name} 的API密钥权限范围
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 space-y-3">
            {Object.entries(DEFAULT_API_SCOPES).map(([scope, info]) => (
              <div key={scope} className="border rounded-lg p-3">
                <div className="font-medium mb-2">{info.description}</div>
                <div className="flex flex-wrap gap-2">
                  {info.permissions.map((permission) => {
                    const isChecked = selectedScopes[scope]?.includes(permission)
                    return (
                      <label
                        key={permission}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleScope(scope, permission)}
                        />
                        <span className="text-sm">
                          {PERMISSION_LABELS[permission] || permission}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
            <Button type="button" variant="outline" onClick={() => setScopesDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleScopesSubmit} disabled={updateScopesMutation.isPending}>
              {updateScopesMutation.isPending ? '保存中...' : '保存权限'}
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
              确定要删除员工 {selectedEmployee?.name} 的API密钥吗？删除后，使用该密钥的所有应用将无法访问API。
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

      {/* 配置密钥对话框 */}
      <Dialog open={configDialogOpen} onOpenChange={(open) => {
        setConfigDialogOpen(open)
        if (!open) {
          setConfigSelectedEmployee(null)
          setEmployeeSearchValue('')
          createForm.reset()
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>配置 API 密钥</DialogTitle>
            <DialogDescription>
              {configSelectedEmployee
                ? `为员工 ${configSelectedEmployee.name}（${configSelectedEmployee.username}）创建 API 密钥`
                : '选择一个员工来配置 API 密钥'}
            </DialogDescription>
          </DialogHeader>

          {!configSelectedEmployee ? (
            // 员工选择步骤
            <div className="flex-1 overflow-hidden px-6 pb-6 flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索员工姓名或用户名..."
                  className="pl-8"
                  value={employeeSearchValue}
                  onChange={(e) => setEmployeeSearchValue(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-auto border rounded-md">
                {isLoadingAvailable ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (availableEmployees?.items || []).length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {employeeSearchValue ? '未找到匹配的员工' : '所有员工都已配置 API 密钥'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {(availableEmployees?.items || []).map((emp) => (
                      <div
                        key={emp.employee_id}
                        className="p-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          setConfigSelectedEmployee(emp)
                          createForm.reset({
                            name: `${emp.name}的API密钥`,
                            expires_in_days: 365,
                            scopes: {},
                          })
                        }}
                      >
                        <div>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-sm text-muted-foreground">{emp.username}</div>
                        </div>
                        <Button variant="outline" size="sm">
                          选择
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {(availableEmployees?.total || 0) > 50 && (
                <div className="text-sm text-muted-foreground text-center">
                  显示前 50 个结果，请使用搜索缩小范围
                </div>
              )}
            </div>
          ) : (
            // 创建密钥表单
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((data) => {
                  createMutation.mutate(
                    { employeeId: configSelectedEmployee.employee_id, formData: data },
                    {
                      onSuccess: (response) => {
                        setCreatedKey(response)
                        setConfigDialogOpen(false)
                        setConfigSelectedEmployee(null)
                        setEmployeeSearchValue('')
                        setKeyResultDialogOpen(true)
                        createForm.reset()
                        queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
                        queryClient.invalidateQueries({ queryKey: ['admin-api-keys-available'] })
                      },
                    }
                  )
                })}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 overflow-y-auto px-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfigSelectedEmployee(null)}
                    >
                      ← 返回选择
                    </Button>
                  </div>

                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>密钥名称</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入密钥名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="expires_in_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>有效期（天）</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={3650} {...field} />
                        </FormControl>
                        <FormDescription>最短1天，最长10年（3650天）</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>权限范围</FormLabel>
                    <FormDescription>选择此 API 密钥可访问的功能和权限</FormDescription>
                    <div className="space-y-3 mt-2">
                      {Object.entries(DEFAULT_API_SCOPES).map(([scope, info]) => (
                        <div key={scope} className="border rounded-lg p-3">
                          <div className="font-medium mb-2">{info.description}</div>
                          <div className="flex flex-wrap gap-2">
                            {info.permissions.map((permission) => {
                              const currentScopes = createForm.watch('scopes')
                              const isChecked = currentScopes[scope]?.includes(permission)
                              return (
                                <label
                                  key={permission}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const current = currentScopes[scope] || []
                                      if (checked) {
                                        createForm.setValue('scopes', {
                                          ...currentScopes,
                                          [scope]: [...current, permission],
                                        })
                                      } else {
                                        const newPermissions = current.filter((p) => p !== permission)
                                        if (newPermissions.length === 0) {
                                          const { [scope]: _, ...rest } = currentScopes
                                          createForm.setValue('scopes', rest)
                                        } else {
                                          createForm.setValue('scopes', {
                                            ...currentScopes,
                                            [scope]: newPermissions,
                                          })
                                        }
                                      }
                                    }}
                                  />
                                  <span className="text-sm">
                                    {PERMISSION_LABELS[permission] || permission}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setConfigDialogOpen(false)
                      setConfigSelectedEmployee(null)
                      setEmployeeSearchValue('')
                    }}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? '创建中...' : '创建密钥'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
