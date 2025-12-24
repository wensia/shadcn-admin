/**
 * 来源渠道管理页面
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
import { Plus, Pencil, Trash2, Search, Share2, Filter } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { SimplePagination } from '@/components/simple-pagination'
import { adminApi } from '../api'
import type { SourceChannel } from '../types'
import { StatusBadge, SourceChannelCategoryBadge } from '../components/status-badge'

// 渠道分类选项
const CHANNEL_CATEGORIES = [
  { value: 'ONLINE', label: '线上渠道' },
  { value: 'OFFLINE', label: '线下渠道' },
  { value: 'REFERRAL', label: '推荐渠道' },
  { value: 'EVENT', label: '活动渠道' },
  { value: 'OTHER', label: '其他渠道' },
] as const

// 表单验证 schema
const formSchema = z.object({
  name: z.string().min(1, '请输入渠道名称').max(50, '渠道名称不能超过50个字符'),
  category: z.enum(['ONLINE', 'OFFLINE', 'REFERRAL', 'EVENT', 'OTHER']),
  description: z.string().max(200, '描述不能超过200个字符').optional(),
  sort_order: z.number().min(0, '排序值不能小于0').default(0),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof formSchema>

const pageSize = 20

export function SourceChannelsPage() {
  const queryClient = useQueryClient()

  // 状态管理
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SourceChannel | null>(null)
  const [deletingItem, setDeletingItem] = useState<SourceChannel | null>(null)

  // 表单
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: 'ONLINE',
      description: '',
      sort_order: 0,
      is_active: true,
    },
  })

  // 获取来源渠道列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-source-channels', page, pageSize, searchValue, statusFilter, categoryFilter],
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
      if (categoryFilter !== 'all') {
        params.category = categoryFilter
      }
      const response = await adminApi.getSourceChannels(params)
      return response.data
    },
  })

  // 创建来源渠道
  const createMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.createSourceChannel(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })

  // 更新来源渠道
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      adminApi.updateSourceChannel(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })

  // 删除来源渠道
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSourceChannel(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-source-channels'] })
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })

  // 表格列定义
  const columns: ColumnDef<SourceChannel>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '渠道名称',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-indigo-500" />
              <span className="font-medium">{row.original.name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'category',
        header: '分类',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-5 w-16" />
          }
          return <SourceChannelCategoryBadge category={row.original.category?.toUpperCase() || 'OTHER'} />
        },
      },
      {
        accessorKey: 'description',
        header: '描述',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-32" />
          }
          return row.original.description || '-'
        },
      },
      {
        accessorKey: 'extra_fields',
        header: '额外字段',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-8" />
          }
          const fields = row.original.extra_fields || row.original.channel_config?.fields || []
          return fields.length > 0 ? `${fields.length} 个` : '-'
        },
      },
      {
        accessorKey: 'sort_order',
        header: '排序',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__')) {
            return <Skeleton className="h-4 w-8" />
          }
          return row.original.sort_order
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
  const skeletonData: SourceChannel[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `__skeleton__${i}`,
        name: '',
        category: 'online' as const,
        is_active: true,
        sort_order: 0,
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
      category: 'ONLINE',
      description: '',
      sort_order: 0,
      is_active: true,
    })
    setDialogOpen(true)
  }

  // 处理编辑
  const handleEdit = (item: SourceChannel) => {
    setEditingItem(item)
    form.reset({
      name: item.name,
      category: (item.category?.toUpperCase() || 'ONLINE') as FormData['category'],
      description: item.description || '',
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
    setDialogOpen(true)
  }

  // 处理删除点击
  const handleDeleteClick = (item: SourceChannel) => {
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
      updateMutation.mutate({
        id: editingItem.id,
        data,
      })
    } else {
      createMutation.mutate(data)
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
            <h1 className="text-2xl font-bold">来源渠道管理</h1>
            <p className="text-sm text-muted-foreground">
              管理线索来源渠道配置，支持线上、线下、推荐等多种渠道类型
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建渠道
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索渠道名称..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="筛选分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {CHANNEL_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '编辑来源渠道' : '新建来源渠道'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? '修改来源渠道信息'
                : '创建一个新的来源渠道'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>渠道名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入渠道名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>渠道分类</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择渠道分类" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHANNEL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入描述（可选）"
                        className="resize-none"
                        rows={3}
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
                        设置该渠道是否启用
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
              确定要删除渠道「{deletingItem?.name}」吗？此操作不可撤销。
              如果该渠道下存在线索，则无法删除。
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
