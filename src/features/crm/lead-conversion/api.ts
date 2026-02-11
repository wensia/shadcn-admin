/**
 * 转化管理 API
 * 包含缴费记录和到访记录相关 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type {
  Payment,
  PaymentCreate,
  PaymentUpdate,
  PaymentStats,
  PaymentListParams,
  VisitSchedule,
  VisitScheduleCreate,
  VisitScheduleUpdate,
  VisitScheduleListParams
} from './types'

// ==================== 缴费记录 API ====================

export const paymentApi = {
  /** 获取缴费记录列表 */
  getPayments(params?: PaymentListParams): Promise<ApiResponse<PaginatedResponse<Payment>>> {
    return apiClient.get('/payments', { params })
  },

  /** 获取单个缴费记录 */
  getPayment(id: string): Promise<ApiResponse<Payment>> {
    return apiClient.get(`/payments/${id}`)
  },

  /** 创建缴费记录 */
  createPayment(data: PaymentCreate): Promise<ApiResponse<Payment>> {
    return apiClient.post('/payments', data)
  },

  /** 更新缴费记录 */
  updatePayment(id: string, data: PaymentUpdate): Promise<ApiResponse<Payment>> {
    return apiClient.put(`/payments/${id}`, data)
  },

  /** 删除缴费记录 */
  deletePayment(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/payments/${id}`)
  },

  /** 获取缴费统计 */
  getStats(params?: {
    date_from?: string
    date_to?: string
    campus_id?: string
    collector_id?: string
  }): Promise<ApiResponse<PaymentStats>> {
    return apiClient.get('/payments/stats', { params })
  },

  /** 获取指定线索的缴费记录 */
  getLeadPayments(leadId: string): Promise<ApiResponse<Payment[]>> {
    return apiClient.get(`/payments/lead/${leadId}/payments`)
  }
}

// ==================== 到访记录 API ====================

export const visitScheduleApi = {
  /** 获取到访记录列表 */
  getVisitSchedules(params?: VisitScheduleListParams): Promise<ApiResponse<PaginatedResponse<VisitSchedule>>> {
    return apiClient.get('/visit-schedules', { params })
  },

  /** 获取单个到访记录 */
  getVisitSchedule(id: string): Promise<ApiResponse<VisitSchedule>> {
    return apiClient.get(`/visit-schedules/${id}`)
  },

  /** 创建到访记录 */
  createVisitSchedule(data: VisitScheduleCreate): Promise<ApiResponse<VisitSchedule>> {
    return apiClient.post('/visit-schedules', data)
  },

  /** 更新到访记录 */
  updateVisitSchedule(id: string, data: VisitScheduleUpdate): Promise<ApiResponse<VisitSchedule>> {
    return apiClient.put(`/visit-schedules/${id}`, data)
  },

  /** 删除到访记录 */
  deleteVisitSchedule(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/visit-schedules/${id}`)
  },

  /** 确认到访 */
  confirmVisit(id: string, actualVisitAt?: string): Promise<ApiResponse<VisitSchedule>> {
    return apiClient.post(`/visit-schedules/${id}/confirm`, {
      actual_visit_at: actualVisitAt || new Date().toISOString()
    })
  },

  /** 标记未到访 */
  markNoshow(id: string): Promise<ApiResponse<VisitSchedule>> {
    return apiClient.post(`/visit-schedules/${id}/noshow`)
  },

  /** 取消到访预约 */
  cancelVisit(id: string): Promise<ApiResponse<VisitSchedule>> {
    return apiClient.post(`/visit-schedules/${id}/cancel`)
  },

  /** 获取到访统计 */
  getStats(params?: {
    date_from?: string
    date_to?: string
    campus_id?: string
  }): Promise<ApiResponse<{
    scheduled_count: number
    visited_count: number
    noshow_count: number
    cancelled_count: number
    total: number
  }>> {
    return apiClient.get('/visit-schedules/stats', { params })
  }
}

// ==================== 员工 API（用于收款人选择） ====================

export interface Employee {
  id: string
  name: string
  username: string
  is_active: boolean
}

export const employeeApi = {
  /** 获取员工列表（用于收款人选择） */
  getEmployees(params?: {
    is_active?: boolean
    size?: number
  }): Promise<ApiResponse<{ items: Employee[] }>> {
    return apiClient.get('/admin/employees', {
      params: {
        is_active: params?.is_active ?? true,
        size: params?.size ?? 100
      }
    })
  }
}
