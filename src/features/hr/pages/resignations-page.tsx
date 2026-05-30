/**
 * 离职审批管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { UserMinus, Plus, Eye, Check, X, Send, Ban } from 'lucide-react'
import {
  Form,
  Button,
  Modal,
  Select,
  Typography,
  Input,
  Tag,
  Timeline,
  Descriptions,
  TextArea,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { hrApi, type ResignationItem, type ResignationCreate } from '../api'
import { adminApi } from '@/features/admin/api'
import { formatTime } from '@/lib/utils/time'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { useAuthStore } from '@/stores/auth-store'

const { Text } = Typography

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft: { color: 'grey', label: '草稿' },
  pending: { color: 'orange', label: '待审批' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
  cancelled: { color: 'grey', label: '已取消' },
}

const TYPE_CONFIG: Record<string, string> = {
  voluntary: '主动离职',
  involuntary: '被动离职',
  expired: '合同到期',
}

const ACTION_LABELS: Record<string, string> = {
  create: '创建申请',
  submit: '提交审批',
  resubmit: '重新提交',
  approve: '审批通过',
  reject: '审批驳回',
  cancel: '取消申请',
}

function StatusTag({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <Tag color={config.color as any} size="small">
      {config.label}
    </Tag>
  )
}

export function ResignationsPage() {
  useDocumentTitle('离职审批')
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)
  const user = useAuthStore((s) => s.user)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ResignationItem | null>(null)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve')
  const [approvalComment, setApprovalComment] = useState('')

  // 查询列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hr-resignations', page, pageSize, statusFilter],
    queryFn: async () => {
      const response = await hrApi.getResignations({
        page,
        size: pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      return response.data
    },
  })

  // 查询员工列表（创建时选择）
  const { data: employeesData } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const response = await adminApi.getEmployees({ size: 500, is_active: true })
      return response.data?.items || []
    },
    enabled: createDialogOpen,
  })

  // 查询详情
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['hr-resignation-detail', selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem?.id) return null
      const response = await hrApi.getResignationDetail(selectedItem.id)
      return response.data
    },
    enabled: !!selectedItem?.id && detailDialogOpen,
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: ResignationCreate) => hrApi.createResignation(data),
    onSuccess: () => {
      toast.success('离职申请创建成功')
      setCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hr-resignations'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '创建失败'),
  })

  // 提交
  const submitMutation = useMutation({
    mutationFn: (id: string) => hrApi.submitResignation(id),
    onSuccess: () => {
      toast.success('已提交审批')
      queryClient.invalidateQueries({ queryKey: ['hr-resignations'] })
      queryClient.invalidateQueries({ queryKey: ['hr-resignation-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '提交失败'),
  })

  // 审批
  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.approveResignation(id, { comment }),
    onSuccess: () => {
      toast.success('审批通过')
      setApprovalDialogOpen(false)
      setDetailDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hr-resignations'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '审批失败'),
  })

  // 驳回
  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.rejectResignation(id, { comment }),
    onSuccess: () => {
      toast.success('已驳回')
      setApprovalDialogOpen(false)
      setDetailDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hr-resignations'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '驳回失败'),
  })

  // 取消
  const cancelMutation = useMutation({
    mutationFn: (id: string) => hrApi.cancelResignation(id),
    onSuccess: () => {
      toast.success('已取消')
      queryClient.invalidateQueries({ queryKey: ['hr-resignations'] })
      queryClient.invalidateQueries({ queryKey: ['hr-resignation-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '取消失败'),
  })

  // 列定义
  const columns: ColumnProps<ResignationItem>[] = [
    {
      title: '员工',
      dataIndex: 'employee_name',
      width: 120,
      render: (text: string, record: ResignationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return (
          <div className="flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-red-400" />
            <Text strong>{text}</Text>
          </div>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string, record: ResignationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return <StatusTag status={status} />
      },
    },
    {
      title: '离职类型',
      dataIndex: 'resignation_type',
      width: 100,
      render: (type: string, record: ResignationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <Text>{TYPE_CONFIG[type] || type}</Text>
      },
    },
    {
      title: '计划离职日期',
      dataIndex: 'resignation_date',
      width: 130,
      render: (text: string, record: ResignationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return <Text>{text}</Text>
      },
    },
    {
      title: '离职原因',
      dataIndex: 'reason',
      width: 200,
      render: (text: string, record: ResignationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
        return (
          <Text type="tertiary" className="truncate" style={{ maxWidth: 200, display: 'block' }}>
            {text}
          </Text>
        )
      },
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      width: 160,
      render: (text: string, record: ResignationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
        return <Text type="tertiary">{text ? formatTime(text) : '-'}</Text>
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 200,
      render: (_id: string, record: ResignationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              theme="borderless"
              type="tertiary"
              icon={<Eye className="h-4 w-4" />}
              onClick={() => { setSelectedItem(record); setDetailDialogOpen(true) }}
            >
              详情
            </Button>
            {record.status === 'draft' && (
              <Button
                theme="borderless"
                type="primary"
                icon={<Send className="h-4 w-4" />}
                onClick={() => submitMutation.mutate(record.id)}
              >
                提交
              </Button>
            )}
            {record.status === 'rejected' && (
              <Button
                theme="borderless"
                type="primary"
                icon={<Send className="h-4 w-4" />}
                onClick={() => submitMutation.mutate(record.id)}
              >
                重新提交
              </Button>
            )}
            {record.status === 'pending' && user?.is_superuser && (
              <>
                <Button
                  theme="borderless"
                  type="primary"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => {
                    setSelectedItem(record)
                    setApprovalAction('approve')
                    setApprovalComment('')
                    setApprovalDialogOpen(true)
                  }}
                >
                  通过
                </Button>
                <Button
                  theme="borderless"
                  type="danger"
                  icon={<X className="h-4 w-4" />}
                  onClick={() => {
                    setSelectedItem(record)
                    setApprovalAction('reject')
                    setApprovalComment('')
                    setApprovalDialogOpen(true)
                  }}
                >
                  驳回
                </Button>
              </>
            )}
            {(record.status === 'draft' || record.status === 'rejected') && (
              <Button
                theme="borderless"
                type="danger"
                icon={<Ban className="h-4 w-4" />}
                onClick={() => cancelMutation.mutate(record.id)}
              >
                取消
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'draft', label: '草稿' },
    { value: 'pending', label: '待审批' },
    { value: 'approved', label: '已通过' },
    { value: 'rejected', label: '已驳回' },
    { value: 'cancelled', label: '已取消' },
  ]

  const employeeOptions = useMemo(
    () => (employeesData || []).map((e: any) => ({ label: e.name, value: e.id })),
    [employeesData]
  )

  const handleCreateSubmit = (values: any) => {
    createMutation.mutate(values)
  }

  const handleApprovalConfirm = () => {
    if (!selectedItem) return
    if (approvalAction === 'approve') {
      approveMutation.mutate({ id: selectedItem.id, comment: approvalComment || undefined })
    } else {
      rejectMutation.mutate({ id: selectedItem.id, comment: approvalComment || undefined })
    }
  }

  return (
    <>
      <DataTableLayout
        title="离职审批"
        total={data?.total}
        headerActions={
          <Button
            theme="solid"
            type="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setCreateDialogOpen(true)
              setTimeout(() => formRef.current?.reset(), 0)
            }}
          >
            发起离职申请
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
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

      {/* 创建离职申请弹窗 */}
      <Modal
        title="发起离职申请"
        visible={createDialogOpen}
        onCancel={() => setCreateDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => formRef.current?.submitForm()}
              loading={createMutation.isPending}
            >
              创建并提交审批
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={(values) => {
            // 创建后自动提交审批
            createMutation.mutate(values, {
              onSuccess: async (response) => {
                const id = response.data?.id
                if (id) {
                  try {
                    await hrApi.submitResignation(id)
                    toast.success('已创建并提交审批')
                  } catch {
                    toast.success('已创建（草稿状态），请手动提交')
                  }
                  queryClient.invalidateQueries({ queryKey: ['hr-resignations'] })
                }
                setCreateDialogOpen(false)
              },
            })
          }}
          labelPosition="top"
        >
          <Form.Select
            field="employee_id"
            label="离职员工"
            placeholder="选择员工"
            optionList={employeeOptions}
            filter
            showClear
            rules={[{ required: true, message: '请选择员工' }]}
            style={{ width: '100%' }}
          />
          <Form.Select
            field="resignation_type"
            label="离职类型"
            placeholder="选择离职类型"
            optionList={[
              { label: '主动离职', value: 'voluntary' },
              { label: '被动离职', value: 'involuntary' },
              { label: '合同到期', value: 'expired' },
            ]}
            rules={[{ required: true, message: '请选择离职类型' }]}
            style={{ width: '100%' }}
          />
          <Form.DatePicker
            field="resignation_date"
            label="计划离职日期"
            type="date"
            rules={[{ required: true, message: '请选择日期' }]}
            style={{ width: '100%' }}
          />
          <Form.TextArea
            field="reason"
            label="离职原因"
            placeholder="请详细说明离职原因"
            rows={4}
            rules={[{ required: true, message: '请填写离职原因' }]}
          />
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="离职申请详情"
        visible={detailDialogOpen}
        onCancel={() => { setDetailDialogOpen(false); setSelectedItem(null) }}
        width={640}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setDetailDialogOpen(false); setSelectedItem(null) }}>
              关闭
            </Button>
            {detailData?.status === 'pending' && user?.is_superuser && (
              <>
                <Button
                  type="danger"
                  onClick={() => {
                    setApprovalAction('reject')
                    setApprovalComment('')
                    setApprovalDialogOpen(true)
                  }}
                >
                  驳回
                </Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => {
                    setApprovalAction('approve')
                    setApprovalComment('')
                    setApprovalDialogOpen(true)
                  }}
                >
                  通过
                </Button>
              </>
            )}
          </div>
        }
      >
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Descriptions
              data={[
                { key: '员工', value: detailData.employee_name },
                { key: '状态', value: <StatusTag status={detailData.status} /> },
                { key: '离职类型', value: TYPE_CONFIG[detailData.resignation_type] || detailData.resignation_type },
                { key: '计划离职日期', value: detailData.resignation_date },
                { key: '校区', value: detailData.campus_name || '-' },
                { key: '部门', value: detailData.department_name || '-' },
                { key: '提交人', value: detailData.submitted_by_name || '-' },
                { key: '提交时间', value: detailData.submitted_at ? formatTime(detailData.submitted_at) : '-' },
                { key: '审批人', value: detailData.approved_by_name || '-' },
                { key: '审批时间', value: detailData.approved_at ? formatTime(detailData.approved_at) : '-' },
              ]}
              row
              size="small"
            />

            <div>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>离职原因</Text>
              <Text type="tertiary">{detailData.reason}</Text>
            </div>

            {detailData.approval_comment && (
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>审批意见</Text>
                <Text type="tertiary">{detailData.approval_comment}</Text>
              </div>
            )}

            {/* 审批流程时间线 */}
            {detailData.logs && detailData.logs.length > 0 && (
              <div>
                <Text strong style={{ marginBottom: 12, display: 'block' }}>审批流程</Text>
                <Timeline>
                  {detailData.logs.map((log) => (
                    <Timeline.Item
                      key={log.id}
                      color={log.action === 'approve' ? 'green' : log.action === 'reject' ? 'red' : 'blue'}
                    >
                      <div>
                        <Text strong>{ACTION_LABELS[log.action] || log.action}</Text>
                        <Text type="tertiary" style={{ marginLeft: 8 }}>{log.operator_name}</Text>
                      </div>
                      {log.comment && <Text type="tertiary" size="small">{log.comment}</Text>}
                      <Text type="tertiary" size="small" style={{ display: 'block' }}>
                        {formatTime(log.operated_at)}
                      </Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 审批确认弹窗 */}
      <Modal
        title={approvalAction === 'approve' ? '确认通过' : '确认驳回'}
        visible={approvalDialogOpen}
        onCancel={() => setApprovalDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setApprovalDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type={approvalAction === 'approve' ? 'primary' : 'danger'}
              onClick={handleApprovalConfirm}
              loading={approveMutation.isPending || rejectMutation.isPending}
            >
              {approvalAction === 'approve' ? '确认通过' : '确认驳回'}
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <Text>
            {approvalAction === 'approve'
              ? `确认通过 ${selectedItem?.employee_name} 的离职申请？通过后将自动释放该员工线索并停用账号。`
              : `确认驳回 ${selectedItem?.employee_name} 的离职申请？`
            }
          </Text>
        </div>
        <TextArea
          placeholder={approvalAction === 'approve' ? '审批意见（可选）' : '请填写驳回原因'}
          value={approvalComment}
          onChange={setApprovalComment}
          rows={3}
        />
      </Modal>
    </>
  )
}
