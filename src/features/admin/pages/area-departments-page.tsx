/**
 * 区域部门配置页面
 */

import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Network, Users } from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { Button, Select, Typography, Tag, Modal, Form } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { adminApi } from '../api'
import type { AreaDepartmentItem, DepartmentManagerItem, ManagerType } from '../types'
import { MANAGER_TYPE_OPTIONS } from '../types'
import { StatusBadge } from '../components/status-badge'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { toast } from '@/lib/toast'

const { Text } = Typography

export function AreaDepartmentsPage() {
  useDocumentTitle('区域部门配置')
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [managerDialogOpen, setManagerDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<AreaDepartmentItem | null>(null)

  // 数据查询
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-area-departments', page, pageSize, areaFilter, departmentFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (areaFilter !== 'all') params.area_id = areaFilter
      if (departmentFilter !== 'all') params.department_id = departmentFilter
      const response = await adminApi.getAreaDepartments(params as Parameters<typeof adminApi.getAreaDepartments>[0])
      return response.data
    },
  })

  const { data: areas } = useQuery({
    queryKey: ['admin-areas-simple'],
    queryFn: async () => {
      const response = await adminApi.getAreas({ page: 1, size: 100 })
      return response.data?.items ?? []
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['admin-departments-simple'],
    queryFn: async () => {
      const response = await adminApi.getDepartments({ page: 1, size: 100 })
      return response.data?.items ?? []
    },
  })

  const columns: ColumnProps<AreaDepartmentItem>[] = [
    {
      title: '区域',
      dataIndex: 'area_name',
      width: 150,
      render: (text, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return <Text strong>{text || '-'}</Text>
      },
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      width: 150,
      render: (text, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return text || '-'
      },
    },
    {
      title: '负责人',
      dataIndex: 'managers',
      width: 250,
      render: (_, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
        const managers = record.managers ?? []
        if (managers.length === 0) return <Text type="tertiary">未设置</Text>
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {managers.map((m) => (
              <Tag key={m.id} size="small" color={m.manager_type === 'manager' ? 'blue' : m.manager_type === 'deputy' ? 'cyan' : 'grey'}>
                {m.employee?.name || m.employee_id} ({m.manager_type === 'manager' ? '经理' : m.manager_type === 'deputy' ? '副经理' : '主管'})
              </Tag>
            ))}
          </div>
        )
      },
    },
    {
      title: '钉钉机器人',
      dataIndex: 'dingtalk_robot_name',
      width: 140,
      render: (text, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return text || <Text type="tertiary">未配置</Text>
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (val, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
        return <StatusBadge isActive={val as boolean} />
      },
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
        return (
          <Button
            theme="borderless"
            icon={<Users size={14} />}
            onClick={() => {
              setSelectedDepartment(record)
              setManagerDialogOpen(true)
            }}
          >
            负责人
          </Button>
        )
      },
    },
  ]

  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <>
      <DataTableLayout
        title="区域部门配置"
        total={total}
        onRefresh={refetch}
        isRefreshing={isLoading}
        toolbar={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              value={areaFilter}
              onChange={(v) => { setAreaFilter(v as string); setPage(1) }}
              style={{ width: 160 }}
              placeholder="筛选区域"
            >
              <Select.Option value="all">全部区域</Select.Option>
              {(areas ?? []).map((a: { id: string; name: string }) => (
                <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>
              ))}
            </Select>
            <Select
              value={departmentFilter}
              onChange={(v) => { setDepartmentFilter(v as string); setPage(1) }}
              style={{ width: 160 }}
              placeholder="筛选部门"
            >
              <Select.Option value="all">全部部门</Select.Option>
              {(departments ?? []).map((d: { id: string; name: string }) => (
                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
              ))}
            </Select>
          </div>
        }
      >
        <SemiDataTable<AreaDepartmentItem>
          columns={columns}
          data={items}
          total={total}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          scrollX={900}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          emptyText="暂无区域部门配置"
        />
      </DataTableLayout>

      {managerDialogOpen && selectedDepartment && (
        <ManageAreaManagersDialog
          open={managerDialogOpen}
          onClose={() => { setManagerDialogOpen(false); setSelectedDepartment(null) }}
          areaDepartment={selectedDepartment}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-area-departments'] })
          }}
        />
      )}
    </>
  )
}


// ── 区域部门负责人管理对话框 ──

function ManageAreaManagersDialog({
  open, onClose, areaDepartment, onSuccess,
}: {
  open: boolean
  onClose: () => void
  areaDepartment: AreaDepartmentItem
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedType, setSelectedType] = useState<ManagerType>('manager')

  const { data: managers, isLoading } = useQuery({
    queryKey: ['area-dept-managers', areaDepartment.id],
    queryFn: async () => {
      const res = await adminApi.getAreaDepartmentManagers(areaDepartment.id)
      return res.data ?? []
    },
    enabled: open,
  })

  const { data: employees } = useQuery({
    queryKey: ['admin-employees-search', employeeSearch],
    queryFn: async () => {
      if (!employeeSearch) return []
      const res = await adminApi.getEmployees({ search: employeeSearch, page: 1, size: 20 })
      return res.data?.items ?? []
    },
    enabled: !!employeeSearch,
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      await adminApi.addAreaDepartmentManager(areaDepartment.id, {
        employee_id: selectedEmployee,
        manager_type: selectedType,
      })
    },
    onSuccess: () => {
      toast.success('添加成功')
      queryClient.invalidateQueries({ queryKey: ['area-dept-managers', areaDepartment.id] })
      onSuccess()
      setAddOpen(false)
      setSelectedEmployee('')
    },
    onError: (e) => showApiErrorToast(e, '添加失败'),
  })

  const removeMutation = useMutation({
    mutationFn: async (managerId: string) => {
      await adminApi.removeAreaDepartmentManager(areaDepartment.id, managerId)
    },
    onSuccess: () => {
      toast.success('移除成功')
      queryClient.invalidateQueries({ queryKey: ['area-dept-managers', areaDepartment.id] })
      onSuccess()
    },
    onError: (e) => showApiErrorToast(e, '移除失败'),
  })

  return (
    <Modal
      title={`${areaDepartment.area_name} - ${areaDepartment.department_name} 负责人管理`}
      visible={open}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      <div style={{ marginBottom: 12 }}>
        <Button theme="light" onClick={() => setAddOpen(!addOpen)}>
          {addOpen ? '取消添加' : '+ 添加负责人'}
        </Button>
      </div>

      {addOpen && (
        <div style={{ padding: 12, background: 'var(--semi-color-fill-0)', borderRadius: 6, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Text size="small" style={{ display: 'block', marginBottom: 4 }}>员工</Text>
            <Select
              filter
              remote
              onSearch={setEmployeeSearch}
              value={selectedEmployee}
              onChange={(v) => setSelectedEmployee(v as string)}
              placeholder="搜索员工姓名"
              style={{ width: '100%' }}
            >
              {(employees ?? []).map((e: { id: string; name: string; username?: string }) => (
                <Select.Option key={e.id} value={e.id}>{e.name} ({e.username})</Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Text size="small" style={{ display: 'block', marginBottom: 4 }}>类型</Text>
            <Select value={selectedType} onChange={(v) => setSelectedType(v as ManagerType)} style={{ width: 100 }}>
              {MANAGER_TYPE_OPTIONS.map((o) => (
                <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
              ))}
            </Select>
          </div>
          <Button
            theme="solid"
            disabled={!selectedEmployee}
            loading={addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            确定
          </Button>
        </div>
      )}

      {isLoading ? (
        <Text type="tertiary">加载中...</Text>
      ) : (managers ?? []).length === 0 ? (
        <Text type="tertiary">暂无负责人</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(managers ?? []).map((m: DepartmentManagerItem) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--semi-color-fill-0)', borderRadius: 6 }}>
              <div>
                <Text strong>{m.employee?.name ?? '-'}</Text>
                <Text type="tertiary" size="small" style={{ marginLeft: 8 }}>{m.employee?.username}</Text>
                <Tag size="small" style={{ marginLeft: 8 }} color={m.manager_type === 'manager' ? 'blue' : m.manager_type === 'deputy' ? 'cyan' : 'grey'}>
                  {m.manager_type === 'manager' ? '经理' : m.manager_type === 'deputy' ? '副经理' : '主管'}
                </Tag>
              </div>
              <Button
                theme="borderless"
                type="danger"
                loading={removeMutation.isPending}
                onClick={() => {
                  Modal.confirm({
                    title: '确认移除',
                    content: `确定移除 ${m.employee?.name} 的负责人身份？`,
                    onOk: () => removeMutation.mutate(m.id),
                  })
                }}
              >
                移除
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
