/**
 * 到访预约弹窗组件
 * 用于新建诺到/到访记录
 */

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import type { VisitScheduleCreate } from '@/features/crm/lead-conversion/types'
import { LeadSelectDialog, type SelectedLead } from './lead-select-dialog'

// 表单验证 schema
const visitScheduleFormSchema = z.object({
  lead_id: z.string().min(1, '请选择线索'),
  scheduled_at: z.string().min(1, '请选择预约时间'),
  trial_course: z.string().optional(),
  remark: z.string().optional()
})

type VisitScheduleFormValues = z.infer<typeof visitScheduleFormSchema>

interface VisitScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 默认状态：scheduled=诺到，visited=到访 */
  defaultStatus: 'scheduled' | 'visited'
  onSuccess?: () => void
}

export function VisitScheduleDialog({
  open,
  onOpenChange,
  defaultStatus,
  onSuccess
}: VisitScheduleDialogProps) {
  const queryClient = useQueryClient()
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null)
  const [leadSelectOpen, setLeadSelectOpen] = useState(false)

  const isScheduled = defaultStatus === 'scheduled'
  const title = isScheduled ? '新建诺到记录' : '新建到访记录'

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
      remark: ''
    }
  })

  // 重置表单
  useEffect(() => {
    if (open) {
      form.reset({
        lead_id: '',
        scheduled_at: getDefaultScheduledAt(),
        trial_course: '',
        remark: ''
      })
      setSelectedLead(null)
    }
  }, [open, form])

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
    const data: VisitScheduleCreate = {
      lead_id: values.lead_id,
      scheduled_at: values.scheduled_at,
      trial_course: values.trial_course || undefined,
      remark: values.remark || undefined
    }

    // 如果是到访，需要额外设置实际到访时间
    if (!isScheduled) {
      ;(data as any).actual_visit_at = values.scheduled_at
      ;(data as any).status = 'visited'
    }

    createMutation.mutate(data)
  }

  const isSubmitting = createMutation.isPending

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
                  <FormLabel>选择线索 *</FormLabel>
                  <FormControl>
                    <div>
                      {selectedLead ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                          <span className="font-medium">{selectedLead.child_name || '-'}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{selectedLead.parent_phone}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-6 w-6"
                            onClick={handleClearLead}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-muted-foreground"
                          onClick={() => setLeadSelectOpen(true)}
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
                  <FormLabel>{isScheduled ? '预约时间' : '到访时间'} *</FormLabel>
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

            {/* 体验课程 */}
            <FormField
              control={form.control}
              name="trial_course"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>体验课程</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入体验课程" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting ? '提交中...' : '创建'}
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
