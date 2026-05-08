/**
 * 员工身份申请页面
 */

import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Descriptions,
  Form,
  Modal,
  Select,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import {
  Check,
  Eye,
  Mail,
  Plus,
  RefreshCw,
  UserCheck,
  X,
} from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { SemiSkeletonCell, isSkeletonRow } from '@/lib/table-utils'
import { toast } from '@/lib/toast'
import { formatTime } from '@/lib/utils/time'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { adminApi } from '@/features/admin/api'
import {
  hrApi,
  type IdentityApplicationCreate,
  type IdentityApplicationItem,
} from '../api'

const { Text } = Typography

type IdentityApplicationsMode = 'mine' | 'admin'
type ReviewAction = 'approve' | 'reject'
type ReviewStage = 'department' | 'admin'

type IdentityApplicationFormValues = IdentityApplicationCreate & {
  joined_on?: string | Date
}

const STATUS_CONFIG: Record<string, { color: 'grey' | 'orange' | 'green' | 'red'; label: string }> = {
  pending_department: { color: 'orange', label: '部门待审' },
  pending_admin: { color: 'orange', label: '超管待审' },
  pending: { color: 'orange', label: '待审批' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending_department', label: '部门待审' },
  { value: 'pending_admin', label: '超管待审' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
]

function StatusTag({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <Tag color={config.color} size="small">
      {config.label}
    </Tag>
  )
}

function formatDateValue(value?: string | Date) {
  if (!value) return undefined
  if (typeof value === 'string') return value.slice(0, 10)
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function IdentityApplicationsPage({
  mode = 'mine',
}: {
  mode?: IdentityApplicationsMode
}) {
  const isAdminMode = mode === 'admin'
  useDocumentTitle(isAdminMode ? '员工身份申请审批' : '员工身份申请')

  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<ReviewAction>('approve')
  const [reviewStage, setReviewStage] = useState<ReviewStage>('department')
  const [reviewComment, setReviewComment] = useState('')
  const [selectedItem, setSelectedItem] = useState<IdentityApplicationItem | null>(null)
  const [selectedCampusId, setSelectedCampusId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')

  const listQueryKey = [
    'hr-identity-applications',
    mode,
    isAdminMode,
    page,
    pageSize,
    statusFilter,
  ]

  const { data, isLoading, refetch } = useQuery({
    queryKey: listQueryKey,
    queryFn: async () => {
      const params = {
        page,
        size: pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }
      const response = await hrApi.getIdentityApplications(params)
      return response.data
    },
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['hr-identity-application-detail', selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem?.id) return null
      const response = await hrApi.getIdentityApplicationDetail(selectedItem.id)
      return response.data
    },
    enabled: !!selectedItem?.id && detailDialogOpen,
  })

  const { data: campuses = [] } = useQuery({
    queryKey: ['identity-application-campuses'],
    queryFn: async () => {
      const response = await adminApi.getCampusesSimple()
      return response.data || []
    },
    enabled: createDialogOpen,
  })

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['identity-application-departments', selectedCampusId],
    queryFn: async () => {
      if (!selectedCampusId) return []
      const response = await adminApi.getCampusDepartmentsSimple(selectedCampusId)
      return response.data || []
    },
    enabled: createDialogOpen && !!selectedCampusId,
  })

  const campusDepartmentId = useMemo(() => {
    return departments.find((dept) => dept.id === selectedDepartmentId)?.campus_department_id
  }, [departments, selectedDepartmentId])

  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['identity-application-positions', campusDepartmentId],
    queryFn: async () => {
      if (!campusDepartmentId) return []
      const response = await adminApi.getCampusDepartmentPositionsSimple(campusDepartmentId)
      return response.data || []
    },
    enabled: createDialogOpen && !!campusDepartmentId,
  })

  const createMutation = useMutation({
    mutationFn: (values: IdentityApplicationFormValues) => {
      const payload: IdentityApplicationCreate = {
        ...values,
        joined_on: formatDateValue(values.joined_on),
        remark: values.remark?.trim() || undefined,
      }
      return hrApi.createIdentityApplication(payload)
    },
    onSuccess: () => {
      toast.success('员工身份申请已提交')
      setCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hr-identity-applications'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '提交失败'),
  })

  const departmentApproveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.departmentApproveIdentityApplication(id, { comment }),
    onSuccess: (response) => {
      toast.success(response.message || '部门审批已通过')
      setReviewDialogOpen(false)
      setDetailDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hr-identity-applications'] })
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '部门审批失败'),
  })

  const departmentRejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.departmentRejectIdentityApplication(id, { comment }),
    onSuccess: (response) => {
      toast.success(response.message || '部门已驳回')
      setReviewDialogOpen(false)
      setDetailDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hr-identity-applications'] })
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '部门驳回失败'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.approveIdentityApplication(id, { comment }),
    onSuccess: (response) => {
      toast.success(response.message || '审批通过')
      setReviewDialogOpen(false)
      setDetailDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hr-identity-applications'] })
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '审批失败'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.rejectIdentityApplication(id, { comment }),
    onSuccess: () => {
      toast.success('已驳回')
      setReviewDialogOpen(false)
      setDetailDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['hr-identity-applications'] })
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '驳回失败'),
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => hrApi.resendIdentityInvitation(id),
    onSuccess: (response) => {
      toast.success(response.message || '邀请邮件已重发')
      queryClient.invalidateQueries({ queryKey: ['hr-identity-applications'] })
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '重发失败'),
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])

  const openCreateDialog = () => {
    setCreateDialogOpen(true)
    setSelectedCampusId('')
    setSelectedDepartmentId('')
    setTimeout(() => formRef.current?.reset(), 0)
  }

  const openReviewDialog = (
    item: IdentityApplicationItem,
    action: ReviewAction,
    stage: ReviewStage
  ) => {
    setSelectedItem(item)
    setReviewAction(action)
    setReviewStage(stage)
    setReviewComment('')
    setReviewDialogOpen(true)
  }

  const handleReviewConfirm = () => {
    if (!selectedItem) return
    const comment = reviewComment.trim() || undefined
    if (reviewStage === 'department' && reviewAction === 'approve') {
      departmentApproveMutation.mutate({ id: selectedItem.id, comment })
    } else if (reviewStage === 'department') {
      departmentRejectMutation.mutate({ id: selectedItem.id, comment })
    } else if (reviewAction === 'approve') {
      approveMutation.mutate({ id: selectedItem.id, comment })
    } else {
      rejectMutation.mutate({ id: selectedItem.id, comment })
    }
  }

  const isReviewSubmitting = (
    departmentApproveMutation.isPending
    || departmentRejectMutation.isPending
    || approveMutation.isPending
    || rejectMutation.isPending
  )

  const reviewDialogTitle = reviewStage === 'department'
    ? (reviewAction === 'approve' ? '部门审批通过' : '部门审批驳回')
    : (reviewAction === 'approve' ? '超管终审通过' : '超管终审驳回')

  const reviewDialogMessage = (() => {
    const name = selectedItem?.name || '该员工'
    if (reviewStage === 'department') {
      return reviewAction === 'approve'
        ? `确认通过 ${name} 的部门审批？通过后会流转给超级管理员终审。`
        : `确认在部门审批环节驳回 ${name} 的员工身份申请？`
    }
    return reviewAction === 'approve'
      ? `确认终审通过 ${name} 的员工身份申请？系统将创建 CRM 员工账号和组织身份，并发送设置密码邮件。`
      : `确认在终审环节驳回 ${name} 的员工身份申请？`
  })()

  const columns: ColumnProps<IdentityApplicationItem>[] = [
    {
      title: '新员工',
      dataIndex: 'name',
      width: 160,
      render: (text: string, record: IdentityApplicationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCheck className="h-4 w-4 text-[var(--semi-color-primary)]" />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
              <Text strong>{text}</Text>
              <Text type="tertiary" size="small">{record.phone}</Text>
            </div>
          </div>
        )
      },
    },
    {
      title: '组织身份',
      dataIndex: 'campus_name',
      width: 260,
      render: (_text: string, record: IdentityApplicationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={180} />
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text>{record.campus_name || '-'}</Text>
            <Text type="tertiary" size="small">
              {[record.department_name, record.position_name].filter(Boolean).join(' / ') || '-'}
            </Text>
          </div>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string, record: IdentityApplicationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return <StatusTag status={status} />
      },
    },
    {
      title: '入职日期',
      dataIndex: 'joined_on',
      width: 110,
      render: (text: string, record: IdentityApplicationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return <Text type="tertiary">{text || '-'}</Text>
      },
    },
    {
      title: '流程',
      dataIndex: 'submitted_by_name',
      width: 190,
      render: (_text: string, record: IdentityApplicationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text size="small">提交：{record.submitted_by_name || '-'}</Text>
            <Text type="tertiary" size="small">
              部门：{record.department_reviewed_by_name || (record.status === 'pending_department' ? '待审批' : '-')}
            </Text>
            <Text type="tertiary" size="small">
              终审：{record.reviewed_by_name || (record.status === 'pending_admin' ? '待审批' : '-')}
            </Text>
          </div>
        )
      },
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      width: 160,
      render: (text: string, record: IdentityApplicationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
        return <Text type="tertiary">{text ? formatTime(text) : '-'}</Text>
      },
    },
    {
      title: '邀请邮件',
      dataIndex: 'invitation_sent_at',
      width: 140,
      render: (text: string, record: IdentityApplicationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={90} />
        if (record.status !== 'approved') return <Text type="tertiary">-</Text>
        return text ? (
          <Tag color="green" size="small">已发送</Tag>
        ) : (
          <Tag color="orange" size="small">未发送</Tag>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 260,
      render: (_id: string, record: IdentityApplicationItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Button
              theme="borderless"
              type="tertiary"
              size="small"
              icon={<Eye className="h-4 w-4" />}
              onClick={() => {
                setSelectedItem(record)
                setDetailDialogOpen(true)
              }}
            >
              详情
            </Button>
            {record.can_department_review && (
              <>
                <Button
                  theme="borderless"
                  type="primary"
                  size="small"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => openReviewDialog(record, 'approve', 'department')}
                >
                  部门通过
                </Button>
                <Button
                  theme="borderless"
                  type="danger"
                  size="small"
                  icon={<X className="h-4 w-4" />}
                  onClick={() => openReviewDialog(record, 'reject', 'department')}
                >
                  部门驳回
                </Button>
              </>
            )}
            {record.can_admin_review && (
              <>
                <Button
                  theme="borderless"
                  type="primary"
                  size="small"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => openReviewDialog(record, 'approve', 'admin')}
                >
                  终审通过
                </Button>
                <Button
                  theme="borderless"
                  type="danger"
                  size="small"
                  icon={<X className="h-4 w-4" />}
                  onClick={() => openReviewDialog(record, 'reject', 'admin')}
                >
                  终审驳回
                </Button>
              </>
            )}
            {isAdminMode && record.status === 'approved' && (
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                loading={resendMutation.isPending}
                icon={<Mail className="h-4 w-4" />}
                onClick={() => resendMutation.mutate(record.id)}
              >
                重发邮件
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTableLayout
        title={isAdminMode ? '员工身份申请审批' : '员工身份申请'}
        total={data?.total}
        headerActions={
          !isAdminMode ? (
            <Button
              theme="solid"
              type="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={openCreateDialog}
            >
              提交申请
            </Button>
          ) : undefined
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as string)
              setPage(1)
            }}
            optionList={STATUS_OPTIONS}
            style={{ width: 130 }}
          />
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
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </DataTableLayout>

      <Modal
        title="提交员工身份申请"
        visible={createDialogOpen}
        width={560}
        onCancel={() => setCreateDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              loading={createMutation.isPending}
              onClick={() => formRef.current?.submitForm()}
            >
              提交审批
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={(values) => createMutation.mutate(values as IdentityApplicationFormValues)}
          labelPosition="top"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        >
          <Form.Input
            field="name"
            label="姓名"
            placeholder="新员工姓名"
            rules={[{ required: true, message: '请填写姓名' }]}
          />
          <Form.Input
            field="phone"
            label="手机号"
            placeholder="新员工手机号"
            rules={[{ required: true, message: '请填写手机号' }]}
          />
          <Form.Input
            field="email"
            label="邮箱"
            placeholder="用于接收设置密码邮件"
            rules={[
              { required: true, message: '请填写邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          />
          <Form.DatePicker
            field="joined_on"
            label="入职日期"
            type="date"
            placeholder="选择入职日期"
            style={{ width: '100%' }}
          />
          <Form.Select
            field="campus_id"
            label="所属校区"
            placeholder="选择校区"
            optionList={campuses.map((campus) => ({ label: campus.name, value: campus.id }))}
            filter
            showClear
            rules={[{ required: true, message: '请选择校区' }]}
            style={{ width: '100%' }}
            onChange={(value) => {
              const campusId = (value as string) || ''
              setSelectedCampusId(campusId)
              setSelectedDepartmentId('')
              formRef.current?.setValues({
                campus_id: campusId || undefined,
                department_id: undefined,
                position_id: undefined,
              })
            }}
          />
          <Form.Select
            field="department_id"
            label="所属部门"
            placeholder="先选择校区"
            optionList={departments.map((dept) => ({ label: dept.name, value: dept.id }))}
            filter
            showClear
            loading={departmentsLoading}
            disabled={!selectedCampusId}
            rules={[{ required: true, message: '请选择部门' }]}
            style={{ width: '100%' }}
            onChange={(value) => {
              const departmentId = (value as string) || ''
              setSelectedDepartmentId(departmentId)
              formRef.current?.setValues({
                department_id: departmentId || undefined,
                position_id: undefined,
              })
            }}
          />
          <Form.Select
            field="position_id"
            label="职位"
            placeholder="先选择部门"
            optionList={positions.map((position) => ({
              label: `${position.name} (${position.level_display})`,
              value: position.id,
            }))}
            filter
            showClear
            loading={positionsLoading}
            disabled={!selectedDepartmentId}
            rules={[{ required: true, message: '请选择职位' }]}
            style={{ width: '100%' }}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Form.TextArea
              field="remark"
              label="备注"
              placeholder="补充说明，可选"
              rows={3}
            />
          </div>
        </Form>
      </Modal>

      <Modal
        title="员工身份申请详情"
        visible={detailDialogOpen}
        width={680}
        onCancel={() => {
          setDetailDialogOpen(false)
          setSelectedItem(null)
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
            {isAdminMode && detailData?.status === 'approved' && (
              <Button
                icon={<RefreshCw className="h-4 w-4" />}
                loading={resendMutation.isPending}
                onClick={() => resendMutation.mutate(detailData.id)}
              >
                重发邀请邮件
              </Button>
            )}
            {detailData?.can_department_review && (
              <>
                <Button
                  type="danger"
                  onClick={() => openReviewDialog(detailData, 'reject', 'department')}
                >
                  部门驳回
                </Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => openReviewDialog(detailData, 'approve', 'department')}
                >
                  部门通过
                </Button>
              </>
            )}
            {detailData?.can_admin_review && (
              <>
                <Button
                  type="danger"
                  onClick={() => openReviewDialog(detailData, 'reject', 'admin')}
                >
                  终审驳回
                </Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => openReviewDialog(detailData, 'approve', 'admin')}
                >
                  终审通过
                </Button>
              </>
            )}
          </div>
        }
      >
        {detailLoading && <Text type="tertiary">加载中...</Text>}
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Descriptions
              row
              size="small"
              data={[
                { key: '姓名', value: detailData.name },
                { key: '手机号', value: detailData.phone },
                { key: '邮箱', value: detailData.email },
                { key: '状态', value: <StatusTag status={detailData.status} /> },
                { key: '校区', value: detailData.campus_name || '-' },
                { key: '部门', value: detailData.department_name || '-' },
                { key: '职位', value: detailData.position_name || '-' },
                { key: '入职日期', value: detailData.joined_on || '-' },
                { key: '提交人', value: detailData.submitted_by_name || '-' },
                { key: '提交时间', value: formatTime(detailData.submitted_at) },
                { key: '部门审批人', value: detailData.department_reviewed_by_name || '-' },
                { key: '部门审批时间', value: detailData.department_reviewed_at ? formatTime(detailData.department_reviewed_at) : '-' },
                { key: '终审人', value: detailData.reviewed_by_name || '-' },
                { key: '终审时间', value: detailData.reviewed_at ? formatTime(detailData.reviewed_at) : '-' },
                { key: '创建账号', value: detailData.created_employee_username || '-' },
                { key: '邀请邮件', value: detailData.invitation_sent_at ? formatTime(detailData.invitation_sent_at) : '-' },
              ]}
            />
            {detailData.remark && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>申请备注</Text>
                <Text type="tertiary">{detailData.remark}</Text>
              </div>
            )}
            {detailData.department_review_comment && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>部门审批意见</Text>
                <Text type="tertiary">{detailData.department_review_comment}</Text>
              </div>
            )}
            {detailData.review_comment && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>终审意见</Text>
                <Text type="tertiary">{detailData.review_comment}</Text>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={reviewDialogTitle}
        visible={reviewDialogOpen}
        onCancel={() => setReviewDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setReviewDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type={reviewAction === 'approve' ? 'primary' : 'danger'}
              loading={isReviewSubmitting}
              onClick={handleReviewConfirm}
            >
              {reviewAction === 'approve' ? '确认通过' : '确认驳回'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Text>{reviewDialogMessage}</Text>
          <TextArea
            placeholder={reviewAction === 'approve' ? '审批意见（可选）' : '驳回原因（建议填写）'}
            value={reviewComment}
            rows={3}
            onChange={setReviewComment}
          />
        </div>
      </Modal>
    </>
  )
}
