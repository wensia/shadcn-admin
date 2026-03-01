/**
 * 批量操作 Dialogs - Semi Design 版本
 * Modal 替代 Dialog/AlertDialog
 */

import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Input,
  Select,
  Table,
  Tag,
  Typography,
  Toast,
  Space,
} from '@douyinfe/semi-ui-19'
import { IconSearch, IconRefresh, IconTick } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { leadsApi, employeeApi, type EmployeeListItem } from '../api'
import { apiClient } from '@/lib/api/client'
import type { LeadStatus } from '../types'
import { leadStatusLabels } from '../types'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

// ==================== 批量分配 Dialog ====================
interface BatchAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  onSuccess: () => void
}

export function BatchAssignDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSuccess,
}: BatchAssignDialogProps) {
  const queryClient = useQueryClient()
  const [selectedAdvisor, setSelectedAdvisor] = useState<EmployeeListItem | null>(null)
  const [searchText, setSearchText] = useState('')
  const [selectedCampus, setSelectedCampus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 5

  // 获取全部校区列表（用于筛选顾问，不限当前用户权限）
  const { data: campuses = [] } = useQuery({
    queryKey: ['all-campuses-simple'],
    queryFn: async () => {
      const response = await apiClient.get('/organization/campuses/simple')
      return response.data || []
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  // 获取顾问列表
  const { data: advisorData, isLoading, refetch } = useQuery({
    queryKey: ['course-advisors', page, pageSize, searchText, selectedCampus],
    queryFn: async () => {
      const response = await employeeApi.getCourseAdvisors({
        page,
        size: pageSize,
        search: searchText || undefined,
        campus_name: selectedCampus || undefined,
        is_active: true,
      })
      return response.data
    },
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setSelectedAdvisor(null)
      setSearchText('')
      setSelectedCampus('')
      setPage(1)
    }
  }, [open])

  useEffect(() => { setPage(1) }, [searchText, selectedCampus])

  const assignMutation = useMutation({
    mutationFn: async (data: { lead_ids: string[]; advisor_id: string }) => {
      const response = await leadsApi.batchAssignLeads(data)
      return response.data
    },
    onSuccess: () => {
      Toast.success({ content: `成功分配${selectedLeadIds.length}条线索` })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess()
      onOpenChange(false)
    },
    onError: (error: any) => showApiErrorToast(error, '批量分配失败'),
  })

  const handleSubmit = () => {
    if (!selectedAdvisor) {
      Toast.warning({ content: '请选择顾问' })
      return
    }
    assignMutation.mutate({
      lead_ids: selectedLeadIds,
      advisor_id: selectedAdvisor.id,
    })
  }

  const getAdvisorInfo = (advisor: EmployeeListItem) => {
    const identity = advisor.employee_identities?.[0]
    return {
      campus: identity?.campus?.name || advisor.campus_name || '-',
      department: identity?.department?.name || advisor.department_name || '-',
      position: identity?.position?.name || advisor.position?.name || '-',
    }
  }

  const advisorColumns: ColumnProps<EmployeeListItem>[] = [
    {
      title: '选择',
      key: 'selection',
      dataIndex: 'id',
      width: 56,
      align: 'center' as const,
      render: (_: string, record: EmployeeListItem) => {
        const isSelected = selectedAdvisor?.id === record.id
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
        <Text strong={selectedAdvisor?.id === record.id} style={{ fontSize: 13 }}>
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
        const info = getAdvisorInfo(record)
        return info.position !== '-' ? (
          <Tag>{info.position}</Tag>
        ) : null
      },
    },
    {
      title: '校区',
      dataIndex: 'campus_name',
      width: 112,
      render: (_: string, record: EmployeeListItem) => (
        <Text style={{ fontSize: 13 }}>{getAdvisorInfo(record).campus}</Text>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      width: 96,
      render: (_: string, record: EmployeeListItem) => (
        <Text style={{ fontSize: 13 }}>{getAdvisorInfo(record).department}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 64,
      align: 'center' as const,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '在职' : '离职'}</Tag>
      ),
    },
  ]

  return (
    <Modal
      title="选择课程顾问"
      visible={open}
      onCancel={() => onOpenChange(false)}
      width={900}
      bodyStyle={{ padding: 0 }}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text type="tertiary" style={{ fontSize: 13 }}>共 {advisorData?.total || 0} 位顾问</Text>
            <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Text style={{ fontSize: 13 }}>
              {page} / {Math.max(1, Math.ceil((advisorData?.total || 0) / pageSize))}
            </Text>
            <Button size="small" disabled={page >= Math.ceil((advisorData?.total || 0) / pageSize)} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button onClick={() => onOpenChange(false)}>取消</Button>
            <Button
              theme="solid"
              onClick={handleSubmit}
              disabled={!selectedAdvisor || assignMutation.isPending}
              loading={assignMutation.isPending}
            >
              {selectedAdvisor ? `确定选择 ${selectedAdvisor.name}` : '请先选择顾问'}
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ padding: 16 }}>
        <Text type="tertiary" style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>
          将 {selectedLeadIds.length} 条线索分配给顾问
        </Text>

        {/* 搜索栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Space>
            <Text type="tertiary" style={{ fontSize: 13 }}>搜索顾问</Text>
            <Input
              prefix={<IconSearch />}
              value={searchText}
              onChange={(v) => setSearchText(v)}
              placeholder="输入姓名或用户名搜索"
              style={{ width: 200 }}
            />
          </Space>
          <Space>
            <Text type="tertiary" style={{ fontSize: 13 }}>校区</Text>
            <Select
              value={selectedCampus}
              onChange={(v) => setSelectedCampus(v as string)}
              placeholder="全部校区"
              style={{ width: 150 }}
              showClear
            >
              {campuses.map((campus) => (
                <Select.Option key={campus.id} value={campus.name}>
                  {campus.name}
                </Select.Option>
              ))}
            </Select>
          </Space>
          <Button
            icon={<IconRefresh />}
            theme="borderless"
            onClick={() => { setSearchText(''); setSelectedCampus(''); setPage(1); refetch() }}
            title="刷新"
          />
        </div>

        {/* 顾问表格 */}
        <Table<EmployeeListItem>
          columns={advisorColumns}
          dataSource={advisorData?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          onRow={(record) => ({
            onClick: () => {
              if (record) {
                setSelectedAdvisor(selectedAdvisor?.id === record.id ? null : record)
              }
            },
            style: {
              cursor: 'pointer',
              background: record && selectedAdvisor?.id === record.id ? 'var(--semi-color-primary-light-default)' : undefined,
            },
          })}
          empty={
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <Text type="tertiary">暂无顾问数据</Text>
            </div>
          }
        />
      </div>
    </Modal>
  )
}

// ==================== 批量释放 Dialog ====================
interface BatchReleaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  onSuccess: () => void
}

export function BatchReleaseDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSuccess,
}: BatchReleaseDialogProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [remark, setRemark] = useState('')

  const releaseMutation = useMutation({
    mutationFn: async (data: { lead_ids: string[]; reason: string; remark?: string }) => {
      const response = await leadsApi.batchReleaseLeads(data)
      return response.data
    },
    onSuccess: () => {
      Toast.success({ content: `成功释放${selectedLeadIds.length}条线索到公海` })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess()
      onOpenChange(false)
      setReason('')
      setRemark('')
    },
    onError: (error: any) => showApiErrorToast(error, '批量释放失败'),
  })

  const handleSubmit = () => {
    if (!reason.trim()) {
      Toast.warning({ content: '请输入释放理由' })
      return
    }
    releaseMutation.mutate({
      lead_ids: selectedLeadIds,
      reason: reason.trim(),
      remark: remark.trim() || undefined,
    })
  }

  return (
    <Modal
      title="释放线索到公海"
      visible={open}
      onCancel={() => onOpenChange(false)}
      width={480}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            theme="solid"
            onClick={handleSubmit}
            disabled={releaseMutation.isPending}
            loading={releaseMutation.isPending}
          >
            确定释放
          </Button>
        </div>
      }
    >
      <Text type="tertiary" style={{ fontSize: 13, marginBottom: 16, display: 'block' }}>
        将{selectedLeadIds.length}条线索释放到公海池
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Text strong style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>
            释放理由 <Text type="danger">*</Text>
          </Text>
          <Select
            value={reason}
            onChange={(v) => setReason(v as string)}
            placeholder="请选择释放理由"
            style={{ width: '100%' }}
          >
            <Select.Option value="INVALID_LEAD">无效线索</Select.Option>
            <Select.Option value="NO_FOLLOWUP">长期无跟进</Select.Option>
            <Select.Option value="ADVISOR_TRANSFER">顾问调整</Select.Option>
            <Select.Option value="MANUAL_RELEASE">手动释放</Select.Option>
            <Select.Option value="OTHER">其他</Select.Option>
          </Select>
        </div>
        <div>
          <Text strong style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>
            备注说明
          </Text>
          <Input
            value={remark}
            onChange={(v) => setRemark(v)}
            placeholder="可选,补充说明"
          />
        </div>
      </div>
    </Modal>
  )
}

// ==================== 批量修改状态 Dialog ====================
interface BatchUpdateStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  onSuccess: () => void
}

export function BatchUpdateStatusDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSuccess,
}: BatchUpdateStatusDialogProps) {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('')

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { lead_ids: string[]; status: LeadStatus }) => {
      const response = await leadsApi.batchUpdateStatus(data)
      return response.data
    },
    onSuccess: () => {
      Toast.success({ content: `成功修改${selectedLeadIds.length}条线索状态` })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess()
      onOpenChange(false)
      setSelectedStatus('')
    },
    onError: (error: any) => showApiErrorToast(error, '批量修改状态失败'),
  })

  const handleSubmit = () => {
    if (!selectedStatus) {
      Toast.warning({ content: '请选择目标状态' })
      return
    }
    updateStatusMutation.mutate({
      lead_ids: selectedLeadIds,
      status: selectedStatus as LeadStatus,
    })
  }

  return (
    <Modal
      title="批量修改状态"
      visible={open}
      onCancel={() => onOpenChange(false)}
      width={480}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            theme="solid"
            onClick={handleSubmit}
            disabled={updateStatusMutation.isPending}
            loading={updateStatusMutation.isPending}
          >
            确定修改
          </Button>
        </div>
      }
    >
      <Text type="tertiary" style={{ fontSize: 13, marginBottom: 16, display: 'block' }}>
        修改{selectedLeadIds.length}条线索的状态
      </Text>
      <div>
        <Text strong style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>
          目标状态 <Text type="danger">*</Text>
        </Text>
        <Select
          value={selectedStatus}
          onChange={(v) => setSelectedStatus(v as LeadStatus)}
          placeholder="请选择状态"
          style={{ width: '100%' }}
        >
          {Object.entries(leadStatusLabels).map(([value, label]) => (
            <Select.Option key={value} value={value}>
              {label}
            </Select.Option>
          ))}
        </Select>
      </div>
    </Modal>
  )
}

// ==================== 批量删除 Dialog ====================
interface BatchDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  onSuccess: () => void
}

export function BatchDeleteDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSuccess,
}: BatchDeleteDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const response = await leadsApi.batchDeleteLeads(leadIds)
      return response.data
    },
    onSuccess: () => {
      Toast.success({ content: `成功删除${selectedLeadIds.length}条线索` })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      onSuccess()
      onOpenChange(false)
    },
    onError: (error: any) => showApiErrorToast(error, '批量删除失败'),
  })

  return (
    <Modal
      title="确认删除线索"
      visible={open}
      onCancel={() => onOpenChange(false)}
      width={420}
      okText={deleteMutation.isPending ? '删除中...' : '确定删除'}
      okButtonProps={{
        type: 'danger',
        loading: deleteMutation.isPending,
      }}
      onOk={() => deleteMutation.mutate(selectedLeadIds)}
    >
      <div style={{ padding: '8px 0' }}>
        <Text>
          您确定要删除选中的 <Text strong>{selectedLeadIds.length}</Text> 条线索吗？
        </Text>
        <br />
        <Text type="danger" strong>此操作不可撤销!</Text>
      </div>
    </Modal>
  )
}
