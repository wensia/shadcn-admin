/**
 * 订单弹窗组件
 * 支持新建和编辑订单，包含多个课程明细
 * 重构版本 - 数据表展示 + 弹框编辑
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
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  User,
  Search,
  X,
  Plus,
  Trash2,
  BookOpen,
  CreditCard,
  FileText,
  Receipt,
  Wallet,
  Clock,
  UserCheck,
  Tag,
  CheckCircle2,
  Loader2,
  Pencil
} from 'lucide-react'
import { orderApi } from '../api'
import { leadsApi } from '../../leads/api'
import { employeeApi } from '../../lead-conversion/api'
import { coursesApi } from '@/features/admin/api'
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

// 课程项类型
type CourseItem = {
  course_name: string
  course_hours: number
  unit_price: number
  amount: number
  remark?: string
}

interface OrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: Order | null
  leadId?: string
  leadName?: string
  leadPhone?: string
  onSuccess?: () => void
}

// 区块标题组件
function SectionHeader({
  icon: Icon,
  title,
  action
}: {
  icon: React.ElementType
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {action}
    </div>
  )
}

// 表单区块容器
function SectionCard({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 shadow-sm",
      className
    )}>
      {children}
    </div>
  )
}

// ==================== 课程编辑弹框组件 ====================
interface CourseEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseItem: CourseItem | null
  onSave: (item: CourseItem) => void
  coursesData: Array<{ id: string; name: string; is_active: boolean }> | undefined
  isEdit: boolean
}

function CourseEditDialog({
  open,
  onOpenChange,
  courseItem,
  onSave,
  coursesData,
  isEdit
}: CourseEditDialogProps) {
  const [formData, setFormData] = useState<CourseItem>({
    course_name: '',
    course_hours: 0,
    unit_price: 0,
    amount: 0,
    remark: ''
  })
  const [errors, setErrors] = useState<{ course_name?: string }>({})

  // 当弹框打开时，填充数据
  useEffect(() => {
    if (open) {
      if (courseItem) {
        setFormData({ ...courseItem })
      } else {
        setFormData({
          course_name: '',
          course_hours: 0,
          unit_price: 0,
          amount: 0,
          remark: ''
        })
      }
      setErrors({})
    }
  }, [open, courseItem])

  // 自动计算金额
  const handleFieldChange = (field: keyof CourseItem, value: any) => {
    const newData = { ...formData, [field]: value }

    // 自动计算小计
    if (field === 'course_hours' || field === 'unit_price') {
      newData.amount = (newData.course_hours || 0) * (newData.unit_price || 0)
    }

    setFormData(newData)

    // 清除错误
    if (field === 'course_name' && value) {
      setErrors({})
    }
  }

  // 保存
  const handleSave = () => {
    // 验证
    if (!formData.course_name) {
      setErrors({ course_name: '请选择课程' })
      return
    }

    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {isEdit ? '编辑课程' : '添加课程'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 课程选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">课程名称 *</label>
            <Select
              value={formData.course_name}
              onValueChange={(value) => handleFieldChange('course_name', value)}
            >
              <SelectTrigger className={cn(errors.course_name && "border-red-500")}>
                <SelectValue placeholder="请选择课程" />
              </SelectTrigger>
              <SelectContent>
                {coursesData?.filter(c => c.is_active).map((course) => (
                  <SelectItem key={course.id} value={course.name}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.course_name && (
              <p className="text-xs text-red-500">{errors.course_name}</p>
            )}
          </div>

          {/* 课时和单价 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">课时数</label>
              <Input
                type="number"
                min="0"
                value={formData.course_hours}
                onChange={(e) => handleFieldChange('course_hours', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">单价（元/课时）</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) => handleFieldChange('unit_price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* 小计金额 - 只读显示 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">小计金额</label>
            <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
              <span className="font-semibold text-emerald-600">¥{Number(formData.amount || 0).toFixed(2)}</span>
              <span className="ml-2 text-xs text-muted-foreground">（自动计算）</span>
            </div>
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">备注（可选）</label>
            <Input
              value={formData.remark || ''}
              onChange={(e) => handleFieldChange('remark', e.target.value)}
              placeholder="课程备注信息"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== 主组件 ====================
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

  // 课程编辑弹框状态
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null)

  // 获取收款人列表
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-order'],
    queryFn: async () => {
      const response = await employeeApi.getEmployees({ is_active: true, size: 100 })
      return response.data?.items || []
    },
    staleTime: 5 * 60 * 1000
  })

  // 获取课程列表
  const { data: coursesData } = useQuery({
    queryKey: ['courses-for-order'],
    queryFn: () => coursesApi.getCourses(),
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
      items: []
    }
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  // 计算总金额
  const watchItems = form.watch('items')
  const watchDiscount = form.watch('discount_amount')
  const totalAmount = watchItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const actualAmount = totalAmount - Number(watchDiscount || 0)

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
        items: []
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

  // 打开添加课程弹框
  const handleAddCourse = () => {
    setEditingCourseIndex(null)
    setCourseDialogOpen(true)
  }

  // 打开编辑课程弹框
  const handleEditCourse = (index: number) => {
    setEditingCourseIndex(index)
    setCourseDialogOpen(true)
  }

  // 保存课程
  const handleSaveCourse = (item: CourseItem) => {
    if (editingCourseIndex !== null) {
      // 编辑模式
      update(editingCourseIndex, item)
    } else {
      // 添加模式
      append(item)
    }
  }

  // 删除课程
  const handleDeleteCourse = (index: number) => {
    remove(index)
  }

  // 获取当前编辑的课程
  const editingCourse = editingCourseIndex !== null ? watchItems[editingCourseIndex] : null

  // 提交表单
  const onSubmit = (values: OrderFormValues) => {
    if (values.items.length === 0) {
      toast.error('请至少添加一个课程')
      return
    }

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* 标题栏 - 渐变背景 */}
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-primary" />
              {isEdit ? '编辑订单' : '新建订单'}
              {isEdit && order?.order_no && (
                <Badge variant="secondary" className="ml-2 font-mono text-xs">
                  {order.order_no}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              {/* 内容区域 */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-12 gap-5">
                  {/* ========== 左侧列 (7/12) ========== */}
                  <div className="col-span-7 space-y-5">
                    {/* 学员信息 */}
                    <SectionCard>
                      <SectionHeader icon={User} title="学员信息" />
                      <FormField
                        control={form.control}
                        name="lead_id"
                        render={() => (
                          <FormItem>
                            <FormControl>
                              {selectedLead ? (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium shadow-sm">
                                    {selectedLead.child_name?.charAt(0) || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{selectedLead.child_name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{selectedLead.parent_phone}</div>
                                  </div>
                                  {!leadId && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                      onClick={handleClearLead}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="输入手机号搜索学员..."
                                      value={searchPhone}
                                      onChange={(e) => setSearchPhone(e.target.value)}
                                      className="pl-9 h-10"
                                    />
                                    {isSearching && (
                                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                  </div>
                                  {searchResults && searchResults.length > 0 && (
                                    <div className="border rounded-lg divide-y max-h-32 overflow-y-auto shadow-sm">
                                      {searchResults.map((lead: any) => (
                                        <div
                                          key={lead.id}
                                          className="p-2.5 hover:bg-muted/50 cursor-pointer text-sm flex items-center gap-2 transition-colors"
                                          onClick={() => handleSelectLead({
                                            id: lead.id,
                                            child_name: lead.child_name,
                                            parent_phone: lead.parent_phone
                                          })}
                                        >
                                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                            {lead.child_name?.charAt(0)}
                                          </div>
                                          <span className="font-medium">{lead.child_name}</span>
                                          <span className="text-muted-foreground font-mono text-xs">{lead.parent_phone}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </SectionCard>

                    {/* 课程明细 - 数据表展示 */}
                    <SectionCard>
                      <SectionHeader
                        icon={BookOpen}
                        title="课程明细"
                        action={
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={handleAddCourse}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            添加课程
                          </Button>
                        }
                      />

                      {/* 课程数据表 */}
                      {fields.length > 0 ? (
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs font-semibold">课程名称</TableHead>
                                <TableHead className="text-xs font-semibold text-center w-20">课时</TableHead>
                                <TableHead className="text-xs font-semibold text-right w-24">单价</TableHead>
                                <TableHead className="text-xs font-semibold text-right w-28">小计</TableHead>
                                <TableHead className="text-xs font-semibold text-center w-20">操作</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fields.map((field, index) => (
                                <TableRow key={field.id} className="group">
                                  <TableCell className="font-medium text-sm">
                                    {watchItems[index]?.course_name || '-'}
                                    {watchItems[index]?.remark && (
                                      <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                                        {watchItems[index].remark}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center text-sm">
                                    {watchItems[index]?.course_hours || 0}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    ¥{Number(watchItems[index]?.unit_price || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-sm text-emerald-600">
                                    ¥{Number(watchItems[index]?.amount || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-blue-100 hover:text-blue-600"
                                        onClick={() => handleEditCourse(index)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-red-100 hover:text-red-600"
                                        onClick={() => handleDeleteCourse(index)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">暂无课程</p>
                          <p className="text-xs mt-1">点击上方"添加课程"按钮</p>
                        </div>
                      )}

                      {/* 金额汇总 - 突出显示 */}
                      <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border">
                        <div className="flex items-center justify-end gap-6 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">订单总额</span>
                            <span className="font-semibold text-base">¥{Number(totalAmount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-muted-foreground">优惠</span>
                            <span className="font-semibold text-orange-500">-¥{Number(watchDiscount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-4 border-l">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-muted-foreground">实付</span>
                            <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">¥{Number(actualAmount || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </SectionCard>
                  </div>

                  {/* ========== 右侧列 (5/12) ========== */}
                  <div className="col-span-5 space-y-5">
                    {/* 支付信息 */}
                    <SectionCard>
                      <SectionHeader icon={CreditCard} title="支付信息" />

                      <div className="space-y-4">
                        {/* 支付方式 & 状态 */}
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="payment_method"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs flex items-center gap-1">
                                  <Wallet className="h-3 w-3" />
                                  支付方式
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="选择" />
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
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="payment_status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  状态 *
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="选择" />
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
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* 支付时间 */}
                        <FormField
                          control={form.control}
                          name="payment_at"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                支付时间
                              </FormLabel>
                              <FormControl>
                                <Input type="datetime-local" className="h-9" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* 收款人 & 优惠 */}
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="collector_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  收款人
                                </FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                  value={field.value || 'none'}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="选择" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">不指定</SelectItem>
                                    {employeesData?.map((emp) => (
                                      <SelectItem key={emp.id} value={emp.id}>
                                        {emp.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="discount_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs flex items-center gap-1">
                                  <Tag className="h-3 w-3" />
                                  优惠金额
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0.00"
                                      className="pl-7 h-9"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </SectionCard>

                    {/* 其他信息 */}
                    <SectionCard>
                      <SectionHeader icon={FileText} title="其他信息" />

                      <div className="space-y-4">
                        {/* 收据 & 合同编号 */}
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="receipt_no"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">收据编号</FormLabel>
                                <FormControl>
                                  <Input placeholder="可选" className="h-9" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="contract_no"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">合同编号</FormLabel>
                                <FormControl>
                                  <Input placeholder="可选" className="h-9" {...field} />
                                </FormControl>
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
                              <FormLabel className="text-xs">订单备注</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="订单备注信息（可选）"
                                  rows={3}
                                  className="resize-none text-sm"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </SectionCard>
                  </div>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="min-w-[80px]"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[100px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {isEdit ? '保存修改' : '创建订单'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 课程编辑弹框 */}
      <CourseEditDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        courseItem={editingCourse}
        onSave={handleSaveCourse}
        coursesData={coursesData}
        isEdit={editingCourseIndex !== null}
      />
    </>
  )
}
