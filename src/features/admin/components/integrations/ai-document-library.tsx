/**
 * AI 资料库管理组件
 * 支持导入和编辑 Markdown 文档，供 AI 分析时作为参考资料
 */

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Table, Button, Modal, Form, Tag, Skeleton, Typography, Tooltip, Tabs, TabPane } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { aiConfigApi } from '../../api'
import { AI_DOCUMENT_CATEGORIES, type AIDocumentItem } from '../../types'

const { Text } = Typography

const SKELETON_PREFIX = 'skeleton-'
const isSkeletonRow = (id: string) => id.startsWith(SKELETON_PREFIX)

type DocumentFormValues = {
  name: string
  content: string
  description?: string
  category?: string
}

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
  const formRef = useRef<FormApi>()
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<AIDocumentItem | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<AIDocumentItem | null>(null)
  const [previewTab, setPreviewTab] = useState<string>('edit')
  const [previewContent, setPreviewContent] = useState('')

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
    mutationFn: (data: { name: string; content: string; description?: string; category?: string }) =>
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
    mutationFn: ({ id, data }: { id: string; data: { name: string; content: string; description?: string; category?: string } }) =>
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

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingDoc(null)
    setPreviewTab('edit')
    setPreviewContent('')
  }, [])

  const handleCreate = useCallback(() => {
    closeDialog()
    setPreviewContent('')
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({ name: '', content: '', description: '', category: '' })
    }, 0)
  }, [closeDialog])

  const handleEdit = useCallback((doc: AIDocumentItem) => {
    setEditingDoc(doc)
    setPreviewTab('edit')
    setPreviewContent(doc.content)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: doc.name,
        content: doc.content,
        description: doc.description || '',
        category: doc.category || '',
      })
    }, 0)
  }, [])

  const handleSubmit = (formData: DocumentFormValues) => {
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // 表格列定义
  const columns: ColumnProps<AIDocumentItem>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (_: unknown, record: AIDocumentItem) => {
        if (isSkeletonRow(record.id)) {
          return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
        }
        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{record.name}</span>
            {record.description && (
              <Text type="tertiary" size="small" className="line-clamp-1">
                {record.description}
              </Text>
            )}
          </div>
        )
      },
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (_: unknown, record: AIDocumentItem) => {
        if (isSkeletonRow(record.id)) {
          return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
        }
        return (
          <Tag size="small" type="light">
            {getCategoryLabel(record.category)}
          </Tag>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (_: unknown, record: AIDocumentItem) => {
        if (isSkeletonRow(record.id)) {
          return <Skeleton.Paragraph rows={1} style={{ width: 56 }} />
        }
        return record.is_active ? (
          <Tag size="small" type="light" color="green">
            启用
          </Tag>
        ) : (
          <Tag size="small" type="light">
            停用
          </Tag>
        )
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 110,
      render: (_: unknown, record: AIDocumentItem) => {
        if (isSkeletonRow(record.id)) {
          return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
        }
        return (
          <Text type="tertiary" size="small">
            {new Date(record.updated_at).toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 140,
      render: (_: unknown, record: AIDocumentItem) => {
        if (isSkeletonRow(record.id)) {
          return <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
        }
        return (
          <div className="flex items-center gap-1">
            <Tooltip content="编辑">
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                icon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Tooltip content={record.is_active ? '停用' : '启用'}>
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                icon={record.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                onClick={() =>
                  toggleMutation.mutate({
                    id: record.id,
                    is_active: !record.is_active,
                  })
                }
                disabled={toggleMutation.isPending}
              />
            </Tooltip>
            <Tooltip content="删除">
              <Button
                theme="borderless"
                type="danger"
                size="small"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => setDeleteDoc(record)}
              />
            </Tooltip>
          </div>
        )
      },
    },
  ]

  const tableData = isLoading ? createSkeletonData(3) : (data?.items || [])

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
            <h3 className="text-sm font-medium">资料库管理</h3>
            <Select
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(v as string)}
              size="small"
              style={{ width: 128 }}
              optionList={[
                { value: 'all', label: '全部分类' },
                ...AI_DOCUMENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
              ]}
            />
          </div>
          <Button size="small" theme="solid" type="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={handleCreate}>
            新建文档
          </Button>
        </div>

        {/* 数据表 */}
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="id"
          pagination={false}
          loading={false}
          empty={
            <div className="flex flex-col items-center py-8" style={{ color: 'var(--semi-color-text-2)' }}>
              <BookOpen className="mb-2 h-8 w-8" />
              <p>暂无资料文档</p>
              <Text type="tertiary" size="small" style={{ marginTop: 4 }}>
                点击"新建文档"添加 Markdown 格式的参考资料
              </Text>
            </div>
          }
        />
      </div>

      {/* 新建/编辑对话框 */}
      <Modal
        title={editingDoc ? '编辑文档' : '新建文档'}
        visible={dialogOpen}
        onCancel={closeDialog}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeDialog}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => formRef.current?.submitForm()}
              loading={isSaving}
            >
              {editingDoc ? '保存' : '创建'}
            </Button>
          </div>
        }
        bodyStyle={{ maxHeight: '60vh', overflow: 'auto' }}
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
          编写 Markdown 格式的参考资料，AI 分析时可读取这些文档。
        </Text>
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Input
              field="name"
              label="文档名称"
              placeholder="如：产品价格表"
              rules={[
                { required: true, message: '请输入文档名称' },
                { max: 200, message: '名称最多200字' },
              ]}
            />
            <Form.Select
              field="category"
              label="分类"
              placeholder="选择分类"
              optionList={AI_DOCUMENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
          </div>

          <Form.Input
            field="description"
            label="简要描述"
            placeholder="简要说明文档内容和用途"
            rules={[{ max: 500, message: '描述最多500字' }]}
          />

          <div style={{ marginBottom: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span className="text-sm font-medium">文档内容</span>
              <Tabs
                activeKey={previewTab}
                onChange={setPreviewTab}
                type="button"
                size="small"
                style={{ marginBottom: 0 }}
              >
                <TabPane tab="编辑" itemKey="edit" />
                <TabPane tab="预览" itemKey="preview" />
              </Tabs>
            </div>
            {previewTab === 'edit' ? (
              <Form.TextArea
                field="content"
                noLabel
                placeholder="输入 Markdown 格式的文档内容..."
                rows={12}
                rules={[{ required: true, message: '请输入文档内容' }]}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
                onChange={(value) => setPreviewContent(value)}
              />
            ) : (
              <div className="min-h-[300px] rounded-md border p-4 overflow-auto prose prose-sm max-w-none dark:prose-invert">
                {previewContent ? (
                  <ReactMarkdown>{previewContent}</ReactMarkdown>
                ) : (
                  <Text type="tertiary">暂无内容</Text>
                )}
              </div>
            )}
          </div>
        </Form>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        visible={!!deleteDoc}
        onCancel={() => setDeleteDoc(null)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDoc(null)}>取消</Button>
            <Button
              theme="solid"
              type="danger"
              onClick={() => deleteDoc && deleteMutation.mutate(deleteDoc.id)}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          </div>
        }
      >
        <p>确定要删除文档「{deleteDoc?.name}」吗？此操作不可撤销。</p>
      </Modal>
    </>
  )
}
