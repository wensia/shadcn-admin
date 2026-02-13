/**
 * AI 资料库管理组件
 * 支持导入和编辑 Markdown 文档，供 AI 分析时作为参考资料
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
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { aiConfigApi } from '../../api'
import { AI_DOCUMENT_CATEGORIES, type AIDocumentItem } from '../../types'

// 表单验证
const documentFormSchema = z.object({
  name: z.string().min(1, '请输入文档名称').max(200, '名称最多200字'),
  content: z.string().min(1, '请输入文档内容'),
  description: z.string().max(500, '描述最多500字').optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
})

type DocumentFormData = z.infer<typeof documentFormSchema>

const SKELETON_PREFIX = 'skeleton-'
function createSkeletonData(count: number): AIDocumentItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    name: '',
    content: '',
    description: null,
    category: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  }))
}

function getCategoryLabel(value: string | null): string {
  if (!value) return '-'
  return AI_DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label || value
}

export function AIDocumentLibrary() {
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<AIDocumentItem | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<AIDocumentItem | null>(null)
  const [previewTab, setPreviewTab] = useState<string>('edit')

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: { name: '', content: '', description: '', category: '' },
  })

  // 查询文档列表
  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-documents', categoryFilter],
    queryFn: () =>
      aiConfigApi.listDocuments({
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        limit: 100,
      }),
  })

  // 创建文档
  const createMutation = useMutation({
    mutationFn: (data: DocumentFormData) =>
      aiConfigApi.createDocument({
        name: data.name,
        content: data.content,
        description: data.description || undefined,
        category: data.category || undefined,
      }),
    onSuccess: () => {
      toast.success('文档创建成功')
      closeDialog()
      queryClient.invalidateQueries({ queryKey: ['admin-ai-documents'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '创建失败'),
  })

  // 更新文档
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DocumentFormData }) =>
      aiConfigApi.updateDocument(id, {
        name: data.name,
        content: data.content,
        description: data.description || undefined,
        category: data.category || undefined,
      }),
    onSuccess: () => {
      toast.success('文档更新成功')
      closeDialog()
      queryClient.invalidateQueries({ queryKey: ['admin-ai-documents'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '更新失败'),
  })

  // 切换启用状态
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      aiConfigApi.updateDocument(id, { is_active }),
    onSuccess: (_, vars) => {
      toast.success(vars.is_active ? '已启用' : '已停用')
      queryClient.invalidateQueries({ queryKey: ['admin-ai-documents'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '操作失败'),
  })

  // 删除文档
  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiConfigApi.deleteDocument(id),
    onSuccess: () => {
      toast.success('文档已删除')
      setDeleteDoc(null)
      queryClient.invalidateQueries({ queryKey: ['admin-ai-documents'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '删除失败'),
  })

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingDoc(null)
    setPreviewTab('edit')
    form.reset({ name: '', content: '', description: '', category: '' })
  }

  const handleCreate = () => {
    setEditingDoc(null)
    form.reset({ name: '', content: '', description: '', category: '' })
    setPreviewTab('edit')
    setDialogOpen(true)
  }

  const handleEdit = (doc: AIDocumentItem) => {
    setEditingDoc(doc)
    form.reset({
      name: doc.name,
      content: doc.content,
      description: doc.description || '',
      category: doc.category || '',
    })
    setPreviewTab('edit')
    setDialogOpen(true)
  }

  const handleSubmit = (formData: DocumentFormData) => {
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // 表格列定义
  const columns: ColumnDef<AIDocumentItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '名称',
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-32" />
          }
          return (
            <div className="flex flex-col">
              <span className="font-medium text-sm">{row.original.name}</span>
              {row.original.description && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {row.original.description}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'category',
        header: '分类',
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-16" />
          }
          return (
            <Badge variant="outline" className="text-xs">
              {getCategoryLabel(row.original.category)}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        size: 80,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-14 rounded-full" />
          }
          return row.original.is_active ? (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              启用
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              停用
            </Badge>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: '更新时间',
        size: 110,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-20" />
          }
          return (
            <span className="text-xs text-muted-foreground">
              {new Date(row.original.updated_at).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '操作',
        size: 140,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-24" />
          }
          const doc = row.original
          return (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(doc)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: doc.id,
                        is_active: !doc.is_active,
                      })
                    }
                    disabled={toggleMutation.isPending}
                  >
                    {doc.is_active ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {doc.is_active ? '停用' : '启用'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDoc(doc)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </div>
          )
        },
      },
    ],
    [toggleMutation.isPending]
  )

  const tableData = isLoading ? createSkeletonData(3) : (data?.items || [])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">资料库管理</h3>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {AI_DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            新建文档
          </Button>
        </div>

        {/* 数据表 */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
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
                    <div className="flex flex-col items-center text-muted-foreground">
                      <BookOpen className="mb-2 h-8 w-8" />
                      <p>暂无资料文档</p>
                      <p className="text-xs mt-1">
                        点击"新建文档"添加 Markdown 格式的参考资料
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 新建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {editingDoc ? '编辑文档' : '新建文档'}
            </DialogTitle>
            <DialogDescription>
              编写 Markdown 格式的参考资料，AI 分析时可读取这些文档。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>文档名称</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="如：产品价格表"
                            {...field}
                          />
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
                        <FormLabel>分类</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择分类" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AI_DOCUMENT_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>简要描述</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="简要说明文档内容和用途"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <div className="flex items-center justify-between">
                        <FormLabel>文档内容</FormLabel>
                        <Tabs
                          value={previewTab}
                          onValueChange={setPreviewTab}
                          className="h-auto"
                        >
                          <TabsList className="h-7">
                            <TabsTrigger
                              value="edit"
                              className="text-xs px-2 py-0.5 h-auto"
                            >
                              编辑
                            </TabsTrigger>
                            <TabsTrigger
                              value="preview"
                              className="text-xs px-2 py-0.5 h-auto"
                            >
                              预览
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      {previewTab === 'edit' ? (
                        <FormControl>
                          <Textarea
                            placeholder="输入 Markdown 格式的文档内容..."
                            className="min-h-[300px] font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                      ) : (
                        <div className="min-h-[300px] rounded-md border p-4 overflow-auto prose prose-sm max-w-none dark:prose-invert">
                          {field.value ? (
                            <ReactMarkdown>{field.value}</ReactMarkdown>
                          ) : (
                            <p className="text-muted-foreground">暂无内容</p>
                          )}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? '保存中...' : editingDoc ? '保存' : '创建'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteDoc}
        onOpenChange={(open) => !open && setDeleteDoc(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除文档「{deleteDoc?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDoc && deleteMutation.mutate(deleteDoc.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
