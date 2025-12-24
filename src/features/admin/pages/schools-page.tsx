/**
 * 学校管理页面
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
import { Plus, Pencil, Trash2, Search, GraduationCap } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { adminApi } from '../api'
import type { SchoolItem } from '../types'

// 表单验证 schema
const formSchema = z.object({
  name: z.string().min(1, '请输入学校名称').max(100, '学校名称不能超过100个字符'),
  province: z.string().max(50, '省份不能超过50个字符').optional(),
  city: z.string().max(50, '城市不能超过50个字符').optional(),
  district: z.string().max(50, '区县不能超过50个字符').optional(),
  address: z.string().max(200, '地址不能超过200个字符').optional(),
  contact_phone: z.string().max(20, '联系电话不能超过20个字符').optional(),
  remark: z.string().max(500, '备注不能超过500个字符').optional(),
})

type FormData = z.infer<typeof formSchema>

const pageSize = 20

export function SchoolsPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SchoolItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<SchoolItem | null>(null)

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      province: '',
      city: '',
      district: '',
      address: '',
      contact_phone: '',
      remark: '',
    },
  })

  // 获取学校列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-schools', page, pageSize, searchValue],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (searchValue) {
        params.search = searchValue
      }
      const response = await adminApi.getSchools(params)
      return response.data
    },
  })

  // 创建学校
  const createMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.createSchool(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-schools'] })
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })

  // 更新学校
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      adminApi.updateSchool(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-schools'] })
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })

  // 删除学校
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSchool(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-schools'] })
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })

  // 表格列定义
  const columns: ColumnDef<SchoolItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '学校名称',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-32" />
          }
          return (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-amber-500" />
              <span className="font-medium">{row.original.name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'location',
        header: '所在地区',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          const { province, city, district } = row.original
          const parts = [province, city, district].filter(Boolean)
          return parts.length > 0 ? parts.join(' / ') : '-'
        },
      },
      {
        accessorKey: 'address',
        header: '详细地址',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-40" />
          }
          const address = row.original.address
          if (!address) return '-'
          return (
            <span className="max-w-[200px] truncate" title={address}>
              {address}
            </span>
          )
        },
      },
      {
        accessorKey: 'contact_phone',
        header: '联系电话',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          return row.original.contact_phone || '-'
        },
      },
      {
        accessorKey: 'grade_levels',
        header: '年级',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-16" />
          }
          const levels = row.original.grade_levels
          return levels && levels.length > 0 ? levels.join(', ') : '-'
        },
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-28" />
          }
          return row.original.created_at
            ? new Date(row.original.created_at).toLocaleString('zh-CN')
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
  const skeletonData: SchoolItem[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `__skeleton__${i}`,
        name: '',
        grade_levels: [],
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
      name: '',
      province: '',
      city: '',
      district: '',
      address: '',
      contact_phone: '',
      remark: '',
    })
    setDialogOpen(true)
  }

  // 处理编辑
  const handleEdit = (item: SchoolItem) => {
    setEditingItem(item)
    form.reset({
      name: item.name,
      province: item.province || '',
      city: item.city || '',
      district: item.district || '',
      address: item.address || '',
      contact_phone: item.contact_phone || '',
      remark: item.remark || '',
    })
    setDialogOpen(true)
  }

  // 处理删除点击
  const handleDeleteClick = (item: SchoolItem) => {
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
      province: data.province || undefined,
      city: data.city || undefined,
      district: data.district || undefined,
      address: data.address || undefined,
      contact_phone: data.contact_phone || undefined,
      remark: data.remark || undefined,
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: submitData,
      })
    } else {
      createMutation.mutate(submitData)
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
            <h1 className="text-2xl font-bold">学校管理</h1>
            <p className="text-sm text-muted-foreground">
              管理系统中的学校信息
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建学校
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索学校名称..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8"
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '编辑学校' : '新建学校'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? '修改学校信息'
                : '创建一个新的学校'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>学校名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入学校名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>省份</FormLabel>
                      <FormControl>
                        <Input placeholder="省份" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>城市</FormLabel>
                      <FormControl>
                        <Input placeholder="城市" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>区县</FormLabel>
                      <FormControl>
                        <Input placeholder="区县" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>详细地址</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入详细地址（可选）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系电话</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入联系电话（可选）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入备注（可选）"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
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
              确定要删除学校「{deletingItem?.name}」吗？此操作不可撤销。
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
