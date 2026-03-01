/**
 * 到访预约弹窗组件 - Semi Design 版
 * 用于新建诺到/到访记录
 */

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, Button, Input, TextArea, Select, Toast, Form } from '@douyinfe/semi-ui-19'
import { IconUserAdd, IconClose } from '@douyinfe/semi-icons'
import { DatePicker } from '@douyinfe/semi-ui-19'
import { visitScheduleApi } from '@/features/crm/lead-conversion/api'
import { coursesApi } from '@/features/admin/api'
import type { VisitScheduleCreate } from '@/features/crm/lead-conversion/types'
import { LeadSelectDialog, type SelectedLead } from './lead-select-dialog'
import { updateVisitSchedule, type VisitScheduleItem, type VisitScheduleUpdateData } from '../api'
import { showApiErrorToast } from '@/lib/api/error-toast'

interface VisitScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStatus: 'scheduled' | 'visited'
  onSuccess?: () => void
  editData?: VisitScheduleItem | null
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
  const formRef = useRef<any>(null)

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
  const activeCourses = courses.filter((c: any) => c.is_active)

  const getDefaultScheduledAt = () => {
    const date = new Date()
    date.setHours(10, 0, 0, 0)
    return date
  }

  // 重置表单
  useEffect(() => {
    if (open) {
      if (editData) {
        const scheduledAt = editData.visit_date && editData.visit_time
          ? new Date(`${editData.visit_date}T${editData.visit_time}`)
          : editData.visit_date
            ? new Date(`${editData.visit_date}T10:00:00`)
            : getDefaultScheduledAt()
        setSelectedLead({
          id: editData.lead_id,
          child_name: editData.child_name,
          parent_phone: editData.parent_phone || '',
        })
        // 延迟设置表单值
        setTimeout(() => {
          formRef.current?.setValues({
            scheduled_at: scheduledAt,
            trial_course: editData.course_names?.[0] || '',
            trial_teacher: '',
            remark: editData.remark || '',
          })
        }, 0)
      } else {
        setSelectedLead(null)
        setTimeout(() => {
          formRef.current?.setValues({
            scheduled_at: getDefaultScheduledAt(),
            trial_course: '',
            trial_teacher: '',
            remark: '',
          })
        }, 0)
      }
    }
  }, [open, editData])

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: VisitScheduleCreate) => visitScheduleApi.createVisitSchedule(data),
    onSuccess: () => {
      Toast.success(isScheduled ? '诺到记录创建成功' : '到访记录创建成功')
      queryClient.invalidateQueries({ queryKey: ['visit-schedules'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => { showApiErrorToast(error, '创建失败') },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: (data: VisitScheduleUpdateData) => updateVisitSchedule(editData!.id, data),
    onSuccess: () => {
      Toast.success(isScheduled ? '诺到记录更新成功' : '到访记录更新成功')
      queryClient.invalidateQueries({ queryKey: ['visit-schedules'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => { showApiErrorToast(error, '更新失败') },
  })

  const handleSelectLead = (lead: SelectedLead) => {
    setSelectedLead(lead)
  }

  const handleClearLead = () => {
    setSelectedLead(null)
  }

  const handleSubmit = () => {
    const values = formRef.current?.getValues()
    if (!values) return

    if (!selectedLead && !isEditMode) {
      Toast.warning('请选择线索')
      return
    }

    if (!values.scheduled_at) {
      Toast.warning(isScheduled ? '请选择预约时间' : '请选择到访时间')
      return
    }

    const scheduledAtStr = values.scheduled_at instanceof Date
      ? values.scheduled_at.toISOString()
      : values.scheduled_at

    if (isEditMode) {
      const updateData: VisitScheduleUpdateData = {
        scheduled_at: scheduledAtStr,
        trial_course: values.trial_course || undefined,
        trial_teacher: values.trial_teacher || undefined,
        remark: values.remark || undefined,
      }
      updateMutation.mutate(updateData)
    } else {
      const data: VisitScheduleCreate = {
        lead_id: selectedLead!.id,
        scheduled_at: scheduledAtStr,
        trial_course: values.trial_course || undefined,
        trial_teacher: values.trial_teacher || undefined,
        remark: values.remark || undefined,
      }

      if (!isScheduled) {
        ;(data as any).actual_visit_at = scheduledAtStr
        ;(data as any).status = 'visited'
      }

      createMutation.mutate(data)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const courseOptions = activeCourses.map((course: any) => ({
    value: course.name,
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
        <Form ref={formRef} labelPosition="top">
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
            field="scheduled_at"
            label={<span>{isScheduled ? '预约时间' : '到访时间'} <span style={{ color: 'var(--semi-color-danger)' }}>*</span></span>}
            type="dateTime"
            style={{ width: '100%' }}
            placeholder={isScheduled ? '选择预约时间' : '选择到访时间'}
          />

          {/* 体验课程和讲师 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Select
              field="trial_course"
              label="体验课程"
              optionList={courseOptions}
              placeholder="选择体验课程"
              style={{ width: '100%' }}
            />
            <Form.Input
              field="trial_teacher"
              label="体验课讲师"
              placeholder="讲师姓名"
            />
          </div>

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
