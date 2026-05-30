/**
 * 员工身份管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { Plus, Pencil, Trash2, UserCog } from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { Button, Form, Input, Modal, Select, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'
import { adminApi } from '../api'
import type {
  EmployeeIdentityItem,
  EmployeeIdentityCreate,
  EmployeeIdentityUpdate,
  EmployeeItem,
  CampusItem,
  CampusDepartmentItem,
  PositionItem,
} from '../types'
import { StatusBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

const PAGE_SIZE = 20

interface IdentityFormValues {
  employee_id?: string
  campus_id?: string
  department_id?: string
  position_id?: string
  is_active?: boolean
  can_manage_leads?: boolean
  can_access_pool?: boolean
}

export function IdentitiesPage() {
  useDocumentTitle('员工身份管理')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [searchValue, setSearchValue] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [campusFilter, setCampusFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EmployeeIdentityItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<EmployeeIdentityItem | null>(null)

  // 表单中选择的校区 ID，用于动态加载部门
  const [formCampusId, setFormCampusId] = useState<string>('')

  // 获取员工身份列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-identities', page, pageSize, selectedEmployeeId, campusFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (selectedEmployeeId) {
        params.employee_id = selectedEmployeeId
      }
      if (campusFilter !== 'all') {
        params.campus_id = campusFilter
      }
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active'
      }
      const response = await adminApi.getEmployeeIdentities(params)
      return response.data
    },
  })

  // 获取员工列表（用于下拉选择和搜索）
  const { data: employeesData } = useQuery({
    queryKey: ['admin-employees-options'],
    queryFn: async () => {
      const response = await adminApi.getEmployees({ size: 200, is_active: true })
      return response.data
    },
  })

  // 获取校区列表（用于下拉选择和筛选）
  const { data: campusesData } = useQuery({
    queryKey: ['admin-campuses-options'],
    queryFn: async () => {
      const response = await adminApi.getCampuses({ size: 100, is_active: true })
      return response.data
    },
  })

  // 获取职位列表（用于下拉选择）
  const { data: positionsData } = useQuery({
    queryKey: ['admin-positions-options'],
    queryFn: async () => {
      const response = await adminApi.getPositions({ size: 100, is_active: true })
      return response.data
    },
  })

  // 根据选中的校区动态获取部门列表
  const { data: campusDepartmentsData } = useQuery({
    queryKey: ['admin-campus-departments', formCampusId],
    queryFn: async () => {
      const response = await adminApi.getCampusDepartments({ campus_id: formCampusId, size: 100 })
      return response.data
    },
    enabled: !!formCampusId,
  })

  const employees: EmployeeItem[] = useMemo(() => employeesData?.items ?? [], [employeesData?.items])
  const campuses: CampusItem[] = useMemo(() => campusesData?.items ?? [], [campusesData?.items])
  const positions: PositionItem[] = useMemo(() => positionsData?.items ?? [], [positionsData?.items])
  const campusDepartments: CampusDepartmentItem[] = useMemo(
    () => campusDepartmentsData?.items ?? [],
    [campusDepartmentsData?.items]
  )
  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 创建身份
  const createMutation = useMutation({
    mutationFn: (data: EmployeeIdentityCreate) => adminApi.createEmployeeIdentity(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-identities'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新身份
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeIdentityUpdate }) =>
      adminApi.updateEmployeeIdentity(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-identities'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除身份
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteEmployeeIdentity(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-identities'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 表格列定义
  const columns: ColumnProps<EmployeeIdentityItem>[] = [
    {
      title: '员工姓名',
      dataIndex: 'employee_name',
      render: (_: unknown, record: EmployeeIdentityItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCog className="h-4 w-4 text-blue-500" />
            <Text strong>{record.employee_name}</Text>
          </div>
        )
      },
    },
    {
      title: '所属组织',
      dataIndex: 'org_scope',
      render: (_: unknown, record: EmployeeIdentityItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        const scope = record.scope_type || 'campus'
        if (scope === 'region' && record.region_name) return `大区:${record.region_name}`
        if (scope === 'district' && record.district_name) return `地区:${record.district_name}`
        if (scope === 'area' && record.area_name) return `片区:${record.area_name}`
        return record.campus_name || '-'
      },
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      render: (_: unknown, record: EmployeeIdentityItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return record.department_name || '-'
      },
    },
    {
      title: '职位',
      dataIndex: 'position_name',
      render: (_: unknown, record: EmployeeIdentityItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return record.position_name || '-'
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (_: unknown, record: EmployeeIdentityItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return <StatusBadge isActive={record.is_active} />
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (_: unknown, record: EmployeeIdentityItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return new Date(record.created_at).toLocaleString('zh-CN')
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 120,
      render: (_: unknown, record: EmployeeIdentityItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              theme="borderless"
              type="tertiary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => handleEdit(record)}
            />
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

  // 处理创建
  const handleCreate = () => {
    setEditingItem(null)
    setFormCampusId('')
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({ is_active: true, can_manage_leads: true, can_access_pool: true })
    }, 0)
  }

  // 处理编辑
  const handleEdit = (item: EmployeeIdentityItem) => {
    setEditingItem(item)
    setFormCampusId(item.campus_id ?? '')
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        employee_id: item.employee_id,
        campus_id: item.campus_id,
        department_id: item.department_id,
        position_id: item.position_id,
        is_active: item.is_active,
        can_manage_leads: (item as unknown as Record<string, unknown>).can_manage_leads as boolean ?? true,
        can_access_pool: (item as unknown as Record<string, unknown>).can_access_pool as boolean ?? true,
      })
    }, 0)
  }

  // 处理删除点击
  const handleDeleteClick = (item: EmployeeIdentityItem) => {
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
  const handleSubmit = (values: IdentityFormValues) => {
    if (editingItem) {
      const updateData: EmployeeIdentityUpdate = {
        campus_id: values.campus_id || '',
        department_id: values.department_id || '',
        position_id: values.position_id || '',
        is_active: !!values.is_active,
        can_manage_leads: !!values.can_manage_leads,
        can_access_pool: !!values.can_access_pool,
      }
      updateMutation.mutate({
        id: editingItem.id,
        data: updateData,
      })
    } else {
      const createData: EmployeeIdentityCreate = {
        employee_id: values.employee_id || '',
        campus_id: values.campus_id || '',
        department_id: values.department_id || '',
        position_id: values.position_id || '',
        is_active: !!values.is_active,
        can_manage_leads: !!values.can_manage_leads,
        can_access_pool: !!values.can_access_pool,
      }
      createMutation.mutate(createData)
    }
  }

  // 处理搜索（按员工姓名搜索 - 找到匹配的员工ID进行筛选）
  const handleSearch = () => {
    setPage(1)
    if (searchValue.trim()) {
      const matched = employees.find((e) => e.name.includes(searchValue.trim()))
      setSelectedEmployeeId(matched?.id || '__no_match__')
    } else {
      setSelectedEmployeeId('')
    }
  }

  // 校区变化时清空部门
  const handleCampusChange = (campusId: string) => {
    setFormCampusId(campusId)
    // 如果是编辑模式且校区未变，不清空部门
    if (editingItem && campusId === editingItem.campus_id) {
      return
    }
    formRef.current?.setValue('department_id', '')
  }

  // 筛选选项
  const campusFilterOptions = useMemo(() => [
    { value: 'all', label: '全部校区' },
    ...campuses.map((c) => ({ value: c.id, label: c.name })),
  ], [campuses])

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '已启用' },
    { value: 'inactive', label: '已停用' },
  ]

  // 表单下拉选项
  const employeeOptions = useMemo(() =>
    employees.map((emp) => ({
      value: emp.id,
      label: emp.name + (emp.username ? ` (${emp.username})` : ''),
    })),
    [employees]
  )

  const campusOptions = useMemo(() =>
    campuses.map((c) => ({ value: c.id, label: c.name })),
    [campuses]
  )

  const departmentOptions = useMemo(() =>
    campusDepartments.map((cd) => ({
      value: cd.department_id,
      label: cd.department_name,
    })),
    [campusDepartments]
  )

  const positionOptions = useMemo(() =>
    positions.map((pos) => ({ value: pos.id, label: pos.name })),
    [positions]
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataTableLayout
        title="员工身份管理"
        total={data?.total}
        headerActions={
          <Button theme="solid" type="primary" onClick={handleCreate} icon={<Plus className="h-4 w-4" />}>
            新建身份
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索员工姓名..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
            <Select
              value={campusFilter}
              onChange={(v) => { setCampusFilter(v as string); setPage(1) }}
              optionList={campusFilterOptions}
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
        title={editingItem ? '编辑身份' : '新建身份'}
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
            field="employee_id"
            label="员工"
            placeholder="请选择员工"
            optionList={employeeOptions}
            rules={[{ required: true, message: '请选择员工' }]}
            disabled={!!editingItem}
            filter
            style={{ width: '100%' }}
          />
          <Form.Select
            field="campus_id"
            label="校区"
            placeholder="请选择校区"
            optionList={campusOptions}
            rules={[{ required: true, message: '请选择校区' }]}
            onChange={(v) => handleCampusChange(v as string)}
            filter
            style={{ width: '100%' }}
          />
          <Form.Select
            field="department_id"
            label="部门"
            placeholder={formCampusId ? '请选择部门' : '请先选择校区'}
            optionList={departmentOptions}
            rules={[{ required: true, message: '请选择部门' }]}
            disabled={!formCampusId}
            style={{ width: '100%' }}
          />
          <Form.Select
            field="position_id"
            label="职位"
            placeholder="请选择职位"
            optionList={positionOptions}
            rules={[{ required: true, message: '请选择职位' }]}
            filter
            style={{ width: '100%' }}
          />
          <Form.Switch
            field="is_active"
            label="启用状态"
            checkedText="启用"
            uncheckedText="停用"
          />
          <Form.Switch
            field="can_manage_leads"
            label="线索管理权限"
            checkedText="允许"
            uncheckedText="禁止"
          />
          <Form.Switch
            field="can_access_pool"
            label="公海访问权限"
            checkedText="允许"
            uncheckedText="禁止"
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
        确定要删除员工"{deletingItem?.employee_name}"在"{deletingItem?.campus_name} - {deletingItem?.department_name}"的身份吗？此操作不可撤销。
      </Modal>
    </>
  )
}
