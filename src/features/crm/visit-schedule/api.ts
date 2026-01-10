/**
 * Visit Schedule API
 * 到访预约记录 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'

export interface VisitScheduleCreate {
  lead_id: string
  visit_date: string  // YYYY-MM-DD
  visit_time: string  // HH:MM:SS
  advisor_id?: string | null
  course_ids?: string[]
  status: 'scheduled' | 'visited' | 'noshow' | 'cancelled'
  remark?: string
}

export interface VisitScheduleResponse {
  id: string
  lead_id: string
  student_name: string
  phone: string
  visit_date: string
  visit_time: string
  advisor_id: string
  advisor_name: string
  course_ids: string[]
  course_names: string[]
  status: string
  remark?: string
  created_at?: string
  updated_at?: string
}

export const visitScheduleApi = {
  /**
   * 创建到访预约记录
   */
  async createVisitSchedule(data: VisitScheduleCreate): Promise<ApiResponse<VisitScheduleResponse>> {
    const response = await apiClient.post<ApiResponse<VisitScheduleResponse>>('/visit-schedules', data)
    return response
  },

  /**
   * 获取到访预约记录列表
   */
  async getVisitSchedules(params?: {
    page?: number
    size?: number
    lead_id?: string
    advisor_id?: string
    status?: string
    visit_date_from?: string
    visit_date_to?: string
  }): Promise<ApiResponse<{ items: VisitScheduleResponse[]; total: number }>> {
    const response = await apiClient.get<ApiResponse<{ items: VisitScheduleResponse[]; total: number }>>('/visit-schedules', {
      params: params || {}
    })
    return response
  },

  /**
   * 更新到访预约记录状态
   */
  async updateVisitSchedule(id: string, data: Partial<VisitScheduleCreate>): Promise<ApiResponse<VisitScheduleResponse>> {
    const response = await apiClient.put<ApiResponse<VisitScheduleResponse>>(`/visit-schedules/${id}`, data)
    return response
  },

  /**
   * 删除到访预约记录
   */
  async deleteVisitSchedule(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/visit-schedules/${id}`)
    return response
  },
}
