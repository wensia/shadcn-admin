/**
 * 订单管理类型定义
 * 支持多课程订单
 */

// ==================== 订单相关枚举 ====================

export enum OrderPaymentMethod {
  CASH = 'cash',
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BANK_CARD = 'bank_card',
  TRANSFER = 'transfer',
  OTHER = 'other'
}

export enum OrderPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

// ==================== 标签映射 ====================

export const orderPaymentMethodLabels: Record<OrderPaymentMethod, string> = {
  [OrderPaymentMethod.CASH]: '现金',
  [OrderPaymentMethod.WECHAT]: '微信',
  [OrderPaymentMethod.ALIPAY]: '支付宝',
  [OrderPaymentMethod.BANK_CARD]: '银行卡',
  [OrderPaymentMethod.TRANSFER]: '银行转账',
  [OrderPaymentMethod.OTHER]: '其他'
}

export const orderPaymentStatusLabels: Record<OrderPaymentStatus, string> = {
  [OrderPaymentStatus.PENDING]: '待支付',
  [OrderPaymentStatus.PAID]: '已支付',
  [OrderPaymentStatus.PARTIAL]: '部分支付',
  [OrderPaymentStatus.REFUNDED]: '已退款',
  [OrderPaymentStatus.CANCELLED]: '已取消'
}

// ==================== 选项列表 ====================

export const orderPaymentMethodOptions = Object.entries(orderPaymentMethodLabels).map(([value, label]) => ({
  value,
  label
}))

export const orderPaymentStatusOptions = Object.entries(orderPaymentStatusLabels).map(([value, label]) => ({
  value,
  label
}))

// ==================== 订单明细接口 ====================

export interface OrderItem {
  id: string
  order_id: string
  course_id?: string
  course_name: string
  course_hours: number
  unit_price: number
  amount: number
  remark?: string
  sort_order: number
  created_at: string
}

export interface OrderItemCreate {
  course_id?: string
  course_name: string
  course_hours: number
  unit_price: number
  amount: number
  remark?: string
  sort_order?: number
}

// ==================== 订单接口 ====================

export interface Order {
  id: string
  order_no: string
  lead_id: string
  // 学员信息
  child_name?: string
  parent_phone?: string
  parent_name?: string
  // 金额信息
  total_amount: number
  discount_amount: number
  actual_amount: number
  // 支付信息
  payment_method?: string
  payment_method_display: string
  payment_status: string
  payment_status_display: string
  payment_at?: string
  // 收款人信息
  collector_id?: string
  collector_name?: string
  // 校区信息
  campus_id?: string
  campus_name?: string
  // 其他
  remark?: string
  contract_no?: string
  receipt_no?: string
  // 订单明细
  items: OrderItem[]
  // 审计信息
  created_at: string
  updated_at: string
  created_by_id: string
  created_by_name?: string
}

export interface OrderListItem {
  id: string
  order_no: string
  lead_id: string
  child_name?: string
  parent_phone?: string
  total_amount: number
  discount_amount: number
  actual_amount: number
  payment_method?: string
  payment_method_display: string
  payment_status: string
  payment_status_display: string
  payment_at?: string
  collector_name?: string
  campus_name?: string
  items_count: number
  created_at: string
  created_by_name?: string
}

export interface OrderCreate {
  lead_id: string
  payment_method?: string
  payment_status?: string
  payment_at?: string
  collector_id?: string
  campus_id?: string
  discount_amount?: number
  remark?: string
  contract_no?: string
  receipt_no?: string
  items: OrderItemCreate[]
}

export interface OrderUpdate {
  payment_method?: string
  payment_status?: string
  payment_at?: string
  collector_id?: string
  campus_id?: string
  discount_amount?: number
  remark?: string
  contract_no?: string
  receipt_no?: string
  items?: OrderItemCreate[]
}

export interface OrderStats {
  total_count: number
  total_amount: number
  paid_count: number
  paid_amount: number
  today_count: number
  today_amount: number
  month_count: number
  month_amount: number
}

export interface OrderListParams {
  page?: number
  size?: number
  lead_id?: string
  collector_id?: string
  campus_id?: string
  payment_method?: string
  payment_status?: string
  date_from?: string
  date_to?: string
  keyword?: string
}
