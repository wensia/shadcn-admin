/**
 * 订单弹窗组件
 * Semi Design 重构版 - Modal + Semi Form + Form.Section
 * 支持新建和编辑订单，包含多个课程明细
 */

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Input,
  Table,
  Tag,
  Toast,
  Typography,
  Form,
} from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import {
  IconPlus,
  IconDelete,
  IconEdit,
  IconTick,
  IconSearch,
  IconClose,
  IconLoading,
} from '@douyinfe/semi-icons'
import { BookOpen } from 'lucide-react'
import { orderApi } from '../api'
import { leadsApi } from '../../leads/api'
import { employeeApi, type Employee } from '../../lead-conversion/api'
import { coursesApi } from '@/features/admin/api'
import {
  orderPaymentMethodOptions,
  orderPaymentStatusOptions,
  OrderPaymentMethod,
  OrderPaymentStatus,
  type Order,
  type OrderCreate,
  type OrderUpdate
} from '../types'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

// 课程项类型
type CourseItem = {
  course_name: string
  course_hours: number
  unit_price: number
  amount: number
  remark?: string
}

type CourseFormValues = {
  course_name?: string
  course_hours?: number | string
  unit_price?: number | string
  remark?: string
}

type OrderFormValues = {
  payment_method?: string
  payment_status?: string
  payment_at?: Date | string
  collector_id?: string
  discount_amount?: number | string
  receipt_no?: string
  contract_no?: string
  remark?: string
}

type SearchLeadOption = {
  id: string
  child_name: string
  parent_phone: string
}

const EMPTY_COURSE_FORM_VALUES: CourseFormValues = {
  course_name: '',
  course_hours: 0,
  unit_price: 0,
  remark: ''
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
  const courseFormRef = useRef<FormApi>(null)
  const [computedAmount, setComputedAmount] = useState(0)

  const closeCourseDialog = () => {
    setComputedAmount(0)
    onOpenChange(false)
  }

  useEffect(() => {
    if (!open) return
    const frameId = requestAnimationFrame(() => {
      if (!courseFormRef.current) return
      const initialValues = courseItem ?? EMPTY_COURSE_FORM_VALUES
      courseFormRef.current.setValues(initialValues)
      setComputedAmount(courseItem?.amount || 0)
    })
    return () => cancelAnimationFrame(frameId)
  }, [open, courseItem])

  const handleFieldChange = (values: CourseFormValues) => {
    const hours = Number(values.course_hours) || 0
    const price = Number(values.unit_price) || 0
    setComputedAmount(hours * price)
  }

  const handleSave = () => {
    courseFormRef.current?.validate().then((rawValues) => {
      const values = rawValues as CourseFormValues
      const hours = Number(values.course_hours) || 0
      const price = Number(values.unit_price) || 0
      onSave({
        course_name: values.course_name || '',
        course_hours: hours,
        unit_price: price,
        amount: hours * price,
        remark: values.remark || ''
      })
      closeCourseDialog()
    })
  }

  const activeCourses = coursesData?.filter(c => c.is_active) || []

  return (
    <Modal
      title={isEdit ? '编辑课程' : '添加课程'}
      visible={open}
      onCancel={closeCourseDialog}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={closeCourseDialog}>取消</Button>
          <Button theme="solid" icon={<IconTick />} onClick={handleSave}>确定</Button>
        </div>
      }
      width={480}
    >
      <Form
        getFormApi={(api) => { courseFormRef.current = api }}
        onValueChange={handleFieldChange}
        labelPosition="top"
      >
        <Form.Select
          field="course_name"
          label="课程名称"
          rules={[{ required: true, message: '请选择课程' }]}
          placeholder="请选择课程"
          style={{ width: '100%' }}
          optionList={activeCourses.map(c => ({ value: c.name, label: c.name }))}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.InputNumber
            field="course_hours"
            label="课时数"
            min={0}
            placeholder="0"
            style={{ width: '100%' }}
          />
          <Form.InputNumber
            field="unit_price"
            label="单价（元/课时）"
            min={0}
            precision={2}
            placeholder="0.00"
            style={{ width: '100%' }}
          />
        </div>
        <Form.Slot label="小计金额">
          <div style={{
            height: 36, padding: '0 12px', borderRadius: 6,
            border: '1px solid var(--semi-color-border)',
            backgroundColor: 'var(--semi-color-fill-0)',
            display: 'flex', alignItems: 'center',
          }}>
            <Text strong style={{ color: 'var(--semi-color-success)' }}>
              ¥{Number(computedAmount || 0).toFixed(2)}
            </Text>
            <Text type="tertiary" style={{ marginLeft: 8, fontSize: 12 }}>（自动计算）</Text>
          </div>
        </Form.Slot>
        <Form.Input
          field="remark"
          label={{ text: '备注', optional: true }}
          placeholder="课程备注信息"
        />
      </Form>
    </Modal>
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
  const formRef = useRef<FormApi>(null)
  const isEdit = !!order?.id
  const [searchPhone, setSearchPhone] = useState('')
  const [selectedLead, setSelectedLead] = useState<{
    id: string
    child_name: string
    parent_phone: string
  } | null>(null)

  // 课程列表状态
  const [courseItems, setCourseItems] = useState<CourseItem[]>([])
  const [courseDialogOpen, setCourseDialogOpen] = useState(false)
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null)

  // 金额计算
  const [discountAmount, setDiscountAmount] = useState(0)
  const totalAmount = courseItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const actualAmount = totalAmount - Number(discountAmount || 0)

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
    queryFn: async (): Promise<SearchLeadOption[]> => {
      if (!searchPhone || searchPhone.length < 3) return []
      const response = await leadsApi.searchLeadsByPhone(searchPhone)
      return response.data?.items || []
    },
    enabled: searchPhone.length >= 3
  })

  // 填充编辑数据或预设学员
  useEffect(() => {
    if (!open) return
    const frameId = requestAnimationFrame(() => {
      if (order) {
        formRef.current?.setValues({
          payment_method: order.payment_method || OrderPaymentMethod.WECHAT,
          payment_status: order.payment_status,
          payment_at: order.payment_at ? new Date(order.payment_at) : undefined,
          collector_id: order.collector_id || '',
          discount_amount: order.discount_amount,
          receipt_no: order.receipt_no || '',
          contract_no: order.contract_no || '',
          remark: order.remark || '',
        })
        setCourseItems(
          order.items.map((item) => ({
            course_name: item.course_name,
            course_hours: item.course_hours,
            unit_price: item.unit_price,
            amount: item.amount,
            remark: item.remark || ''
          }))
        )
        setSelectedLead({
          id: order.lead_id,
          child_name: order.child_name || '',
          parent_phone: order.parent_phone || ''
        })
        setDiscountAmount(order.discount_amount)
        return
      }

      formRef.current?.setValues({
        payment_method: OrderPaymentMethod.WECHAT,
        payment_status: OrderPaymentStatus.PAID,
        payment_at: new Date(),
        collector_id: '',
        discount_amount: 0,
        receipt_no: '',
        contract_no: '',
        remark: '',
      })
      setCourseItems([])
      setDiscountAmount(0)
      if (leadId && leadName && leadPhone) {
        setSelectedLead({ id: leadId, child_name: leadName, parent_phone: leadPhone })
      } else {
        setSelectedLead(null)
      }
      setSearchPhone('')
    })
    return () => cancelAnimationFrame(frameId)
  }, [order, open, leadId, leadName, leadPhone])

  // 创建订单
  const createMutation = useMutation({
    mutationFn: (data: OrderCreate) => orderApi.createOrder(data),
    onSuccess: () => {
      Toast.success('订单创建成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order-stats'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: unknown) => {
      showApiErrorToast(error, '创建失败')
    }
  })

  // 更新订单
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrderUpdate }) =>
      orderApi.updateOrder(id, data),
    onSuccess: () => {
      Toast.success('订单更新成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order-stats'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: unknown) => {
      showApiErrorToast(error, '更新失败')
    }
  })

  // 选择线索
  const handleSelectLead = (lead: { id: string; child_name: string; parent_phone: string }) => {
    setSelectedLead(lead)
    setSearchPhone('')
  }

  // 清除选择的线索
  const handleClearLead = () => {
    setSelectedLead(null)
  }

  // 课程操作
  const handleAddCourse = () => {
    setEditingCourseIndex(null)
    setCourseDialogOpen(true)
  }

  const handleEditCourse = (index: number) => {
    setEditingCourseIndex(index)
    setCourseDialogOpen(true)
  }

  const handleSaveCourse = (item: CourseItem) => {
    if (editingCourseIndex !== null) {
      const newItems = [...courseItems]
      newItems[editingCourseIndex] = item
      setCourseItems(newItems)
    } else {
      setCourseItems([...courseItems, item])
    }
  }

  const handleDeleteCourse = (index: number) => {
    setCourseItems(courseItems.filter((_, i) => i !== index))
  }

  const editingCourse = editingCourseIndex !== null ? courseItems[editingCourseIndex] : null

  // 提交表单
  const handleSubmit = () => {
    if (!selectedLead) {
      Toast.error('请选择学员')
      return
    }
    if (courseItems.length === 0) {
      Toast.error('请至少添加一个课程')
      return
    }

    formRef.current?.validate().then((rawValues) => {
      const values = rawValues as OrderFormValues
      const paymentAt = values.payment_at instanceof Date
        ? values.payment_at.toISOString()
        : values.payment_at
          ? new Date(values.payment_at).toISOString()
          : undefined

      const data = {
        lead_id: selectedLead.id,
        payment_method: values.payment_method || undefined,
        payment_status: values.payment_status,
        payment_at: paymentAt,
        collector_id: values.collector_id || undefined,
        discount_amount: Number(values.discount_amount) || 0,
        receipt_no: values.receipt_no || undefined,
        contract_no: values.contract_no || undefined,
        remark: values.remark || undefined,
        items: courseItems.map((item, idx) => ({
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
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // 课程明细表格列
  const courseColumns = [
    {
      title: '课程名称',
      dataIndex: 'course_name',
      render: (text: string, record: CourseItem) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{text || '-'}</Text>
          {record.remark && (
            <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 2 }}>
              {record.remark}
            </div>
          )}
        </div>
      )
    },
    {
      title: '课时',
      dataIndex: 'course_hours',
      width: 70,
      align: 'center' as const,
      render: (text: number) => <Text style={{ fontSize: 13 }}>{text || 0}</Text>
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      width: 90,
      align: 'right' as const,
      render: (text: number) => <Text style={{ fontSize: 13 }}>¥{Number(text || 0).toFixed(2)}</Text>
    },
    {
      title: '小计',
      dataIndex: 'amount',
      width: 100,
      align: 'right' as const,
      render: (text: number) => (
        <Text strong style={{ fontSize: 13, color: 'var(--semi-color-success)' }}>
          ¥{Number(text || 0).toFixed(2)}
        </Text>
      )
    },
    {
      title: '操作',
      width: 80,
      align: 'center' as const,
      render: (_value: unknown, _record: CourseItem, index: number) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Button
            type="tertiary"
            theme="borderless"
            icon={<IconEdit />}
            size="small"
            onClick={() => handleEditCourse(index)}
          />
          <Button
            type="danger"
            theme="borderless"
            icon={<IconDelete />}
            size="small"
            onClick={() => handleDeleteCourse(index)}
          />
        </div>
      )
    }
  ]

  // 收款人选项
  const collectorOptions = [
    { value: '', label: '不指定' },
    ...(employeesData?.map((emp: Employee) => ({ value: emp.id, label: emp.name })) || [])
  ]

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEdit ? '编辑订单' : '新建订单'}
            {isEdit && order?.order_no && (
              <Tag size="small" style={{ marginLeft: 4 }}>{order.order_no}</Tag>
            )}
          </div>
        }
        visible={open}
        onCancel={() => onOpenChange(false)}
        width={1060}
        style={{ maxHeight: '92vh' }}
        bodyStyle={{ overflow: 'auto', maxHeight: 'calc(92vh - 120px)', padding: '16px 24px' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              theme="solid"
              icon={isSubmitting ? undefined : <IconTick />}
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              {isEdit ? '保存修改' : '创建订单'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* ===== 左侧：学员 + 课程明细 ===== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Section text="学员信息">
              {selectedLead ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8,
                  background: 'var(--semi-color-primary-light-default)',
                  border: '1px solid var(--semi-color-primary-light-active)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--semi-color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 500, fontSize: 14,
                  }}>
                    {selectedLead.child_name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong>{selectedLead.child_name}</Text>
                    <div>
                      <Text type="tertiary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {selectedLead.parent_phone}
                      </Text>
                    </div>
                  </div>
                  {!leadId && (
                    <Button
                      type="danger"
                      theme="borderless"
                      icon={<IconClose />}
                      size="small"
                      onClick={handleClearLead}
                    />
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Input
                    prefix={<IconSearch />}
                    placeholder="输入手机号搜索学员..."
                    value={searchPhone}
                    onChange={(val) => setSearchPhone(val)}
                    suffix={isSearching ? <IconLoading spin /> : undefined}
                  />
                  {searchResults && searchResults.length > 0 && (
                    <div style={{
                      border: '1px solid var(--semi-color-border)',
                      borderRadius: 8, maxHeight: 128, overflow: 'auto',
                    }}>
                      {searchResults.map((lead: SearchLeadOption) => (
                        <div
                          key={lead.id}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 8,
                            borderBottom: '1px solid var(--semi-color-border)',
                          }}
                          onClick={() => handleSelectLead({
                            id: lead.id,
                            child_name: lead.child_name,
                            parent_phone: lead.parent_phone
                          })}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--semi-color-fill-0)'
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = ''
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            backgroundColor: 'var(--semi-color-fill-1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 500,
                          }}>
                            {lead.child_name?.charAt(0)}
                          </div>
                          <Text strong>{lead.child_name}</Text>
                          <Text type="tertiary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {lead.parent_phone}
                          </Text>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Form.Section>

            <Form.Section
              text={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span>课程明细</span>
                  <Button icon={<IconPlus />} size="small" onClick={handleAddCourse}>
                    添加课程
                  </Button>
                </div>
              }
            >
              {courseItems.length > 0 ? (
                <Table
                  columns={courseColumns}
                  dataSource={courseItems}
                  rowKey={(record?: CourseItem) => String(courseItems.indexOf(record!))}
                  pagination={false}
                  size="small"
                />
              ) : (
                <div style={{
                  textAlign: 'center', padding: '24px 0',
                  color: 'var(--semi-color-text-2)',
                  border: '1px dashed var(--semi-color-border)', borderRadius: 8,
                }}>
                  <BookOpen size={28} style={{ opacity: 0.4, marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                  <div style={{ fontSize: 13 }}>暂无课程，点击上方"添加课程"</div>
                </div>
              )}

              {/* 金额汇总 */}
              <div style={{
                marginTop: 12, padding: '10px 16px', borderRadius: 8,
                background: 'var(--semi-color-fill-0)',
                border: '1px solid var(--semi-color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20, fontSize: 13,
              }}>
                <div>
                  <Text type="tertiary">总额 </Text>
                  <Text strong>¥{Number(totalAmount || 0).toFixed(2)}</Text>
                </div>
                <div>
                  <Text type="tertiary">优惠 </Text>
                  <Text strong style={{ color: 'var(--semi-color-warning)' }}>
                    -¥{Number(discountAmount || 0).toFixed(2)}
                  </Text>
                </div>
                <div style={{ paddingLeft: 12, borderLeft: '1px solid var(--semi-color-border)' }}>
                  <Text type="tertiary">实付 </Text>
                  <Text strong style={{ fontSize: 16, color: 'var(--semi-color-success)' }}>
                    ¥{Number(actualAmount || 0).toFixed(2)}
                  </Text>
                </div>
              </div>
            </Form.Section>
          </div>

          {/* ===== 右侧：支付信息 + 其他信息（2列网格） ===== */}
          <Form
            getFormApi={(api) => { formRef.current = api }}
            labelPosition="top"
            onValueChange={(values) => {
              setDiscountAmount(Number(values.discount_amount) || 0)
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <Form.Section text="支付信息">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <Form.Select
                  field="payment_method"
                  label="支付方式"
                  optionList={orderPaymentMethodOptions}
                  style={{ width: '100%' }}
                />
                <Form.Select
                  field="payment_status"
                  label={{ text: '支付状态', required: true }}
                  rules={[{ required: true, message: '请选择支付状态' }]}
                  optionList={orderPaymentStatusOptions}
                  style={{ width: '100%' }}
                />
                <Form.DatePicker
                  field="payment_at"
                  label="支付时间"
                  type="dateTime"
                  style={{ width: '100%' }}
                  format="yyyy-MM-dd HH:mm"
                />
                <Form.Select
                  field="collector_id"
                  label="收款人"
                  optionList={collectorOptions}
                  style={{ width: '100%' }}
                />
                <div style={{ gridColumn: '1 / -1' }}>
                  <Form.InputNumber
                    field="discount_amount"
                    label="优惠金额"
                    min={0}
                    precision={2}
                    prefix="¥"
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </Form.Section>

            <Form.Section text="其他信息">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <Form.Input
                  field="receipt_no"
                  label={{ text: '收据编号', optional: true }}
                  placeholder="收据编号"
                />
                <Form.Input
                  field="contract_no"
                  label={{ text: '合同编号', optional: true }}
                  placeholder="合同编号"
                />
                <div style={{ gridColumn: '1 / -1' }}>
                  <Form.TextArea
                    field="remark"
                    label={{ text: '订单备注', optional: true }}
                    placeholder="订单备注信息"
                    rows={3}
                    autosize={false}
                  />
                </div>
              </div>
            </Form.Section>
          </Form>
        </div>
      </Modal>

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
