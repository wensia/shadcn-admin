/**
 * 职位管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Briefcase, Plus, Pencil, Trash2 } from 'lucide-react'
import { Table, Form, Button, Modal, Select, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { Input } from '@douyinfe/semi-ui-19'
import { Main } from '@/components/layout/main'
import { adminApi } from '../api'
import type { PositionItem, PositionCreate, PositionUpdate } from '../types'
import { POSITION_LEVELS } from '../types'
import { StatusBadge, PositionLevelBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

const SKELETON_PREFIX = '__skeleton__'
const isSkeletonRow = (id: string) => id.startsWith(SKELETON_PREFIX)

function createSkeletonData(count: number): PositionItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_PREFIX}${i}`,
    name: '',
    level: 1,
    description: '',
    sort_order: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  }))
}

export function PositionsPage() {
  useDocumentTitle('职位管理')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi>()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PositionItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<PositionItem | null>(null)

  // 查询数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-positions', page, pageSize, searchValue, statusFilter, levelFilter],
    queryFn: async () => {
      const response = await adminApi.getPositions({
        page,
        size: pageSize,
        search: searchValue || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        level: levelFilter === 'all' ? undefined : parseInt(levelFilter),
      })
      return response.data
    },
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: PositionCreate) => adminApi.createPosition(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-positions'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PositionUpdate }) =>
      adminApi.updatePosition(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-positions'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deletePosition(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-positions'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 列定义
  const columns: ColumnProps[] = useMemo(
    () => [
      {
        title: '职位名称',
        dataIndex: 'name',
        width: 200,
        render: (text: string, record: any) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 96, height: 20 }} loading />
          return (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-emerald-500" />
              <Text strong>{text}</Text>
            </div>
          )
        },
      },
      {
        title: '职位级别',
        dataIndex: 'level',
        width: 120,
        render: (_: number, record: any) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 64, height: 20 }} loading />
          return <PositionLevelBadge level={record.level} />
        },
      },
      {
        title: '描述',
        dataIndex: 'description',
        width: 250,
        render: (text: string, record: any) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 160, height: 20 }} loading />
          return (
            <Text type="tertiary" style={{ maxWidth: 250, display: 'block' }} className="truncate">
              {text || '-'}
            </Text>
          )
        },
      },
      {
        title: '排序',
        dataIndex: 'sort_order',
        width: 80,
        render: (text: number, record: any) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 40, height: 20 }} loading />
          return <span style={{ display: 'block', textAlign: 'center' }}>{text}</span>
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_: boolean, record: any) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 56, height: 20 }} loading />
          return <StatusBadge isActive={record.is_active} />
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 180,
        render: (text: string, record: any) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 128, height: 20 }} loading />
          return <Text type="tertiary">{formatTime(text)}</Text>
        },
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 120,
        render: (_: string, record: any) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80, height: 20 }} loading />
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} size="small" onClick={() => handleEdit(record)} />
              <Button theme="borderless" type="danger" icon={<Trash2 className="h-4 w-4" />} size="small" onClick={() => handleDelete(record)} />
            </div>
          )
        },
      },
    ],
    []
  )

  // 显示数据
  const displayData = isLoading ? createSkeletonData(pageSize) : (data?.items || [])

  // 下拉选项
  const levelFilterOptions = useMemo(() => [
    { value: 'all', label: '全部级别' },
    ...POSITION_LEVELS.map((l) => ({ value: String(l.value), label: l.label })),
  ], [])

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '启用' },
    { value: 'inactive', label: '停用' },
  ]

  const levelFormOptions = useMemo(() =>
    POSITION_LEVELS.map((l) => ({ value: l.value, label: l.label })),
    []
  )

  // 处理函数
  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
    setTimeout(() => { formRef.current?.reset() }, 0)
  }

  const handleEdit = (item: PositionItem) => {
    setEditingItem(item)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        level: item.level,
        description: item.description || '',
        sort_order: item.sort_order,
        is_active: item.is_active,
      })
    }, 0)
  }

  const handleDelete = (item: PositionItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = (values: Record<string, any>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values as PositionUpdate })
    } else {
      createMutation.mutate(values as PositionCreate)
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

  const isPending = createMutation.isPending || updateMutation.isPending

  // 分页配置
  const pagination = useMemo(() => ({
    currentPage: page,
    pageSize,
    total: data?.total || 0,
    onPageChange: (p: number) => setPage(p),
    onPageSizeChange: (s: number) => { setPageSize(s); setPage(1) },
    showSizeChanger: true,
    pageSizeOpts: [10, 20, 50, 100],
    showTotal: true,
    formatPageText: (info: any) => `第 ${info.currentStart}–${info.currentEnd} 条，共 ${info.total} 条`,
  }), [page, pageSize, data?.total])

  return (
    <Main fixed>
      <div className="flex flex-col gap-4 h-full">
        {/* 标题栏 */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-semibold">职位管理</h1>
            <p style={{ color: 'var(--semi-color-text-2)', fontSize: 14 }}>管理系统中的职位信息</p>
          </div>
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新建职位
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索职位名称..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
            <Select
              value={levelFilter}
              onChange={(v) => { setLevelFilter(v as string); setPage(1) }}
              optionList={levelFilterOptions}
              style={{ width: 130 }}
            />
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
              optionList={statusOptions}
              style={{ width: 130 }}
            />
          </div>
          <Button theme="borderless" type="tertiary" icon={<IconRefresh />} onClick={() => refetch()} />
        </div>

        {/* 表格 */}
        <div className="flex-1 min-h-0">
          <Table
            columns={columns}
            dataSource={displayData}
            rowKey="id"
            pagination={pagination}
            loading={false}
            style={isLoading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            empty={<Text type="tertiary">暂无数据</Text>}
          />
        </div>
      </div>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑职位' : '新建职位'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={isPending}>保存</Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <Form.Input
            field="name"
            label="职位名称"
            placeholder="请输入职位名称"
            rules={[
              { required: true, message: '请输入职位名称' },
              { max: 50, message: '名称最多50个字符' },
            ]}
          />
          <Form.Select
            field="level"
            label="职位级别"
            placeholder="请选择职位级别"
            optionList={levelFormOptions}
            rules={[{ required: true, message: '请选择职位级别' }]}
            initValue={1}
            style={{ width: '100%' }}
          />
          <Form.TextArea
            field="description"
            label="描述"
            placeholder="请输入描述信息"
            rows={3}
          />
          <Form.InputNumber
            field="sort_order"
            label="排序值"
            min={0}
            initValue={0}
          />
          <Form.Switch
            field="is_active"
            label="启用状态"
            initValue={true}
          />
        </Form>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="danger" onClick={handleConfirmDelete} loading={deleteMutation.isPending}>删除</Button>
          </div>
        }
      >
        确定要删除职位"{deletingItem?.name}"吗？此操作无法撤销。
      </Modal>
    </Main>
  )
}
