/**
 * 日控表 API
 * 包含到访预约和缴费记录的 API 调用
 */

import { apiClient } from '@/lib/api/client'
import { unwrapData, type ApiResponse, type PaginatedResponse } from '@/lib/api/types'

// ==================== 类型定义 ====================

// 到访预约状态
export type VisitScheduleStatus = 'scheduled' | 'visited' | 'noshow' | 'cancelled'

// 审批状态
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'

// 到访预约记录（字段名与后端 VisitScheduleResponse 对应）
export interface VisitScheduleItem {
  id: string
  lead_id?: string | null  // 线索删除后为 null
  lead_deleted?: boolean   // 线索是否已删除
  student_name?: string  // 后端返回 student_name
  phone?: string         // 后端返回 phone
  grade?: string
  grade_display?: string
  // 来源渠道信息
  source_channel_name?: string
  source_extra?: string
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
  created_by?: string
  created_by_name?: string
  updated_at?: string
  // 兼容旧字段名（前端使用）
  child_name?: string    // 映射自 student_name
  parent_phone?: string  // 映射自 phone
  // 审批相关字段
  is_counted?: boolean
  approval_status?: ApprovalStatus
  approval_status_display?: string
  confirmed_at?: string
  approver_id?: string
  approver_name?: string
  approved_at?: string
  approval_comment?: string
  // 权限标识
  can_confirm?: boolean
  can_approve?: boolean
  can_withdraw?: boolean
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
  creator_campus_id?: string
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
  lead_id?: string | null  // 线索删除后为 null
  lead_deleted?: boolean   // 线索是否已删除
  child_name?: string
  parent_name?: string
  parent_phone?: string
  // 跟进顾问信息（来自线索）
  advisor_id?: string
  advisor_name?: string
  // 年级信息（来自线索）
  grade?: string
  grade_display?: string
  // 来源渠道信息（来自线索）
  source_channel_name?: string
  source_extra?: string
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
  // 审批相关字段
  is_counted?: boolean
  approval_status?: ApprovalStatus
  approval_status_display?: string
  confirmed_at?: string
  approver_id?: string
  approver_name?: string
  approved_at?: string
  approval_comment?: string
  // 权限标识
  can_confirm?: boolean
  can_approve?: boolean
  can_withdraw?: boolean
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
  creator_campus_id?: string
}

export interface VisitScheduleMutationData {
  visit_at?: string
  course_ids?: string[]
  remark?: string
  status?: VisitScheduleStatus
}

export interface VisitScheduleCreateData extends Required<Pick<VisitScheduleMutationData, 'visit_at'>> {
  lead_id: string
  course_ids?: string[]
  remark?: string
  status?: VisitScheduleStatus
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

// 审批状态标签
export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回'
}

// 审批状态颜色
export const approvalStatusColors: Record<ApprovalStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
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

function compactQueryParams<T extends object>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  ) as Partial<T>
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function splitVisitAt(visitAt: string) {
  const date = new Date(visitAt)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`无效的到访时间: ${visitAt}`)
  }

  return {
    visit_date: `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    visit_time: `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`,
  }
}

export const dailyControlQueryKeys = {
  all: ['daily-control'] as const,
  visitSchedules: () => [...dailyControlQueryKeys.all, 'visit-schedules'] as const,
  visitScheduleList: (params: VisitScheduleQueryParams) =>
    [...dailyControlQueryKeys.visitSchedules(), compactQueryParams(params)] as const,
  visitScheduleStats: () => [...dailyControlQueryKeys.all, 'visit-schedule-stats'] as const,
  visitScheduleStat: (params: Omit<VisitScheduleQueryParams, 'page' | 'size'>) =>
    [...dailyControlQueryKeys.visitScheduleStats(), compactQueryParams(params)] as const,
  payments: () => [...dailyControlQueryKeys.all, 'payments'] as const,
  paymentList: (params: PaymentQueryParams) =>
    [...dailyControlQueryKeys.payments(), compactQueryParams(params)] as const,
  paymentStats: () => [...dailyControlQueryKeys.all, 'payment-stats'] as const,
  paymentStat: (params: PaymentQueryParams) =>
    [...dailyControlQueryKeys.paymentStats(), compactQueryParams(params)] as const,
} as const

// ==================== API 函数 ====================

/** 获取到访预约列表 */
export async function getVisitSchedules(params: VisitScheduleQueryParams = {}) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<VisitScheduleItem>>>(
    '/visit-schedules',
    { params }
  )
  return unwrapData(response)
}

/** 创建到访预约 */
export async function createVisitSchedule(data: VisitScheduleCreateData) {
  const response = await apiClient.post<ApiResponse<VisitScheduleItem>>(
    '/visit-schedules',
    {
      lead_id: data.lead_id,
      ...splitVisitAt(data.visit_at),
      course_ids: data.course_ids ?? [],
      remark: data.remark,
      status: data.status ?? 'scheduled',
    }
  )
  return unwrapData(response)
}

/** 更新到访预约状态 */
export function updateVisitScheduleStatus(id: string, status: VisitScheduleStatus) {
  return apiClient.put<ApiResponse<VisitScheduleItem>>(
    `/visit-schedules/${id}`,
    { status }
  )
}

/** 更新到访预约信息 */
export function updateVisitSchedule(id: string, data: VisitScheduleMutationData) {
  // 转换数据格式以匹配后端 API
  const apiData: Record<string, unknown> = {}

  if (data.visit_at) {
    Object.assign(apiData, splitVisitAt(data.visit_at))
  }

  if (data.course_ids !== undefined) {
    apiData.course_ids = data.course_ids
  }

  if (data.remark !== undefined) {
    apiData.remark = data.remark
  }

  if (data.status !== undefined) {
    apiData.status = data.status
  }

  return apiClient.put<ApiResponse<VisitScheduleItem>>(
    `/visit-schedules/${id}`,
    apiData
  )
}

/** 删除到访预约 */
export function deleteVisitSchedule(id: string) {
  return apiClient.delete<ApiResponse<null>>(`/visit-schedules/${id}`)
}

/** 确认诺到记录（提交审批） */
export function confirmVisitSchedule(id: string) {
  return apiClient.post<ApiResponse<VisitScheduleItem>>(
    `/visit-schedules/${id}/confirm`
  )
}

/** 审批诺到记录 */
export function approveVisitSchedule(id: string, action: 'approve' | 'reject', comment?: string) {
  return apiClient.post<ApiResponse<VisitScheduleItem>>(
    `/visit-schedules/${id}/approve`,
    { action, comment }
  )
}

/** 撤回诺到记录 */
export function withdrawVisitSchedule(id: string) {
  return apiClient.post<ApiResponse<VisitScheduleItem>>(
    `/visit-schedules/${id}/withdraw`
  )
}

/** 获取缴费记录列表 */
export async function getPayments(params: PaymentQueryParams = {}) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<PaymentItem>>>(
    '/payments',
    { params }
  )
  return unwrapData(response)
}

/** 更新缴费状态 */
export function updatePaymentStatus(id: string, status: PaymentStatus) {
  return apiClient.put<ApiResponse<PaymentItem>>(
    `/payments/${id}`,
    { status }
  )
}

/** 更新缴费记录信息 */
export interface PaymentUpdateData {
  amount?: number
  payment_method?: PaymentMethod
  payment_type?: PaymentType
  payment_at?: string
  course_id?: string
  remark?: string
  status?: PaymentStatus
}

export function updatePayment(id: string, data: PaymentUpdateData) {
  return apiClient.put<ApiResponse<PaymentItem>>(`/payments/${id}`, data)
}

/** 删除缴费记录 */
export function deletePayment(id: string) {
  return apiClient.delete<ApiResponse<null>>(`/payments/${id}`)
}

/** 确认缴费记录（提交审批） */
export function confirmPayment(id: string) {
  return apiClient.post<ApiResponse<PaymentItem>>(`/payments/${id}/confirm`)
}

/** 审批缴费记录 */
export function approvePayment(id: string, action: 'approve' | 'reject', comment?: string) {
  return apiClient.post<ApiResponse<PaymentItem>>(
    `/payments/${id}/approve`,
    { action, comment }
  )
}

/** 撤回缴费记录 */
export function withdrawPayment(id: string) {
  return apiClient.post<ApiResponse<PaymentItem>>(`/payments/${id}/withdraw`)
}

// ==================== 批量导入日控表 ====================

// 批量导入响应
export interface BatchImportResponse {
  success_count: number
  failed_records: Array<{
    id: string
    reason: string
  }>
}

/** 批量导入诺到记录到日控表 */
export async function batchImportVisitSchedules(recordIds: string[]) {
  const response = await apiClient.post<ApiResponse<BatchImportResponse>>(
    '/visit-schedules/batch-import',
    { record_ids: recordIds }
  )
  return response.data
}

/** 批量取消导入诺到记录 */
export async function batchCancelImportVisitSchedules(recordIds: string[]) {
  const response = await apiClient.post<ApiResponse<BatchImportResponse>>(
    '/visit-schedules/batch-cancel-import',
    { record_ids: recordIds }
  )
  return response.data
}

/** 批量导入缴费记录到日控表 */
export async function batchImportPayments(recordIds: string[]) {
  const response = await apiClient.post<ApiResponse<BatchImportResponse>>(
    '/payments/batch-import',
    { record_ids: recordIds }
  )
  return response.data
}

/** 批量取消导入缴费记录 */
export async function batchCancelImportPayments(recordIds: string[]) {
  const response = await apiClient.post<ApiResponse<BatchImportResponse>>(
    '/payments/batch-cancel-import',
    { record_ids: recordIds }
  )
  return response.data
}

// ==================== 日控报表 ====================

// 顾问日控统计数据
export interface AdvisorDailyControlStats {
  advisor_id: string
  advisor_name: string
  campus_id?: string
  campus_name?: string
  promised_count: number
  visited_count: number
  payment_count: number
  payment_amount: number
}

// 日控报表响应
export interface DailyControlReportResponse {
  stats: AdvisorDailyControlStats[]
  total_advisors: number
  total_promised: number
  total_visited: number
  total_payment_count: number
  total_payment_amount: number
}

// 日控报表查询参数
export interface DailyControlReportParams {
  campus_id?: string
  date_from?: string
  date_to?: string
}

/** 获取日控报表数据 */
export async function getDailyControlReport(params: DailyControlReportParams = {}) {
  const response = await apiClient.get<ApiResponse<DailyControlReportResponse>>(
    '/daily-control-report',
    { params }
  )
  return response.data
}
