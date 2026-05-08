/**
 * HR 模块 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'

const BASE_URL = '/hr'

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

export interface IdentityApplicationItem {
  id: string
  name: string
  phone: string
  email: string
  joined_on?: string
  campus_id: string
  campus_name?: string
  department_id: string
  department_name?: string
  position_id: string
  position_name?: string
  status: string
  status_display: string
  remark?: string
  department_review_comment?: string
  review_comment?: string
  submitted_by_id: string
  submitted_by_name?: string
  department_reviewed_by_id?: string
  department_reviewed_by_name?: string
  reviewed_by_id?: string
  reviewed_by_name?: string
  created_employee_id?: string
  created_employee_username?: string
  invitation_sent_at?: string
  submitted_at: string
  department_reviewed_at?: string
  reviewed_at?: string
  created_at: string
  updated_at?: string
  can_department_review?: boolean
  can_admin_review?: boolean
}

export interface IdentityApplicationCreate {
  name: string
  phone: string
  email: string
  joined_on?: string
  campus_id: string
  department_id: string
  position_id: string
  remark?: string
}

export interface IdentityApplicationReviewAction {
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

  // 员工身份申请
  async getIdentityApplications(params?: {
    page?: number
    size?: number
    status?: string
  }): Promise<ApiResponse<PaginatedResponse<IdentityApplicationItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<IdentityApplicationItem>>>(
      `${BASE_URL}/identity-applications`,
      { params }
    )
  },

  async getMyIdentityApplications(params?: {
    page?: number
    size?: number
    status?: string
  }): Promise<ApiResponse<PaginatedResponse<IdentityApplicationItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<IdentityApplicationItem>>>(
      `${BASE_URL}/identity-applications/mine`,
      { params }
    )
  },

  async getIdentityApplicationDetail(id: string): Promise<ApiResponse<IdentityApplicationItem>> {
    return apiClient.get<ApiResponse<IdentityApplicationItem>>(
      `${BASE_URL}/identity-applications/${id}`
    )
  },

  async createIdentityApplication(data: IdentityApplicationCreate): Promise<ApiResponse<IdentityApplicationItem>> {
    return apiClient.post<ApiResponse<IdentityApplicationItem>>(
      `${BASE_URL}/identity-applications`,
      data
    )
  },

  async approveIdentityApplication(
    id: string,
    data: IdentityApplicationReviewAction
  ): Promise<ApiResponse<IdentityApplicationItem>> {
    return apiClient.post<ApiResponse<IdentityApplicationItem>>(
      `${BASE_URL}/identity-applications/${id}/approve`,
      data
    )
  },

  async departmentApproveIdentityApplication(
    id: string,
    data: IdentityApplicationReviewAction
  ): Promise<ApiResponse<IdentityApplicationItem>> {
    return apiClient.post<ApiResponse<IdentityApplicationItem>>(
      `${BASE_URL}/identity-applications/${id}/department-approve`,
      data
    )
  },

  async departmentRejectIdentityApplication(
    id: string,
    data: IdentityApplicationReviewAction
  ): Promise<ApiResponse<IdentityApplicationItem>> {
    return apiClient.post<ApiResponse<IdentityApplicationItem>>(
      `${BASE_URL}/identity-applications/${id}/department-reject`,
      data
    )
  },

  async rejectIdentityApplication(
    id: string,
    data: IdentityApplicationReviewAction
  ): Promise<ApiResponse<IdentityApplicationItem>> {
    return apiClient.post<ApiResponse<IdentityApplicationItem>>(
      `${BASE_URL}/identity-applications/${id}/reject`,
      data
    )
  },

  async resendIdentityInvitation(id: string): Promise<ApiResponse<IdentityApplicationItem>> {
    return apiClient.post<ApiResponse<IdentityApplicationItem>>(
      `${BASE_URL}/identity-applications/${id}/resend-invitation`
    )
  },
}
