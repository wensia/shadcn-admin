import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Banner, DatePicker, Dropdown, Input, Modal, Select, Space, Spin, Table, Tag, TextArea, Toast, Typography, Button } from '@douyinfe/semi-ui-19'
import { IconMore, IconRefresh, IconSearch, IconTick } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { ClipboardPen, Copy, Download, Eye, Plus, QrCode, Trash2, UserPlus } from 'lucide-react'
import { format } from 'date-fns'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { copyToClipboard } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useAuthStore } from '@/stores/auth-store'
import { EmployeeSelectorDialog } from '@/components/employee-selector-dialog'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { employeeApi, type EmployeeListItem, type Campus } from '@/features/crm/leads/api'
import { gradeLabels, leadStatusLabels, type Grade, type LeadStatus } from '@/features/crm/leads/types'
import { directVisitLeadsApi } from './api'
import {
  directVisitConcernOptions,
  directVisitReceptionResultConfig,
  directVisitReceptionStatusConfig,
  directVisitStatusConfig,
  directVisitStatusOptions,
  type DirectVisitCampusTokenItem,
  type DirectVisitExistingLeadInfo,
  type DirectVisitLeadDetail,
  type DirectVisitLeadItem,
  type DirectVisitLeadParams,
  type DirectVisitReceptionInfo,
  type DirectVisitReceptionistItem,
  type DirectVisitReceptionRequest,
  type DirectVisitReceptionResult,
  type DirectVisitReceptionStatus,
} from './types'

const { Text } = Typography

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  try {
    return format(new Date(value), 'yyyy-MM-dd HH:mm:ss')
  } catch {
    return value
  }
}

function formatGrade(value?: string | null) {
  if (!value) return '-'
  return gradeLabels[value as Grade] ?? value
}

function formatLeadStatus(value?: string | null) {
  if (!value) return '-'
  return leadStatusLabels[value as LeadStatus] ?? value
}

function formatReceptionResult(value?: DirectVisitReceptionResult | null) {
  if (!value) return '-'
  return directVisitReceptionResultConfig[value]?.label ?? value
}

function normalizeDatePickerValue(value: unknown): Date | undefined {
  if (value instanceof Date) return value
  if (typeof value === 'string' && value) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  return undefined
}

function toIsoString(value?: Date | null) {
  return value ? value.toISOString() : null
}

const EMPTY_RECEPTIONISTS: DirectVisitReceptionistItem[] = []

function receptionistToEmployee(item: DirectVisitReceptionistItem): EmployeeListItem {
  return {
    id: item.id,
    username: item.username,
    name: item.name,
    phone: item.phone || undefined,
    is_active: true,
    campus_name: item.campus_name || undefined,
    department_name: item.department_name || undefined,
    position: item.position_name
      ? { id: item.position_name, name: item.position_name, level: 0 }
      : undefined,
  }
}

function currentUserToEmployee(
  user: ReturnType<typeof useAuthStore.getState>['user'],
  campusName?: string | null,
): EmployeeListItem | null {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    phone: user.phone,
    is_active: user.is_active,
    campus_name: campusName || user.campus_name,
    department_name: user.department_name,
    position: user.position_name
      ? { id: user.position_id || user.position_name, name: user.position_name, level: 0 }
      : undefined,
  }
}

function getEmployeeMeta(employee?: EmployeeListItem | null) {
  const identity = employee?.employee_identities?.[0]
  return {
    campus: identity?.campus?.name || employee?.campus_name || '-',
    department: identity?.department?.name || employee?.department_name || '-',
    position: identity?.position?.name || employee?.position?.name || '-',
  }
}

function getAdvisorInfo(advisor: EmployeeListItem) {
  const identity = advisor.employee_identities?.[0]
  return {
    campus: identity?.campus?.name || advisor.campus_name || '-',
    department: identity?.department?.name || advisor.department_name || '-',
    position: identity?.position?.name || advisor.position?.name || '-',
  }
}

function getLeadLocationHint(record: DirectVisitLeadItem) {
  const hasReferenceLead = !!(record.lead_id || record.existing_lead_id || record.owner_campus_name || record.advisor_id || record.lead_status)
  if (!hasReferenceLead) return '未生成关联线索'
  if (!record.owner_campus_name) return `位置未知 · 顾问：${record.advisor_name || '未分配'}`
  const campusChanged = record.owner_campus_name !== record.campus_name
  const advisorText = `顾问：${record.advisor_name || '未分配'}`
  return campusChanged ? `非本校区 · ${advisorText}` : advisorText
}

function getLeadLocationName(record: DirectVisitLeadItem) {
  const hasReferenceLead = !!(record.lead_id || record.existing_lead_id || record.owner_campus_name || record.advisor_id || record.lead_status)
  if (!hasReferenceLead) return '-'
  return record.owner_campus_name || '位置未知'
}

interface AssignDialogProps {
  record: DirectVisitLeadItem | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function AssignDialog({ record, open, onClose, onSuccess }: AssignDialogProps) {
  const queryClient = useQueryClient()
  const [selectedAdvisor, setSelectedAdvisor] = useState<EmployeeListItem | null>(null)
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 6

  const { data: advisorData, isLoading, refetch } = useQuery({
    queryKey: ['direct-visit-course-advisors', record?.campus_name, page, pageSize, searchText],
    queryFn: async () => {
      const response = await employeeApi.getCourseAdvisors({
        page,
        size: pageSize,
        search: searchText || undefined,
        campus_name: record?.campus_name || undefined,
        is_active: true,
      })
      return response.data
    },
    enabled: open && !!record,
  })

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!record || !selectedAdvisor) throw new Error('请选择咨询部/TMK员工')
      const response = await directVisitLeadsApi.assign(record.id, selectedAdvisor.id)
      return response.data
    },
    onSuccess: () => {
      Toast.success({ content: '分配成功' })
      queryClient.invalidateQueries({ queryKey: ['direct-visit-leads'] })
      onSuccess()
      setSelectedAdvisor(null)
      setSearchText('')
      setPage(1)
      onClose()
    },
    onError: (error: unknown) => showApiErrorToast(error, '分配失败'),
  })

  const advisorColumns: ColumnProps<EmployeeListItem>[] = [
    {
      title: '选择',
      dataIndex: 'id',
      width: 56,
      align: 'center',
      render: (_: string, item: EmployeeListItem) => {
        const selected = selectedAdvisor?.id === item.id
        return (
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: `2px solid ${selected ? 'var(--semi-color-primary)' : 'var(--semi-color-border)'}`,
              background: selected ? 'var(--semi-color-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            {selected && <IconTick style={{ color: '#fff', fontSize: 10 }} />}
          </div>
        )
      },
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
      render: (name: string, item: EmployeeListItem) => (
        <Text strong={selectedAdvisor?.id === item.id}>{name}</Text>
      ),
    },
    {
      title: '校区',
      dataIndex: 'campus_name',
      width: 120,
      render: (_: string, item: EmployeeListItem) => getAdvisorInfo(item).campus,
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      width: 120,
      render: (_: string, item: EmployeeListItem) => getAdvisorInfo(item).department,
    },
    {
      title: '职位',
      dataIndex: 'id',
      width: 120,
      render: (_: string, item: EmployeeListItem) => getAdvisorInfo(item).position,
    },
  ]

  return (
    <Modal
      title={record ? `${record.campus_name} · 分配直访线索` : '分配直访线索'}
      visible={open}
      onCancel={onClose}
      width={760}
      bodyStyle={{ padding: 0 }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text type="tertiary" size="small">共 {advisorData?.total || 0} 位咨询部/TMK员工</Text>
            <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Text size="small">{page} / {Math.max(1, Math.ceil((advisorData?.total || 0) / pageSize))}</Text>
            <Button
              disabled={page >= Math.ceil((advisorData?.total || 0) / pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onClose}>取消</Button>
            <Button
              theme="solid"
              disabled={!selectedAdvisor || assignMutation.isPending}
              loading={assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {selectedAdvisor ? `确定分配给 ${selectedAdvisor.name}` : '请选择咨询部/TMK员工'}
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Space>
            <Text type="tertiary" size="small">搜索咨询部/TMK员工</Text>
            <Input
              prefix={<IconSearch />}
              value={searchText}
              onChange={(value) => {
                setSearchText(value)
                setPage(1)
              }}
              placeholder="姓名或用户名"
              style={{ width: 220 }}
            />
          </Space>
          <Button
            icon={<IconRefresh />}
            theme="borderless"
            onClick={() => {
              setSelectedAdvisor(null)
              setSearchText('')
              setPage(1)
              refetch()
            }}
          />
        </div>

        <Table<EmployeeListItem>
          columns={advisorColumns}
          dataSource={advisorData?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          onRow={(item) => ({
            onClick: () => {
              if (!item) return
              setSelectedAdvisor(selectedAdvisor?.id === item.id ? null : item)
            },
            style: {
              cursor: item ? 'pointer' : undefined,
              background: item && selectedAdvisor?.id === item.id
                ? 'var(--semi-color-primary-light-default)'
                : undefined,
            },
          })}
          empty={
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <Text type="tertiary">暂无咨询部/TMK员工数据</Text>
            </div>
          }
        />
      </div>
    </Modal>
  )
}

interface ReceptionDialogProps {
  record: DirectVisitLeadItem | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function ReceptionDialog({ record, open, onClose, onSuccess }: ReceptionDialogProps) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const [visitorName, setVisitorName] = useState('')
  const [visitorRelation, setVisitorRelation] = useState('')
  const [hasChildPresent, setHasChildPresent] = useState(false)
  const [visitedAt, setVisitedAt] = useState<Date | undefined>(new Date())
  const [receptionistId, setReceptionistId] = useState<string | undefined>()
  const [selectedReceptionist, setSelectedReceptionist] = useState<EmployeeListItem | null>(null)
  const [receptionistSelectorOpen, setReceptionistSelectorOpen] = useState(false)
  const [receptionStatus, setReceptionStatus] = useState<DirectVisitReceptionStatus>('received')
  const [receptionResult, setReceptionResult] = useState<DirectVisitReceptionResult | undefined>()
  const [concernTags, setConcernTags] = useState<string[]>([])
  const [questions, setQuestions] = useState<string[]>([''])
  const [receptionNotes, setReceptionNotes] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextFollowupAt, setNextFollowupAt] = useState<Date | undefined>()

  const { data: detailData } = useQuery({
    queryKey: ['direct-visit-lead-detail', record?.id, 'reception-edit'],
    queryFn: async () => {
      if (!record?.id) throw new Error('缺少直访记录ID')
      const response = await directVisitLeadsApi.detail(record.id)
      return response.data
    },
    enabled: open && !!record?.id,
  })

  const effectiveRecord = detailData || record
  const reception: DirectVisitReceptionInfo | null | undefined = detailData?.reception

  const { data: receptionistData, isFetching: isReceptionistsLoading } = useQuery({
    queryKey: ['direct-visit-receptionists', effectiveRecord?.campus_id],
    queryFn: async () => {
      if (!effectiveRecord?.campus_id) {
        return { campusId: null, items: [] as DirectVisitReceptionistItem[] }
      }
      const campusId = effectiveRecord.campus_id
      const response = await directVisitLeadsApi.receptionists(campusId)
      return { campusId, items: response.data ?? [] }
    },
    enabled: open && !!effectiveRecord?.campus_id,
  })
  const isReceptionistsReady = Boolean(
    effectiveRecord?.campus_id && receptionistData?.campusId === effectiveRecord.campus_id,
  )
  const receptionists = isReceptionistsReady ? receptionistData?.items ?? EMPTY_RECEPTIONISTS : EMPTY_RECEPTIONISTS

  useEffect(() => {
    if (!open || !effectiveRecord) return
    const currentUserInCampus = receptionists.some((item) => item.id === currentUser?.id)
    const existingReceptionist = reception?.receptionist_id
      ? receptionists.find((item) => item.id === reception.receptionist_id)
      : undefined
    const defaultReceptionist = existingReceptionist
      ? receptionistToEmployee(existingReceptionist)
      : reception?.receptionist_id
        ? {
            id: reception.receptionist_id,
            username: reception.receptionist_name || reception.receptionist_id,
            name: reception.receptionist_name || '已选接待人',
            is_active: true,
            campus_name: effectiveRecord.campus_name,
          }
      : currentUserInCampus
        ? currentUserToEmployee(currentUser, effectiveRecord.campus_name)
        : null
    setVisitorName(reception?.visitor_name || effectiveRecord.parent_name || '')
    setVisitorRelation(reception?.visitor_relation || '家长')
    setHasChildPresent(Boolean(reception?.has_child_present))
    setVisitedAt(reception?.visited_at ? new Date(reception.visited_at) : new Date())
    setReceptionistId(reception?.receptionist_id || defaultReceptionist?.id)
    setSelectedReceptionist(defaultReceptionist)
    setReceptionStatus(reception?.reception_status || 'received')
    setReceptionResult(reception?.reception_result || undefined)
    setConcernTags(reception?.concern_tags || [])
    setQuestions(reception?.questions?.length ? reception.questions : [''])
    setReceptionNotes(reception?.reception_notes || '')
    setNextAction(reception?.next_action || '')
    setNextFollowupAt(reception?.next_followup_at ? new Date(reception.next_followup_at) : undefined)
  }, [currentUser?.id, effectiveRecord, open, reception, receptionists])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveRecord) throw new Error('缺少直访记录')
      if (receptionStatus === 'received' && !receptionResult) {
        throw new Error('已接待时必须选择接待结果')
      }
      const selectedReceptionistId = selectedReceptionist?.id || receptionistId || null
      const normalizedReceptionistId = selectedReceptionistId && receptionists.some((item) => item.id === selectedReceptionistId)
        ? selectedReceptionistId
        : null
      if (selectedReceptionistId && !normalizedReceptionistId) {
        throw new Error('接待人不属于当前直访校区，请重新选择接待人')
      }
      const payload: DirectVisitReceptionRequest = {
        visitor_name: visitorName.trim() || null,
        visitor_relation: visitorRelation.trim() || null,
        has_child_present: hasChildPresent,
        visited_at: toIsoString(visitedAt),
        receptionist_id: normalizedReceptionistId,
        reception_status: receptionStatus,
        reception_result: receptionStatus === 'received' ? (receptionResult || null) : null,
        concern_tags: concernTags,
        questions: questions.map((item) => item.trim()).filter(Boolean),
        reception_notes: receptionNotes.trim() || null,
        next_action: nextAction.trim() || null,
        next_followup_at: toIsoString(nextFollowupAt),
      }
      return directVisitLeadsApi.saveReception(effectiveRecord.id, payload)
    },
    onSuccess: async (response) => {
      Toast.success({
        content: response.data?.synced_to_lead
          ? '接待信息已保存并同步到线索备注'
          : '接待信息已保存',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['direct-visit-leads'] }),
        queryClient.invalidateQueries({ queryKey: ['direct-visit-lead-detail'] }),
      ])
      onSuccess()
      onClose()
    },
    onError: (error: unknown) => showApiErrorToast(error, '保存接待信息失败'),
  })

  const handleQuestionChange = (index: number, value: string) => {
    setQuestions((items) => items.map((item, idx) => (idx === index ? value : item)))
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions((items) => items.length <= 1 ? [''] : items.filter((_, idx) => idx !== index))
  }

  const receptionistMeta = getEmployeeMeta(selectedReceptionist)

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardPen className="h-5 w-5" color="var(--semi-color-primary)" />
            <Text strong style={{ fontSize: 18 }}>
              {reception ? '编辑直访接待' : '填写直访接待'}
            </Text>
          </div>
        }
        visible={open}
        onCancel={onClose}
        width={820}
        bodyStyle={{ padding: 0 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px' }}>
            <Button onClick={onClose}>取消</Button>
            <Button
              theme="solid"
              loading={saveMutation.isPending}
              disabled={!effectiveRecord || saveMutation.isPending || isReceptionistsLoading || !isReceptionistsReady}
              onClick={() => saveMutation.mutate()}
            >
              保存接待信息
            </Button>
          </div>
        }
      >
        <div style={{ padding: 20, background: 'var(--semi-color-bg-0)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <div>
            <Text type="tertiary" size="small">直访人</Text>
            <Input
              value={visitorName}
              onChange={setVisitorName}
              placeholder="家长或到访人姓名"
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Text type="tertiary" size="small">关系</Text>
            <Input
              value={visitorRelation}
              onChange={setVisitorRelation}
              placeholder="如：妈妈、爸爸、本人"
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Text type="tertiary" size="small">是否带孩子</Text>
            <Select
              value={hasChildPresent ? 'yes' : 'no'}
              optionList={[
                { value: 'no', label: '否' },
                { value: 'yes', label: '是' },
              ]}
              onChange={(value) => setHasChildPresent(value === 'yes')}
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>
          <div>
            <Text type="tertiary" size="small">直访时间</Text>
            <DatePicker
              type="dateTime"
              value={visitedAt}
              onChange={(value) => setVisitedAt(normalizeDatePickerValue(value))}
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>
          <div>
            <Text type="tertiary" size="small">接待人</Text>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 8,
                marginTop: 6,
              }}
            >
              <div
                style={{
                  minHeight: 32,
                  padding: '5px 10px',
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 6,
                  background: 'var(--semi-color-fill-0)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minWidth: 0,
                }}
              >
                <Text strong={Boolean(selectedReceptionist)}>
                  {selectedReceptionist?.name || '未选择接待人'}
                </Text>
                {selectedReceptionist && (
                  <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }}>
                    {[receptionistMeta.campus, receptionistMeta.department, receptionistMeta.position]
                      .filter((item) => item && item !== '-')
                      .join(' · ') || '-'}
                  </Text>
                )}
              </div>
              <Button
                onClick={() => setReceptionistSelectorOpen(true)}
                loading={isReceptionistsLoading}
              >
                选择员工
              </Button>
            </div>
          </div>
          <div>
            <Text type="tertiary" size="small">接待状态</Text>
            <Select
              value={receptionStatus}
              optionList={[
                { value: 'received', label: '已接待' },
                { value: 'not_received', label: '未接待离开' },
              ]}
              onChange={(value) => {
                const nextStatus = value as DirectVisitReceptionStatus
                setReceptionStatus(nextStatus)
                if (nextStatus === 'not_received') setReceptionResult(undefined)
              }}
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>
          {receptionStatus === 'received' && (
            <div>
              <Text type="tertiary" size="small">接待结果</Text>
              <Select
                value={receptionResult}
                optionList={Object.entries(directVisitReceptionResultConfig).map(([value, config]) => ({
                  value,
                  label: config.label,
                }))}
                placeholder="请选择接待结果"
                onChange={(value) => setReceptionResult(value as DirectVisitReceptionResult)}
                style={{ width: '100%', marginTop: 6 }}
              />
            </div>
          )}
          <div>
            <Text type="tertiary" size="small">下次跟进时间</Text>
            <DatePicker
              type="dateTime"
              value={nextFollowupAt}
              onChange={(value) => setNextFollowupAt(normalizeDatePickerValue(value))}
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Text type="tertiary" size="small">顾虑点</Text>
          <Select
            multiple
            filter
            maxTagCount={4}
            value={concernTags}
            optionList={directVisitConcernOptions}
            placeholder="选择顾虑点"
            onChange={(value) => setConcernTags((value as string[]) || [])}
            style={{ width: '100%', marginTop: 6 }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="tertiary" size="small">提出的问题</Text>
            <Button
              theme="borderless"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setQuestions((items) => [...items, ''])}
            >
              添加
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {questions.map((question, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 36px', gap: 8 }}>
                <Input
                  value={question}
                  onChange={(value) => handleQuestionChange(index, value)}
                  placeholder={`问题 ${index + 1}`}
                />
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => handleRemoveQuestion(index)}
                  aria-label="删除问题"
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14, marginTop: 14 }}>
          <div>
            <Text type="tertiary" size="small">接待纪要</Text>
            <TextArea
              value={receptionNotes}
              onChange={setReceptionNotes}
              placeholder="记录本次沟通重点、顾虑和判断"
              rows={4}
              style={{ marginTop: 6 }}
            />
          </div>
          <div>
            <Text type="tertiary" size="small">下一步动作</Text>
            <TextArea
              value={nextAction}
              onChange={setNextAction}
              placeholder="如：邀约试听、补发资料、约二次到访"
              rows={4}
              style={{ marginTop: 6 }}
            />
          </div>
        </div>
        </div>
      </Modal>

      {receptionistSelectorOpen && effectiveRecord && (
        <EmployeeSelectorDialog
          open={receptionistSelectorOpen}
          onOpenChange={setReceptionistSelectorOpen}
          onSelect={(employee) => {
            setSelectedReceptionist(employee)
            setReceptionistId(employee.id)
          }}
          title="选择接待人"
          description={`${effectiveRecord.campus_name} 校区内可作为直访接待人的在职员工`}
          confirmText="选定接待人"
          filterByAdvisorPosition={false}
          fixedCampusName={effectiveRecord.campus_name}
          lockCampus
          employeeLoader={async ({ page, size, search }) => {
            const response = await directVisitLeadsApi.receptionists(
              effectiveRecord.campus_id,
              search,
            )
            const items = (response.data ?? []).map(receptionistToEmployee)
            const start = (page - 1) * size
            const pagedItems = items.slice(start, start + size)
            return {
              items: pagedItems,
              total: items.length,
              page,
              size,
              pages: Math.max(1, Math.ceil(items.length / size)),
            }
          }}
        />
      )}
    </>
  )
}

function DetailSection({
  title,
  children,
  compact = false,
}: {
  title: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <section
      style={{
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--semi-color-bg-2)',
      }}
    >
      <div
        style={{
          padding: compact ? '10px 14px' : '12px 16px',
          borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-fill-0)',
        }}
      >
        <Text strong>{title}</Text>
      </div>
      <div style={{ padding: compact ? 14 : 16 }}>
        {children}
      </div>
    </section>
  )
}

function DetailGrid({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '14px 18px',
      }}
    >
      {children}
    </div>
  )
}

function DetailField({
  label,
  value,
  span = 1,
  strong = false,
}: {
  label: string
  value: ReactNode
  span?: 1 | 2
  strong?: boolean
}) {
  const isEmptyText = value === '-' || value === '' || value == null

  return (
    <div
      style={{
        minWidth: 0,
        gridColumn: span === 2 ? 'span 2' : undefined,
      }}
    >
      <div
        style={{
          marginBottom: 5,
          color: 'var(--semi-color-text-2)',
          fontSize: 12,
          lineHeight: '18px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: isEmptyText ? 'var(--semi-color-text-2)' : 'var(--semi-color-text-0)',
          fontSize: strong ? 16 : 14,
          fontWeight: strong && !isEmptyText ? 600 : 500,
          lineHeight: '22px',
          wordBreak: 'break-word',
        }}
      >
        {value || '-'}
      </div>
    </div>
  )
}

function DetailModal({
  detail,
  open,
  onClose,
  onOpenLead,
}: {
  detail?: DirectVisitLeadDetail
  open: boolean
  onClose: () => void
  onOpenLead: (leadId: string) => void
}) {
  const existing: DirectVisitExistingLeadInfo | null | undefined = detail?.existing_lead
  const linkedLeadId = detail?.lead_id || detail?.existing_lead_id || existing?.id
  const statusConfig = detail ? directVisitStatusConfig[detail.status] : undefined
  const hasLeadLocation = !!(linkedLeadId || existing || detail?.owner_campus_name || detail?.advisor_id || detail?.lead_status)
  const leadLocationStatus = existing?.status || detail?.lead_status
  const leadLocationCampus = hasLeadLocation
    ? (existing?.owner_campus_name || detail?.owner_campus_name || '位置未知')
    : '-'
  const leadLocationAdvisor = hasLeadLocation
    ? (existing?.advisor_name || detail?.advisor_name || '未分配')
    : '-'
  const leadStatusLabel = detail?.existing_lead_id && !detail?.lead_id ? '现有线索 CRM 状态' : '关联线索 CRM 状态'
  const reception = detail?.reception
  const receptionStatusConfig = reception?.reception_status
    ? directVisitReceptionStatusConfig[reception.reception_status]
    : undefined
  const receptionResultConfig = reception?.reception_result
    ? directVisitReceptionResultConfig[reception.reception_result]
    : undefined

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Text strong style={{ fontSize: 18 }}>直访线索详情</Text>
          {statusConfig && (
            <Tag size="small" color={statusConfig.color}>{statusConfig.label}</Tag>
          )}
        </div>
      }
      visible={open}
      onCancel={onClose}
      width={760}
      bodyStyle={{ padding: 0 }}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 20px',
            borderTop: '1px solid var(--semi-color-border)',
            background: 'var(--semi-color-bg-1)',
          }}
        >
          {linkedLeadId && (
            <Button icon={<Eye className="h-4 w-4" />} onClick={() => onOpenLead(linkedLeadId)}>
              查看线索
            </Button>
          )}
          <Button theme="solid" onClick={onClose}>关闭</Button>
        </div>
      }
    >
      <div style={{ padding: '18px 20px 20px', background: 'var(--semi-color-bg-0)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(120px, 0.8fr) minmax(150px, 1fr)',
            gap: 16,
            marginBottom: 16,
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--semi-color-border)',
            background: 'linear-gradient(135deg, var(--semi-color-fill-0), var(--semi-color-bg-2))',
          }}
        >
          <DetailField
            label="学生 / 家长"
            value={`${detail?.child_name || '-'} / ${detail?.parent_name || '-'}`}
            strong
          />
          <DetailField label="提交校区" value={detail?.campus_name || '-'} strong />
          <DetailField label="手机号" value={detail?.parent_phone || detail?.phone_masked || '-'} strong />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DetailSection title="提交信息">
            <DetailGrid>
              <DetailField label="提交时间" value={formatDateTime(detail?.created_at)} />
              <DetailField label="年级" value={formatGrade(detail?.grade)} />
              <DetailField label="学校" value={detail?.school_name || '-'} />
              <DetailField label="提交结果" value={detail?.message || '-'} span={2} />
              <DetailField label="备注" value={detail?.notes || '-'} span={2} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="当前线索位置" compact>
            <DetailGrid>
              <DetailField label="当前校区" value={leadLocationCampus} strong />
              <DetailField label="当前顾问" value={leadLocationAdvisor} strong />
              <DetailField
                label={leadStatusLabel}
                value={leadLocationStatus ? formatLeadStatus(leadLocationStatus) : '-'}
                strong
              />
              <DetailField label="线索创建时间" value={formatDateTime(existing?.created_at)} />
              <DetailField label="最近激活时间" value={formatDateTime(existing?.activated_at)} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="直访接待信息" compact>
            {reception ? (
              <DetailGrid>
                <DetailField label="接待状态" value={
                  receptionStatusConfig
                    ? <Tag size="small" color={receptionStatusConfig.color}>{receptionStatusConfig.label}</Tag>
                    : '-'
                } />
                <DetailField label="接待结果" value={
                  receptionResultConfig
                    ? <Tag size="small" color={receptionResultConfig.color}>{receptionResultConfig.label}</Tag>
                    : '-'
                } />
                <DetailField label="直访人" value={reception.visitor_name || '-'} />
                <DetailField label="关系" value={reception.visitor_relation || '-'} />
                <DetailField label="是否带孩子" value={reception.has_child_present ? '是' : '否'} />
                <DetailField label="直访时间" value={formatDateTime(reception.visited_at)} />
                <DetailField label="接待人" value={reception.receptionist_name || '-'} />
                <DetailField label="下次跟进时间" value={formatDateTime(reception.next_followup_at)} />
                <DetailField
                  label="顾虑点"
                  value={reception.concern_tags?.length ? reception.concern_tags.join('、') : '-'}
                  span={2}
                />
                <DetailField
                  label="提出的问题"
                  value={reception.questions?.length ? reception.questions.join('；') : '-'}
                  span={2}
                />
                <DetailField label="接待纪要" value={reception.reception_notes || '-'} span={2} />
                <DetailField label="下一步动作" value={reception.next_action || '-'} span={2} />
              </DetailGrid>
            ) : (
              <Text type="tertiary">尚未填写接待信息</Text>
            )}
          </DetailSection>
        </div>
      </div>
    </Modal>
  )
}

function DirectVisitTokenDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selectedCampusId, setSelectedCampusId] = useState<string | undefined>()
  const [qrDataUrl, setQrDataUrl] = useState('')

  const { data: tokensData, isLoading: isTokensLoading } = useQuery({
    queryKey: ['direct-visit-campus-tokens'],
    queryFn: async () => {
      const response = await directVisitLeadsApi.tokens()
      return response.data ?? { channel_id: '', channel_name: '校区直访', items: [] }
    },
    enabled: open,
  })

  const tokenItems = useMemo<DirectVisitCampusTokenItem[]>(
    () => tokensData?.items ?? [],
    [tokensData?.items],
  )

  const campusOptions = useMemo(() => tokenItems.map((item) => ({
    value: item.campus_id,
    label: item.operation_assistant_name
      ? `${item.campus_name} · ${item.operation_assistant_name}`
      : item.campus_name,
  })), [tokenItems])

  const selectedTokenItem = useMemo(() => (
    tokenItems.find((item) => item.campus_id === selectedCampusId)
  ), [selectedCampusId, tokenItems])

  const directVisitLink = selectedTokenItem?.token && typeof window !== 'undefined'
    ? `${window.location.origin}/direct-visit?token=${encodeURIComponent(selectedTokenItem.token)}`
    : ''

  const generateTokenMutation = useMutation({
    mutationFn: (campusId: string) => directVisitLeadsApi.createToken(campusId),
    onSuccess: async (response) => {
      Toast.success({ content: '直访码已生成' })
      if (response.data?.campus_id) {
        setSelectedCampusId(response.data.campus_id)
      }
      await queryClient.invalidateQueries({ queryKey: ['direct-visit-campus-tokens'] })
    },
    onError: (error: unknown) => showApiErrorToast(error, '生成直访码失败'),
  })

  useEffect(() => {
    if (!open || tokenItems.length === 0) return
    if (!selectedCampusId || !tokenItems.some((item) => item.campus_id === selectedCampusId)) {
      setSelectedCampusId(tokenItems[0].campus_id)
    }
  }, [open, selectedCampusId, tokenItems])

  useEffect(() => {
    let cancelled = false
    if (!directVisitLink) {
      setQrDataUrl('')
      return
    }

    QRCode.toDataURL(directVisitLink, {
      width: 240,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setQrDataUrl(url) })
      .catch(() => { if (!cancelled) setQrDataUrl('') })

    return () => { cancelled = true }
  }, [directVisitLink])

  const handleCreateToken = () => {
    if (!selectedTokenItem) return
    generateTokenMutation.mutate(selectedTokenItem.campus_id)
  }

  const handleCopyLink = async () => {
    if (!directVisitLink) return
    const success = await copyToClipboard(directVisitLink)
    if (success) {
      Toast.success({ content: '直访链接已复制' })
    } else {
      Toast.error({ content: '复制失败' })
    }
  }

  const handleDownloadQr = () => {
    if (!qrDataUrl || !selectedTokenItem) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `${selectedTokenItem.campus_name}-直访码.png`
    link.click()
  }

  const canGenerate = Boolean(
    selectedTokenItem?.is_active && selectedTokenItem.operation_assistant_id,
  )
  const hasToken = Boolean(selectedTokenItem?.token)

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <QrCode className="h-5 w-5" color="var(--semi-color-primary)" />
          <Text strong style={{ fontSize: 18 }}>校区直访码</Text>
        </div>
      }
      visible={open}
      onCancel={onClose}
      width={620}
      footer={null}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ padding: 20, background: 'var(--semi-color-bg-0)' }}>
        {isTokensLoading ? (
          <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
            <Spin />
          </div>
        ) : tokenItems.length === 0 ? (
          <Banner
            type="warning"
            fullMode={false}
            closeIcon={null}
            title="暂无可创建校区"
            description="当前账号没有可处理直访线索的校区。"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10 }}>
              <Select
                value={selectedCampusId}
                optionList={campusOptions}
                onChange={(value) => setSelectedCampusId(value as string)}
                style={{ width: '100%' }}
              />
              {!hasToken && (
                <Button
                  theme="solid"
                  icon={<QrCode className="h-4 w-4" />}
                  loading={generateTokenMutation.isPending}
                  disabled={!canGenerate}
                  onClick={handleCreateToken}
                >
                  生成直访码
                </Button>
              )}
            </div>

            {selectedTokenItem && !selectedTokenItem.is_active && (
              <Banner
                type="warning"
                fullMode={false}
                closeIcon={null}
                title="校区已停用"
                description="停用校区不能生成直访码。"
              />
            )}

            {selectedTokenItem && !selectedTokenItem.operation_assistant_id && (
              <Banner
                type="warning"
                fullMode={false}
                closeIcon={null}
                title="未任命运营助理"
                description={hasToken ? '当前只能查看已有直访码；补齐运营助理后才能维护直访码。' : '请先为该校区任命运营助理，再生成直访码。'}
              />
            )}

            {!hasToken ? (
              <div
                style={{
                  minHeight: 220,
                  border: '1px dashed var(--semi-color-border)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: 'var(--semi-color-text-2)',
                  background: 'var(--semi-color-fill-0)',
                }}
              >
                <QrCode className="h-10 w-10" />
                <Text type="tertiary">尚未生成直访码</Text>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 18, alignItems: 'center' }}>
                <div
                  style={{
                    width: 240,
                    height: 240,
                    border: '1px solid var(--semi-color-border)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                  }}
                >
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="校区直访二维码" width={220} height={220} />
                  ) : (
                    <Spin />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                  <div>
                    <Text type="tertiary" size="small">校区</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text strong>{selectedTokenItem?.campus_name || '-'}</Text>
                    </div>
                  </div>

                  <div>
                    <Text type="tertiary" size="small">运营助理</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text>{selectedTokenItem?.operation_assistant_name || '-'}</Text>
                    </div>
                  </div>

                  {selectedTokenItem?.updated_at && (
                    <div>
                      <Text type="tertiary" size="small">更新时间</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text>{formatDateTime(selectedTokenItem.updated_at)}</Text>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      padding: 10,
                      border: '1px solid var(--semi-color-border)',
                      borderRadius: 8,
                      background: 'var(--semi-color-fill-0)',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      lineHeight: 1.5,
                      wordBreak: 'break-all',
                    }}
                  >
                    {directVisitLink}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Button icon={<Copy className="h-4 w-4" />} onClick={handleCopyLink}>
                      复制链接
                    </Button>
                    <Button icon={<Download className="h-4 w-4" />} onClick={handleDownloadQr}>
                      下载二维码
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function DirectVisitLeadsPage() {
  useDocumentTitle('直访线索')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | undefined>()
  const [campusId, setCampusId] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[Date, Date] | undefined>()
  const [assignRecord, setAssignRecord] = useState<DirectVisitLeadItem | null>(null)
  const [receptionRecord, setReceptionRecord] = useState<DirectVisitLeadItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [leadDetailId, setLeadDetailId] = useState<string | null>(null)
  const [leadSheetOpen, setLeadSheetOpen] = useState(false)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)

  const params = useMemo<DirectVisitLeadParams>(() => ({
    page,
    size: pageSize,
    search: search.trim() || undefined,
    campus_id: campusId,
    status: status as DirectVisitLeadParams['status'],
    date_from: dateRange?.[0]?.toISOString(),
    date_to: dateRange?.[1]?.toISOString(),
  }), [campusId, dateRange, page, pageSize, search, status])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['direct-visit-leads', params],
    queryFn: async () => {
      const response = await directVisitLeadsApi.list(params)
      return response.data
    },
  })

  const { data: campuses = [] } = useQuery<Campus[]>({
    queryKey: ['direct-visit-current-user-campuses'],
    queryFn: () => employeeApi.getCurrentUserCampuses(),
  })

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['direct-visit-lead-detail', detailId],
    queryFn: async () => {
      if (!detailId) throw new Error('缺少直访记录ID')
      const response = await directVisitLeadsApi.detail(detailId)
      return response.data
    },
    enabled: !!detailId,
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])

  const campusOptions = useMemo(() => campuses.map((item) => ({
    value: item.id,
    label: item.name,
  })), [campuses])

  const handleOpenLead = (leadId: string) => {
    setLeadDetailId(leadId)
    setLeadSheetOpen(true)
  }

  const columns = useMemo<ColumnProps<DirectVisitLeadItem>[]>(() => [
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 160,
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
        return formatDateTime(record.created_at)
      },
    },
    {
      title: '校区',
      dataIndex: 'campus_name',
      width: 120,
      ellipsis: true,
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return record.campus_name
      },
    },
    {
      title: '家长/学生',
      dataIndex: 'parent_name',
      width: 150,
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text>{record.parent_name || '-'}</Text>
            <Text type="tertiary" size="small">{record.child_name || '-'}</Text>
          </div>
        )
      },
    },
    {
      title: '手机号',
      dataIndex: 'parent_phone',
      width: 130,
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
        return record.parent_phone || record.phone_masked
      },
    },
    {
      title: '年级/学校',
      dataIndex: 'grade',
      width: 170,
      ellipsis: true,
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text>{formatGrade(record.grade)}</Text>
            <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }}>
              {record.school_name || '-'}
            </Text>
          </div>
        )
      },
    },
    {
      title: '直访状态',
      dataIndex: 'status',
      width: 110,
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        const config = directVisitStatusConfig[record.status]
        if (record.status === 'pending_assign') {
          return (
            <Button
              theme="light"
              type="warning"
              icon={<UserPlus className="h-4 w-4" />}
              onClick={(event) => {
                event.stopPropagation()
                setAssignRecord(record)
              }}
            >
              {config.label}
            </Button>
          )
        }
        return <Tag size="small" color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '接待状态',
      dataIndex: 'reception_status',
      width: 130,
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={74} />
        if (!record.reception_status) {
          return <Tag size="small" color="grey">未填写</Tag>
        }
        const config = directVisitReceptionStatusConfig[record.reception_status]
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
            <Tag size="small" color={config.color}>{config.label}</Tag>
            {record.receptionist_name && (
              <Text type="tertiary" size="small">{record.receptionist_name}</Text>
            )}
          </div>
        )
      },
    },
    {
      title: '当前线索位置',
      dataIndex: 'owner_campus_name',
      width: 200,
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={136} />
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text>{getLeadLocationName(record)}</Text>
            <Text type="tertiary" size="small">
              {getLeadLocationHint(record)}
            </Text>
          </div>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 72,
      align: 'center',
      fixed: 'right',
      render: (_: string, record) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
        return (
          <div onClick={(event) => event.stopPropagation()}>
            <Dropdown
              trigger="click"
              clickToHide
              stopPropagation
              position="bottomRight"
              render={
                <Dropdown.Menu>
                  <Dropdown.Item
                    icon={<Eye className="h-4 w-4" />}
                    onClick={(event) => {
                      event.stopPropagation()
                      setDetailId(record.id)
                    }}
                  >
                    详情
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={<ClipboardPen className="h-4 w-4" />}
                    onClick={(event) => {
                      event.stopPropagation()
                      setReceptionRecord(record)
                    }}
                  >
                    {record.reception_status ? '编辑接待' : '填写接待'}
                  </Dropdown.Item>
                </Dropdown.Menu>
              }
            >
              <Button
                theme="borderless"
                type="tertiary"
                icon={<IconMore />}
                aria-label="更多操作"
                style={{ padding: 4 }}
              />
            </Dropdown>
          </div>
        )
      },
    },
  ], [])

  return (
    <>
      <DataTableLayout
        title="直访线索"
        total={data?.total}
        headerActions={
          <Button
            theme="solid"
            icon={<QrCode className="h-4 w-4" />}
            onClick={() => setTokenDialogOpen(true)}
          >
            直访码
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索手机号、家长、学生、学校"
              value={search}
              onChange={(value) => setSearch(value)}
              onEnterPress={() => {
                setPage(1)
                refetch()
              }}
              showClear
              style={{ width: 260 }}
            />
            <Select
              placeholder="校区"
              value={campusId}
              optionList={campusOptions}
              showClear
              onChange={(value) => {
                setCampusId(value as string | undefined)
                setPage(1)
              }}
              style={{ width: 150 }}
            />
            <Select
              placeholder="状态"
              value={status}
              optionList={directVisitStatusOptions}
              showClear
              onChange={(value) => {
                setStatus(value as string | undefined)
                setPage(1)
              }}
              style={{ width: 130 }}
            />
            <DatePicker
              type="dateRange"
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={(dates) => {
                const range = Array.isArray(dates) &&
                  dates.length === 2 &&
                  dates[0] instanceof Date &&
                  dates[1] instanceof Date
                  ? ([dates[0], dates[1]] as [Date, Date])
                  : undefined
                setDateRange(range)
                setPage(1)
              }}
              style={{ width: 240 }}
            />
            <Button theme="outline" onClick={() => {
              setPage(1)
              refetch()
            }}>
              搜索
            </Button>
          </div>
        }
      >
        <SemiDataTable<DirectVisitLeadItem>
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
          onRowClick={(record) => setDetailId(record.id)}
          emptyText="暂无直访线索"
        />
      </DataTableLayout>

      <AssignDialog
        record={assignRecord}
        open={!!assignRecord}
        onClose={() => setAssignRecord(null)}
        onSuccess={() => refetch()}
      />

      {receptionRecord && (
        <ReceptionDialog
          record={receptionRecord}
          open={!!receptionRecord}
          onClose={() => setReceptionRecord(null)}
          onSuccess={() => refetch()}
        />
      )}

      <DetailModal
        detail={detailData}
        open={!!detailId && !isDetailLoading}
        onClose={() => setDetailId(null)}
        onOpenLead={handleOpenLead}
      />

      <LeadDetailSheet
        leadId={leadDetailId}
        open={leadSheetOpen}
        onOpenChange={setLeadSheetOpen}
      />

      <DirectVisitTokenDialog
        open={tokenDialogOpen}
        onClose={() => setTokenDialogOpen(false)}
      />
    </>
  )
}
