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
  /**
   * 获取缴费记录列表
   */
  async getPayments(params?: PaymentListParams): Promise<ApiResponse<PaginatedResponse<Payment>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Payment>>>('/payments', {
      params
    })
    return response
  },

  /**
   * 获取单个缴费记录
   */
  async getPayment(id: string): Promise<ApiResponse<Payment>> {
    const response = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}`)
    return response
  },

  /**
   * 创建缴费记录
   */
  async createPayment(data: PaymentCreate): Promise<ApiResponse<Payment>> {
    const response = await apiClient.post<ApiResponse<Payment>>('/payments', data)
    return response
  },

  /**
   * 更新缴费记录
   */
  async updatePayment(id: string, data: PaymentUpdate): Promise<ApiResponse<Payment>> {
    const response = await apiClient.put<ApiResponse<Payment>>(`/payments/${id}`, data)
    return response
  },

  /**
   * 删除缴费记录
   */
  async deletePayment(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/payments/${id}`)
    return response
  },

  /**
   * 获取缴费统计
   */
  async getStats(params?: {
    date_from?: string
    date_to?: string
    campus_id?: string
    collector_id?: string
  }): Promise<ApiResponse<PaymentStats>> {
    const response = await apiClient.get<ApiResponse<PaymentStats>>('/payments/stats', {
      params
    })
    return response
  },

  /**
   * 获取指定线索的缴费记录
   */
  async getLeadPayments(leadId: string): Promise<ApiResponse<Payment[]>> {
    const response = await apiClient.get<ApiResponse<Payment[]>>(`/payments/lead/${leadId}/payments`)
    return response
  }
}

// ==================== 到访记录 API ====================

export const visitScheduleApi = {
  /**
   * 获取到访记录列表
   */
  async getVisitSchedules(params?: VisitScheduleListParams): Promise<ApiResponse<PaginatedResponse<VisitSchedule>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<VisitSchedule>>>('/visit-schedules', {
      params
    })
    return response
  },

  /**
   * 获取单个到访记录
   */
  async getVisitSchedule(id: string): Promise<ApiResponse<VisitSchedule>> {
    const response = await apiClient.get<ApiResponse<VisitSchedule>>(`/visit-schedules/${id}`)
    return response
  },

  /**
   * 创建到访记录
   */
  async createVisitSchedule(data: VisitScheduleCreate): Promise<ApiResponse<VisitSchedule>> {
    const response = await apiClient.post<ApiResponse<VisitSchedule>>('/visit-schedules', data)
    return response
  },

  /**
   * 更新到访记录
   */
  async updateVisitSchedule(id: string, data: VisitScheduleUpdate): Promise<ApiResponse<VisitSchedule>> {
    const response = await apiClient.put<ApiResponse<VisitSchedule>>(`/visit-schedules/${id}`, data)
    return response
  },

  /**
   * 删除到访记录
   */
  async deleteVisitSchedule(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/visit-schedules/${id}`)
    return response
  },

  /**
   * 确认到访
   */
  async confirmVisit(id: string, actualVisitAt?: string): Promise<ApiResponse<VisitSchedule>> {
    const response = await apiClient.post<ApiResponse<VisitSchedule>>(`/visit-schedules/${id}/confirm`, {
      actual_visit_at: actualVisitAt || new Date().toISOString()
    })
    return response
  },

  /**
   * 标记未到访
   */
  async markNoshow(id: string): Promise<ApiResponse<VisitSchedule>> {
    const response = await apiClient.post<ApiResponse<VisitSchedule>>(`/visit-schedules/${id}/noshow`)
    return response
  },

  /**
   * 取消到访预约
   */
  async cancelVisit(id: string): Promise<ApiResponse<VisitSchedule>> {
    const response = await apiClient.post<ApiResponse<VisitSchedule>>(`/visit-schedules/${id}/cancel`)
    return response
  },

  /**
   * 获取到访统计
   */
  async getStats(params?: {
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
    const response = await apiClient.get<ApiResponse<{
      scheduled_count: number
      visited_count: number
      noshow_count: number
      cancelled_count: number
      total: number
    }>>('/visit-schedules/stats', {
      params
    })
    return response
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
  /**
   * 获取员工列表（用于收款人选择）
   */
  async getEmployees(params?: {
    is_active?: boolean
    size?: number
  }): Promise<ApiResponse<{ items: Employee[] }>> {
    const response = await apiClient.get<ApiResponse<{ items: Employee[] }>>('/admin/employees', {
      params: {
        is_active: params?.is_active ?? true,
        size: params?.size ?? 100
      }
    })
    return response
  }
}

export default {
  payment: paymentApi,
  visitSchedule: visitScheduleApi,
  employee: employeeApi
}
