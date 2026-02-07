/**
 * 校区部门配置页面
 */

import { useState, useMemo } from 'react'
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
import { Plus, Trash2, Search, Building2, Network, Filter, RefreshCw, Users, Eye } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { adminApi } from '../api'
import type { CampusDepartmentItem, CampusDepartmentCreate, ManagerType } from '../types'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { StatusBadge } from '../components/status-badge'
import { ManageManagersDialog } from '../components/manage-managers-dialog'
import { ViewDepartmentEmployeesDialog } from '../components/view-department-employees-dialog'
import { showApiErrorToast } from '@/lib/api/error-toast'

// 表单验证 schema
const formSchema = z.object({
  campus_id: z.string().min(1, '请选择校区'),
  department_id: z.string().min(1, '请选择部门'),
  sort_order: z.number().min(0, '排序值不能小于0').default(0),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof formSchema>

export function CampusDepartmentsPage() {
  useDocumentTitle('校区部门配置')
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [campusFilter, setCampusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<CampusDepartmentItem | null>(null)
  const [managerDialogOpen, setManagerDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<CampusDepartmentItem | null>(null)
  const [employeesDialogOpen, setEmployeesDialogOpen] = useState(false)
  const [viewingDepartment, setViewingDepartment] = useState<CampusDepartmentItem | null>(null)

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      campus_id: '',
      department_id: '',
      sort_order: 0,
      is_active: true,
    },
  })

  // 获取校区部门配置列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-campus-departments', page, pageSize, searchValue, campusFilter, departmentFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (searchValue) {
        params.search = searchValue
      }
      if (campusFilter !== 'all') {
        params.campus_id = campusFilter
      }
      if (departmentFilter !== 'all') {
        params.department_id = departmentFilter
      }
      const response = await adminApi.getCampusDepartments(params)
      return response.data
    },
  })

  // 获取校区列表（用于下拉选择）
  const { data: campusesData } = useQuery({
    queryKey: ['admin-campuses-options'],
    queryFn: async () => {
      const response = await adminApi.getCampuses({ size: 100, is_active: true })
      return response.data
    },
  })

  // 获取部门列表（用于下拉选择）
  const { data: departmentsData } = useQuery({
    queryKey: ['admin-departments-options'],
    queryFn: async () => {
      const response = await adminApi.getDepartments({ size: 100, is_active: true })
      return response.data
    },
  })

  const campuses = campusesData?.items || []
  const departments = departmentsData?.items || []

  // 创建校区部门配置
  const createMutation = useMutation({
    mutationFn: (data: CampusDepartmentCreate) => adminApi.createCampusDepartment(data),
    onSuccess: () => {
      toast.success('配置成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-campus-departments'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '配置失败')
    },
  })

  // 删除校区部门配置
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCampusDepartment(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-campus-departments'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 表格列定义
  const columns: ColumnDef<CampusDepartmentItem>[] = useMemo(
    () => [
      {
        accessorKey: 'campus_name',
        header: '校区',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-500" />
              <span className="font-medium">{row.original.campus_name || '-'}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'department_name',
        header: '部门',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-purple-500" />
              <span>{row.original.department_name || '-'}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'managers',
        header: '负责人',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-32" />
          }
          const managers = row.original.managers || []
          if (managers.length === 0) {
            return <span className="text-muted-foreground text-sm">未配置</span>
          }

          // 负责人类型对应的颜色
          const typeVariants: Record<ManagerType, 'default' | 'secondary' | 'outline'> = {
            manager: 'default',
            deputy: 'secondary',
            supervisor: 'outline',
          }
          const typeLabels: Record<ManagerType, string> = {
            manager: '经理',
            deputy: '副经理',
            supervisor: '主管',
          }

          return (
            <TooltipProvider>
              <div className="flex flex-wrap gap-1">
                {managers.slice(0, 3).map((m) => (
                  <Tooltip key={m.id}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={typeVariants[m.manager_type]}
                        className="text-xs cursor-default"
                      >
                        {m.employee?.name || '未知'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{typeLabels[m.manager_type]}: {m.employee?.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {managers.length > 3 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs cursor-default">
                        +{managers.length - 3}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {managers.slice(3).map((m) => (
                          <p key={m.id}>{typeLabels[m.manager_type]}: {m.employee?.name}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )
        },
      },
      {
        accessorKey: 'sort_order',
        header: '排序',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-8" />
          }
          return row.original.sort_order ?? '-'
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
            return <Skeleton className="h-8 w-16" />
          }
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleViewEmployees(row.original)}
                title="查看员工"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleManageManagers(row.original)}
                title="负责人管理"
              >
                <Users className="h-4 w-4" />
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
  const skeletonData: CampusDepartmentItem[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `__skeleton__${i}`,
        campus_id: '',
        department_id: '',
        sort_order: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
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
    form.reset({
      campus_id: '',
      department_id: '',
      sort_order: 0,
      is_active: true,
    })
    setDialogOpen(true)
  }

  // 处理删除点击
  const handleDeleteClick = (item: CampusDepartmentItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 处理负责人管理点击
  const handleManageManagers = (item: CampusDepartmentItem) => {
    setSelectedDepartment(item)
    setManagerDialogOpen(true)
  }

  // 处理查看员工点击
  const handleViewEmployees = (item: CampusDepartmentItem) => {
    setViewingDepartment(item)
    setEmployeesDialogOpen(true)
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 处理表单提交
  const handleSubmit = (data: FormData) => {
    createMutation.mutate(data as CampusDepartmentCreate)
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">校区部门配置</h1>
            <p className="text-sm text-muted-foreground">
              配置校区与部门的关联关系，决定每个校区有哪些部门
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            添加配置
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索..."
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
            <Select value={departmentFilter} onValueChange={(value) => { setDepartmentFilter(value); setPage(1) }}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="筛选部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部部门</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
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
            isLoading={isLoading}
          />
        )}
      </div>

      {/* 创建对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>添加校区部门配置</DialogTitle>
            <DialogDescription>
              为校区添加部门，建立校区与部门的关联关系
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
              <FormField
                control={form.control}
                name="campus_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>选择校区</FormLabel>
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
                            {campus.area && ` (${campus.area.name})`}
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
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>选择部门</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择部门" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
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
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序值</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="请输入排序值"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
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
                  onClick={() => setDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? '保存中...' : '保存'}
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
              确定要删除「{deletingItem?.campus_name} - {deletingItem?.department_name}」的配置吗？
              此操作不可撤销。
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

      {/* 负责人管理对话框 */}
      <ManageManagersDialog
        open={managerDialogOpen}
        onOpenChange={setManagerDialogOpen}
        campusDepartment={selectedDepartment}
        onSuccess={() => refetch()}
      />

      {/* 查看部门员工对话框 */}
      <ViewDepartmentEmployeesDialog
        open={employeesDialogOpen}
        onOpenChange={setEmployeesDialogOpen}
        campusDepartment={viewingDepartment}
      />
    </Main>
  )
}
