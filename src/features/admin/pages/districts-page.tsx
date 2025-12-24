/**
 * 地区管理页面
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
import { Map, Plus, Pencil, Trash2, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'

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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { adminApi } from '../api'
import type { DistrictItem, DistrictCreate, DistrictUpdate, RegionItem } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

// 表单验证模式
const formSchema = z.object({
  region_id: z.string().min(1, '请选择所属大区'),
  name: z.string().min(1, '请输入地区名称').max(50, '名称最多50个字符'),
  description: z.string().max(200, '描述最多200个字符').optional(),
  sort_order: z.coerce.number().int().min(0, '排序值不能为负数').default(0),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof formSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): DistrictItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    region_id: '',
    region_name: '',
    name: '',
    description: '',
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }))
}

export function DistrictsPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DistrictItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<DistrictItem | null>(null)

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      region_id: '',
      name: '',
      description: '',
      sort_order: 0,
      is_active: true,
    },
  })

  // 查询大区列表（用于筛选和表单选择）
  const { data: regionsData } = useQuery({
    queryKey: ['admin-regions-options'],
    queryFn: async () => {
      const response = await adminApi.getRegions({ size: 100, is_active: true })
      return response.data
    },
  })

  // 查询地区列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-districts', page, pageSize, searchValue, statusFilter, regionFilter],
    queryFn: async () => {
      const response = await adminApi.getDistricts({
        page,
        size: pageSize,
        search: searchValue || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        region_id: regionFilter === 'all' ? undefined : regionFilter,
      })
      return response.data
    },
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: DistrictCreate) => adminApi.createDistrict(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-districts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DistrictUpdate }) =>
      adminApi.updateDistrict(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-districts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDistrict(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-districts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })

  // 大区选项
  const regionOptions = regionsData?.items || []

  // 列定义
  const columns: ColumnDef<DistrictItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '地区名称',
        size: 180,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-24" />
          }
          return (
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{row.original.name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'region_name',
        header: '所属大区',
        size: 150,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-20" />
          }
          return (
            <span className="text-muted-foreground">
              {row.original.region_name || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'description',
        header: '描述',
        size: 250,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-40" />
          }
          return (
            <span className="text-muted-foreground truncate max-w-[250px] block">
              {row.original.description || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'sort_order',
        header: '排序',
        size: 80,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-10" />
          }
          return <span className="text-center block">{row.original.sort_order}</span>
        },
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-14" />
          }
          return <StatusBadge isActive={row.original.is_active} />
        },
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        size: 180,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return (
            <span className="text-muted-foreground">
              {formatTime(row.original.created_at)}
            </span>
          )
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
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(row.original)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(row.original)}
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

  // 显示数据
  const displayData = isLoading ? createSkeletonData(pageSize) : (data?.items || [])

  // 表格实例
  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // 处理函数
  const handleCreate = () => {
    setEditingItem(null)
    form.reset({
      region_id: '',
      name: '',
      description: '',
      sort_order: 0,
      is_active: true,
    })
    setDialogOpen(true)
  }

  const handleEdit = (item: DistrictItem) => {
    setEditingItem(item)
    form.reset({
      region_id: item.region_id,
      name: item.name,
      description: item.description || '',
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setDialogOpen(true)
  }

  const handleDelete = (item: DistrictItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = (values: FormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const handleConfirmDelete = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  return (
    <Main fixed>
      <div className="flex flex-col gap-4 h-full">
        {/* 标题栏 */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-semibold">地区管理</h1>
            <p className="text-muted-foreground text-sm">管理系统中的地区信息</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新建地区
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索地区名称..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="所属大区" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部大区</SelectItem>
                {regionOptions.map((region: RegionItem) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                      >
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
                {table.getRowModel().rows.length ? (
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
        </div>

        {/* 分页 */}
        <div className="flex-shrink-0">
          <SimplePagination
            page={page}
            pageSize={pageSize}
            total={data?.total || 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        </div>
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editingItem ? '编辑地区' : '新建地区'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '修改地区信息' : '创建一个新的地区'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
              <FormField
                control={form.control}
                name="region_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所属大区 *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择所属大区" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regionOptions.map((region: RegionItem) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>地区名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入地区名称" {...field} />
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
                      <Textarea
                        placeholder="请输入描述信息"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
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
                        min={0}
                        placeholder="请输入排序值"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>启用状态</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        停用后该地区将不可使用
                      </p>
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
              确定要删除地区"{deletingItem?.name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
