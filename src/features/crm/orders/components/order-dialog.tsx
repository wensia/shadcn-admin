/**
 * 订单弹窗组件
 * Semi Design 重构版 - Modal + Semi Form
 * 支持新建和编辑订单，包含多个课程明细
 */

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Input,
  Select,
  Table,
  Tag,
  Toast,
  Typography,
  Form,
  Spin,
} from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import {
  IconPlus,
  IconDelete,
  IconEdit,
  IconTick,
  IconSearch,
  IconClose,
} from '@douyinfe/semi-icons'
import {
  User,
  BookOpen,
  CreditCard,
  FileText,
  Receipt,
  Wallet,
  Clock,
  UserCheck,
  Tag as TagIcon,
  CheckCircle2,
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          padding: 6, borderRadius: 6,
          backgroundColor: 'var(--semi-color-primary-light-default)',
        }}>
          <Icon size={16} style={{ color: 'var(--semi-color-primary)' }} />
        </div>
        <Text strong style={{ fontSize: 14 }}>{title}</Text>
      </div>
      {action}
    </div>
  )
}

// 表单区块容器
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 12, border: '1px solid var(--semi-color-border)',
      backgroundColor: 'var(--semi-color-bg-2)', padding: 16,
    }}>
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
  const courseFormRef = useRef<FormApi>()
  const [computedAmount, setComputedAmount] = useState(0)

  useEffect(() => {
    if (open && courseFormRef.current) {
      if (courseItem) {
        courseFormRef.current.setValues({ ...courseItem })
        setComputedAmount(courseItem.amount || 0)
      } else {
        courseFormRef.current.setValues({
          course_name: '',
          course_hours: 0,
          unit_price: 0,
          amount: 0,
          remark: ''
        })
        setComputedAmount(0)
      }
    }
  }, [open, courseItem])

  const handleFieldChange = (values: any) => {
    const hours = Number(values.course_hours) || 0
    const price = Number(values.unit_price) || 0
    const amt = hours * price
    setComputedAmount(amt)
  }

  const handleSave = () => {
    courseFormRef.current?.validate().then((values: any) => {
      const hours = Number(values.course_hours) || 0
      const price = Number(values.unit_price) || 0
      onSave({
        course_name: values.course_name,
        course_hours: hours,
        unit_price: price,
        amount: hours * price,
        remark: values.remark || ''
      })
      onOpenChange(false)
    })
  }

  const activeCourses = coursesData?.filter(c => c.is_active) || []

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={20} style={{ color: 'var(--semi-color-primary)' }} />
          {isEdit ? '编辑课程' : '添加课程'}
        </div>
      }
      visible={open}
      onCancel={() => onOpenChange(false)}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => onOpenChange(false)}>取消</Button>
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
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 4 }}>小计金额</Text>
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
        </div>
        <Form.Input
          field="remark"
          label="备注（可选）"
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
  const formRef = useRef<FormApi>()
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
    queryFn: async () => {
      if (!searchPhone || searchPhone.length < 3) return []
      const response = await leadsApi.searchLeadsByPhone(searchPhone)
      return response.data?.items || []
    },
    enabled: searchPhone.length >= 3
  })

  // 填充编辑数据或预设学员
  useEffect(() => {
    if (order && open) {
      setTimeout(() => {
        formRef.current?.setValues({
          payment_method: order.payment_method || OrderPaymentMethod.WECHAT,
          payment_status: order.payment_status,
          payment_at: order.payment_at?.slice(0, 16) || '',
          collector_id: order.collector_id || '',
          discount_amount: order.discount_amount,
          receipt_no: order.receipt_no || '',
          contract_no: order.contract_no || '',
          remark: order.remark || '',
        })
      }, 0)
      setCourseItems(
        order.items.map(item => ({
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
    } else if (!order && open) {
      setTimeout(() => {
        formRef.current?.setValues({
          payment_method: OrderPaymentMethod.WECHAT,
          payment_status: OrderPaymentStatus.PAID,
          payment_at: new Date().toISOString().slice(0, 16),
          collector_id: '',
          discount_amount: 0,
          receipt_no: '',
          contract_no: '',
          remark: '',
        })
      }, 0)
      setCourseItems([])
      setDiscountAmount(0)
      if (leadId && leadName && leadPhone) {
        setSelectedLead({ id: leadId, child_name: leadName, parent_phone: leadPhone })
      } else {
        setSelectedLead(null)
      }
      setSearchPhone('')
    }
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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

    formRef.current?.validate().then((values: any) => {
      const data = {
        lead_id: selectedLead.id,
        payment_method: values.payment_method || undefined,
        payment_status: values.payment_status,
        payment_at: values.payment_at ? new Date(values.payment_at).toISOString() : undefined,
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
      width: 80,
      align: 'center' as const,
      render: (text: number) => <Text style={{ fontSize: 13 }}>{text || 0}</Text>
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      width: 100,
      align: 'right' as const,
      render: (text: number) => <Text style={{ fontSize: 13 }}>¥{Number(text || 0).toFixed(2)}</Text>
    },
    {
      title: '小计',
      dataIndex: 'amount',
      width: 110,
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
      render: (_: any, __: any, index: number) => (
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
    ...(employeesData?.map((emp) => ({ value: emp.id, label: emp.name })) || [])
  ]

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={20} style={{ color: 'var(--semi-color-primary)' }} />
            {isEdit ? '编辑订单' : '新建订单'}
            {isEdit && order?.order_no && (
              <Tag style={{ marginLeft: 8 }}>{order.order_no}</Tag>
            )}
          </div>
        }
        visible={open}
        onCancel={() => onOpenChange(false)}
        width={1040}
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
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 20 }}>
          {/* 左侧列 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 学员信息 */}
            <SectionCard>
              <SectionHeader icon={User} title="学员信息" />
              {selectedLead ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8,
                  background: 'var(--semi-color-primary-light-default)',
                  border: '1px solid var(--semi-color-primary-light-active)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--semi-color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 500,
                  }}>
                    {selectedLead.child_name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 14 }}>{selectedLead.child_name}</Text>
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
                    suffix={isSearching ? <Spin size="small" /> : undefined}
                  />
                  {searchResults && searchResults.length > 0 && (
                    <div style={{
                      border: '1px solid var(--semi-color-border)',
                      borderRadius: 8, maxHeight: 128, overflow: 'auto',
                    }}>
                      {searchResults.map((lead: any) => (
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
            </SectionCard>

            {/* 课程明细 */}
            <SectionCard>
              <SectionHeader
                icon={BookOpen}
                title="课程明细"
                action={
                  <Button
                    icon={<IconPlus />}
                    size="small"
                    onClick={handleAddCourse}
                  >
                    添加课程
                  </Button>
                }
              />

              {courseItems.length > 0 ? (
                <Table
                  columns={courseColumns}
                  dataSource={courseItems}
                  rowKey={(_, index) => String(index)}
                  pagination={false}
                  size="small"
                />
              ) : (
                <div style={{
                  textAlign: 'center', padding: '32px 0',
                  color: 'var(--semi-color-text-2)',
                  border: '1px dashed var(--semi-color-border)', borderRadius: 8,
                }}>
                  <BookOpen size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <div style={{ fontSize: 14 }}>暂无课程</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>点击上方"添加课程"按钮</div>
                </div>
              )}

              {/* 金额汇总 */}
              <div style={{
                marginTop: 16, padding: 16, borderRadius: 8,
                background: 'var(--semi-color-fill-0)',
                border: '1px solid var(--semi-color-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 24, fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text type="tertiary">订单总额</Text>
                    <Text strong style={{ fontSize: 16 }}>¥{Number(totalAmount || 0).toFixed(2)}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TagIcon size={14} style={{ color: 'var(--semi-color-warning)' }} />
                    <Text type="tertiary">优惠</Text>
                    <Text strong style={{ color: 'var(--semi-color-warning)' }}>
                      -¥{Number(discountAmount || 0).toFixed(2)}
                    </Text>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    paddingLeft: 16, borderLeft: '1px solid var(--semi-color-border)',
                  }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--semi-color-success)' }} />
                    <Text type="tertiary">实付</Text>
                    <Text strong style={{ fontSize: 18, color: 'var(--semi-color-success)' }}>
                      ¥{Number(actualAmount || 0).toFixed(2)}
                    </Text>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* 右侧列 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 支付信息 + 其他信息（共用一个 Form） */}
            <Form
              getFormApi={(api) => { formRef.current = api }}
              labelPosition="top"
              onValueChange={(values) => {
                setDiscountAmount(Number(values.discount_amount) || 0)
              }}
            >
              <SectionCard>
                <SectionHeader icon={CreditCard} title="支付信息" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Select
                    field="payment_method"
                    label={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Wallet size={12} /> 支付方式
                      </span>
                    }
                    optionList={orderPaymentMethodOptions}
                    style={{ width: '100%' }}
                  />
                  <Form.Select
                    field="payment_status"
                    label={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <CheckCircle2 size={12} /> 状态 *
                      </span>
                    }
                    rules={[{ required: true, message: '请选择支付状态' }]}
                    optionList={orderPaymentStatusOptions}
                    style={{ width: '100%' }}
                  />
                </div>

                <Form.Input
                  field="payment_at"
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <Clock size={12} /> 支付时间
                    </span>
                  }
                  type="datetime-local"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Select
                    field="collector_id"
                    label={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <UserCheck size={12} /> 收款人
                      </span>
                    }
                    optionList={collectorOptions}
                    style={{ width: '100%' }}
                  />
                  <Form.InputNumber
                    field="discount_amount"
                    label={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <TagIcon size={12} /> 优惠金额
                      </span>
                    }
                    min={0}
                    precision={2}
                    prefix="¥"
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </div>
              </SectionCard>

              {/* 其他信息 */}
              <div style={{ marginTop: 20 }}>
                <SectionCard>
                  <SectionHeader icon={FileText} title="其他信息" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Form.Input
                      field="receipt_no"
                      label={<span style={{ fontSize: 12 }}>收据编号</span>}
                      placeholder="可选"
                    />
                    <Form.Input
                      field="contract_no"
                      label={<span style={{ fontSize: 12 }}>合同编号</span>}
                      placeholder="可选"
                    />
                  </div>
                  <Form.TextArea
                    field="remark"
                    label={<span style={{ fontSize: 12 }}>订单备注</span>}
                    placeholder="订单备注信息（可选）"
                    rows={3}
                    autosize={false}
                  />
                </SectionCard>
              </div>
            </Form>
          </div>
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
