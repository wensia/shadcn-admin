/**
 * 到访预约弹窗组件
 * 用于新建诺到/到访记录
 */

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/date-time-picker'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { UserPlus, X } from 'lucide-react'
import { visitScheduleApi } from '@/features/crm/lead-conversion/api'
import { coursesApi } from '@/features/admin/api'
import type { VisitScheduleCreate } from '@/features/crm/lead-conversion/types'
import { LeadSelectDialog, type SelectedLead } from './lead-select-dialog'
import { updateVisitSchedule, type VisitScheduleItem, type VisitScheduleUpdateData } from '../api'

// 表单验证 schema
const visitScheduleFormSchema = z.object({
  lead_id: z.string().min(1, '请选择线索'),
  scheduled_at: z.string().min(1, '请选择预约时间'),
  trial_course: z.string().optional(),
  trial_teacher: z.string().optional(),
  remark: z.string().optional()
})

type VisitScheduleFormValues = z.infer<typeof visitScheduleFormSchema>

interface VisitScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 默认状态：scheduled=诺到，visited=到访 */
  defaultStatus: 'scheduled' | 'visited'
  onSuccess?: () => void
  /** 编辑数据，传入时为编辑模式 */
  editData?: VisitScheduleItem | null
}

export function VisitScheduleDialog({
  open,
  onOpenChange,
  defaultStatus,
  onSuccess,
  editData
}: VisitScheduleDialogProps) {
  const queryClient = useQueryClient()
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null)
  const [leadSelectOpen, setLeadSelectOpen] = useState(false)

  const isScheduled = defaultStatus === 'scheduled'
  const isEditMode = !!editData
  const title = isEditMode
    ? (isScheduled ? '编辑诺到记录' : '编辑到访记录')
    : (isScheduled ? '新建诺到记录' : '新建到访记录')

  // 获取课程列表
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-for-visit'],
    queryFn: () => coursesApi.getCourses(),
    staleTime: 5 * 60 * 1000
  })
  // 只显示启用的课程
  const activeCourses = courses.filter(c => c.is_active)

  // 默认预约时间：今天 10:00
  const getDefaultScheduledAt = () => {
    const date = new Date()
    date.setHours(10, 0, 0, 0)
    return date.toISOString()
  }

  const form = useForm<VisitScheduleFormValues>({
    resolver: zodResolver(visitScheduleFormSchema),
    defaultValues: {
      lead_id: '',
      scheduled_at: getDefaultScheduledAt(),
      trial_course: '',
      trial_teacher: '',
      remark: ''
    }
  })

  // 重置表单
  useEffect(() => {
    if (open) {
      if (editData) {
        // 编辑模式：填充现有数据
        const scheduledAt = editData.visit_date && editData.visit_time
          ? `${editData.visit_date}T${editData.visit_time}`
          : editData.visit_date
            ? `${editData.visit_date}T10:00:00`
            : getDefaultScheduledAt()
        form.reset({
          lead_id: editData.lead_id,
          scheduled_at: scheduledAt,
          trial_course: editData.course_names?.[0] || '',
          trial_teacher: '',
          remark: editData.remark || ''
        })
        setSelectedLead({
          id: editData.lead_id,
          child_name: editData.child_name,
          parent_phone: editData.parent_phone || ''
        })
      } else {
        // 新建模式
        form.reset({
          lead_id: '',
          scheduled_at: getDefaultScheduledAt(),
          trial_course: '',
          trial_teacher: '',
          remark: ''
        })
        setSelectedLead(null)
      }
    }
  }, [open, form, editData])

  // 创建记录
  const createMutation = useMutation({
    mutationFn: (data: VisitScheduleCreate) => visitScheduleApi.createVisitSchedule(data),
    onSuccess: () => {
      toast.success(isScheduled ? '诺到记录创建成功' : '到访记录创建成功')
      queryClient.invalidateQueries({ queryKey: ['visit-schedules'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.message || '创建失败')
    }
  })

  // 更新记录
  const updateMutation = useMutation({
    mutationFn: (data: VisitScheduleUpdateData) => updateVisitSchedule(editData!.id, data),
    onSuccess: () => {
      toast.success(isScheduled ? '诺到记录更新成功' : '到访记录更新成功')
      queryClient.invalidateQueries({ queryKey: ['visit-schedules'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.message || '更新失败')
    }
  })

  // 选择线索
  const handleSelectLead = (lead: SelectedLead) => {
    setSelectedLead(lead)
    form.setValue('lead_id', lead.id)
  }

  // 清除选择的线索
  const handleClearLead = () => {
    setSelectedLead(null)
    form.setValue('lead_id', '')
  }

  // 提交表单
  const onSubmit = (values: VisitScheduleFormValues) => {
    if (isEditMode) {
      // 编辑模式
      const updateData: VisitScheduleUpdateData = {
        scheduled_at: values.scheduled_at,
        trial_course: values.trial_course || undefined,
        trial_teacher: values.trial_teacher || undefined,
        remark: values.remark || undefined
      }
      updateMutation.mutate(updateData)
    } else {
      // 新建模式
      const data: VisitScheduleCreate = {
        lead_id: values.lead_id,
        scheduled_at: values.scheduled_at,
        trial_course: values.trial_course || undefined,
        trial_teacher: values.trial_teacher || undefined,
        remark: values.remark || undefined
      }

      // 如果是到访，需要额外设置实际到访时间
      if (!isScheduled) {
        ;(data as any).actual_visit_at = values.scheduled_at
        ;(data as any).status = 'visited'
      }

      createMutation.mutate(data)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 线索选择 */}
            <FormField
              control={form.control}
              name="lead_id"
              render={() => (
                <FormItem>
                  <FormLabel>选择线索 <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <div>
                      {selectedLead ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                          <span className="font-medium">{selectedLead.child_name || '-'}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{selectedLead.parent_phone}</span>
                          {!isEditMode && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="ml-auto h-6 w-6"
                              onClick={handleClearLead}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-muted-foreground"
                          onClick={() => setLeadSelectOpen(true)}
                          disabled={isEditMode}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          点击选择线索
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 预约日期和时间 */}
            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isScheduled ? '预约时间' : '到访时间'} <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={isScheduled ? '选择预约时间' : '选择到访时间'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 体验课程和讲师 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="trial_course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>体验课程</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择体验课程" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeCourses.map((course) => (
                          <SelectItem key={course.id} value={course.name}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trial_teacher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>体验课讲师</FormLabel>
                    <FormControl>
                      <Input placeholder="讲师姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 备注 */}
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea placeholder="请输入备注信息" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : (isEditMode ? '保存' : '创建')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* 线索选择弹窗 */}
      <LeadSelectDialog
        open={leadSelectOpen}
        onOpenChange={setLeadSelectOpen}
        onSelect={handleSelectLead}
        title="选择线索"
        description={isScheduled ? '选择要预约到访的线索' : '选择已到访的线索'}
      />
    </Dialog>
  )
}
