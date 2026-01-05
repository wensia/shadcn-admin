/**
 * 订单弹窗组件
 * 支持新建和编辑订单，包含多个课程明细
 */

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm, useFieldArray } from 'react-hook-form'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Search, X, Plus, Trash2 } from 'lucide-react'
import { orderApi } from '../api'
import { leadsApi } from '../../leads/api'
import { employeeApi } from '../../lead-conversion/api'
import type { Order, OrderCreate, OrderUpdate } from '../types'
import {
  orderPaymentMethodOptions,
  orderPaymentStatusOptions,
  OrderPaymentMethod,
  OrderPaymentStatus
} from '../types'

// 课程明细 schema
const orderItemSchema = z.object({
  course_name: z.string().min(1, '请输入课程名称'),
  course_hours: z.number().min(0, '课时数不能为负'),
  unit_price: z.number().min(0, '单价不能为负'),
  amount: z.number().min(0, '金额不能为负'),
  remark: z.string().optional()
})

// 表单验证 schema
const orderFormSchema = z.object({
  lead_id: z.string().min(1, '请选择学员'),
  payment_method: z.string().optional(),
  payment_status: z.string().min(1, '请选择支付状态'),
  payment_at: z.string().optional(),
  collector_id: z.string().nullable().optional(),
  discount_amount: z.number().min(0, '优惠金额不能为负'),
  receipt_no: z.string().optional(),
  contract_no: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(orderItemSchema).min(1, '至少添加一个课程')
})

type OrderFormValues = z.infer<typeof orderFormSchema>

interface OrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: Order | null
  leadId?: string
  leadName?: string
  leadPhone?: string
  onSuccess?: () => void
}

export function OrderDialog({
  open,
  onOpenChange,
  order,
  leadId,
  leadName,
  leadPhone,
  onSuccess
}: OrderDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!order?.id
  const [searchPhone, setSearchPhone] = useState('')
  const [selectedLead, setSelectedLead] = useState<{
    id: string
    child_name: string
    parent_phone: string
  } | null>(null)

  // 获取收款人列表
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-order'],
    queryFn: async () => {
      const response = await employeeApi.getEmployees({ is_active: true, size: 100 })
      return response.data?.items || []
    },
    staleTime: 5 * 60 * 1000
  })

  // 搜索线索
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-leads-for-order', searchPhone],
    queryFn: async () => {
      if (!searchPhone || searchPhone.length < 3) return []
      const response = await leadsApi.searchLeadsByPhone(searchPhone)
      return response.data?.items || []
    },
    enabled: searchPhone.length >= 3
  })

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      lead_id: '',
      payment_method: OrderPaymentMethod.WECHAT,
      payment_status: OrderPaymentStatus.PAID,
      payment_at: new Date().toISOString().slice(0, 16),
      collector_id: null,
      discount_amount: 0,
      receipt_no: '',
      contract_no: '',
      remark: '',
      items: [{ course_name: '', course_hours: 0, unit_price: 0, amount: 0, remark: '' }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  // 计算总金额
  const watchItems = form.watch('items')
  const watchDiscount = form.watch('discount_amount')
  const totalAmount = watchItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const actualAmount = totalAmount - (watchDiscount || 0)

  // 填充编辑数据或预设学员
  useEffect(() => {
    if (order && open) {
      form.reset({
        lead_id: order.lead_id,
        payment_method: order.payment_method || OrderPaymentMethod.WECHAT,
        payment_status: order.payment_status,
        payment_at: order.payment_at?.slice(0, 16) || '',
        collector_id: order.collector_id || null,
        discount_amount: order.discount_amount,
        receipt_no: order.receipt_no || '',
        contract_no: order.contract_no || '',
        remark: order.remark || '',
        items: order.items.map(item => ({
          course_name: item.course_name,
          course_hours: item.course_hours,
          unit_price: item.unit_price,
          amount: item.amount,
          remark: item.remark || ''
        }))
      })
      setSelectedLead({
        id: order.lead_id,
        child_name: order.child_name || '',
        parent_phone: order.parent_phone || ''
      })
    } else if (!order && open) {
      const defaultValues = {
        lead_id: leadId || '',
        payment_method: OrderPaymentMethod.WECHAT,
        payment_status: OrderPaymentStatus.PAID,
        payment_at: new Date().toISOString().slice(0, 16),
        collector_id: null,
        discount_amount: 0,
        receipt_no: '',
        contract_no: '',
        remark: '',
        items: [{ course_name: '', course_hours: 0, unit_price: 0, amount: 0, remark: '' }]
      }
      form.reset(defaultValues)

      if (leadId && leadName && leadPhone) {
        setSelectedLead({
          id: leadId,
          child_name: leadName,
          parent_phone: leadPhone
        })
      } else {
        setSelectedLead(null)
      }
      setSearchPhone('')
    }
  }, [order, open, form, leadId, leadName, leadPhone])

  // 创建订单
  const createMutation = useMutation({
    mutationFn: (data: OrderCreate) => orderApi.createOrder(data),
    onSuccess: () => {
      toast.success('订单创建成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order-stats'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '创建失败')
    }
  })

  // 更新订单
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrderUpdate }) =>
      orderApi.updateOrder(id, data),
    onSuccess: () => {
      toast.success('订单更新成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order-stats'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '更新失败')
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

  // 自动计算金额
  const handleItemChange = (index: number, field: 'course_hours' | 'unit_price') => {
    const hours = form.getValues(`items.${index}.course_hours`) || 0
    const price = form.getValues(`items.${index}.unit_price`) || 0
    form.setValue(`items.${index}.amount`, hours * price)
  }

  // 提交表单
  const onSubmit = (values: OrderFormValues) => {
    const data = {
      lead_id: values.lead_id,
      payment_method: values.payment_method || undefined,
      payment_status: values.payment_status,
      payment_at: values.payment_at ? new Date(values.payment_at).toISOString() : undefined,
      collector_id: values.collector_id || undefined,
      discount_amount: values.discount_amount,
      receipt_no: values.receipt_no || undefined,
      contract_no: values.contract_no || undefined,
      remark: values.remark || undefined,
      items: values.items.map((item, idx) => ({
        course_name: item.course_name,
        course_hours: item.course_hours,
        unit_price: item.unit_price,
        amount: item.amount,
        remark: item.remark || undefined,
        sort_order: idx
      }))
    }

    if (isEdit && order) {
      updateMutation.mutate({ id: order.id, data })
    } else {
      createMutation.mutate(data as OrderCreate)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑订单' : '新建订单'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 学员选择 */}
            <FormField
              control={form.control}
              name="lead_id"
              render={() => (
                <FormItem>
                  <FormLabel>选择学员 *</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {selectedLead ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                          <span className="font-medium">{selectedLead.child_name}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{selectedLead.parent_phone}</span>
                          {!leadId && (
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
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="输入手机号搜索学员"
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

            {/* 课程明细 */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">课程明细</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ course_name: '', course_hours: 0, unit_price: 0, amount: 0, remark: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加课程
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-md p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">课程 {index + 1}</span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.course_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">课程名称 *</FormLabel>
                            <FormControl>
                              <Input placeholder="课程名称" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.course_hours`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">课时数</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseInt(e.target.value) || 0)
                                  setTimeout(() => handleItemChange(index, 'course_hours'), 0)
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">单价（元/课时）</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0)
                                  setTimeout(() => handleItemChange(index, 'unit_price'), 0)
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">小计金额</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.remark`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">备注</FormLabel>
                          <FormControl>
                            <Input placeholder="课程备注（可选）" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}

                {/* 金额汇总 */}
                <Separator />
                <div className="flex justify-end gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">订单总额：</span>
                    <span className="font-medium">¥{totalAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">优惠金额：</span>
                    <span className="font-medium text-orange-500">-¥{(watchDiscount || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">实付金额：</span>
                    <span className="font-bold text-green-600">¥{actualAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 支付信息 */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>支付方式</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择支付方式" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {orderPaymentMethodOptions.map((option) => (
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
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>支付状态 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {orderPaymentStatusOptions.map((option) => (
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
                    <FormLabel>支付时间</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 收款人和优惠 */}
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
                name="discount_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>优惠金额</FormLabel>
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
                    <Textarea placeholder="请输入备注信息" rows={2} {...field} />
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
                {isSubmitting ? '提交中...' : isEdit ? '保存' : '创建订单'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
