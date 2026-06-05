/**
 * 人事审批统一页面
 * 将添加员工与员工离职收敛到同一张审批表。
 */

import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Descriptions,
  Dropdown,
  Form,
  Modal,
  Select,
  Tag,
  TextArea,
  Timeline,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import {
  Ban,
  Check,
  ChevronDown,
  Eye,
  Mail,
  Plus,
  RefreshCw,
  Send,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { DialogBodySkeleton } from '@/components/semi/dialog-body-skeleton'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { SemiSkeletonCell, isSkeletonRow } from '@/lib/table-utils'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { toast } from '@/lib/toast'
import { formatTime } from '@/lib/utils/time'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useAuthStore } from '@/stores/auth-store'
import { adminApi } from '@/features/admin/api'
import {
  hrApi,
  type IdentityApplicationCreate,
  type IdentityApplicationItem,
  type ResignationCreate,
  type ResignationItem,
} from '../api'

const { Text } = Typography

const COMBINED_FETCH_SIZE = 100

type ApprovalTypeFilter = 'all' | 'identity' | 'resignations'
type ApprovalStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'draft' | 'cancelled'
type ApprovalSource = 'identity' | 'resignations'
type IdentityReviewAction = 'approve' | 'reject'
type IdentityReviewStage = 'department' | 'admin'
type ResignationApprovalAction = 'business_approve' | 'business_reject' | 'approve' | 'reject'

type IdentityApplicationFormValues = Omit<IdentityApplicationCreate, 'joined_on'> & {
  joined_on: string | Date
}

type ResignationFormValues = Omit<ResignationCreate, 'resignation_date'> & {
  resignation_date: string | Date
}

type HrApprovalsSearch = {
  tab?: string
  type?: string
  status?: string
  page?: string | number
  size?: string | number
}

interface HrApprovalsPageProps {
  defaultType?: ApprovalTypeFilter
}

interface UnifiedApprovalRow {
  id: string
  rawId: string
  source: ApprovalSource
  personName: string
  subtitle: string
  status: string
  organizationPrimary: string
  organizationSecondary: string
  effectiveDate: string
  submittedAt?: string
  submittedBy?: string
  sortTime: number
  raw: IdentityApplicationItem | ResignationItem
}

async function fetchAllApprovalItems<T>(
  fetchPage: (params: { page: number; size: number }) => Promise<{
    data?: {
      items: T[]
      pages?: number
    }
  }>
): Promise<T[]> {
  const firstResponse = await fetchPage({ page: 1, size: COMBINED_FETCH_SIZE })
  const firstPage = firstResponse.data
  const items = firstPage?.items ?? []
  const pages = firstPage?.pages ?? 1

  if (pages <= 1) return items

  const restResponses = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      fetchPage({ page: index + 2, size: COMBINED_FETCH_SIZE })
    )
  )

  return [
    ...items,
    ...restResponses.flatMap((response) => response.data?.items ?? []),
  ]
}

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'identity', label: '添加员工' },
  { value: 'resignations', label: '员工离职' },
]

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'draft', label: '草稿' },
  { value: 'cancelled', label: '已取消' },
]

const IDENTITY_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending_department: { color: 'orange', label: '部门待审' },
  pending_admin: { color: 'orange', label: '超管待审' },
  pending: { color: 'orange', label: '待审批' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
}

const RESIGNATION_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft: { color: 'grey', label: '草稿' },
  pending: { color: 'orange', label: '待审批' },
  pending_business: { color: 'orange', label: '待业务确认' },
  pending_admin: { color: 'amber', label: '待超管终审' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
  cancelled: { color: 'grey', label: '已取消' },
}

const RESIGNATION_TYPE_CONFIG: Record<string, string> = {
  voluntary: '主动离职',
  involuntary: '被动离职',
  expired: '合同到期',
}

const RESIGNATION_ACTION_LABELS: Record<string, string> = {
  create: '创建申请',
  submit: '提交业务确认',
  resubmit: '重新提交',
  business_approve: '业务确认通过',
  business_reject: '业务确认驳回',
  approve: '审批通过',
  reject: '审批驳回',
  cancel: '取消申请',
}

const LEAD_DISPOSITION_OPTIONS = [
  { label: '释放到公海', value: 'release_to_pool' },
  { label: '转交给指定顾问', value: 'transfer_to_advisor' },
]

const LEAD_DISPOSITION_LABELS: Record<string, string> = {
  release_to_pool: '释放到公海',
  transfer_to_advisor: '转交给指定顾问',
}

function resolveType(value: string | undefined, fallback: ApprovalTypeFilter): ApprovalTypeFilter {
  return value === 'identity' || value === 'resignations' || value === 'all' ? value : fallback
}

function resolveStatus(value: string | undefined): ApprovalStatusFilter {
  return value === 'pending'
    || value === 'approved'
    || value === 'rejected'
    || value === 'draft'
    || value === 'cancelled'
    ? value
    : 'all'
}

function parsePositiveInteger(value: string | number | undefined, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function formatDateValue(value: string | Date) {
  if (typeof value === 'string') return value.slice(0, 10)
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStatusConfig(source: ApprovalSource, status: string) {
  return source === 'identity'
    ? (IDENTITY_STATUS_CONFIG[status] || IDENTITY_STATUS_CONFIG.pending)
    : (RESIGNATION_STATUS_CONFIG[status] || RESIGNATION_STATUS_CONFIG.draft)
}

function StatusTag({ source, status }: { source: ApprovalSource; status: string }) {
  const config = getStatusConfig(source, status)
  return (
    <Tag color={config.color as any} size="small">
      {config.label}
    </Tag>
  )
}

function getStatusGroup(status: string): ApprovalStatusFilter {
  if (status === 'approved' || status === 'rejected' || status === 'draft' || status === 'cancelled') {
    return status
  }
  return 'pending'
}

function toSortTime(value?: string) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function mapIdentityRow(item: IdentityApplicationItem): UnifiedApprovalRow {
  return {
    id: `identity-${item.id}`,
    rawId: item.id,
    source: 'identity',
    personName: item.name,
    subtitle: item.phone || item.email || '-',
    status: item.status,
    organizationPrimary: item.campus_name || '-',
    organizationSecondary: [item.department_name, item.position_name].filter(Boolean).join(' / ') || '-',
    effectiveDate: item.joined_on || '-',
    submittedAt: item.submitted_at,
    submittedBy: item.submitted_by_name,
    sortTime: toSortTime(item.submitted_at || item.created_at),
    raw: item,
  }
}

function mapResignationRow(item: ResignationItem): UnifiedApprovalRow {
  return {
    id: `resignation-${item.id}`,
    rawId: item.id,
    source: 'resignations',
    personName: item.employee_name,
    subtitle: RESIGNATION_TYPE_CONFIG[item.resignation_type] || item.resignation_type,
    status: item.status,
    organizationPrimary: item.campus_name || '-',
    organizationSecondary: item.department_name || '-',
    effectiveDate: item.resignation_date || '-',
    submittedAt: item.submitted_at,
    submittedBy: item.submitted_by_name,
    sortTime: toSortTime(item.submitted_at || item.created_at),
    raw: item,
  }
}

export function HrApprovalsPage({ defaultType = 'all' }: HrApprovalsPageProps) {
  useDocumentTitle('人事审批')
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as HrApprovalsSearch
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const identityFormRef = useRef<FormApi | null>(null)
  const resignationFormRef = useRef<FormApi | null>(null)

  const typeFilter = resolveType(search.type || search.tab, defaultType)
  const statusFilter = resolveStatus(search.status)
  const page = parsePositiveInteger(search.page, 1)
  const pageSize = parsePositiveInteger(search.size, 20)

  const [identityCreateOpen, setIdentityCreateOpen] = useState(false)
  const [resignationCreateOpen, setResignationCreateOpen] = useState(false)
  const [identityDetailOpen, setIdentityDetailOpen] = useState(false)
  const [resignationDetailOpen, setResignationDetailOpen] = useState(false)
  const [identityReviewOpen, setIdentityReviewOpen] = useState(false)
  const [resignationReviewOpen, setResignationReviewOpen] = useState(false)
  const [selectedIdentity, setSelectedIdentity] = useState<IdentityApplicationItem | null>(null)
  const [selectedResignation, setSelectedResignation] = useState<ResignationItem | null>(null)
  const [identityReviewAction, setIdentityReviewAction] = useState<IdentityReviewAction>('approve')
  const [identityReviewStage, setIdentityReviewStage] = useState<IdentityReviewStage>('department')
  const [identityReviewComment, setIdentityReviewComment] = useState('')
  const [resignationReviewAction, setResignationReviewAction] = useState<ResignationApprovalAction>('approve')
  const [resignationReviewComment, setResignationReviewComment] = useState('')
  const [selectedCampusId, setSelectedCampusId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')

  const updateSearch = (next: Partial<{ type: ApprovalTypeFilter; status: ApprovalStatusFilter; page: number; size: number }>) => {
    void navigate({
      to: '/hr/identity-applications',
      search: {
        type: next.type ?? typeFilter,
        status: next.status ?? statusFilter,
        page: next.page ?? page,
        size: next.size ?? pageSize,
      },
      replace: true,
    })
  }

  const identityListQuery = useQuery({
    queryKey: ['hr-identity-applications', 'unified', COMBINED_FETCH_SIZE],
    queryFn: () => fetchAllApprovalItems<IdentityApplicationItem>(hrApi.getIdentityApplications),
  })

  const resignationListQuery = useQuery({
    queryKey: ['hr-resignations', 'unified', COMBINED_FETCH_SIZE],
    queryFn: () => fetchAllApprovalItems<ResignationItem>(hrApi.getResignations),
  })

  const identityItems = useMemo(
    () => identityListQuery.data ?? [],
    [identityListQuery.data]
  )
  const resignationItems = useMemo(
    () => resignationListQuery.data ?? [],
    [resignationListQuery.data]
  )

  const combinedRows = useMemo(() => {
    return [
      ...identityItems.map(mapIdentityRow),
      ...resignationItems.map(mapResignationRow),
    ].sort((a, b) => b.sortTime - a.sortTime)
  }, [identityItems, resignationItems])

  const filteredRows = useMemo(() => {
    return combinedRows.filter((row) => {
      const typeMatched = typeFilter === 'all' || row.source === typeFilter
      const statusMatched = statusFilter === 'all' || getStatusGroup(row.status) === statusFilter
      return typeMatched && statusMatched
    })
  }, [combinedRows, statusFilter, typeFilter])

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const isLoading = identityListQuery.isLoading || resignationListQuery.isLoading
  const isRefreshing = identityListQuery.isFetching || resignationListQuery.isFetching

  const { data: identityDetailData, isLoading: identityDetailLoading } = useQuery({
    queryKey: ['hr-identity-application-detail', selectedIdentity?.id],
    queryFn: async () => {
      if (!selectedIdentity?.id) return null
      const response = await hrApi.getIdentityApplicationDetail(selectedIdentity.id)
      return response.data
    },
    enabled: !!selectedIdentity?.id && identityDetailOpen,
  })

  const { data: resignationDetailData, isLoading: resignationDetailLoading } = useQuery({
    queryKey: ['hr-resignation-detail', selectedResignation?.id],
    queryFn: async () => {
      if (!selectedResignation?.id) return null
      const response = await hrApi.getResignationDetail(selectedResignation.id)
      return response.data
    },
    enabled: !!selectedResignation?.id && resignationDetailOpen,
  })

  const { data: campuses = [] } = useQuery({
    queryKey: ['identity-application-accessible-campuses'],
    queryFn: async () => {
      const response = await hrApi.getIdentityApplicationAccessibleCampuses()
      return response.data || []
    },
    enabled: identityCreateOpen,
  })

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['identity-application-departments', selectedCampusId],
    queryFn: async () => {
      if (!selectedCampusId) return []
      const response = await adminApi.getCampusDepartmentsSimple(selectedCampusId)
      return response.data || []
    },
    enabled: identityCreateOpen && !!selectedCampusId,
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
    enabled: identityCreateOpen && !!campusDepartmentId,
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const response = await adminApi.getEmployees({ size: 500, is_active: true })
      return response.data?.items || []
    },
    enabled: resignationCreateOpen,
  })

  const employeeOptions = useMemo(
    () => (employeesData || []).map((employee: any) => ({
      label: employee.name,
      value: employee.id,
    })),
    [employeesData]
  )

  const invalidateApprovalQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['hr-identity-applications'] })
    queryClient.invalidateQueries({ queryKey: ['hr-resignations'] })
  }

  const createIdentityMutation = useMutation({
    mutationFn: (values: IdentityApplicationFormValues) => {
      const payload: IdentityApplicationCreate = {
        ...values,
        joined_on: formatDateValue(values.joined_on),
        remark: values.remark?.trim() || undefined,
      }
      return hrApi.createIdentityApplication(payload)
    },
    onSuccess: () => {
      toast.success('添加员工申请已提交')
      setIdentityCreateOpen(false)
      invalidateApprovalQueries()
    },
    onError: (error: Error) => showApiErrorToast(error, '提交失败'),
  })

  const createResignationMutation = useMutation({
    mutationFn: (values: ResignationFormValues) => {
      const payload: ResignationCreate = {
        ...values,
        resignation_date: formatDateValue(values.resignation_date),
        reason: values.reason?.trim(),
        handover_note: values.handover_note?.trim() || undefined,
      }
      return hrApi.createResignation(payload)
    },
    onSuccess: async (response) => {
      const id = response.data?.id
      if (id) {
        try {
          await hrApi.submitResignation(id)
          toast.success('员工离职申请已创建并提交')
        } catch {
          toast.success('员工离职申请已创建，请手动提交')
        }
      }
      setResignationCreateOpen(false)
      invalidateApprovalQueries()
    },
    onError: (error: Error) => showApiErrorToast(error, '创建失败'),
  })

  const identityDepartmentApproveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.departmentApproveIdentityApplication(id, { comment }),
    onSuccess: (response) => {
      toast.success(response.message || '部门审批已通过')
      setIdentityReviewOpen(false)
      setIdentityDetailOpen(false)
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '部门审批失败'),
  })

  const identityDepartmentRejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.departmentRejectIdentityApplication(id, { comment }),
    onSuccess: (response) => {
      toast.success(response.message || '部门已驳回')
      setIdentityReviewOpen(false)
      setIdentityDetailOpen(false)
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '部门驳回失败'),
  })

  const identityApproveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.approveIdentityApplication(id, { comment }),
    onSuccess: (response) => {
      toast.success(response.message || '审批通过')
      setIdentityReviewOpen(false)
      setIdentityDetailOpen(false)
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '审批失败'),
  })

  const identityRejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.rejectIdentityApplication(id, { comment }),
    onSuccess: () => {
      toast.success('已驳回')
      setIdentityReviewOpen(false)
      setIdentityDetailOpen(false)
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '驳回失败'),
  })

  const resendIdentityInvitationMutation = useMutation({
    mutationFn: (id: string) => hrApi.resendIdentityInvitation(id),
    onSuccess: (response) => {
      toast.success(response.message || '邀请邮件已重发')
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-identity-application-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '重发失败'),
  })

  const submitResignationMutation = useMutation({
    mutationFn: (id: string) => hrApi.submitResignation(id),
    onSuccess: () => {
      toast.success('已提交业务确认')
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-resignation-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '提交失败'),
  })

  const resignationBusinessApproveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.businessApproveResignation(id, { comment }),
    onSuccess: () => {
      toast.success('业务确认已通过')
      setResignationReviewOpen(false)
      setResignationDetailOpen(false)
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-resignation-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '业务确认失败'),
  })

  const resignationBusinessRejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.businessRejectResignation(id, { comment }),
    onSuccess: () => {
      toast.success('业务确认已驳回')
      setResignationReviewOpen(false)
      setResignationDetailOpen(false)
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-resignation-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '业务确认驳回失败'),
  })

  const resignationApproveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.approveResignation(id, { comment }),
    onSuccess: () => {
      toast.success('审批通过')
      setResignationReviewOpen(false)
      setResignationDetailOpen(false)
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-resignation-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '审批失败'),
  })

  const resignationRejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      hrApi.rejectResignation(id, { comment }),
    onSuccess: () => {
      toast.success('已驳回')
      setResignationReviewOpen(false)
      setResignationDetailOpen(false)
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-resignation-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '驳回失败'),
  })

  const cancelResignationMutation = useMutation({
    mutationFn: (id: string) => hrApi.cancelResignation(id),
    onSuccess: () => {
      toast.success('已取消')
      invalidateApprovalQueries()
      queryClient.invalidateQueries({ queryKey: ['hr-resignation-detail'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '取消失败'),
  })

  const openIdentityCreateDialog = () => {
    setIdentityCreateOpen(true)
    setSelectedCampusId('')
    setSelectedDepartmentId('')
    setTimeout(() => identityFormRef.current?.reset(), 0)
  }

  const openResignationCreateDialog = () => {
    setResignationCreateOpen(true)
    setTimeout(() => resignationFormRef.current?.reset(), 0)
  }

  const openIdentityReviewDialog = (
    item: IdentityApplicationItem,
    action: IdentityReviewAction,
    stage: IdentityReviewStage
  ) => {
    setSelectedIdentity(item)
    setIdentityReviewAction(action)
    setIdentityReviewStage(stage)
    setIdentityReviewComment('')
    setIdentityReviewOpen(true)
  }

  const openResignationReviewDialog = (
    item: ResignationItem,
    action: ResignationApprovalAction
  ) => {
    setSelectedResignation(item)
    setResignationReviewAction(action)
    setResignationReviewComment('')
    setResignationReviewOpen(true)
  }

  const handleIdentityReviewConfirm = () => {
    if (!selectedIdentity) return
    const comment = identityReviewComment.trim() || undefined
    if (identityReviewStage === 'department' && identityReviewAction === 'approve') {
      identityDepartmentApproveMutation.mutate({ id: selectedIdentity.id, comment })
    } else if (identityReviewStage === 'department') {
      identityDepartmentRejectMutation.mutate({ id: selectedIdentity.id, comment })
    } else if (identityReviewAction === 'approve') {
      identityApproveMutation.mutate({ id: selectedIdentity.id, comment })
    } else {
      identityRejectMutation.mutate({ id: selectedIdentity.id, comment })
    }
  }

  const handleResignationReviewConfirm = () => {
    if (!selectedResignation) return
    const comment = resignationReviewComment.trim() || undefined
    if (resignationReviewAction === 'business_approve') {
      resignationBusinessApproveMutation.mutate({ id: selectedResignation.id, comment })
    } else if (resignationReviewAction === 'business_reject') {
      resignationBusinessRejectMutation.mutate({ id: selectedResignation.id, comment })
    } else if (resignationReviewAction === 'approve') {
      resignationApproveMutation.mutate({ id: selectedResignation.id, comment })
    } else {
      resignationRejectMutation.mutate({ id: selectedResignation.id, comment })
    }
  }

  const identityReviewSubmitting = (
    identityDepartmentApproveMutation.isPending
    || identityDepartmentRejectMutation.isPending
    || identityApproveMutation.isPending
    || identityRejectMutation.isPending
  )

  const resignationReviewSubmitting = (
    resignationBusinessApproveMutation.isPending
    || resignationBusinessRejectMutation.isPending
    || resignationApproveMutation.isPending
    || resignationRejectMutation.isPending
  )

  const identityReviewDialogTitle = identityReviewStage === 'department'
    ? (identityReviewAction === 'approve' ? '部门审批通过' : '部门审批驳回')
    : (identityReviewAction === 'approve' ? '超管终审通过' : '超管终审驳回')

  const identityReviewDialogMessage = (() => {
    const name = selectedIdentity?.name || '该员工'
    if (identityReviewStage === 'department') {
      return identityReviewAction === 'approve'
        ? `确认通过 ${name} 的部门审批？通过后会流转给超级管理员终审。`
        : `确认在部门审批环节驳回 ${name} 的添加员工申请？`
    }
    return identityReviewAction === 'approve'
      ? `确认终审通过 ${name} 的添加员工申请？系统将创建 CRM 员工账号和组织身份，并发送设置密码邮件。`
      : `确认在终审环节驳回 ${name} 的添加员工申请？`
  })()

  const resignationReviewDialogMessage = (() => {
    const name = selectedResignation?.employee_name || '该员工'
    if (resignationReviewAction === 'business_approve') {
      return `确认 ${name} 的离职事实和交接方案？通过后将进入超管终审。`
    }
    if (resignationReviewAction === 'business_reject') {
      return `确认在业务确认环节驳回 ${name} 的员工离职申请？`
    }
    if (resignationReviewAction === 'approve') {
      return `确认终审通过 ${name} 的员工离职申请？通过后将按线索处理方式执行，并停用账号。`
    }
    return `确认在终审环节驳回 ${name} 的员工离职申请？`
  })()

  const columns: ColumnProps<UnifiedApprovalRow>[] = [
    {
      title: '申请对象',
      dataIndex: 'personName',
      width: 210,
      render: (_text: string, record: UnifiedApprovalRow) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
        const Icon = record.source === 'identity' ? UserCheck : UserMinus
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon
              className="h-4 w-4"
              style={{ color: record.source === 'identity' ? 'var(--semi-color-primary)' : 'var(--semi-color-danger)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <Text strong>{record.personName || '-'}</Text>
              <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }}>
                {record.subtitle || '-'}
              </Text>
            </div>
          </div>
        )
      },
    },
    {
      title: '申请类型',
      dataIndex: 'source',
      width: 110,
      render: (_source: ApprovalSource, record: UnifiedApprovalRow) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={72} />
        return record.source === 'identity' ? (
          <Tag color="blue" size="small">添加员工</Tag>
        ) : (
          <Tag color="red" size="small">员工离职</Tag>
        )
      },
    },
    {
      title: '组织',
      dataIndex: 'organizationPrimary',
      width: 240,
      render: (_text: string, record: UnifiedApprovalRow) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text>{record.organizationPrimary}</Text>
            <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }}>
              {record.organizationSecondary}
            </Text>
          </div>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_status: string, record: UnifiedApprovalRow) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <StatusTag source={record.source} status={record.status} />
      },
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      width: 120,
      render: (_text: string, record: UnifiedApprovalRow) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={82} />
        return <Text type="tertiary">{record.effectiveDate || '-'}</Text>
      },
    },
    {
      title: '流程',
      dataIndex: 'submittedBy',
      width: 210,
      render: (_text: string, record: UnifiedApprovalRow) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={140} />
        if (record.source === 'identity') {
          const item = record.raw as IdentityApplicationItem
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Text size="small">提交：{item.submitted_by_name || '-'}</Text>
              <Text type="tertiary" size="small">
                部门：{item.department_reviewed_by_name || (item.status === 'pending_department' ? '待审批' : '-')}
              </Text>
              <Text type="tertiary" size="small">
                终审：{item.reviewed_by_name || (item.status === 'pending_admin' ? '待审批' : '-')}
              </Text>
            </div>
          )
        }
        const item = record.raw as ResignationItem
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text size="small">提交：{item.submitted_by_name || '-'}</Text>
            <Text type="tertiary" size="small">
              业务：{item.business_reviewed_by_name || (item.status === 'pending_business' ? '待确认' : '-')}
            </Text>
            <Text type="tertiary" size="small">
              终审：{item.approved_by_name || (item.status === 'pending_admin' ? '待审批' : '-')}
            </Text>
          </div>
        )
      },
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      width: 160,
      render: (_text: string, record: UnifiedApprovalRow) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
        return <Text type="tertiary">{record.submittedAt ? formatTime(record.submittedAt) : '-'}</Text>
      },
    },
    {
      title: '操作',
      dataIndex: 'rawId',
      width: 280,
      render: (_id: string, record: UnifiedApprovalRow) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={180} />
        if (record.source === 'identity') {
          const item = record.raw as IdentityApplicationItem
          return (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Eye className="h-4 w-4" />}
                onClick={() => {
                  setSelectedIdentity(item)
                  setIdentityDetailOpen(true)
                }}
              >
                详情
              </Button>
              {item.can_department_review && (
                <>
                  <Button
                    theme="borderless"
                    type="primary"
                    icon={<Check className="h-4 w-4" />}
                    onClick={() => openIdentityReviewDialog(item, 'approve', 'department')}
                  >
                    部门通过
                  </Button>
                  <Button
                    theme="borderless"
                    type="danger"
                    icon={<X className="h-4 w-4" />}
                    onClick={() => openIdentityReviewDialog(item, 'reject', 'department')}
                  >
                    部门驳回
                  </Button>
                </>
              )}
              {item.can_admin_review && (
                <>
                  <Button
                    theme="borderless"
                    type="primary"
                    icon={<Check className="h-4 w-4" />}
                    onClick={() => openIdentityReviewDialog(item, 'approve', 'admin')}
                  >
                    终审通过
                  </Button>
                  <Button
                    theme="borderless"
                    type="danger"
                    icon={<X className="h-4 w-4" />}
                    onClick={() => openIdentityReviewDialog(item, 'reject', 'admin')}
                  >
                    终审驳回
                  </Button>
                </>
              )}
              {user?.is_superuser && item.status === 'approved' && (
                <Button
                  theme="borderless"
                  type="tertiary"
                  loading={resendIdentityInvitationMutation.isPending}
                  icon={<Mail className="h-4 w-4" />}
                  onClick={() => resendIdentityInvitationMutation.mutate(item.id)}
                >
                  重发邮件
                </Button>
              )}
            </div>
          )
        }

        const item = record.raw as ResignationItem
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Button
              theme="borderless"
              type="tertiary"
              icon={<Eye className="h-4 w-4" />}
              onClick={() => {
                setSelectedResignation(item)
                setResignationDetailOpen(true)
              }}
            >
              详情
            </Button>
            {item.status === 'draft' && (user?.is_superuser || item.submitted_by_id === user?.id) && (
              <Button
                theme="borderless"
                type="primary"
                icon={<Send className="h-4 w-4" />}
                loading={submitResignationMutation.isPending}
                onClick={() => submitResignationMutation.mutate(item.id)}
              >
                提交
              </Button>
            )}
            {item.status === 'rejected' && (user?.is_superuser || item.submitted_by_id === user?.id) && (
              <Button
                theme="borderless"
                type="primary"
                icon={<Send className="h-4 w-4" />}
                loading={submitResignationMutation.isPending}
                onClick={() => submitResignationMutation.mutate(item.id)}
              >
                重新提交
              </Button>
            )}
            {item.status === 'pending_business' && (user?.is_superuser || item.submitted_by_id !== user?.id) && (
              <>
                <Button
                  theme="borderless"
                  type="primary"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => openResignationReviewDialog(item, 'business_approve')}
                >
                  确认
                </Button>
                <Button
                  theme="borderless"
                  type="danger"
                  icon={<X className="h-4 w-4" />}
                  onClick={() => openResignationReviewDialog(item, 'business_reject')}
                >
                  驳回
                </Button>
              </>
            )}
            {(item.status === 'pending_admin' || item.status === 'pending') && user?.is_superuser && (
              <>
                <Button
                  theme="borderless"
                  type="primary"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => openResignationReviewDialog(item, 'approve')}
                >
                  通过
                </Button>
                <Button
                  theme="borderless"
                  type="danger"
                  icon={<X className="h-4 w-4" />}
                  onClick={() => openResignationReviewDialog(item, 'reject')}
                >
                  驳回
                </Button>
              </>
            )}
            {(item.status === 'draft' || item.status === 'rejected') && (user?.is_superuser || item.submitted_by_id === user?.id) && (
              <Button
                theme="borderless"
                type="danger"
                icon={<Ban className="h-4 w-4" />}
                loading={cancelResignationMutation.isPending}
                onClick={() => cancelResignationMutation.mutate(item.id)}
              >
                取消
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
        title="人事审批"
        total={filteredRows.length}
        headerActions={
          <Dropdown
            trigger="click"
            position="bottomRight"
            render={
              <Dropdown.Menu>
                <Dropdown.Item icon={<UserCheck className="h-4 w-4" />} onClick={openIdentityCreateDialog}>
                  添加员工
                </Dropdown.Item>
                <Dropdown.Item icon={<UserMinus className="h-4 w-4" />} onClick={openResignationCreateDialog}>
                  员工离职
                </Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                提交申请
                <ChevronDown className="h-4 w-4" />
              </span>
            </Button>
          </Dropdown>
        }
        onRefresh={() => {
          identityListQuery.refetch()
          resignationListQuery.refetch()
        }}
        isRefreshing={isRefreshing}
        toolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Select
              value={typeFilter}
              onChange={(value) => updateSearch({ type: value as ApprovalTypeFilter, page: 1 })}
              optionList={TYPE_FILTER_OPTIONS}
              style={{ width: 130 }}
            />
            <Select
              value={statusFilter}
              onChange={(value) => updateSearch({ status: value as ApprovalStatusFilter, page: 1 })}
              optionList={STATUS_FILTER_OPTIONS}
              style={{ width: 130 }}
            />
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={pageRows}
          total={filteredRows.length}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          scrollX={1430}
          emptyText="暂无审批申请"
          onPageChange={(nextPage) => updateSearch({ page: nextPage })}
          onPageSizeChange={(nextSize) => updateSearch({ page: 1, size: nextSize })}
        />
      </DataTableLayout>

      <Modal
        title="提交添加员工申请"
        visible={identityCreateOpen}
        width={560}
        onCancel={() => setIdentityCreateOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIdentityCreateOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              loading={createIdentityMutation.isPending}
              onClick={() => identityFormRef.current?.submitForm()}
            >
              提交审批
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { identityFormRef.current = api }}
          onSubmit={(values) => createIdentityMutation.mutate(values as IdentityApplicationFormValues)}
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
            rules={[{ required: true, message: '请选择入职日期' }]}
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
              identityFormRef.current?.setValue('department_id', undefined)
              identityFormRef.current?.setValue('position_id', undefined)
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
              identityFormRef.current?.setValue('position_id', undefined)
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
        title="提交员工离职申请"
        visible={resignationCreateOpen}
        onCancel={() => setResignationCreateOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setResignationCreateOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => resignationFormRef.current?.submitForm()}
              loading={createResignationMutation.isPending}
            >
              创建并提交业务确认
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { resignationFormRef.current = api }}
          initValues={{ lead_disposition: 'release_to_pool' }}
          onSubmit={(values) => createResignationMutation.mutate(values as ResignationFormValues)}
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
          <Form.Select
            field="lead_disposition"
            label="线索处理方式"
            placeholder="选择线索处理方式"
            optionList={LEAD_DISPOSITION_OPTIONS}
            rules={[{ required: true, message: '请选择线索处理方式' }]}
            style={{ width: '100%' }}
          />
          <Form.Select
            field="transfer_to_advisor_id"
            label="转交顾问"
            placeholder="选择接收顾问"
            optionList={employeeOptions}
            filter
            showClear
            style={{ width: '100%' }}
          />
          <Form.TextArea
            field="reason"
            label="离职原因"
            placeholder="请详细说明离职原因"
            rows={4}
            rules={[{ required: true, message: '请填写离职原因' }]}
          />
          <Form.TextArea
            field="handover_note"
            label="交接说明"
            placeholder="填写交接安排或特殊事项"
            rows={3}
          />
        </Form>
      </Modal>

      <Modal
        title="添加员工申请详情"
        visible={identityDetailOpen}
        width={680}
        onCancel={() => {
          setIdentityDetailOpen(false)
          setSelectedIdentity(null)
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIdentityDetailOpen(false)}>关闭</Button>
            {user?.is_superuser && identityDetailData?.status === 'approved' && (
              <Button
                icon={<RefreshCw className="h-4 w-4" />}
                loading={resendIdentityInvitationMutation.isPending}
                onClick={() => resendIdentityInvitationMutation.mutate(identityDetailData.id)}
              >
                重发邀请邮件
              </Button>
            )}
            {identityDetailData?.can_department_review && (
              <>
                <Button
                  type="danger"
                  onClick={() => openIdentityReviewDialog(identityDetailData, 'reject', 'department')}
                >
                  部门驳回
                </Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => openIdentityReviewDialog(identityDetailData, 'approve', 'department')}
                >
                  部门通过
                </Button>
              </>
            )}
            {identityDetailData?.can_admin_review && (
              <>
                <Button
                  type="danger"
                  onClick={() => openIdentityReviewDialog(identityDetailData, 'reject', 'admin')}
                >
                  终审驳回
                </Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => openIdentityReviewDialog(identityDetailData, 'approve', 'admin')}
                >
                  终审通过
                </Button>
              </>
            )}
          </div>
        }
      >
        {identityDetailLoading && !identityDetailData ? (
          <DialogBodySkeleton variant="detail" rows={6} />
        ) : identityDetailData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Descriptions
              row
              size="small"
              data={[
                { key: '姓名', value: identityDetailData.name },
                { key: '手机号', value: identityDetailData.phone },
                { key: '邮箱', value: identityDetailData.email },
                { key: '状态', value: <StatusTag source="identity" status={identityDetailData.status} /> },
                { key: '校区', value: identityDetailData.campus_name || '-' },
                { key: '部门', value: identityDetailData.department_name || '-' },
                { key: '职位', value: identityDetailData.position_name || '-' },
                { key: '入职日期', value: identityDetailData.joined_on || '-' },
                { key: '提交人', value: identityDetailData.submitted_by_name || '-' },
                { key: '提交时间', value: formatTime(identityDetailData.submitted_at) },
                { key: '部门审批人', value: identityDetailData.department_reviewed_by_name || '-' },
                { key: '部门审批时间', value: identityDetailData.department_reviewed_at ? formatTime(identityDetailData.department_reviewed_at) : '-' },
                { key: '终审人', value: identityDetailData.reviewed_by_name || '-' },
                { key: '终审时间', value: identityDetailData.reviewed_at ? formatTime(identityDetailData.reviewed_at) : '-' },
                { key: '创建账号', value: identityDetailData.created_employee_username || '-' },
                { key: '邀请邮件', value: identityDetailData.invitation_sent_at ? formatTime(identityDetailData.invitation_sent_at) : '-' },
              ]}
            />
            {identityDetailData.remark && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>申请备注</Text>
                <Text type="tertiary">{identityDetailData.remark}</Text>
              </div>
            )}
            {identityDetailData.department_review_comment && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>部门审批意见</Text>
                <Text type="tertiary">{identityDetailData.department_review_comment}</Text>
              </div>
            )}
            {identityDetailData.review_comment && (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>终审意见</Text>
                <Text type="tertiary">{identityDetailData.review_comment}</Text>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        title="员工离职申请详情"
        visible={resignationDetailOpen}
        onCancel={() => {
          setResignationDetailOpen(false)
          setSelectedResignation(null)
        }}
        width={640}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => {
              setResignationDetailOpen(false)
              setSelectedResignation(null)
            }}>
              关闭
            </Button>
            {resignationDetailData?.status === 'pending_business' && (user?.is_superuser || resignationDetailData.submitted_by_id !== user?.id) && (
              <>
                <Button
                  type="danger"
                  onClick={() => openResignationReviewDialog(resignationDetailData, 'business_reject')}
                >
                  驳回
                </Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => openResignationReviewDialog(resignationDetailData, 'business_approve')}
                >
                  业务确认
                </Button>
              </>
            )}
            {(resignationDetailData?.status === 'pending_admin' || resignationDetailData?.status === 'pending') && user?.is_superuser && (
              <>
                <Button
                  type="danger"
                  onClick={() => openResignationReviewDialog(resignationDetailData, 'reject')}
                >
                  驳回
                </Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={() => openResignationReviewDialog(resignationDetailData, 'approve')}
                >
                  通过
                </Button>
              </>
            )}
          </div>
        }
      >
        {resignationDetailLoading && !resignationDetailData ? (
          <DialogBodySkeleton variant="detail" rows={6} />
        ) : resignationDetailData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Descriptions
              data={[
                { key: '员工', value: resignationDetailData.employee_name },
                { key: '状态', value: <StatusTag source="resignations" status={resignationDetailData.status} /> },
                { key: '离职类型', value: RESIGNATION_TYPE_CONFIG[resignationDetailData.resignation_type] || resignationDetailData.resignation_type },
                { key: '计划离职日期', value: resignationDetailData.resignation_date },
                { key: '线索处理', value: resignationDetailData.lead_disposition_display || LEAD_DISPOSITION_LABELS[resignationDetailData.lead_disposition || ''] || '-' },
                { key: '转交顾问', value: resignationDetailData.transfer_to_advisor_name || '-' },
                { key: '校区', value: resignationDetailData.campus_name || '-' },
                { key: '部门', value: resignationDetailData.department_name || '-' },
                { key: '提交人', value: resignationDetailData.submitted_by_name || '-' },
                { key: '提交时间', value: resignationDetailData.submitted_at ? formatTime(resignationDetailData.submitted_at) : '-' },
                { key: '业务确认人', value: resignationDetailData.business_reviewed_by_name || '-' },
                { key: '业务确认时间', value: resignationDetailData.business_reviewed_at ? formatTime(resignationDetailData.business_reviewed_at) : '-' },
                { key: '审批人', value: resignationDetailData.approved_by_name || '-' },
                { key: '审批时间', value: resignationDetailData.approved_at ? formatTime(resignationDetailData.approved_at) : '-' },
              ]}
              row
              size="small"
            />

            <div>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>离职原因</Text>
              <Text type="tertiary">{resignationDetailData.reason}</Text>
            </div>

            {resignationDetailData.approval_comment && (
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>审批意见</Text>
                <Text type="tertiary">{resignationDetailData.approval_comment}</Text>
              </div>
            )}

            {resignationDetailData.business_review_comment && (
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>业务确认意见</Text>
                <Text type="tertiary">{resignationDetailData.business_review_comment}</Text>
              </div>
            )}

            {resignationDetailData.handover_note && (
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>交接说明</Text>
                <Text type="tertiary">{resignationDetailData.handover_note}</Text>
              </div>
            )}

            {resignationDetailData.logs && resignationDetailData.logs.length > 0 && (
              <div>
                <Text strong style={{ marginBottom: 12, display: 'block' }}>审批流程</Text>
                <Timeline>
                  {resignationDetailData.logs.map((log) => (
                    <Timeline.Item
                      key={log.id}
                      color={log.action === 'approve' ? 'green' : log.action === 'reject' ? 'red' : 'blue'}
                    >
                      <div>
                        <Text strong>{RESIGNATION_ACTION_LABELS[log.action] || log.action}</Text>
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
        ) : null}
      </Modal>

      <Modal
        title={identityReviewDialogTitle}
        visible={identityReviewOpen}
        onCancel={() => setIdentityReviewOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIdentityReviewOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type={identityReviewAction === 'approve' ? 'primary' : 'danger'}
              loading={identityReviewSubmitting}
              onClick={handleIdentityReviewConfirm}
            >
              {identityReviewAction === 'approve' ? '确认通过' : '确认驳回'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Text>{identityReviewDialogMessage}</Text>
          <TextArea
            placeholder={identityReviewAction === 'approve' ? '审批意见（可选）' : '驳回原因（建议填写）'}
            value={identityReviewComment}
            rows={3}
            onChange={setIdentityReviewComment}
          />
        </div>
      </Modal>

      <Modal
        title={resignationReviewAction === 'approve' || resignationReviewAction === 'business_approve' ? '确认通过' : '确认驳回'}
        visible={resignationReviewOpen}
        onCancel={() => setResignationReviewOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setResignationReviewOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type={resignationReviewAction === 'approve' || resignationReviewAction === 'business_approve' ? 'primary' : 'danger'}
              onClick={handleResignationReviewConfirm}
              loading={resignationReviewSubmitting}
            >
              {resignationReviewAction === 'approve' || resignationReviewAction === 'business_approve' ? '确认通过' : '确认驳回'}
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <Text>{resignationReviewDialogMessage}</Text>
        </div>
        <TextArea
          placeholder={resignationReviewAction === 'approve' || resignationReviewAction === 'business_approve' ? '意见（可选）' : '请填写驳回原因'}
          value={resignationReviewComment}
          onChange={setResignationReviewComment}
          rows={3}
        />
      </Modal>
    </>
  )
}
