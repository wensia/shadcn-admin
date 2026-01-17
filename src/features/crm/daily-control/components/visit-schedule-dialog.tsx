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
import { format } from 'date-fns'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Search, X } from 'lucide-react'
import { visitScheduleApi } from '@/features/crm/lead-conversion/api'
import { leadsApi } from '@/features/crm/leads/api'
import type { VisitScheduleCreate } from '@/features/crm/lead-conversion/types'

// 表单验证 schema
const visitScheduleFormSchema = z.object({
  lead_id: z.string().min(1, '请选择线索'),
  scheduled_date: z.string().min(1, '请选择预约日期'),
  scheduled_time: z.string().min(1, '请选择预约时间'),
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
  const [searchPhone, setSearchPhone] = useState('')
  const [selectedLead, setSelectedLead] = useState<{
    id: string
    child_name: string
    parent_phone: string
  } | null>(null)

  const isScheduled = defaultStatus === 'scheduled'
  const title = isScheduled ? '新建诺到记录' : '新建到访记录'

  // 搜索线索
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-leads-for-visit', searchPhone],
    queryFn: async () => {
      if (!searchPhone || searchPhone.length < 3) return []
      const response = await leadsApi.searchLeadsByPhone(searchPhone)
      return response.data?.items || []
    },
    enabled: searchPhone.length >= 3
  })

  const form = useForm<VisitScheduleFormValues>({
    resolver: zodResolver(visitScheduleFormSchema),
    defaultValues: {
      lead_id: '',
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
      scheduled_time: '10:00',
      trial_course: '',
      remark: ''
    }
  })

  // 重置表单
  useEffect(() => {
    if (open) {
      form.reset({
        lead_id: '',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        scheduled_time: '10:00',
        trial_course: '',
        remark: ''
      })
      setSelectedLead(null)
      setSearchPhone('')
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
  const handleSelectLead = (lead: { id: string; child_name: string; parent_phone: string }) => {
    setSelectedLead(lead)
    form.setValue('lead_id', lead.id)
    setSearchPhone('')
  }

  // 清除选择的线索
  const handleClearLead = () => {
    setSelectedLead(null)
    form.setValue('lead_id', '')
  }

  // 提交表单
  const onSubmit = (values: VisitScheduleFormValues) => {
    // 组合日期和时间
    const scheduledAt = `${values.scheduled_date}T${values.scheduled_time}:00`

    const data: VisitScheduleCreate = {
      lead_id: values.lead_id,
      scheduled_at: scheduledAt,
      trial_course: values.trial_course || undefined,
      remark: values.remark || undefined
    }

    // 如果是到访，需要额外设置实际到访时间
    if (!isScheduled) {
      ;(data as any).actual_visit_at = scheduledAt
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
                    <div className="space-y-2">
                      {selectedLead ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                          <span className="font-medium">{selectedLead.child_name}</span>
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
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="输入手机号搜索线索"
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      )}
                      {!selectedLead && searchResults && searchResults.length > 0 && (
                        <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                          {searchResults.map((lead: any) => (
                            <div
                              key={lead.id}
                              className="p-2 hover:bg-muted cursor-pointer text-sm"
                              onClick={() => handleSelectLead({
                                id: lead.id,
                                child_name: lead.child_name,
                                parent_phone: lead.parent_phone
                              })}
                            >
                              <span className="font-medium">{lead.child_name}</span>
                              <span className="text-muted-foreground ml-2">{lead.parent_phone}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!selectedLead && searchPhone.length >= 3 && isSearching && (
                        <div className="text-sm text-muted-foreground p-2">搜索中...</div>
                      )}
                      {!selectedLead && searchPhone.length >= 3 && !isSearching && searchResults?.length === 0 && (
                        <div className="text-sm text-muted-foreground p-2">未找到匹配的线索</div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 预约日期和时间 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isScheduled ? '预约日期' : '到访日期'} *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isScheduled ? '预约时间' : '到访时间'} *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
    </Dialog>
  )
}
