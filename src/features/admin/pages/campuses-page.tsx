/**
 * 校区管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button, Form, Input, Modal, Select, Switch, Table, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { adminApi } from '../api'
import type { CampusItem, CampusCreate, CampusUpdate } from '../types'
import { StatusBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography
const { TextArea } = Input

const SKELETON_PREFIX = '__skeleton__'
const isSkeletonRow = (id: string) => id.startsWith(SKELETON_PREFIX)

const PAGE_SIZE = 20

export function CampusesPage() {
  useDocumentTitle('校区管理')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi>()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CampusItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<CampusItem | null>(null)

  // 获取校区列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-campuses', page, pageSize, searchValue, statusFilter, areaFilter],
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
      if (areaFilter !== 'all') {
        params.area_id = areaFilter
      }
      const response = await adminApi.getCampuses(params)
      return response.data
    },
  })

  // 获取区域列表（用于下拉选择）
  const { data: areasData } = useQuery({
    queryKey: ['admin-areas-options'],
    queryFn: async () => {
      const response = await adminApi.getAreas({ size: 100, is_active: true })
      return response.data
    },
  })

  const areas = areasData?.items || []

  // 创建校区
  const createMutation = useMutation({
    mutationFn: (data: CampusCreate) => adminApi.createCampus(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新校区
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CampusUpdate }) =>
      adminApi.updateCampus(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除校区
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCampus(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-campuses'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 表格列定义
  const columns: ColumnProps<CampusItem>[] = useMemo(
    () => [
      {
        title: '校区名称',
        dataIndex: 'name',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96, height: 16 }} loading />
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 className="h-4 w-4 text-teal-500" />
              <Text strong>{record.name}</Text>
            </div>
          )
        },
      },
      {
        title: '所属区域',
        dataIndex: 'area_name',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 80, height: 16 }} loading />
          }
          return record.area?.name || '-'
        },
      },
      {
        title: '类型',
        dataIndex: 'is_area_office',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 56, height: 20 }} loading />
          }
          return record.is_area_office ? (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
              区域办
            </span>
          ) : (
            <Text type="tertiary" size="small">普通校区</Text>
          )
        },
      },
      {
        title: '地址',
        dataIndex: 'address',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 160, height: 16 }} loading />
          }
          const address = record.address
          if (!address) return '-'
          return (
            <span style={{ maxWidth: 200, display: 'inline-block' }} className="truncate" title={address}>
              {address}
            </span>
          )
        },
      },
      {
        title: '联系电话',
        dataIndex: 'contact_phone',
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96, height: 16 }} loading />
          }
          return record.contact_phone || '-'
        },
      },
      {
        title: '排序',
        dataIndex: 'sort_order',
        width: 80,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 32, height: 16 }} loading />
          }
          return record.sort_order
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 56, height: 20 }} loading />
          }
          return <StatusBadge isActive={record.is_active} />
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 180,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 112, height: 16 }} loading />
          }
          return new Date(record.created_at).toLocaleString('zh-CN')
        },
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 120,
        render: (_: unknown, record: CampusItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 64, height: 16 }} loading />
          }
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Pencil className="h-4 w-4" />}
                size="small"
                onClick={() => handleEdit(record)}
              />
              <Button
                theme="borderless"
                type="danger"
                icon={<Trash2 className="h-4 w-4" />}
                size="small"
                onClick={() => handleDeleteClick(record)}
              />
            </div>
          )
        },
      },
    ],
    []
  )

  // 骨架屏数据
  const skeletonData: CampusItem[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `${SKELETON_PREFIX}${i}`,
        area_id: '',
        name: '',
        address: '',
        contact_phone: '',
        description: '',
        sort_order: 0,
        is_active: true,
        is_area_office: false,
        created_at: '',
        updated_at: '',
      })),
    []
  )

  const displayData = isLoading ? skeletonData : (data?.items || [])

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

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({ sort_order: 0, is_active: true, is_area_office: false })
    }, 0)
  }

  // 处理编辑
  const handleEdit = (item: CampusItem) => {
    setEditingItem(item)
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        area_id: item.area_id,
        name: item.name,
        address: item.address || '',
        contact_phone: item.contact_phone || '',
        description: item.description || '',
        sort_order: item.sort_order,
        is_active: item.is_active,
        is_area_office: item.is_area_office || false,
      })
    }, 0)
  }

  // 处理删除点击
  const handleDeleteClick = (item: CampusItem) => {
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
  const handleSubmit = (values: Record<string, unknown>) => {
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: values as CampusUpdate,
      })
    } else {
      createMutation.mutate(values as CampusCreate)
    }
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  // 区域筛选选项
  const areaOptions = useMemo(() => [
    { value: 'all', label: '全部区域' },
    ...areas.map((area) => ({ value: area.id, label: area.name })),
  ], [areas])

  // 状态筛选选项
  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '已启用' },
    { value: 'inactive', label: '已停用' },
  ]

  // 区域下拉选项（表单用）
  const areaFormOptions = useMemo(() =>
    areas.map((area) => ({
      value: area.id,
      label: area.name + (area.district ? ` (${area.district.name})` : ''),
    })),
    [areas]
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">校区管理</h1>
            <Text type="tertiary" size="small">
              管理系统中的校区信息，校区是业务开展的基本单元
            </Text>
          </div>
          <Button theme="solid" type="primary" onClick={handleCreate} icon={<Plus className="h-4 w-4" />}>
            新建校区
          </Button>
        </div>

        {/* 工具栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, flex: 1 }}>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索校区名称..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
            <Select
              value={areaFilter}
              onChange={(v) => { setAreaFilter(v as string); setPage(1) }}
              optionList={areaOptions}
              style={{ width: 160 }}
            />
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
              optionList={statusOptions}
              style={{ width: 130 }}
            />
            <Button theme="outline" onClick={handleSearch}>
              搜索
            </Button>
          </div>
          <Button theme="borderless" type="tertiary" icon={<IconRefresh />} onClick={() => refetch()} />
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-hidden">
          <Table
            columns={columns}
            dataSource={displayData}
            rowKey="id"
            pagination={pagination}
            loading={false}
            style={isLoading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
          />
        </div>
      </div>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑校区' : '新建校区'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={isPending}>
              保存
            </Button>
          </div>
        }
        style={{ maxWidth: 520 }}
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <Form.Select
            field="area_id"
            label="所属区域"
            placeholder="请选择所属区域"
            optionList={areaFormOptions}
            rules={[{ required: true, message: '请选择所属区域' }]}
            style={{ width: '100%' }}
          />
          <Form.Input
            field="name"
            label="校区名称"
            placeholder="请输入校区名称"
            rules={[
              { required: true, message: '请输入校区名称' },
              { max: 50, message: '校区名称不能超过50个字符' },
            ]}
          />
          <Form.Input
            field="address"
            label="地址"
            placeholder="请输入校区地址（可选）"
            rules={[{ max: 200, message: '地址不能超过200个字符' }]}
          />
          <Form.Input
            field="contact_phone"
            label="联系电话"
            placeholder="请输入联系电话（可选）"
            rules={[{ max: 20, message: '联系电话不能超过20个字符' }]}
          />
          <Form.TextArea
            field="description"
            label="描述"
            placeholder="请输入校区描述（可选）"
            autosize={{ minRows: 3, maxRows: 5 }}
            rules={[{ max: 500, message: '描述不能超过500个字符' }]}
          />
          <Form.InputNumber
            field="sort_order"
            label="排序值"
            placeholder="请输入排序值"
            min={0}
          />
          <Form.Switch
            field="is_area_office"
            label="区域办"
            checkedText="是"
            uncheckedText="否"
          />
          <Form.Switch
            field="is_active"
            label="启用状态"
            checkedText="启用"
            uncheckedText="停用"
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
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>
              删除
            </Button>
          </div>
        }
      >
        确定要删除校区"{deletingItem?.name}"吗？此操作不可撤销。
        如果该校区下存在员工或部门配置，则无法删除。
      </Modal>
    </Main>
  )
}
