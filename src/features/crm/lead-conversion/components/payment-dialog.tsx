/**
 * 缴费记录弹窗组件
 * 支持新建和编辑缴费记录
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Search, X } from 'lucide-react'
import { paymentApi, employeeApi } from '../api'
import { leadsApi } from '../../leads/api'
import type { Payment, PaymentCreate, PaymentUpdate } from '../types'
import {
  paymentMethodOptions,
  paymentTypeOptions,
  paymentStatusOptions,
  PaymentMethod,
  PaymentType,
  PaymentStatus
} from '../types'

// 表单验证 schema
const paymentFormSchema = z.object({
  lead_id: z.string().min(1, '请选择线索'),
  amount: z.number().min(0.01, '金额必须大于0'),
  payment_method: z.string().min(1, '请选择支付方式'),
  payment_type: z.string().min(1, '请选择缴费类型'),
  payment_at: z.string().min(1, '请选择缴费时间'),
  status: z.string().min(1, '请选择状态'),
  collector_id: z.string().nullable().optional(),
  course_name: z.string().optional(),
  course_hours: z.number().nullable().optional(),
  receipt_no: z.string().optional(),
  contract_no: z.string().optional(),
  remark: z.string().optional()
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: Payment | null
  onSuccess?: () => void
}

export function PaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess
}: PaymentDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!payment?.id
  const [searchPhone, setSearchPhone] = useState('')
  const [selectedLead, setSelectedLead] = useState<{
    id: string
    child_name: string
    parent_phone: string
  } | null>(null)

  // 获取收款人列表
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-payment'],
    queryFn: async () => {
      const response = await employeeApi.getEmployees({ is_active: true, size: 100 })
      return response.data?.items || []
    },
    staleTime: 5 * 60 * 1000
  })

  // 搜索线索
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-leads-for-payment', searchPhone],
    queryFn: async () => {
      if (!searchPhone || searchPhone.length < 3) return []
      const response = await leadsApi.searchLeadsByPhone(searchPhone)
      return response.data?.items || []
    },
    enabled: searchPhone.length >= 3
  })

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      lead_id: '',
      amount: 0,
      payment_method: PaymentMethod.WECHAT,
      payment_type: PaymentType.FULL_PAY,
      payment_at: new Date().toISOString().slice(0, 16),
      status: PaymentStatus.CONFIRMED,
      collector_id: null,
      course_name: '',
      course_hours: null,
      receipt_no: '',
      contract_no: '',
      remark: ''
    }
  })

  // 填充编辑数据
  useEffect(() => {
    if (payment && open) {
      form.reset({
        lead_id: payment.lead_id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        payment_type: payment.payment_type,
        payment_at: payment.payment_at.slice(0, 16),
        status: payment.status,
        collector_id: payment.collector_id || null,
        course_name: payment.course_name || '',
        course_hours: payment.course_hours || null,
        receipt_no: payment.receipt_no || '',
        contract_no: payment.contract_no || '',
        remark: payment.remark || ''
      })
      setSelectedLead({
        id: payment.lead_id,
        child_name: payment.child_name || '',
        parent_phone: payment.parent_phone || ''
      })
    } else if (!payment && open) {
      form.reset({
        lead_id: '',
        amount: 0,
        payment_method: PaymentMethod.WECHAT,
        payment_type: PaymentType.FULL_PAY,
        payment_at: new Date().toISOString().slice(0, 16),
        status: PaymentStatus.CONFIRMED,
        collector_id: null,
        course_name: '',
        course_hours: null,
        receipt_no: '',
        contract_no: '',
        remark: ''
      })
      setSelectedLead(null)
      setSearchPhone('')
    }
  }, [payment, open, form])

  // 创建缴费记录
  const createMutation = useMutation({
    mutationFn: (data: PaymentCreate) => paymentApi.createPayment(data),
    onSuccess: () => {
      toast.success('缴费记录创建成功')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['conversion-stats'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.message || '创建失败')
    }
  })

  // 更新缴费记录
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentUpdate }) =>
      paymentApi.updatePayment(id, data),
    onSuccess: () => {
      toast.success('缴费记录更新成功')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['conversion-stats'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.message || '更新失败')
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
  const onSubmit = (values: PaymentFormValues) => {
    const data = {
      lead_id: values.lead_id,
      amount: values.amount,
      payment_method: values.payment_method,
      payment_type: values.payment_type,
      payment_at: new Date(values.payment_at).toISOString(),
      status: values.status,
      collector_id: values.collector_id || undefined,
      course_name: values.course_name || undefined,
      course_hours: values.course_hours || undefined,
      receipt_no: values.receipt_no || undefined,
      contract_no: values.contract_no || undefined,
      remark: values.remark || undefined
    }

    if (isEdit && payment) {
      updateMutation.mutate({ id: payment.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑缴费记录' : '新建缴费记录'}</DialogTitle>
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
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 金额和支付方式 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>缴费金额 *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>支付方式 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择支付方式" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 缴费类型和时间 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>缴费类型 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择缴费类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="payment_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>缴费时间 *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 收款人和状态 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="collector_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>收款人</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择收款人" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">不指定</SelectItem>
                        {employeesData?.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>缴费状态 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 课程信息 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="course_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>课程名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入课程名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="course_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>课时数</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="请输入课时数"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 收据和合同编号 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="receipt_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>收据编号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入收据编号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contract_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>合同编号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入合同编号" {...field} />
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
                {isSubmitting ? '提交中...' : isEdit ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
