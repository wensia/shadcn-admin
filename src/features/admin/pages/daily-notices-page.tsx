/**
 * 每日通知管理页面
 */

import { useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Plus, Pencil, Trash2, Power, PowerOff, Eye } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Button, Input, Modal, Tag, Switch, Typography, TextArea, Tabs, TabPane } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { adminApi } from '../api'
import type { DailyNoticeItem, DailyNoticeCreate, DailyNoticeUpdate } from '../types'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

export function DailyNoticesPage() {
  useDocumentTitle('每日通知')
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
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
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-daily-notices'],
    queryFn: async () => {
      const response = await adminApi.getDailyNotices(1, 100)
      return response.data
    },
  })

  const notices = useMemo(() => data?.items ?? [], [data?.items])

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

  // Semi Table 列定义
  const columns: ColumnProps<DailyNoticeItem>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      width: 250,
      render: (_text: string, record: DailyNoticeItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{record.title}</span>
          </div>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (_text: boolean, record: DailyNoticeItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return record.is_active ? (
          <Tag color="green" size="small">生效中</Tag>
        ) : (
          <Tag size="small">未启用</Tag>
        )
      },
    },
    {
      title: '创建者',
      dataIndex: 'created_by_name',
      width: 120,
      render: (_text: string, record: DailyNoticeItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <Text type="tertiary">{record.created_by_name || '-'}</Text>
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (_text: string, record: DailyNoticeItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return <Text type="tertiary">{formatTime(record.updated_at)}</Text>
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 160,
      render: (_text: unknown, record: DailyNoticeItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return (
          <div className="flex items-center gap-1">
            <Button theme="borderless" type="tertiary" icon={<Eye className="h-4 w-4" />} onClick={() => handlePreview(record)} />
            <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} onClick={() => handleEdit(record)} />
            {record.is_active ? (
              <Button
                theme="borderless"
                type="tertiary"
                icon={<PowerOff className="h-4 w-4 text-orange-500" />}
                onClick={() => deactivateMutation.mutate(record.id)}
                disabled={deactivateMutation.isPending}
              />
            ) : (
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Power className="h-4 w-4 text-green-600" />}
                onClick={() => activateMutation.mutate(record.id)}
                disabled={activateMutation.isPending}
              />
            )}
            <Button
              theme="borderless"
              type="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => handleDeleteClick(record)}
            />
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTableLayout
        title="每日通知"
        total={notices.length}
        headerActions={
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新建通知
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      >
        <SemiDataTable<DailyNoticeItem>
          columns={columns}
          data={notices}
          total={notices.length}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          emptyText="暂无通知，点击「新建通知」创建"
        />
      </DataTableLayout>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑通知' : '新建通知'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={handleSubmit} loading={isSaving}>
              保存
            </Button>
          </div>
        }
        width={600}
        style={{ maxHeight: '85vh' }}
      >
        <Text type="tertiary" size="small">
          {editingItem ? '修改通知内容' : '创建新的每日通知，内容支持 Markdown 格式'}
        </Text>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Text strong size="small">标题</Text>
            <Input
              placeholder="请输入通知标题"
              value={formTitle}
              onChange={(v) => setFormTitle(v)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Text strong size="small">内容（支持 Markdown）</Text>
            <Tabs defaultActiveKey="edit">
              <TabPane tab="编辑" itemKey="edit">
                <div className="mt-2">
                  <TextArea
                    placeholder="请输入通知内容，支持 Markdown 格式..."
                    value={formContent}
                    onChange={(v) => setFormContent(v)}
                    autosize={{ minRows: 8 }}
                    style={{ fontFamily: 'monospace', fontSize: 14 }}
                  />
                </div>
              </TabPane>
              <TabPane tab="预览" itemKey="preview">
                <div className="mt-2">
                  <div className="min-h-[200px] rounded-md border p-4">
                    {formContent ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{formContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <Text type="tertiary" size="small">暂无内容</Text>
                    )}
                  </div>
                </div>
              </TabPane>
            </Tabs>
          </div>

          {!editingItem && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Text strong size="small">立即生效</Text>
                <div>
                  <Text type="tertiary" size="small">
                    开启后将立即生效，并停用其他通知
                  </Text>
                </div>
              </div>
              <Switch
                checked={formIsActive}
                onChange={setFormIsActive}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* 预览对话框 */}
      <Modal
        title={previewItem?.title}
        visible={previewDialogOpen}
        onCancel={() => setPreviewDialogOpen(false)}
        footer={
          <Button theme="solid" type="primary" onClick={() => setPreviewDialogOpen(false)}>
            已知晓
          </Button>
        }
        width={500}
        style={{ maxHeight: '80vh' }}
      >
        <Text type="tertiary" size="small">通知预览 - 用户看到的效果</Text>
        <div className="mt-4 prose prose-sm dark:prose-invert max-w-none" style={{ maxHeight: '50vh', overflow: 'auto' }}>
          <ReactMarkdown>{previewItem?.content ?? ''}</ReactMarkdown>
        </div>
      </Modal>

      {/* 删除确认 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="danger"
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          </div>
        }
      >
        确定要删除通知「{deletingItem?.title}」吗？此操作不可撤销。
      </Modal>
    </>
  )
}
