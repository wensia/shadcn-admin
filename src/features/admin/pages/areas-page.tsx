/**
 * 区域管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { Plus, Pencil, Trash2, MapPinned } from 'lucide-react'
import { Form, Button, Modal, Input, Select, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { adminApi } from '../api'
import type { AreaItem, AreaCreate, AreaUpdate, DistrictItem } from '../types'
import { StatusBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

interface AreaFormValues extends AreaCreate {
  is_active?: boolean
}

export function AreasPage() {
  useDocumentTitle('区域管理')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi>()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [districtFilter, setDistrictFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AreaItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<AreaItem | null>(null)

  // 获取区域列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-areas', page, pageSize, searchValue, statusFilter, districtFilter],
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
      if (districtFilter !== 'all') {
        params.district_id = districtFilter
      }
      const response = await adminApi.getAreas(params)
      return response.data
    },
  })

  // 获取地区列表（用于下拉选择）
  const { data: districtsData } = useQuery({
    queryKey: ['admin-districts-options'],
    queryFn: async () => {
      const response = await adminApi.getDistricts({ size: 100, is_active: true })
      return response.data
    },
  })

  const districts = useMemo<DistrictItem[]>(() => districtsData?.items ?? [], [districtsData?.items])

  // 创建区域
  const createMutation = useMutation({
    mutationFn: (data: AreaCreate) => adminApi.createArea(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新区域
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AreaUpdate }) =>
      adminApi.updateArea(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除区域
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteArea(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 表格列定义
  const columns: ColumnProps<AreaItem>[] = [
    {
      title: '区域名称',
      dataIndex: 'name',
      width: 200,
      render: (text: string, record: AreaItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return (
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-orange-500" />
            <Text strong>{text}</Text>
          </div>
        )
      },
    },
    {
      title: '所属地区',
      dataIndex: 'district_name',
      width: 150,
      render: (_text: string, record: AreaItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return record.district_name || '-'
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (text: string, record: AreaItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
        return text || '-'
      },
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 80,
      render: (text: number, record: AreaItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
        return text
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (_value: boolean, record: AreaItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return <StatusBadge isActive={record.is_active} />
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (text: string | undefined, record: AreaItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return text ? new Date(text).toLocaleString('zh-CN') : '-'
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 120,
      render: (_id: string, record: AreaItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} size="small" onClick={() => handleEdit(record)} />
            <Button theme="borderless" type="danger" icon={<Trash2 className="h-4 w-4" />} size="small" onClick={() => handleDeleteClick(record)} />
          </div>
        )
      },
    },
  ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 地区下拉选项
  const districtFilterOptions = useMemo(() => [
    { value: 'all', label: '全部地区' },
    ...districts.map((district) => ({ value: district.id, label: district.name })),
  ], [districts])

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '已启用' },
    { value: 'inactive', label: '已停用' },
  ]

  // 地区表单下拉选项
  const districtFormOptions = useMemo(() =>
    districts.map((district) => ({
      value: district.id,
      label: district.name + (district.region_name ? ` (${district.region_name})` : ''),
    })),
    [districts]
  )

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
    setTimeout(() => { formRef.current?.reset() }, 0)
  }

  // 处理编辑
  const handleEdit = (item: AreaItem) => {
    setEditingItem(item)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        district_id: item.district_id,
        name: item.name,
        description: item.description || '',
        sort_order: item.sort_order,
        is_active: item.is_active,
      })
    }, 0)
  }

  // 处理删除点击
  const handleDeleteClick = (item: AreaItem) => {
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
  const handleSubmit = (values: AreaFormValues) => {
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: values as AreaUpdate,
      })
    } else {
      createMutation.mutate(values)
    }
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataTableLayout
        title="区域管理"
        total={data?.total}
        headerActions={
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新建区域
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索区域名称..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
            <Select
              value={districtFilter}
              onChange={(v) => { setDistrictFilter(v as string); setPage(1) }}
              optionList={districtFilterOptions}
              style={{ width: 160 }}
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

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑区域' : '新建区域'}
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
          <Form.Select
            field="district_id"
            label="所属地区"
            placeholder="请选择所属地区"
            optionList={districtFormOptions}
            rules={[{ required: true, message: '请选择所属地区' }]}
            style={{ width: '100%' }}
          />
          <Form.Input
            field="name"
            label="区域名称"
            placeholder="请输入区域名称"
            rules={[
              { required: true, message: '请输入区域名称' },
              { max: 50, message: '区域名称不能超过50个字符' },
            ]}
          />
          <Form.Input
            field="description"
            label="描述"
            placeholder="请输入描述（可选）"
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
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>删除</Button>
          </div>
        }
      >
        确定要删除区域"{deletingItem?.name}"吗？此操作不可撤销。
        如果该区域下存在校区，则无法删除。
      </Modal>
    </>
  )
}
