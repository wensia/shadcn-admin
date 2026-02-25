/**
 * 每日通知管理页面
 */

import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Bell, Plus, Pencil, Trash2, Power, PowerOff, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi } from '../api'
import type { DailyNoticeItem, DailyNoticeCreate, DailyNoticeUpdate } from '../types'
import { formatTime } from '@/lib/utils/time'

export function DailyNoticesPage() {
  useDocumentTitle('每日通知')
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DailyNoticeItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<DailyNoticeItem | null>(null)
  const [previewItem, setPreviewItem] = useState<DailyNoticeItem | null>(null)

  // 表单状态
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formIsActive, setFormIsActive] = useState(false)

  // 查询
  const { data, isLoading } = useQuery({
    queryKey: ['admin-daily-notices'],
    queryFn: async () => {
      const response = await adminApi.getDailyNotices(1, 100)
      return response.data?.data
    },
  })

  const notices = data?.items ?? []

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: DailyNoticeCreate) => adminApi.createDailyNotice(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-daily-notices'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '创建失败'),
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DailyNoticeUpdate }) =>
      adminApi.updateDailyNotice(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-daily-notices'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '更新失败'),
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDailyNotice(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-daily-notices'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '删除失败'),
  })

  // 激活
  const activateMutation = useMutation({
    mutationFn: (id: string) => adminApi.activateDailyNotice(id),
    onSuccess: () => {
      toast.success('激活成功')
      queryClient.invalidateQueries({ queryKey: ['admin-daily-notices'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '激活失败'),
  })

  // 停用
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.deactivateDailyNotice(id),
    onSuccess: () => {
      toast.success('已停用')
      queryClient.invalidateQueries({ queryKey: ['admin-daily-notices'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '停用失败'),
  })

  const handleCreate = () => {
    setEditingItem(null)
    setFormTitle('')
    setFormContent('')
    setFormIsActive(false)
    setDialogOpen(true)
  }

  const handleEdit = (item: DailyNoticeItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormContent(item.content)
    setFormIsActive(item.is_active)
    setDialogOpen(true)
  }

  const handlePreview = (item: DailyNoticeItem) => {
    setPreviewItem(item)
    setPreviewDialogOpen(true)
  }

  const handleDeleteClick = (item: DailyNoticeItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('请填写标题和内容')
      return
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: { title: formTitle, content: formContent },
      })
    } else {
      createMutation.mutate({
        title: formTitle,
        content: formContent,
        is_active: formIsActive,
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">每日通知</h1>
              <p className="text-sm text-muted-foreground">
                配置 CRM 用户每日登录弹窗通知，同时只能有一条生效
              </p>
            </div>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建通知
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 250 }}>标题</TableHead>
                <TableHead style={{ width: 100 }}>状态</TableHead>
                <TableHead style={{ width: 120 }}>创建者</TableHead>
                <TableHead style={{ width: 170 }}>更新时间</TableHead>
                <TableHead style={{ width: 160 }}>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                  </TableRow>
                ))
              ) : notices.length > 0 ? (
                notices.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">{item.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.is_active ? (
                        <Badge variant="default" className="bg-green-600">生效中</Badge>
                      ) : (
                        <Badge variant="secondary">未启用</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.created_by_name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(item.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(item)} title="预览">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="编辑">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {item.is_active ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deactivateMutation.mutate(item.id)}
                            disabled={deactivateMutation.isPending}
                            title="停用"
                          >
                            <PowerOff className="h-4 w-4 text-orange-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => activateMutation.mutate(item.id)}
                            disabled={activateMutation.isPending}
                            title="激活"
                          >
                            <Power className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} title="删除">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    暂无通知，点击「新建通知」创建
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col p-0 sm:max-w-[600px]">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>{editingItem ? '编辑通知' : '新建通知'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '修改通知内容' : '创建新的每日通知，内容支持 Markdown 格式'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 space-y-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                placeholder="请输入通知标题"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>内容（支持 Markdown）</Label>
              <Tabs defaultValue="edit">
                <TabsList className="w-fit">
                  <TabsTrigger value="edit">编辑</TabsTrigger>
                  <TabsTrigger value="preview">预览</TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="mt-2">
                  <Textarea
                    placeholder="请输入通知内容，支持 Markdown 格式..."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-2">
                  <div className="min-h-[200px] rounded-md border p-4">
                    {formContent ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{formContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">暂无内容</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {!editingItem && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>立即生效</Label>
                  <p className="text-sm text-muted-foreground">
                    开启后将立即生效，并停用其他通知
                  </p>
                </div>
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 pt-4 pb-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col p-0 sm:max-w-[500px]">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>{previewItem?.title}</DialogTitle>
            <DialogDescription>通知预览 - 用户看到的效果</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="prose prose-sm dark:prose-invert max-w-none pb-4">
              <ReactMarkdown>{previewItem?.content ?? ''}</ReactMarkdown>
            </div>
          </ScrollArea>
          <DialogFooter className="shrink-0 border-t px-6 pt-4 pb-6">
            <Button onClick={() => setPreviewDialogOpen(false)} className="w-full sm:w-auto">
              已知晓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除通知「{deletingItem?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
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
