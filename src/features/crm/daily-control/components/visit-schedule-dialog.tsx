/**
 * 到访预约弹窗组件 - Semi Design 版
 * 用于新建诺到/到访记录
 */

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, Button, Toast, Form } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconUserAdd, IconClose } from '@douyinfe/semi-icons'
import { coursesApi } from '@/features/admin/api'
import { LeadSelectDialog, type SelectedLead } from './lead-select-dialog'
import {
  createVisitSchedule,
  dailyControlQueryKeys,
  updateVisitSchedule,
  type VisitScheduleItem,
  type VisitScheduleMutationData,
  type VisitScheduleCreateData,
} from '../api'
import { showApiErrorToast } from '@/lib/api/error-toast'

interface VisitScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStatus: 'scheduled' | 'visited'
  onSuccess?: () => void
  editData?: VisitScheduleItem | null
}

interface CourseOptionItem {
  id: string
  is_active: boolean
  name: string
}

interface VisitScheduleFormValues {
  visit_at?: Date | string
  course_id?: string
  remark?: string
}

export function VisitScheduleDialog({
  open,
  onOpenChange,
  defaultStatus,
  onSuccess,
  editData,
}: VisitScheduleDialogProps) {
  const queryClient = useQueryClient()
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null)
  const [leadSelectOpen, setLeadSelectOpen] = useState(false)
  const formRef = useRef<FormApi | null>(null)

  const isScheduled = defaultStatus === 'scheduled'
  const isEditMode = !!editData
  const title = isEditMode
    ? (isScheduled ? '编辑诺到记录' : '编辑到访记录')
    : (isScheduled ? '新建诺到记录' : '新建到访记录')

  // 获取课程列表
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-for-visit'],
    queryFn: () => coursesApi.getCourses(),
    staleTime: 5 * 60 * 1000,
  })
  const activeCourses = (courses as CourseOptionItem[]).filter((course) => course.is_active)

  const getDefaultVisitAt = () => {
    const date = new Date()
    date.setHours(10, 0, 0, 0)
    return date
  }

  // 重置表单
  useEffect(() => {
    if (!open) return

    const nextSelectedLead = editData?.lead_id
      ? {
          id: editData.lead_id,
          child_name: editData.student_name || editData.child_name || '',
          parent_phone: editData.phone || editData.parent_phone || '',
        }
      : null
    const nextValues: VisitScheduleFormValues = editData
      ? {
          visit_at: editData.visit_date && editData.visit_time
            ? new Date(`${editData.visit_date}T${editData.visit_time}`)
            : editData.visit_date
              ? new Date(`${editData.visit_date}T10:00:00`)
              : getDefaultVisitAt(),
          course_id: editData.course_ids?.[0] || '',
          remark: editData.remark || '',
        }
      : {
          visit_at: getDefaultVisitAt(),
          course_id: '',
          remark: '',
        }

    const frameId = requestAnimationFrame(() => {
      setSelectedLead(nextSelectedLead)
      formRef.current?.setValues(nextValues)
    })

    return () => cancelAnimationFrame(frameId)
  }, [open, editData])

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: VisitScheduleCreateData) => createVisitSchedule(data),
    onSuccess: async () => {
      Toast.success(isScheduled ? '诺到记录创建成功' : '到访记录创建成功')
      await queryClient.invalidateQueries({ queryKey: dailyControlQueryKeys.all })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: unknown) => { showApiErrorToast(error, '创建失败') },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: (data: VisitScheduleMutationData) => updateVisitSchedule(editData!.id, data),
    onSuccess: async () => {
      Toast.success(isScheduled ? '诺到记录更新成功' : '到访记录更新成功')
      await queryClient.invalidateQueries({ queryKey: dailyControlQueryKeys.all })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: unknown) => { showApiErrorToast(error, '更新失败') },
  })

  const handleSelectLead = (lead: SelectedLead) => {
    setSelectedLead(lead)
  }

  const handleClearLead = () => {
    setSelectedLead(null)
  }

  const handleSubmit = () => {
    const values = formRef.current?.getValues() as VisitScheduleFormValues | undefined
    if (!values) return

    if (!selectedLead && !isEditMode) {
      Toast.warning('请选择线索')
      return
    }

    if (!values.visit_at) {
      Toast.warning(isScheduled ? '请选择预约时间' : '请选择到访时间')
      return
    }

    const visitAtStr = values.visit_at instanceof Date
      ? values.visit_at.toISOString()
      : values.visit_at

    if (isEditMode) {
      const updateData: VisitScheduleMutationData = {
        visit_at: visitAtStr,
        course_ids: values.course_id ? [values.course_id] : [],
        remark: values.remark || undefined,
      }
      updateMutation.mutate(updateData)
    } else {
      const data: VisitScheduleCreateData = {
        lead_id: selectedLead!.id,
        visit_at: visitAtStr,
        course_ids: values.course_id ? [values.course_id] : [],
        remark: values.remark || undefined,
        status: isScheduled ? 'scheduled' : 'visited',
      }

      createMutation.mutate(data)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const courseOptions = activeCourses.map((course) => ({
    value: course.id,
    label: course.name,
  }))

  return (
    <>
      <Modal
        visible={open}
        onCancel={() => onOpenChange(false)}
        title={title}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => onOpenChange(false)} disabled={isSubmitting}>取消</Button>
            <Button theme="solid" onClick={handleSubmit} loading={isSubmitting}>
              {isEditMode ? '保存' : '创建'}
            </Button>
          </div>
        }
      >
        <Form getFormApi={(api) => { formRef.current = api }} labelPosition="top">
          {/* 线索选择 */}
          <Form.Slot label={<span>选择线索 <span style={{ color: 'var(--semi-color-danger)' }}>*</span></span>}>
            {selectedLead ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 8, border: '1px solid var(--semi-color-border)',
                borderRadius: 6, background: 'var(--semi-color-fill-0)',
              }}>
                <span style={{ fontWeight: 500 }}>{selectedLead.child_name || '-'}</span>
                <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
                <span>{selectedLead.parent_phone}</span>
                {!isEditMode && (
                  <Button
                    type="tertiary"
                    theme="borderless"
                    icon={<IconClose />}
                    size="small"
                    onClick={handleClearLead}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </div>
            ) : (
              <Button
                block
                icon={<IconUserAdd />}
                onClick={() => setLeadSelectOpen(true)}
                disabled={isEditMode}
                style={{ justifyContent: 'flex-start', color: 'var(--semi-color-text-2)' }}
              >
                点击选择线索
              </Button>
            )}
          </Form.Slot>

          {/* 预约时间 */}
          <Form.DatePicker
            field="visit_at"
            label={<span>{isScheduled ? '预约时间' : '到访时间'} <span style={{ color: 'var(--semi-color-danger)' }}>*</span></span>}
            type="dateTime"
            style={{ width: '100%' }}
            placeholder={isScheduled ? '选择预约时间' : '选择到访时间'}
          />

          <Form.Select
            field="course_id"
            label="体验课程"
            optionList={courseOptions}
            placeholder="选择体验课程"
            style={{ width: '100%' }}
          />

          {/* 备注 */}
          <Form.TextArea
            field="remark"
            label="备注"
            placeholder="请输入备注信息"
            rows={3}
          />
        </Form>
      </Modal>

      <LeadSelectDialog
        open={leadSelectOpen}
        onOpenChange={setLeadSelectOpen}
        onSelect={handleSelectLead}
        title="选择线索"
        description={isScheduled ? '选择要预约到访的线索' : '选择已到访的线索'}
      />
    </>
  )
}
