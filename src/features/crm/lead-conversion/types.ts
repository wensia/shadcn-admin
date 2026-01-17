/**
 * 转化管理类型定义
 * 包含缴费记录和到访记录相关类型
 */

// ==================== 缴费相关枚举 ====================

export enum PaymentMethod {
  CASH = 'cash',
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BANK_CARD = 'bank_card',
  TRANSFER = 'transfer',
  OTHER = 'other'
}

export enum PaymentType {
  DEPOSIT = 'deposit',
  FIRST_PAY = 'first_pay',
  FULL_PAY = 'full_pay',
  RENEWAL = 'renewal',
  OTHER = 'other'
}

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

// ==================== 到访相关枚举 ====================

export enum VisitStatus {
  SCHEDULED = 'scheduled',  // 诺到（已预约）
  VISITED = 'visited',      // 已到访
  NOSHOW = 'noshow',        // 未到访
  CANCELLED = 'cancelled'   // 已取消
}

// ==================== 标签映射 ====================

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: '现金',
  [PaymentMethod.WECHAT]: '微信',
  [PaymentMethod.ALIPAY]: '支付宝',
  [PaymentMethod.BANK_CARD]: '银行卡',
  [PaymentMethod.TRANSFER]: '银行转账',
  [PaymentMethod.OTHER]: '其他'
}

export const paymentTypeLabels: Record<PaymentType, string> = {
  [PaymentType.DEPOSIT]: '定金',
  [PaymentType.FIRST_PAY]: '首付',
  [PaymentType.FULL_PAY]: '全款',
  [PaymentType.RENEWAL]: '续费',
  [PaymentType.OTHER]: '其他'
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: '待确认',
  [PaymentStatus.CONFIRMED]: '已确认',
  [PaymentStatus.REFUNDED]: '已退款',
  [PaymentStatus.CANCELLED]: '已取消'
}

export const visitStatusLabels: Record<VisitStatus, string> = {
  [VisitStatus.SCHEDULED]: '诺到',
  [VisitStatus.VISITED]: '已到访',
  [VisitStatus.NOSHOW]: '未到访',
  [VisitStatus.CANCELLED]: '已取消'
}

// ==================== 选项列表 ====================

export const paymentMethodOptions = Object.entries(paymentMethodLabels).map(([value, label]) => ({
  value,
  label
}))

export const paymentTypeOptions = Object.entries(paymentTypeLabels).map(([value, label]) => ({
  value,
  label
}))

export const paymentStatusOptions = Object.entries(paymentStatusLabels).map(([value, label]) => ({
  value,
  label
}))

export const visitStatusOptions = Object.entries(visitStatusLabels).map(([value, label]) => ({
  value,
  label
}))

// ==================== 缴费记录接口 ====================

export interface Payment {
  id: string
  lead_id: string
  // 线索信息
  child_name?: string
  parent_phone?: string
  parent_name?: string
  // 缴费信息
  amount: number
  payment_method: PaymentMethod
  payment_method_display: string
  payment_type: PaymentType
  payment_type_display: string
  payment_at: string
  status: PaymentStatus
  status_display: string
  // 收款人信息
  collector_id?: string
  collector_name?: string
  // 校区信息
  campus_id?: string
  campus_name?: string
  // 课程信息
  course_name?: string
  course_hours?: number
  // 其他
  receipt_no?: string
  contract_no?: string
  remark?: string
  // 审计信息
  created_at: string
  updated_at: string
  created_by_id?: string
  created_by_name?: string
}

export interface PaymentCreate {
  lead_id: string
  amount: number
  payment_method: string
  payment_type?: string
  payment_at?: string
  status?: string
  collector_id?: string | null
  campus_id?: string | null
  course_name?: string
  course_hours?: number | null
  receipt_no?: string
  contract_no?: string
  remark?: string
}

export interface PaymentUpdate {
  amount?: number
  payment_method?: string
  payment_type?: string
  payment_at?: string
  status?: string
  collector_id?: string | null
  campus_id?: string | null
  course_name?: string
  course_hours?: number | null
  receipt_no?: string
  contract_no?: string
  remark?: string
}

export interface PaymentStats {
  total_count: number
  total_amount: number
  today_count: number
  today_amount: number
  month_count: number
  month_amount: number
}

export interface PaymentListParams {
  page?: number
  size?: number
  lead_id?: string
  collector_id?: string
  campus_id?: string
  payment_method?: string
  payment_type?: string
  status?: string
  date_from?: string
  date_to?: string
  keyword?: string
}

// ==================== 到访记录接口 ====================

export interface VisitSchedule {
  id: string
  lead_id: string
  // 线索信息
  child_name?: string
  parent_phone?: string
  parent_name?: string
  // 到访信息
  scheduled_at: string
  actual_visit_at?: string
  status: VisitStatus
  status_display: string
  // 校区信息
  campus_id?: string
  campus_name?: string
  // 其他
  remark?: string
  trial_course?: string
  // 审计信息
  created_at: string
  updated_at: string
  created_by_id?: string
  created_by_name?: string
}

export interface VisitScheduleCreate {
  lead_id: string
  scheduled_at: string
  campus_id?: string
  trial_course?: string
  trial_teacher?: string
  remark?: string
}

export interface VisitScheduleUpdate {
  scheduled_at?: string
  actual_visit_at?: string
  status?: string
  campus_id?: string
  trial_course?: string
  trial_teacher?: string
  remark?: string
}

export interface VisitScheduleListParams {
  page?: number
  size?: number
  lead_id?: string
  campus_id?: string
  status?: string
  date_from?: string
  date_to?: string
  keyword?: string
}

// ==================== 统一转化记录类型 ====================

export type ConversionType = 'scheduled' | 'visited' | 'payment'

export interface ConversionRecord {
  id: string
  type: ConversionType
  lead_id: string
  child_name?: string
  parent_phone?: string
  parent_name?: string
  // 时间（统一显示）
  record_time: string
  // 状态
  status: string
  status_display: string
  // 金额（仅缴费有）
  amount?: number
  payment_method_display?: string
  payment_type_display?: string
  // 其他
  campus_name?: string
  remark?: string
  created_at: string
  created_by_name?: string
  // 原始数据
  original: Payment | VisitSchedule
}

// ==================== 统计卡片数据 ====================

export interface ConversionStats {
  // 诺到统计
  scheduled_total: number
  scheduled_month: number
  // 到访统计
  visited_total: number
  visited_month: number
  // 缴费统计
  payment_total: number
  payment_month: number
  payment_amount_total: number
  payment_amount_month: number
}
