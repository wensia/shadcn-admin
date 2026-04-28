/**
 * 业绩结果登记弹窗
 */

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Modal, Toast, Typography } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { UserPlus, X } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { formatTime, toUTCString } from '@/lib/utils/time'
import { LeadSelectDialog, type SelectedLead } from '@/features/crm/daily-control/components/lead-select-dialog'
import { employeeApi } from '@/features/crm/lead-conversion/api'
import type { ApiResponse } from '@/lib/api/types'
import { performanceEventApi } from '../api'
import {
  PerformanceEventType,
  performanceEventTypeOptions,
  type PerformanceEvent,
  type PerformanceEventCreate,
  type PerformanceEventUpdate,
} from '../types'

const { Text } = Typography

interface PerformanceEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  performanceEvent?: PerformanceEvent | null
}

interface CampusOption {
  id: string
  name: string
}

interface EventFormValues {
  lead_id?: string
  student_name_snapshot?: string
  parent_phone_snapshot?: string
  advisor_id?: string
  campus_id?: string
  event_type?: PerformanceEventType
  amount?: string | number
  event_at?: string
  contract_no?: string
  remark?: string
}

function toLocalDateTimeInputValue(time?: string | null): string {
  if (!time) {
    const now = new Date()
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    return localNow.toISOString().slice(0, 16)
  }

  const normalizedTime =
    time.endsWith('Z') || time.includes('+') ? time : `${time}Z`
  const date = new Date(normalizedTime)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

export function PerformanceEventDialog({
  open,
  onOpenChange,
  performanceEvent,
}: PerformanceEventDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!performanceEvent?.id
  const formApiRef = useRef<FormApi<EventFormValues> | null>(null)
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null)
  const [leadSelectOpen, setLeadSelectOpen] = useState(false)
  const [amountInput, setAmountInput] = useState('0')

  const { data: campusesData } = useQuery({
    queryKey: ['campuses-for-performance-events'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<CampusOption[]>>('/organization/campuses/simple')
      return response.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-performance-events'],
    queryFn: async () => {
      const response = await employeeApi.getEmployees({ is_active: true, size: 200 })
      return response.data?.items || []
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!open) return

    const frameId = requestAnimationFrame(() => {
      if (!formApiRef.current) return

      if (performanceEvent) {
        formApiRef.current.setValues({
          lead_id: performanceEvent.lead_id || '',
          student_name_snapshot:
            performanceEvent.student_name_snapshot ||
            performanceEvent.child_name ||
            '',
          parent_phone_snapshot:
            performanceEvent.parent_phone_snapshot ||
            performanceEvent.parent_phone ||
            '',
          advisor_id: performanceEvent.advisor_id || '',
          campus_id: performanceEvent.campus_id || '',
          event_type: performanceEvent.event_type,
          amount: performanceEvent.amount,
          event_at: toLocalDateTimeInputValue(performanceEvent.event_at),
          contract_no: performanceEvent.contract_no || '',
          remark: performanceEvent.remark || '',
        })
        setAmountInput(String(performanceEvent.amount))
        if (performanceEvent.lead_id) {
          setSelectedLead({
            id: performanceEvent.lead_id,
            child_name: performanceEvent.child_name || '',
            parent_phone: performanceEvent.parent_phone || '',
          })
        } else {
          setSelectedLead(null)
        }
        return
      }

      formApiRef.current.setValues({
        lead_id: '',
        student_name_snapshot: '',
        parent_phone_snapshot: '',
        advisor_id: '',
        campus_id: '',
        event_type: PerformanceEventType.SIGNUP,
        amount: 0,
        event_at: toLocalDateTimeInputValue(),
        contract_no: '',
        remark: '',
      })
      setAmountInput('0')
      setSelectedLead(null)
    })

    return () => cancelAnimationFrame(frameId)
  }, [open, performanceEvent])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['performance-events'] })
    queryClient.invalidateQueries({ queryKey: ['performance-event-stats'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: PerformanceEventCreate) => performanceEventApi.createPerformanceEvent(data),
    onSuccess: () => {
      Toast.success({ content: '业绩结果登记成功' })
      invalidateAll()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      showApiErrorToast(error, '登记失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PerformanceEventUpdate }) =>
      performanceEventApi.updatePerformanceEvent(id, data),
    onSuccess: () => {
      Toast.success({ content: '业绩结果更新成功' })
      invalidateAll()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  const handleAmountChange = (value: string) => {
    setAmountInput(value)
    formApiRef.current?.setValue('amount', value)
  }

  const handleSelectLead = (lead: SelectedLead) => {
    setSelectedLead(lead)
    formApiRef.current?.setValue('lead_id', lead.id)
    formApiRef.current?.setValue('student_name_snapshot', lead.child_name || '')
    formApiRef.current?.setValue('parent_phone_snapshot', lead.parent_phone || '')
  }

  const handleClearLead = () => {
    setSelectedLead(null)
    formApiRef.current?.setValue('lead_id', '')
  }

  const handleSubmit = (values: EventFormValues) => {
    if (!values.event_type) {
      Toast.warning({ content: '请选择事件类型' })
      return
    }

    const amount = Number(values.amount ?? 0)
    if (!amount || amount <= 0) {
      Toast.warning({ content: '金额必须大于 0' })
      return
    }

    if (!values.event_at) {
      Toast.warning({ content: '请选择发生时间' })
      return
    }

    const studentNameSnapshot = values.student_name_snapshot?.trim()
    const parentPhoneSnapshot = values.parent_phone_snapshot?.trim()
    const hasLead = Boolean(values.lead_id)

    if (!hasLead && !studentNameSnapshot && !parentPhoneSnapshot) {
      Toast.warning({ content: '不关联线索时，至少填写学生姓名或家长手机号' })
      return
    }

    if (!hasLead && !values.campus_id) {
      Toast.warning({ content: '不关联线索时，必须选择校区' })
      return
    }

    const payload = {
      lead_id: values.lead_id || null,
      student_name_snapshot: studentNameSnapshot || undefined,
      parent_phone_snapshot: parentPhoneSnapshot || undefined,
      advisor_id: values.advisor_id || null,
      campus_id: values.campus_id || null,
      event_type: values.event_type,
      amount,
      event_at: toUTCString(values.event_at),
      contract_no: values.contract_no || undefined,
      remark: values.remark || undefined,
    }

    if (isEdit && performanceEvent) {
      updateMutation.mutate({ id: performanceEvent.id, data: payload })
      return
    }

    createMutation.mutate(payload)
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Modal
        title={isEdit ? '编辑业绩结果' : '登记业绩结果'}
        visible={open}
        onCancel={() => onOpenChange(false)}
        width={720}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ overflow: 'auto' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button theme="solid" onClick={() => formApiRef.current?.submitForm()} disabled={isSubmitting}>
              {isSubmitting ? '提交中...' : isEdit ? '保存' : '确认登记'}
            </Button>
          </div>
        }
      >
        <Form<EventFormValues>
          getFormApi={(api) => {
            formApiRef.current = api
          }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <Form.Slot label="关联线索">
              {selectedLead ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    border: '1px solid var(--semi-color-border)',
                    borderRadius: 6,
                    backgroundColor: 'var(--semi-color-fill-0)',
                  }}
                >
                  <Text strong>{selectedLead.child_name || '-'}</Text>
                  <Text type="tertiary">-</Text>
                  <Text>{selectedLead.parent_phone}</Text>
                  <Button
                    type="tertiary"
                    theme="borderless"
                    icon={<X style={{ width: 16, height: 16 }} />}
                    style={{ marginLeft: 'auto', padding: 4 }}
                    onClick={handleClearLead}
                  />
                </div>
              ) : (
                <Button
                  icon={<UserPlus style={{ width: 16, height: 16 }} />}
                  onClick={() => setLeadSelectOpen(true)}
                  style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--semi-color-text-2)' }}
                >
                  可选，点击关联线索
                </Button>
              )}
            </Form.Slot>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Input
                field="student_name_snapshot"
                label="学生姓名"
                placeholder={selectedLead ? '已随线索自动带出，可按需调整' : '未关联线索时建议填写'}
              />
              <Form.Input
                field="parent_phone_snapshot"
                label="家长手机号"
                placeholder={selectedLead ? '已随线索自动带出，可按需调整' : '未关联线索时建议填写'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Select
                field="event_type"
                label="事件类型"
                optionList={performanceEventTypeOptions}
                rules={[{ required: true, message: '请选择事件类型' }]}
                style={{ width: '100%' }}
              />
              <Form.Input
                field="event_at"
                label="发生时间"
                type="datetime-local"
                rules={[{ required: true, message: '请选择发生时间' }]}
                extraText={performanceEvent?.event_at ? `当前记录时间：${formatTime(performanceEvent.event_at)}` : undefined}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Slot label="金额（元）">
                <Input
                  value={amountInput}
                  onChange={(value) => handleAmountChange(String(value))}
                />
              </Form.Slot>
              <Form.Input field="contract_no" label="合同编号" placeholder="可选" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Select
                field="campus_id"
                label="校区"
                optionList={(campusesData || []).map((campus) => ({
                  value: campus.id,
                  label: campus.name,
                }))}
                placeholder="可选"
                style={{ width: '100%' }}
              />
              <Form.Select
                field="advisor_id"
                label="顾问"
                optionList={(employeesData || []).map((employee) => ({
                  value: employee.id,
                  label: employee.name,
                }))}
                placeholder="可选"
                filter
                style={{ width: '100%' }}
              />
            </div>

            <Form.TextArea field="remark" label="备注" rows={4} placeholder="补充说明、同步来源备注等" />
          </div>
        </Form>
      </Modal>

      <LeadSelectDialog
        open={leadSelectOpen}
        onOpenChange={setLeadSelectOpen}
        onSelect={handleSelectLead}
        title="关联线索"
        description="如该结果关联现有 CRM 线索，可通过完整手机号检索并绑定。"
      />
    </>
  )
}
