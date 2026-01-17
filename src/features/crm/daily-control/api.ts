/**
 * 日控表 API
 * 包含到访预约和缴费记录的 API 调用
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'

// ==================== 类型定义 ====================

// 到访预约状态
export type VisitScheduleStatus = 'scheduled' | 'visited' | 'noshow' | 'cancelled'

// 到访预约记录
export interface VisitScheduleItem {
  id: string
  lead_id: string
  child_name: string
  parent_name?: string
  parent_phone?: string
  visit_date: string
  visit_time?: string
  advisor_id?: string
  advisor_name?: string
  campus_id?: string
  campus_name?: string
  status: VisitScheduleStatus
  course_ids?: string[]
  course_names?: string[]
  remark?: string
  created_at: string
  updated_at?: string
}

// 到访预约查询参数
export interface VisitScheduleQueryParams {
  page?: number
  size?: number
  lead_id?: string
  advisor_id?: string
  status?: VisitScheduleStatus
  visit_date_from?: string
  visit_date_to?: string
}

// 缴费状态
export type PaymentStatus = 'pending' | 'confirmed' | 'refunded' | 'cancelled'

// 支付方式
export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'bank_transfer' | 'pos' | 'other'

// 缴费类型
export type PaymentType = 'deposit' | 'full_payment' | 'installment' | 'supplementary' | 'other'

// 缴费记录
export interface PaymentItem {
  id: string
  lead_id: string
  child_name?: string
  parent_name?: string
  parent_phone?: string
  amount: number
  payment_method: PaymentMethod
  payment_method_display?: string
  payment_type: PaymentType
  payment_type_display?: string
  status: PaymentStatus
  status_display?: string
  payment_at: string
  collector_id?: string
  collector_name?: string
  campus_id?: string
  campus_name?: string
  course_id?: string
  course_name?: string
  remark?: string
  created_at: string
  updated_at?: string
}

// 缴费查询参数
export interface PaymentQueryParams {
  page?: number
  size?: number
  lead_id?: string
  collector_id?: string
  campus_id?: string
  payment_method?: PaymentMethod
  payment_type?: PaymentType
  status?: PaymentStatus
  date_from?: string
  date_to?: string
  keyword?: string
}

// ==================== 状态标签配置 ====================

export const visitScheduleStatusLabels: Record<VisitScheduleStatus, string> = {
  scheduled: '诺到',
  visited: '已到访',
  noshow: '未到访',
  cancelled: '已取消'
}

export const visitScheduleStatusColors: Record<VisitScheduleStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  visited: 'bg-green-100 text-green-800',
  noshow: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  refunded: '已退款',
  cancelled: '已取消'
}

export const paymentStatusColors: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  refunded: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  bank_transfer: '银行转账',
  pos: 'POS机',
  other: '其他'
}

export const paymentTypeLabels: Record<PaymentType, string> = {
  deposit: '定金',
  full_payment: '全款',
  installment: '分期',
  supplementary: '补缴',
  other: '其他'
}

// ==================== API 函数 ====================

/**
 * 获取到访预约列表
 */
export async function getVisitSchedules(params: VisitScheduleQueryParams = {}) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<VisitScheduleItem>>>(
    '/visit-schedules',
    { params }
  )
  return response.data
}

/**
 * 更新到访预约状态
 */
export async function updateVisitScheduleStatus(id: string, status: VisitScheduleStatus) {
  const response = await apiClient.put<ApiResponse<VisitScheduleItem>>(
    `/visit-schedules/${id}`,
    { status }
  )
  return response
}

/**
 * 删除到访预约
 */
export async function deleteVisitSchedule(id: string) {
  const response = await apiClient.delete<ApiResponse<null>>(`/visit-schedules/${id}`)
  return response
}

/**
 * 获取缴费记录列表
 */
export async function getPayments(params: PaymentQueryParams = {}) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<PaymentItem>>>(
    '/payments',
    { params }
  )
  return response.data
}

/**
 * 更新缴费状态
 */
export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  const response = await apiClient.put<ApiResponse<PaymentItem>>(
    `/payments/${id}`,
    { status }
  )
  return response
}

/**
 * 删除缴费记录
 */
export async function deletePayment(id: string) {
  const response = await apiClient.delete<ApiResponse<null>>(`/payments/${id}`)
  return response
}
