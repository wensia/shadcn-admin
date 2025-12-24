/**
 * 课程管理页面
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
import { BookOpen, Plus, Pencil, Trash2, Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { coursesApi } from '../api'
import type { Course, CourseFormData } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

// 表单验证模式
const formSchema = z.object({
  name: z.string().min(1, '请输入课程名称').max(50, '名称最多50个字符'),
  sort_order: z.coerce.number().int().min(0, '排序值不能为负数').default(0),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof formSchema>

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
function createSkeletonData(count: number): Course[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    name: '',
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }))
}

export function CoursesPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [initDialogOpen, setInitDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Course | null>(null)
  const [deletingItem, setDeletingItem] = useState<Course | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sort_order: 0,
      is_active: true,
    },
  })

  // 查询数据
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const response = await coursesApi.getCourses()
      return response || []
    },
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: CourseFormData) => coursesApi.createCourse(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CourseFormData }) =>
      coursesApi.updateCourse(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesApi.deleteCourse(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })

  // 复制
  const copyMutation = useMutation({
    mutationFn: (id: string) => coursesApi.copyCourse(id),
    onSuccess: () => {
      toast.success('复制成功')
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '复制失败')
    },
  })

  // 批量启用
  const batchActivateMutation = useMutation({
    mutationFn: (ids: string[]) => coursesApi.batchActivateCourses(ids),
    onSuccess: () => {
      toast.success('批量启用成功')
      setRowSelection({})
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '批量启用失败')
    },
  })

  // 批量停用
  const batchDeactivateMutation = useMutation({
    mutationFn: (ids: string[]) => coursesApi.batchDeactivateCourses(ids),
    onSuccess: () => {
      toast.success('批量停用成功')
      setRowSelection({})
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '批量停用失败')
    },
  })

  // 批量删除
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => coursesApi.batchDeleteCourses(ids),
    onSuccess: () => {
      toast.success('批量删除成功')
      setBatchDeleteDialogOpen(false)
      setRowSelection({})
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '批量删除失败')
    },
  })

  // 初始化预设
  const initPresetMutation = useMutation({
    mutationFn: () => coursesApi.initializePresetCourses(),
    onSuccess: () => {
      toast.success('初始化预设成功')
      setInitDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '初始化预设失败')
    },
  })

  // 获取选中的 ID 列表
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key])
  }, [rowSelection])

  // 列定义
  const columns: ColumnDef<Course>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
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
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: 'name',
        header: '课程名称',
        size: 200,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-24" />
          }
          return (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{row.original.name}</span>
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
        accessorKey: 'sort_order',
        header: '排序值',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-12" />
          }
          return row.original.sort_order
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
          return formatTime(row.original.created_at)
        },
      },
      {
        accessorKey: 'updated_at',
        header: '更新时间',
        size: 180,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return formatTime(row.original.updated_at)
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 180,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-28" />
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
                onClick={() => handleCopy(row.original)}
                disabled={copyMutation.isPending}
              >
                <Copy className="h-4 w-4" />
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
    [copyMutation.isPending]
  )

  // 表格数据
  const tableData = isLoading ? createSkeletonData(5) : courses

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.id,
  })

  // 打开新增对话框
  const handleCreate = () => {
    setEditingItem(null)
    form.reset({
      name: '',
      sort_order: 0,
      is_active: true,
    })
    setDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (item: Course) => {
    setEditingItem(item)
    form.reset({
      name: item.name,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setDialogOpen(true)
  }

  // 复制课程
  const handleCopy = (item: Course) => {
    copyMutation.mutate(item.id)
  }

  // 点击删除按钮
  const handleDeleteClick = (item: Course) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 提交表单
  const handleSubmit = (data: FormData) => {
    const formData: CourseFormData = {
      name: data.name,
      is_active: data.is_active,
      sort_order: data.sort_order,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  // 批量启用
  const handleBatchActivate = () => {
    if (selectedIds.length > 0) {
      batchActivateMutation.mutate(selectedIds)
    }
  }

  // 批量停用
  const handleBatchDeactivate = () => {
    if (selectedIds.length > 0) {
      batchDeactivateMutation.mutate(selectedIds)
    }
  }

  // 批量删除
  const handleBatchDeleteConfirm = () => {
    if (selectedIds.length > 0) {
      batchDeleteMutation.mutate(selectedIds)
    }
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">课程管理</h1>
            <p className="text-sm text-muted-foreground">
              管理系统中的课程信息
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setInitDialogOpen(true)}
              disabled={initPresetMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              初始化预设
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              新增课程
            </Button>
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
            <span className="text-sm text-muted-foreground">
              已选择 {selectedIds.length} 项
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchActivate}
              disabled={batchActivateMutation.isPending}
            >
              批量启用
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchDeactivate}
              disabled={batchDeactivateMutation.isPending}
            >
              批量停用
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBatchDeleteDialogOpen(true)}
            >
              批量删除
            </Button>
          </div>
        )}

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
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
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

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editingItem ? '编辑课程' : '新建课程'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '修改课程信息' : '创建一个新的课程'}
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
                    <FormLabel>课程名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入课程名称" {...field} />
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
                        placeholder="请输入排序值"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                      <div className="text-sm text-muted-foreground">
                        设置该课程是否启用
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
              确定要删除课程「{deletingItem?.name}」吗？此操作不可撤销。
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

      {/* 批量删除确认对话框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 个课程吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchDeleteMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 初始化预设确认对话框 */}
      <AlertDialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认初始化</AlertDialogTitle>
            <AlertDialogDescription>
              确定要初始化预设课程吗？这将添加系统预设的课程列表。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => initPresetMutation.mutate()}
            >
              {initPresetMutation.isPending ? '初始化中...' : '确定'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
