/**
 * 校区部门配置页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Building2, Network, Users, Eye } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Form, Button, Modal, Input, Select, Table, Skeleton, Typography, Tag, Tooltip } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { adminApi } from '../api'
import type { CampusDepartmentItem, CampusDepartmentCreate, ManagerType } from '../types'
import { StatusBadge } from '../components/status-badge'
import { ManageManagersDialog } from '../components/manage-managers-dialog'
import { ViewDepartmentEmployeesDialog } from '../components/view-department-employees-dialog'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

const SKELETON_PREFIX = '__skeleton__'
const isSkeletonRow = (id: string) => id.startsWith(SKELETON_PREFIX)

export function CampusDepartmentsPage() {
  useDocumentTitle('校区部门配置')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi>()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [campusFilter, setCampusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<CampusDepartmentItem | null>(null)
  const [managerDialogOpen, setManagerDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<CampusDepartmentItem | null>(null)
  const [employeesDialogOpen, setEmployeesDialogOpen] = useState(false)
  const [viewingDepartment, setViewingDepartment] = useState<CampusDepartmentItem | null>(null)

  // 获取校区部门配置列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-campus-departments', page, pageSize, searchValue, campusFilter, departmentFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
      }
      if (searchValue) {
        params.search = searchValue
      }
      if (campusFilter !== 'all') {
        params.campus_id = campusFilter
      }
      if (departmentFilter !== 'all') {
        params.department_id = departmentFilter
      }
      const response = await adminApi.getCampusDepartments(params)
      return response.data
    },
  })

  // 获取校区列表（用于下拉选择）
  const { data: campusesData } = useQuery({
    queryKey: ['admin-campuses-options'],
    queryFn: async () => {
      const response = await adminApi.getCampuses({ size: 100, is_active: true })
      return response.data
    },
  })

  // 获取部门列表（用于下拉选择）
  const { data: departmentsData } = useQuery({
    queryKey: ['admin-departments-options'],
    queryFn: async () => {
      const response = await adminApi.getDepartments({ size: 100, is_active: true })
      return response.data
    },
  })

  const campuses = campusesData?.items || []
  const departments = departmentsData?.items || []

  // 创建校区部门配置
  const createMutation = useMutation({
    mutationFn: (data: CampusDepartmentCreate) => adminApi.createCampusDepartment(data),
    onSuccess: () => {
      toast.success('配置成功')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-campus-departments'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '配置失败')
    },
  })

  // 删除校区部门配置
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCampusDepartment(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-campus-departments'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 负责人类型标签
  const typeLabels: Record<ManagerType, string> = {
    manager: '经理',
    deputy: '副经理',
    supervisor: '主管',
  }

  // 负责人类型颜色
  const typeColors: Record<ManagerType, 'blue' | 'cyan' | 'grey'> = {
    manager: 'blue',
    deputy: 'cyan',
    supervisor: 'grey',
  }

  // 表格列定义
  const columns: ColumnProps<CampusDepartmentItem>[] = useMemo(
    () => [
      {
        title: '校区',
        dataIndex: 'campus_name',
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96, height: 16 }} loading />
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 className="h-4 w-4" style={{ color: '#14b8a6' }} />
              <span style={{ fontWeight: 500 }}>{record!.campus_name || '-'}</span>
            </div>
          )
        },
      },
      {
        title: '部门',
        dataIndex: 'department_name',
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96, height: 16 }} loading />
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Network className="h-4 w-4" style={{ color: '#a855f7' }} />
              <span>{record!.department_name || '-'}</span>
            </div>
          )
        },
      },
      {
        title: '负责人',
        dataIndex: 'managers',
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 128, height: 20 }} loading />
          }
          const managers = record!.managers || []
          if (managers.length === 0) {
            return <Text type="tertiary" size="small">未配置</Text>
          }

          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {managers.slice(0, 3).map((m) => (
                <Tooltip key={m.id} content={`${typeLabels[m.manager_type]}: ${m.employee?.name}`}>
                  <Tag
                    color={typeColors[m.manager_type]}
                    size="small"
                    style={{ cursor: 'default' }}
                  >
                    {m.employee?.name || '未知'}
                  </Tag>
                </Tooltip>
              ))}
              {managers.length > 3 && (
                <Tooltip content={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {managers.slice(3).map((m) => (
                      <div key={m.id}>{typeLabels[m.manager_type]}: {m.employee?.name}</div>
                    ))}
                  </div>
                }>
                  <Tag size="small" style={{ cursor: 'default' }}>
                    +{managers.length - 3}
                  </Tag>
                </Tooltip>
              )}
            </div>
          )
        },
      },
      {
        title: '排序',
        dataIndex: 'sort_order',
        width: 80,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 32, height: 16 }} loading />
          }
          return record!.sort_order ?? '-'
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 56, height: 20 }} loading />
          }
          return <StatusBadge isActive={record!.is_active} />
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 180,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 112, height: 16 }} loading />
          }
          return new Date(record!.created_at).toLocaleString('zh-CN')
        },
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 140,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 80, height: 16 }} loading />
          }
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Eye className="h-4 w-4" />}
                size="small"
                onClick={() => handleViewEmployees(record!)}
              />
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Users className="h-4 w-4" />}
                size="small"
                onClick={() => handleManageManagers(record!)}
              />
              <Button
                theme="borderless"
                type="danger"
                icon={<Trash2 className="h-4 w-4" />}
                size="small"
                onClick={() => handleDeleteClick(record!)}
              />
            </div>
          )
        },
      },
    ],
    []
  )

  // 生成骨架屏数据
  const skeletonData: CampusDepartmentItem[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `${SKELETON_PREFIX}${i}`,
        campus_id: '',
        department_id: '',
        sort_order: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      })),
    []
  )

  const displayData = isLoading ? skeletonData : (data?.items || [])

  // 分页
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
    setDialogOpen(true)
    setTimeout(() => { formRef.current?.reset() }, 0)
  }

  // 处理删除点击
  const handleDeleteClick = (item: CampusDepartmentItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 处理负责人管理点击
  const handleManageManagers = (item: CampusDepartmentItem) => {
    setSelectedDepartment(item)
    setManagerDialogOpen(true)
  }

  // 处理查看员工点击
  const handleViewEmployees = (item: CampusDepartmentItem) => {
    setViewingDepartment(item)
    setEmployeesDialogOpen(true)
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 处理表单提交
  const handleSubmit = (values: Record<string, any>) => {
    createMutation.mutate({
      campus_id: values.campus_id,
      department_id: values.department_id,
      sort_order: values.sort_order ?? 0,
      is_active: true,
    } as CampusDepartmentCreate)
  }

  // 处理搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  // 校区下拉选项
  const campusFilterOptions = useMemo(() => [
    { value: 'all', label: '全部校区' },
    ...campuses.map((c) => ({ value: c.id, label: c.name })),
  ], [campuses])

  const departmentFilterOptions = useMemo(() => [
    { value: 'all', label: '全部部门' },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ], [departments])

  const campusFormOptions = useMemo(() =>
    campuses.map((c) => ({
      value: c.id,
      label: c.name + (c.area ? ` (${c.area.name})` : ''),
    })), [campuses])

  const departmentFormOptions = useMemo(() =>
    departments.map((d) => ({ value: d.id, label: d.name })), [departments])

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">校区部门配置</h1>
            <Text type="tertiary" size="small">
              配置校区与部门的关联关系，决定每个校区有哪些部门
            </Text>
          </div>
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            添加配置
          </Button>
        </div>

        {/* 工具栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, flex: 1 }}>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 200 }}
            />
            <Select
              value={campusFilter}
              onChange={(v) => { setCampusFilter(v as string); setPage(1) }}
              optionList={campusFilterOptions}
              style={{ width: 160 }}
            />
            <Select
              value={departmentFilter}
              onChange={(v) => { setDepartmentFilter(v as string); setPage(1) }}
              optionList={departmentFilterOptions}
              style={{ width: 160 }}
            />
            <Button theme="outline" onClick={handleSearch}>搜索</Button>
          </div>
          <Button theme="borderless" type="tertiary" icon={<IconRefresh />} onClick={() => refetch()} />
        </div>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={displayData}
          rowKey="id"
          pagination={pagination}
          loading={false}
          style={isLoading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
        />
      </div>

      {/* 创建对话框 */}
      <Modal
        title="添加校区部门配置"
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={createMutation.isPending}>
              保存
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <Form.Select
            field="campus_id"
            label="选择校区"
            placeholder="请选择校区"
            optionList={campusFormOptions}
            rules={[{ required: true, message: '请选择校区' }]}
            style={{ width: '100%' }}
          />
          <Form.Select
            field="department_id"
            label="选择部门"
            placeholder="请选择部门"
            optionList={departmentFormOptions}
            rules={[{ required: true, message: '请选择部门' }]}
            style={{ width: '100%' }}
          />
          <Form.InputNumber
            field="sort_order"
            label="排序值"
            initValue={0}
            min={0}
            style={{ width: '100%' }}
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
        确定要删除「{deletingItem?.campus_name} - {deletingItem?.department_name}」的配置吗？此操作不可撤销。
      </Modal>

      {/* 负责人管理对话框 */}
      <ManageManagersDialog
        open={managerDialogOpen}
        onOpenChange={setManagerDialogOpen}
        campusDepartment={selectedDepartment}
        onSuccess={() => refetch()}
      />

      {/* 查看部门员工对话框 */}
      <ViewDepartmentEmployeesDialog
        open={employeesDialogOpen}
        onOpenChange={setEmployeesDialogOpen}
        campusDepartment={viewingDepartment}
      />
    </Main>
  )
}
