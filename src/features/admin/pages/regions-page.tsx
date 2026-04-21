/**
 * 大区管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { Button, Input, Modal, Form, Typography, Select } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { adminApi } from '../api'
import type { RegionItem, RegionCreate, RegionUpdate } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

interface RegionFormValues extends RegionCreate {
  sort_order?: number
  is_active?: boolean
}

// 状态筛选选项
const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
]

export function RegionsPage() {
  useDocumentTitle('大区管理')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi>()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RegionItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<RegionItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // 查询数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-regions', page, pageSize, searchValue, statusFilter],
    queryFn: async () => {
      const response = await adminApi.getRegions({
        page,
        size: pageSize,
        search: searchValue || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
      })
      return response.data
    },
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: RegionCreate) => adminApi.createRegion(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RegionUpdate }) =>
      adminApi.updateRegion(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteRegion(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 启用/禁用
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateRegion(id, { is_active }),
    onMutate: ({ id }) => setTogglingId(id),
    onSettled: () => setTogglingId(null),
    onSuccess: (_res, { is_active }) => {
      toast.success(is_active ? '已启用' : '已禁用')
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '操作失败'),
  })

  // 列定义
  const columns: ColumnProps<RegionItem>[] = [
    {
      title: '大区名称',
      dataIndex: 'name',
      width: 200,
      render: (text: string, record: RegionItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-500" />
            <Text strong>{text}</Text>
          </div>
        )
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 300,
      render: (text: string, record: RegionItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
        return (
          <Text type="tertiary" ellipsis={{ showTooltip: true }} style={{ maxWidth: 300 }}>
            {text || '-'}
          </Text>
        )
      },
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 80,
      render: (text: number, record: RegionItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={40} />
        return <span className="text-center block">{text}</span>
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (_isActive: boolean, record: RegionItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return <StatusBadge isActive={record.is_active} />
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (text: string, record: RegionItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
        return <Text type="tertiary">{formatTime(text)}</Text>
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 120,
      render: (_id: string, record: RegionItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} size="small" onClick={() => handleEdit(record)} />
            <Button
              theme="borderless"
              type={record.is_active ? 'warning' : 'tertiary'}
              icon={record.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4 text-green-600" />}
              size="small"
              loading={togglingId === record.id}
              onClick={() => toggleStatusMutation.mutate({ id: record.id, is_active: !record.is_active })}
            />
            <Button theme="borderless" type="danger" icon={<Trash2 className="h-4 w-4" />} size="small" onClick={() => handleDelete(record)} />
          </div>
        )
      },
    },
  ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 处理函数
  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
    }, 0)
  }

  const handleEdit = (item: RegionItem) => {
    setEditingItem(item)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        name: item.name,
        description: item.description || '',
        sort_order: item.sort_order,
        is_active: item.is_active,
      })
    }, 0)
  }

  const handleDelete = (item: RegionItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = (values: RegionFormValues) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values as RegionUpdate })
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

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataTableLayout
        title="大区管理"
        total={data?.total}
        headerActions={
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新建大区
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索大区名称..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
              optionList={statusOptions}
              style={{ width: 130 }}
            />
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑大区' : '新建大区'}
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
          <Form.Input field="name" label="大区名称" placeholder="请输入大区名称" rules={[{ required: true, message: '请输入大区名称' }, { max: 50, message: '名称最多50个字符' }]} />
          <Form.TextArea field="description" label="描述" placeholder="请输入描述信息" rules={[{ max: 200, message: '描述最多200个字符' }]} />
          <Form.InputNumber field="sort_order" label="排序值" min={0} style={{ width: '100%' }} initValue={0} />
          <Form.Switch field="is_active" label="启用状态" initValue={true} />
        </Form>
      </Modal>

      {/* 删除确认弹窗 */}
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
        确定要删除大区"{deletingItem?.name}"吗？此操作无法撤销。
      </Modal>
    </>
  )
}
