/**
 * 员工身份管理页面
 */

import { useState, useMemo, useEffect } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
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
import { Plus, Pencil, Trash2, Search, UserCog, Filter, RefreshCw } from 'lucide-react'
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
import type {
  EmployeeIdentityItem,
  EmployeeIdentityCreate,
  EmployeeIdentityUpdate,
  EmployeeItem,
  CampusItem,
  CampusDepartmentItem,
  PositionItem,
} from '../types'
import { StatusBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'

// 表单验证 schema
const formSchema = z.object({
  employee_id: z.string().min(1, '请选择员工'),
  campus_id: z.string().min(1, '请选择校区'),
  department_id: z.string().min(1, '请选择部门'),
  position_id: z.string().min(1, '请选择职位'),
  is_active: z.boolean().default(true),
  can_manage_leads: z.boolean().default(true),
  can_access_pool: z.boolean().default(true),
})

type FormData = z.infer<typeof formSchema>

const pageSize = 20

export function IdentitiesPage() {
  useDocumentTitle('员工身份管理')
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [campusFilter, setCampusFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EmployeeIdentityItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<EmployeeIdentityItem | null>(null)

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      campus_id: '',
      department_id: '',
      position_id: '',
      is_active: true,
      can_manage_leads: true,
      can_access_pool: true,
    },
  })

  // 监听表单中的 campus_id 变化，用于动态加载部门
  const formCampusId = form.watch('campus_id')

  // 获取员工身份列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-identities', page, pageSize, selectedEmployeeId, campusFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (selectedEmployeeId) {
        params.employee_id = selectedEmployeeId
      }
      if (campusFilter !== 'all') {
        params.campus_id = campusFilter
      }
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active'
      }
      const response = await adminApi.getEmployeeIdentities(params)
      return response.data
    },
  })

  // 获取员工列表（用于下拉选择和搜索）
  const { data: employeesData } = useQuery({
    queryKey: ['admin-employees-options'],
    queryFn: async () => {
      const response = await adminApi.getEmployees({ size: 200, is_active: true })
      return response.data
    },
  })

  // 获取校区列表（用于下拉选择和筛选）
  const { data: campusesData } = useQuery({
    queryKey: ['admin-campuses-options'],
    queryFn: async () => {
      const response = await adminApi.getCampuses({ size: 100, is_active: true })
      return response.data
    },
  })

  // 获取职位列表（用于下拉选择）
  const { data: positionsData } = useQuery({
    queryKey: ['admin-positions-options'],
    queryFn: async () => {
      const response = await adminApi.getPositions({ size: 100, is_active: true })
      return response.data
    },
  })

  // 根据选中的校区动态获取部门列表
  const { data: campusDepartmentsData } = useQuery({
    queryKey: ['admin-campus-departments', formCampusId],
    queryFn: async () => {
      const response = await adminApi.getCampusDepartments({ campus_id: formCampusId, size: 100 })
      return response.data
    },
    enabled: !!formCampusId,
  })

  const employees: EmployeeItem[] = employeesData?.items || []
  const campuses: CampusItem[] = campusesData?.items || []
  const positions: PositionItem[] = positionsData?.items || []
  const campusDepartments: CampusDepartmentItem[] = campusDepartmentsData?.items || []

  // 当校区变化时，清空部门选择
  useEffect(() => {
    if (formCampusId && dialogOpen) {
      // 如果是编辑模式且校区未变，不清空部门
      if (editingItem && formCampusId === editingItem.campus_id) {
        return
      }
      form.setValue('department_id', '')
    }
  }, [formCampusId])

  // 创建身份
  const createMutation = useMutation({
    mutationFn: (data: EmployeeIdentityCreate) => adminApi.createEmployeeIdentity(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-identities'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新身份
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeIdentityUpdate }) =>
      adminApi.updateEmployeeIdentity(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-identities'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除身份
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteEmployeeIdentity(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-identities'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 表格列定义
  const columns: ColumnDef<EmployeeIdentityItem>[] = useMemo(
    () => [
      {
        accessorKey: 'employee_name',
        header: '员工姓名',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-20" />
          }
          return (
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{row.original.employee_name}</span>
            </div>
          )
        },
      },
      {
        id: 'org_scope',
        header: '所属组织',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-20" />
          }
          const item = row.original
          const scope = item.scope_type || 'campus'
          if (scope === 'region' && item.region_name) return `大区:${item.region_name}`
          if (scope === 'district' && item.district_name) return `地区:${item.district_name}`
          if (scope === 'area' && item.area_name) return `片区:${item.area_name}`
          return item.campus_name || '-'
        },
      },
      {
        accessorKey: 'department_name',
        header: '部门',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-16" />
          }
          return row.original.department_name || '-'
        },
      },
      {
        accessorKey: 'position_name',
        header: '职位',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-16" />
          }
          return row.original.position_name || '-'
        },
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-14" />
          }
          return <StatusBadge isActive={row.original.is_active} />
        },
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-28" />
          }
          return new Date(row.original.created_at).toLocaleString('zh-CN')
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
    ],
    []
  )

  // 生成骨架屏数据
  const skeletonData: EmployeeIdentityItem[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `__skeleton__${i}`,
        employee_id: '',
        employee_name: '',
        employee_username: '',
        campus_id: '',
        campus_name: '',
        department_id: '',
        department_name: '',
        position_id: '',
        position_name: '',
        position_level: '',
        is_primary: false,
        is_active: true,
        created_at: '',
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
      employee_id: '',
      campus_id: '',
      department_id: '',
      position_id: '',
      is_active: true,
      can_manage_leads: true,
      can_access_pool: true,
    })
    setDialogOpen(true)
  }

  // 处理编辑
  const handleEdit = (item: EmployeeIdentityItem) => {
    setEditingItem(item)
    form.reset({
      employee_id: item.employee_id,
      campus_id: item.campus_id,
      department_id: item.department_id,
      position_id: item.position_id,
      is_active: item.is_active,
      can_manage_leads: (item as Record<string, unknown>).can_manage_leads as boolean ?? true,
      can_access_pool: (item as Record<string, unknown>).can_access_pool as boolean ?? true,
    })
    setDialogOpen(true)
  }

  // 处理删除点击
  const handleDeleteClick = (item: EmployeeIdentityItem) => {
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
    if (editingItem) {
      const updateData: EmployeeIdentityUpdate = {
        campus_id: data.campus_id,
        department_id: data.department_id,
        position_id: data.position_id,
        is_active: data.is_active,
        can_manage_leads: data.can_manage_leads,
        can_access_pool: data.can_access_pool,
      }
      updateMutation.mutate({
        id: editingItem.id,
        data: updateData,
      })
    } else {
      const createData: EmployeeIdentityCreate = {
        employee_id: data.employee_id,
        campus_id: data.campus_id,
        department_id: data.department_id,
        position_id: data.position_id,
        is_active: data.is_active,
        can_manage_leads: data.can_manage_leads,
        can_access_pool: data.can_access_pool,
      }
      createMutation.mutate(createData)
    }
  }

  // 处理搜索（按员工姓名搜索 - 找到匹配的员工ID进行筛选）
  const handleSearch = () => {
    setPage(1)
    if (searchValue.trim()) {
      const matched = employees.find((e) => e.name.includes(searchValue.trim()))
      setSelectedEmployeeId(matched?.id || '__no_match__')
    } else {
      setSelectedEmployeeId('')
    }
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">员工身份管理</h1>
            <p className="text-sm text-muted-foreground">
              管理员工在各校区、部门的身份配置及权限
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建身份
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索员工姓名..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <Select value={campusFilter} onValueChange={(value) => { setCampusFilter(value); setPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="筛选校区" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部校区</SelectItem>
                {campuses.map((campus) => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.name}
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
        <DialogContent className="max-w-lg max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {editingItem ? '编辑身份' : '新建身份'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? '修改员工身份信息及权限配置'
                : '为员工创建新的身份，配置其所属校区、部门和职位'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
                {/* 员工选择 */}
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>员工</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={!!editingItem}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择员工" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                              {emp.username && ` (${emp.username})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 校区选择 */}
                <FormField
                  control={form.control}
                  name="campus_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>校区</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择校区" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {campuses.map((campus) => (
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
                {/* 部门选择 - 根据校区动态加载 */}
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部门</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={!formCampusId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={formCampusId ? '请选择部门' : '请先选择校区'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {campusDepartments.map((cd) => (
                            <SelectItem key={cd.department_id} value={cd.department_id}>
                              {cd.department_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 职位选择 */}
                <FormField
                  control={form.control}
                  name="position_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>职位</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择职位" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positions.map((pos) => (
                            <SelectItem key={pos.id} value={pos.id}>
                              {pos.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 启用状态 */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>启用状态</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          设置该身份是否启用
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
                {/* 线索管理权限 */}
                <FormField
                  control={form.control}
                  name="can_manage_leads"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>线索管理权限</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          允许该身份管理线索数据
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
                {/* 公海访问权限 */}
                <FormField
                  control={form.control}
                  name="can_access_pool"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>公海访问权限</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          允许该身份访问公海线索池
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
              确定要删除员工「{deletingItem?.employee_name}」在「{deletingItem?.campus_name} - {deletingItem?.department_name}」的身份吗？此操作不可撤销。
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
