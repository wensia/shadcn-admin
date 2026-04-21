/**
 * HR 模块 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'

const BASE_URL = '/api/v1/hr'

export interface ResignationItem {
  id: string
  employee_id: string
  employee_name: string
  campus_id?: string
  campus_name?: string
  department_id: string
  department_name?: string
  status: string
  status_display: string
  resignation_type: string
  type_display: string
  resignation_date: string
  reason: string
  submitted_by_id: string
  submitted_by_name?: string
  submitted_at?: string
  approved_by_id?: string
  approved_by_name?: string
  approved_at?: string
  approval_comment?: string
  is_executed: boolean
  executed_at?: string
  created_at: string
  updated_at?: string
  logs?: ResignationLogItem[]
}

export interface ResignationLogItem {
  id: string
  action: string
  from_status: string
  to_status: string
  operator_id: string
  operator_name?: string
  comment?: string
  operated_at: string
}

export interface ResignationCreate {
  employee_id: string
  resignation_type: string
  resignation_date: string
  reason: string
}

export interface ResignationApprovalAction {
  comment?: string
}

export const hrApi = {
  // 离职审批
  async getResignations(params?: {
    page?: number
    size?: number
    status?: string
  }): Promise<ApiResponse<PaginatedResponse<ResignationItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<ResignationItem>>>(
      `${BASE_URL}/resignations`,
      { params }
    )
  },

  async getResignationDetail(id: string): Promise<ApiResponse<ResignationItem>> {
    return apiClient.get<ApiResponse<ResignationItem>>(
      `${BASE_URL}/resignations/${id}`
    )
  },

  async createResignation(data: ResignationCreate): Promise<ApiResponse<ResignationItem>> {
    return apiClient.post<ApiResponse<ResignationItem>>(
      `${BASE_URL}/resignations`,
      data
    )
  },

  async submitResignation(id: string): Promise<ApiResponse<ResignationItem>> {
    return apiClient.post<ApiResponse<ResignationItem>>(
      `${BASE_URL}/resignations/${id}/submit`
    )
  },

  async approveResignation(id: string, data: ResignationApprovalAction): Promise<ApiResponse<ResignationItem>> {
    return apiClient.post<ApiResponse<ResignationItem>>(
      `${BASE_URL}/resignations/${id}/approve`,
      data
    )
  },

  async rejectResignation(id: string, data: ResignationApprovalAction): Promise<ApiResponse<ResignationItem>> {
    return apiClient.post<ApiResponse<ResignationItem>>(
      `${BASE_URL}/resignations/${id}/reject`,
      data
    )
  },

  async cancelResignation(id: string): Promise<ApiResponse<ResignationItem>> {
    return apiClient.post<ApiResponse<ResignationItem>>(
      `${BASE_URL}/resignations/${id}/cancel`
    )
  },
}
