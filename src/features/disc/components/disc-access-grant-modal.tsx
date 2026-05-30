/**
 * DISC 授权访问弹窗
 * 参照批量分配 Dialog 风格：内嵌员工表格 + 搜索筛选 + 底部分页
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Input,
  Select,
  Table,
  Tag,
  Typography,
  Popconfirm,
  Space,
  Tabs,
  TabPane,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch, IconRefresh, IconTick, IconDelete } from '@douyinfe/semi-icons'
import { toast } from '@/lib/toast'
import { formatTime } from '@/lib/utils/time'
import { apiClient } from '@/lib/api/client'
import { employeeApi, type EmployeeListItem } from '@/features/crm/leads/api'
import {
  getDiscAccessGrants,
  createDiscAccessGrant,
  deleteDiscAccessGrant,
  type DiscAccessGrantItem,
} from '@/features/disc/api'

const { Text } = Typography

interface DiscAccessGrantModalProps {
  visible: boolean
  onClose: () => void
}

export function DiscAccessGrantModal({ visible, onClose }: DiscAccessGrantModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('add')

  // ========== 添加授权 Tab 状态 ==========
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null)
  const [searchText, setSearchText] = useState('')
  const [selectedCampus, setSelectedCampus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 5

  const resetAddState = useCallback(() => {
    setSelectedEmployee(null)
    setSearchText('')
    setSelectedCampus('')
    setPage(1)
  }, [])

  // 已授权列表
  const { data: grants = [], isLoading: loadingGrants } = useQuery({
    queryKey: ['disc-access-grants'],
    queryFn: async () => {
      const res = await getDiscAccessGrants()
      return res.data ?? []
    },
    enabled: visible,
  })

  const existingGranteeIds = grants.map((g) => g.grantee_id)

  // 校区列表
  const { data: campuses = [] } = useQuery({
    queryKey: ['all-campuses-simple'],
    queryFn: async () => {
      const response: { data?: { id: string; name: string }[] } = await apiClient.get('/organization/campuses/simple')
      return response.data || []
    },
    enabled: visible && activeTab === 'add',
    staleTime: 5 * 60 * 1000,
  })

  // 员工列表
  const { data: employeeData, isLoading: loadingEmployees, refetch } = useQuery({
    queryKey: ['employees-for-grant', page, pageSize, searchText, selectedCampus],
    queryFn: async () => {
      const response = await employeeApi.getEmployees({
        page,
        size: pageSize,
        search: searchText || undefined,
        campus_name: selectedCampus || undefined,
        is_active: true,
      })
      return response.data
    },
    enabled: visible && activeTab === 'add',
  })

  // 创建授权
  const createMutation = useMutation({
    mutationFn: (granteeId: string) => createDiscAccessGrant(granteeId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('授权成功')
        queryClient.invalidateQueries({ queryKey: ['disc-access-grants'] })
        setSelectedEmployee(null)
      } else {
        toast.error(res.message || '授权失败')
      }
    },
    onError: () => toast.error('授权失败'),
  })

  // 撤销授权
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDiscAccessGrant(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('已撤销授权')
        queryClient.invalidateQueries({ queryKey: ['disc-access-grants'] })
      } else {
        toast.error(res.message || '撤销失败')
      }
    },
    onError: () => toast.error('撤销失败'),
  })

  const handleSubmit = () => {
    if (!selectedEmployee) {
      toast.warning('请先选择员工')
      return
    }
    createMutation.mutate(selectedEmployee.id)
  }

  const getEmployeeInfo = (emp: EmployeeListItem) => {
    const identity = emp.employee_identities?.[0]
    return {
      campus: identity?.campus?.name || emp.campus_name || '-',
      department: identity?.department?.name || emp.department_name || '-',
      position: identity?.position?.name || emp.position?.name || '-',
    }
  }

  // ========== 添加授权 - 员工表格列 ==========
  const employeeColumns: ColumnProps<EmployeeListItem>[] = [
    {
      title: '选择',
      key: 'selection',
      dataIndex: 'id',
      width: 56,
      align: 'center' as const,
      render: (_: string, record: EmployeeListItem) => {
        const isSelected = selectedEmployee?.id === record.id
        const isGranted = existingGranteeIds.includes(record.id)
        if (isGranted) {
          return <Tag size="small" color="green">已授权</Tag>
        }
        return (
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: `2px solid ${isSelected ? 'var(--semi-color-primary)' : 'var(--semi-color-border)'}`,
              background: isSelected ? 'var(--semi-color-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            {isSelected && <IconTick style={{ color: '#fff', fontSize: 10 }} />}
          </div>
        )
      },
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 96,
      render: (name: string, record: EmployeeListItem) => (
        <Text strong={selectedEmployee?.id === record.id} style={{ fontSize: 13 }}>
          {name}
        </Text>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 112,
      render: (text: string) => (
        <Text type="tertiary" style={{ fontSize: 13 }}>{text}</Text>
      ),
    },
    {
      title: '职位',
      key: 'position',
      dataIndex: 'id',
      width: 96,
      render: (_: string, record: EmployeeListItem) => {
        const info = getEmployeeInfo(record)
        return info.position !== '-' ? <Tag>{info.position}</Tag> : null
      },
    },
    {
      title: '校区',
      dataIndex: 'campus_name',
      width: 112,
      render: (_: string, record: EmployeeListItem) => (
        <Text style={{ fontSize: 13 }}>{getEmployeeInfo(record).campus}</Text>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      width: 96,
      render: (_: string, record: EmployeeListItem) => (
        <Text style={{ fontSize: 13 }}>{getEmployeeInfo(record).department}</Text>
      ),
    },
  ]

  // ========== 已授权 - 列表列 ==========
  const grantColumns: ColumnProps<DiscAccessGrantItem>[] = [
    {
      title: '姓名',
      dataIndex: 'grantee_name',
      width: 100,
      render: (text: string | null) => (
        <Text strong style={{ fontSize: 13 }}>{text || '-'}</Text>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'grantee_username',
      width: 120,
      render: (text: string | null) => (
        <Text type="tertiary" style={{ fontSize: 13 }}>{text || '-'}</Text>
      ),
    },
    {
      title: '授权时间',
      dataIndex: 'created_at',
      width: 180,
      render: (text: string) => (
        <Text style={{ fontSize: 13 }}>{formatTime(text)}</Text>
      ),
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 80,
      align: 'center' as const,
      render: (_: string, record: DiscAccessGrantItem) => (
        <Popconfirm
          title="确认撤销"
          content={`撤销对 ${record.grantee_name || '该员工'} 的授权？`}
          onConfirm={() => deleteMutation.mutate(record.id)}
        >
          <Button
            theme="borderless"
            type="danger"
            icon={<IconDelete />}
          />
        </Popconfirm>
      ),
    },
  ]

  const totalPages = Math.max(1, Math.ceil((employeeData?.total || 0) / pageSize))

  return (
    <Modal
      title="授权访问管理"
      visible={visible}
      onCancel={onClose}
      width={900}
      bodyStyle={{ padding: 0 }}
      closeOnEsc
      footer={
        activeTab === 'add' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="tertiary" style={{ fontSize: 13 }}>共 {employeeData?.total || 0} 位员工</Text>
              <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
              <Text style={{ fontSize: 13 }}>{page} / {totalPages}</Text>
              <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button onClick={onClose}>关闭</Button>
              <Button
                theme="solid"
                onClick={handleSubmit}
                disabled={!selectedEmployee || createMutation.isPending}
                loading={createMutation.isPending}
              >
                {selectedEmployee ? `确定授权 ${selectedEmployee.name}` : '请先选择员工'}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px' }}>
            <Button onClick={onClose}>关闭</Button>
          </div>
        )
      }
    >
      <div style={{ padding: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          size="small"
          style={{ marginBottom: 12 }}
        >
          <TabPane tab={`添加授权`} itemKey="add" />
          <TabPane tab={`已授权 (${grants.length})`} itemKey="list" />
        </Tabs>

        {activeTab === 'add' && (
          <>
            <Text type="tertiary" style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>
              选择一名同事，授权其查看你推荐的DISC测试记录（仅查看，不可编辑）
            </Text>

            {/* 搜索栏 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <Space>
                <Text type="tertiary" style={{ fontSize: 13 }}>搜索</Text>
                <Input
                  prefix={<IconSearch />}
                  value={searchText}
                  onChange={(v) => {
                    setSearchText(v)
                    setPage(1)
                  }}
                  placeholder="输入姓名或用户名搜索"
                  style={{ width: 200 }}
                />
              </Space>
              <Space>
                <Text type="tertiary" style={{ fontSize: 13 }}>校区</Text>
                <Select
                  value={selectedCampus}
                  onChange={(v) => {
                    setSelectedCampus(v as string)
                    setPage(1)
                  }}
                  placeholder="全部校区"
                  style={{ width: 150 }}
                  showClear
                >
                  {campuses.map((campus: { id: string; name: string }) => (
                    <Select.Option key={campus.id} value={campus.name}>
                      {campus.name}
                    </Select.Option>
                  ))}
                </Select>
              </Space>
              <Button
                icon={<IconRefresh />}
                theme="borderless"
                onClick={() => {
                  resetAddState()
                  refetch()
                }}
                title="刷新"
              />
            </div>

            {/* 员工表格 */}
            <Table<EmployeeListItem>
              columns={employeeColumns}
              dataSource={employeeData?.items || []}
              rowKey="id"
              loading={loadingEmployees}
              pagination={false}
              onRow={(record) => {
                const isGranted = record ? existingGranteeIds.includes(record.id) : false
                return {
                  onClick: () => {
                    if (record && !isGranted) {
                      setSelectedEmployee(selectedEmployee?.id === record.id ? null : record)
                    }
                  },
                  style: {
                    cursor: isGranted ? 'default' : 'pointer',
                    opacity: isGranted ? 0.5 : 1,
                    background: record && selectedEmployee?.id === record.id ? 'var(--semi-color-primary-light-default)' : undefined,
                  },
                }
              }}
              empty={
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <Text type="tertiary">暂无员工数据</Text>
                </div>
              }
            />
          </>
        )}

        {activeTab === 'list' && (
          <>
            <Text type="tertiary" style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>
              以下同事可以查看你推荐的DISC测试记录
            </Text>

            <Table<DiscAccessGrantItem>
              columns={grantColumns}
              dataSource={grants}
              rowKey="id"
              loading={loadingGrants}
              pagination={false}
              empty={
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <Text type="tertiary">暂无授权记录，请在「添加授权」中选择同事</Text>
                </div>
              }
            />
          </>
        )}
      </div>
    </Modal>
  )
}
