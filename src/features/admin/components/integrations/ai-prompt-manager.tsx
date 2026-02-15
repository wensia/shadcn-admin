/**
 * AI Prompt 版本管理组件
 * 管理 prompt 模板内容和版本，场景关联在"场景配置"中完成
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
import { FileText, Plus, Copy, Pencil, Database } from 'lucide-react'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { aiConfigApi } from '../../api'
import { AI_SCENES, type AIPromptItem } from '../../types'

// 表单验证
const promptFormSchema = z.object({
  name: z.string().min(1, '请输入名称').max(200, '名称最多200字'),
  content: z.string().min(10, 'Prompt 内容至少10个字符'),
  description: z.string().max(500, '说明最多500字').optional(),
})

type PromptFormData = z.infer<typeof promptFormSchema>

const SKELETON_PREFIX = 'skeleton-'
function createSkeletonData(count: number): AIPromptItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    scene_key: '',
    name: '',
    content: '',
    version: 0,
    is_active: false,
    description: null,
    created_at: '',
  }))
}

// 获取默认场景 key（需要 prompt 的第一个场景）
const DEFAULT_SCENE_KEY = AI_SCENES.find((s) => s.needsPrompt)?.key || AI_SCENES[0].key

export function AIPromptManager() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<AIPromptItem | null>(null)
  const [copyFrom, setCopyFrom] = useState<AIPromptItem | null>(null)
  // 记录创建/复制时的 scene_key（不在 UI 中展示）
  const [currentSceneKey, setCurrentSceneKey] = useState(DEFAULT_SCENE_KEY)

  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: { name: '', content: '', description: '' },
  })

  const isEditing = !!editingPrompt && !copyFrom

  // 查询所有 prompt
  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-prompts'],
    queryFn: () => aiConfigApi.listPrompts({ limit: 100 }),
  })

  // 创建 prompt
  const createMutation = useMutation({
    mutationFn: (data: PromptFormData & { scene_key: string }) =>
      aiConfigApi.createPrompt({
        scene_key: data.scene_key,
        name: data.name,
        content: data.content,
        description: data.description,
      }),
    onSuccess: () => {
      toast.success('Prompt 创建成功')
      closeDialog()
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts-all'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '创建失败'),
  })

  // 更新 prompt
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PromptFormData }) =>
      aiConfigApi.updatePrompt(id, { name: data.name, content: data.content, description: data.description }),
    onSuccess: () => {
      toast.success('更新成功')
      closeDialog()
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts-all'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '更新失败'),
  })

  // 初始化默认 prompt
  const seedMutation = useMutation({
    mutationFn: () => aiConfigApi.seedDefaultPrompts(),
    onSuccess: (result) => {
      toast.success(result.message || '默认 Prompt 初始化完成')
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts-all'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '初始化失败'),
  })

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingPrompt(null)
    setCopyFrom(null)
    form.reset({ name: '', content: '', description: '' })
  }

  const handleCreate = () => {
    setCopyFrom(null)
    setEditingPrompt(null)
    setCurrentSceneKey(DEFAULT_SCENE_KEY)
    form.reset({ name: '', content: '', description: '' })
    setDialogOpen(true)
  }

  const handleCopyAndCreate = (prompt: AIPromptItem) => {
    setCopyFrom(prompt)
    setEditingPrompt(null)
    setCurrentSceneKey(prompt.scene_key)
    form.reset({ name: `${prompt.name} (改进版)`, content: prompt.content, description: '' })
    setDialogOpen(true)
  }

  const handleEdit = (prompt: AIPromptItem) => {
    setEditingPrompt(prompt)
    setCopyFrom(null)
    setCurrentSceneKey(prompt.scene_key)
    form.reset({ name: prompt.name, content: prompt.content, description: prompt.description || '' })
    setDialogOpen(true)
  }

  const handleSubmit = (formData: PromptFormData) => {
    if (isEditing) {
      updateMutation.mutate({ id: editingPrompt!.id, data: formData })
    } else {
      createMutation.mutate({ ...formData, scene_key: currentSceneKey })
    }
  }

  // 表格列定义（无场景列）
  const columns: ColumnDef<AIPromptItem>[] = useMemo(
    () => [
      {
        accessorKey: 'version',
        header: '版本',
        size: 60,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-10" />
          }
          return (
            <Badge variant="secondary" className="text-xs">
              v{row.original.version}
            </Badge>
          )
        },
      },
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
        accessorKey: 'created_at',
        header: '创建时间',
        size: 110,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-5 w-20" />
          }
          return (
            <span className="text-xs text-muted-foreground">
              {new Date(row.original.created_at).toLocaleString('zh-CN', {
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
        size: 100,
        cell: ({ row }) => {
          if (row.original.id.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-8 w-16" />
          }
          const prompt = row.original
          return (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(prompt)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyAndCreate(prompt)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>复制并新建</TooltipContent>
              </Tooltip>
            </div>
          )
        },
      },
    ],
    []
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
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Prompt 版本管理</h3>
            <span className="text-xs text-muted-foreground">管理 Prompt 内容和版本，场景关联请在"场景配置"中设置</span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                >
                  <Database className="mr-1 h-3.5 w-3.5" />
                  初始化默认
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                将代码中硬编码的默认 Prompt 写入数据库（已有则跳过）
              </TooltipContent>
            </Tooltip>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              新建版本
            </Button>
          </div>
        </div>

        {/* 数据表 */}
        <div className="rounded-md border">
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
                    <div className="flex flex-col items-center text-muted-foreground">
                      <FileText className="mb-2 h-8 w-8" />
                      <p>暂无 Prompt 配置</p>
                      <p className="text-xs mt-1">
                        点击"初始化默认"导入系统默认 Prompt，或"新建版本"创建
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 创建/编辑对话框（不含场景选择） */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {isEditing
                ? `编辑 Prompt (v${editingPrompt!.version})`
                : copyFrom
                  ? `基于 v${copyFrom.version} 创建新版本`
                  : '新建 Prompt'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? '修改 Prompt 名称、内容和版本说明' : '创建后可在"场景配置"中为场景指定使用的 Prompt 版本'}
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
                      <FormLabel>名称</FormLabel>
                      <FormControl>
                        <Input placeholder="如：通话分析-强化需求挖掘" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt 内容</FormLabel>
                      <FormControl>
                        <Textarea placeholder="输入系统提示词..." className="min-h-[300px] font-mono text-sm" {...field} />
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
                      <FormLabel>版本说明</FormLabel>
                      <FormControl>
                        <Input placeholder="如：调整了异议处理的评分标准" {...field} />
                      </FormControl>
                      {!isEditing && <FormDescription>简要描述本次修改内容，便于日后对比</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="px-6 pb-6 pt-4 shrink-0 border-t">
                <Button type="button" variant="outline" onClick={closeDialog}>取消</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? (isEditing ? '保存中...' : '创建中...') : (isEditing ? '保存' : '创建')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
