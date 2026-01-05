/**
 * Leads API
 * 从frontend-vue/src/api/leads.ts迁移
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type {
  Lead,
  LeadListItem,
  LeadCreate,
  LeadUpdate,
  LeadFollowup,
  LeadFollowupCreate,
  LeadInfoChangeLog,
  LeadOwnershipChangeLog,
  LeadListParams,
  LeadStatus,
  MarketStatisticsResponse,
  DituiFirstFollowupStats,
  DituiPendingStats,
  DituiCollectionTimeStat,
  AdvisorTodayActivityResponse,
  AdvisorLeadSummaryResponse,
  AdvisorPendingByChannelResponse
} from './types'

/**
 * Leads API对象
 * 包含所有线索管理相关的API方法
 */
const leadsApi = {
  // ==================== 基础CRUD ====================

  /**
   * 获取线索列表
   */
  async getLeads(params?: LeadListParams): Promise<ApiResponse<PaginatedResponse<LeadListItem>>> {
    // 处理参数：后端期望特定格式
    const processedParams = params ? {
      ...params,
      // source_extra_filters: 后端期望 JSON 字符串格式
      source_extra_filters: params.source_extra_filters
        ? JSON.stringify(params.source_extra_filters)
        : undefined,
      // grade: 后端期望单个字符串，取数组第一个值
      grade: params.grade && params.grade.length > 0
        ? params.grade[0]
        : undefined
    } : undefined

    const response = await apiClient.get<ApiResponse<PaginatedResponse<LeadListItem>>>(
      '/leads',
      { params: processedParams }
    )
    return response
  },

  /**
   * 获取线索详情
   */
  async getLead(id: string, includeStyles = false): Promise<ApiResponse<Lead>> {
    const response = await apiClient.get<ApiResponse<Lead>>(`/leads/${id}`, {
      params: { include_styles: includeStyles }
    })
    return response
  },

  /**
   * 创建线索
   */
  async createLead(data: LeadCreate): Promise<ApiResponse<Lead>> {
    const response = await apiClient.post<ApiResponse<Lead>>('/leads', data)
    return response
  },

  /**
   * 更新线索
   */
  async updateLead(id: string, data: Partial<LeadUpdate>): Promise<ApiResponse<Lead>> {
    const response = await apiClient.put<ApiResponse<Lead>>(`/leads/${id}`, data)
    return response
  },

  /**
   * 删除线索
   */
  async deleteLead(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(`/leads/${id}`)
    return response
  },

  // ==================== 导出功能 ====================

  /**
   * 导出线索
   */
  async exportLeads(params?: LeadListParams): Promise<any> {
    const response = await apiClient.get('/leads/export', {
      params,
      responseType: 'blob'
    })
    return response
  },

  // ==================== 跟进记录 ====================

  /**
   * 获取跟进记录
   */
  async getLeadFollowups(
    leadId: string,
    params?: { page?: number; size?: number }
  ): Promise<ApiResponse<LeadFollowup[]>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.size) queryParams.append('size', params.size.toString())

    const url = `/leads/${leadId}/followups${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await apiClient.get<ApiResponse<LeadFollowup[]>>(url)
    return response
  },

  /**
   * 添加跟进记录
   */
  async addLeadFollowup(
    leadId: string,
    data: LeadFollowupCreate
  ): Promise<ApiResponse<LeadFollowup>> {
    const response = await apiClient.post<ApiResponse<LeadFollowup>>(
      `/leads/${leadId}/followups`,
      data
    )
    return response
  },

  // ==================== 变更记录 ====================

  /**
   * 获取线索信息变更记录
   */
  async getLeadInfoChangeLogs(
    leadId: string,
    params?: { page?: number; size?: number }
  ): Promise<ApiResponse<LeadInfoChangeLog[]>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.size) queryParams.append('size', params.size.toString())

    const url = `/leads/${leadId}/info-change-logs${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await apiClient.get<ApiResponse<LeadInfoChangeLog[]>>(url)
    return response
  },

  /**
   * 获取线索归属变更记录
   */
  async getLeadOwnershipChangeLogs(
    leadId: string,
    params?: { page?: number; size?: number }
  ): Promise<ApiResponse<LeadOwnershipChangeLog[]>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.size) queryParams.append('size', params.size.toString())

    const url = `/leads/${leadId}/ownership-change-logs${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    const response = await apiClient.get<ApiResponse<LeadOwnershipChangeLog[]>>(url)
    return response
  },

  // ==================== 批量操作 ====================

  /**
   * 批量分配线索
   */
  async batchAssignLeads(data: {
    lead_ids: string[]
    advisor_id: string
    status?: LeadStatus
  }): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>('/leads/batch-assign', data)
    return response
  },

  /**
   * 批量释放到公海（使用新的统一API）
   */
  async batchReleaseLeads(data: {
    lead_ids: string[]
    reason: string
    remark?: string
  }): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>('/lead-pool/release', data)
    return response
  },

  /**
   * 批量删除线索
   */
  async batchDeleteLeads(leadIds: string[]): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>('/leads/batch-delete', {
      lead_ids: leadIds
    })
    return response
  },

  /**
   * 批量修改状态
   */
  async batchUpdateStatus(data: {
    lead_ids: string[]
    status: LeadStatus
  }): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>('/leads/batch-status-update', data)
    return response
  },

  /**
   * 批量标记为待回访
   */
  async batchMarkFollowup(data: {
    lead_ids: string[]
    priority?: number
    next_followup_at?: string
    remark?: string
  }): Promise<ApiResponse<{
    success_count: number
    failed_count: number
    total: number
  }>> {
    const response = await apiClient.post<ApiResponse<{
      success_count: number
      failed_count: number
      total: number
    }>>('/leads/batch-mark-followup', data)
    return response
  },

  /**
   * 批量删除线索（仅超级管理员）
   */
  async batchDelete(data: {
    lead_ids: string[]
    delete_reason?: string
  }): Promise<ApiResponse<{
    success_count: number
    failed_count: number
    total: number
    failed_leads?: Array<{
      id: string
      reason: string
    }>
  }>> {
    const response = await apiClient.post<ApiResponse<{
      success_count: number
      failed_count: number
      total: number
      failed_leads?: Array<{
        id: string
        reason: string
      }>
    }>>('/leads/batch-delete', data)
    return response
  },

  // ==================== 辅助功能 ====================

  /**
   * 获取筛选选项
   */
  async getFilterOptions(): Promise<ApiResponse<{
    source_channels: Array<{ id: string; name: string; category: string }>
    creators: Array<{ id: string; name: string; username: string }>
    advisors: Array<{ id: string; name: string; username: string }>
    campuses?: Array<{ id: string; name: string }>
  }>> {
    const response = await apiClient.get<ApiResponse<{
      source_channels: Array<{ id: string; name: string; category: string }>
      creators: Array<{ id: string; name: string; username: string }>
      advisors: Array<{ id: string; name: string; username: string }>
      campuses?: Array<{ id: string; name: string }>
    }>>('/leads/filter-options')
    return response
  },

  /**
   * 检查手机号重复
   */
  async checkPhoneDuplicate(
    phone: string,
    excludeLeadId?: string
  ): Promise<ApiResponse<{
    is_duplicate: boolean
    duplicate_count: number
    duplicate_leads: Array<{
      id: string
      child_name: string
      parent_name: string
      created_at: string
      status: string
      advisor_name?: string
      owner_campus_name?: string
      created_by_name?: string
      no_permission?: boolean
    }>
    message: string
  }>> {
    const params = new URLSearchParams()
    params.append('phone', phone)
    if (excludeLeadId) {
      params.append('exclude_lead_id', excludeLeadId)
    }

    const response = await apiClient.get<ApiResponse<{
      is_duplicate: boolean
      duplicate_count: number
      duplicate_leads: Array<{
        id: string
        child_name: string
        parent_name: string
        created_at: string
        status: string
        advisor_name?: string
        owner_campus_name?: string
        created_by_name?: string
        no_permission?: boolean
      }>
      message: string
    }>>(`/leads/check-phone-duplicate?${params.toString()}`)
    return response
  },

  /**
   * 通过手机号搜索线索（用于到访预约等场景）
   */
  async searchLeadsByPhone(phone: string): Promise<ApiResponse<{
    items: Array<{
      id: string
      child_name: string
      parent_name: string
      parent_phone: string
      status: string
      advisor_name?: string
      owner_campus_name?: string
    }>
    total: number
  }>> {
    const params = new URLSearchParams()
    params.append('search', phone)
    params.append('page', '1')
    params.append('size', '10')

    const response = await apiClient.get<ApiResponse<{
      items: any[]
      total: number
    }>>(`/leads?${params.toString()}`)
    return response
  },

  // ==================== 待回访管理 ====================

  /**
   * 获取待回访线索列表
   */
  async getPendingFollowupLeads(params?: {
    page?: number
    size?: number
    priority_min?: number
    priority_max?: number
    sort_by?: string
    sort_order?: string
  }): Promise<ApiResponse<{
    items: any[]
    total: number
    page: number
    size: number
  }>> {
    const response = await apiClient.get<ApiResponse<{
      items: any[]
      total: number
      page: number
      size: number
    }>>('/leads/pending-followup', { params })
    return response
  },

  /**
   * 更新线索回访信息
   */
  async updateFollowupInfo(
    leadId: string,
    data: {
      priority?: number
      next_followup_at?: string
      remark?: string
    }
  ): Promise<ApiResponse<{
    id: string
    followup_priority?: number
    next_followup_at?: string
    followup_remark?: string
  }>> {
    const response = await apiClient.put<ApiResponse<{
      id: string
      followup_priority?: number
      next_followup_at?: string
      followup_remark?: string
    }>>(`/leads/${leadId}/followup-info`, data)
    return response
  },

  // ==================== 统计功能 ====================

  /**
   * 获取市场数据统计
   */
  async getMarketStatistics(params?: {
    date_from?: string
    date_to?: string
    staff_id?: string
  }): Promise<ApiResponse<MarketStatisticsResponse>> {
    const response = await apiClient.get<ApiResponse<MarketStatisticsResponse>>(
      '/leads/statistics/market',
      { params }
    )
    return response
  },

  /**
   * 获取地推采单人统计
   */
  async getDituiCollectorStats(params?: {
    start_date?: string
    end_date?: string
    marketer_id?: string
  }): Promise<ApiResponse<Array<{
    collector_name: string
    count: number
    percentage: string
  }>>> {
    const response = await apiClient.get<ApiResponse<Array<{
      collector_name: string
      count: number
      percentage: string
    }>>>('/leads/statistics/ditui-collectors', { params })
    return response
  },

  /**
   * 获取地推采单地点统计
   */
  async getDituiLocationStats(params?: {
    start_date?: string
    end_date?: string
  }): Promise<ApiResponse<Array<{
    location: string
    count: number
    percentage: string
  }>>> {
    const response = await apiClient.get<ApiResponse<Array<{
      location: string
      count: number
      percentage: string
    }>>>('/leads/statistics/ditui-locations', { params })
    return response
  },

  /**
   * 获取地推首次回访状态统计
   */
  async getDituiFirstFollowupStats(params?: {
    start_date?: string
    end_date?: string
    marketer_id?: string
  }): Promise<ApiResponse<DituiFirstFollowupStats>> {
    const response = await apiClient.get<ApiResponse<DituiFirstFollowupStats>>(
      '/leads/statistics/ditui-first-followup',
      { params }
    )
    return response
  },

  /**
   * 获取地推待处理统计
   */
  async getDituiPendingStats(params?: {
    start_date?: string
    end_date?: string
    marketer_id?: string
  }): Promise<ApiResponse<DituiPendingStats>> {
    const response = await apiClient.get<ApiResponse<DituiPendingStats>>(
      '/leads/statistics/ditui-pending',
      { params }
    )
    return response
  },

  /**
   * 获取地推采单时间统计
   */
  async getDituiCollectionTimeStats(params?: {
    start_date?: string
    end_date?: string
    marketer_id?: string
  }): Promise<ApiResponse<{ items: DituiCollectionTimeStat[]; total: number }>> {
    const response = await apiClient.get<ApiResponse<{
      items: DituiCollectionTimeStat[]
      total: number
    }>>('/leads/statistics/ditui-collection-time', { params })
    return response
  },

  /**
   * 获取顾问今日活动统计
   */
  async getAdvisorTodayActivity(): Promise<ApiResponse<AdvisorTodayActivityResponse>> {
    const response = await apiClient.get<ApiResponse<AdvisorTodayActivityResponse>>(
      '/leads/statistics/advisor-today-activity'
    )
    return response
  },

  /**
   * 获取顾问线索汇总
   */
  async getAdvisorLeadSummary(): Promise<ApiResponse<AdvisorLeadSummaryResponse>> {
    const response = await apiClient.get<ApiResponse<AdvisorLeadSummaryResponse>>(
      '/leads/statistics/advisor-lead-summary'
    )
    return response
  },

  /**
   * 获取顾问待回访线索按渠道分组统计
   */
  async getAdvisorPendingByChannel(): Promise<ApiResponse<AdvisorPendingByChannelResponse>> {
    const response = await apiClient.get<ApiResponse<AdvisorPendingByChannelResponse>>(
      '/leads/statistics/advisor-pending-by-channel'
    )
    return response
  }
}

export default leadsApi
export { leadsApi }
export const leadApi = leadsApi

// ==================== 员工相关类型 ====================

/**
 * 员工身份信息
 */
export interface EmployeeIdentity {
  id: string
  employee_id: string
  campus_id: string
  department_id: string
  position_id: string
  can_manage_leads: boolean
  can_access_pool: boolean
  max_lead_count: number
  is_active: boolean
  campus?: {
    id: string
    name: string
  }
  department?: {
    id: string
    name: string
  }
  position?: {
    id: string
    name: string
    level: number
  }
}

/**
 * 员工列表项
 */
export interface EmployeeListItem {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  is_active: boolean
  position?: {
    id: string
    name: string
    level: number
  }
  campus_name?: string
  department_name?: string
  lead_count?: number
  current_lead_count?: number
  max_lead_count?: number
  employee_identities?: EmployeeIdentity[]
}

/**
 * 校区信息
 */
export interface Campus {
  id: string
  name: string
}

/**
 * 员工 API
 */
export const employeeApi = {
  /**
   * 获取员工列表（通用）
   */
  async getEmployees(params?: {
    page?: number
    size?: number
    search?: string
    campus_name?: string
    is_active?: boolean
  }): Promise<ApiResponse<{
    items: EmployeeListItem[]
    total: number
    page: number
    size: number
    pages: number
  }>> {
    const queryParams = {
      ...params,
      is_active: params?.is_active !== false,
      include_identities: true,
      use_cache: false
    }

    // 过滤掉 undefined 值
    const filteredParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== undefined)
    )

    const response = await apiClient.get<ApiResponse<{
      items: EmployeeListItem[]
      total: number
      page: number
      size: number
      pages: number
    }>>('/employees', { params: filteredParams })
    return response
  },

  /**
   * 获取课程顾问列表（用于线索分配）
   */
  async getCourseAdvisors(params?: {
    page?: number
    size?: number
    search?: string
    campus_name?: string
    is_active?: boolean
  }): Promise<ApiResponse<{
    items: EmployeeListItem[]
    total: number
    page: number
    size: number
    pages: number
  }>> {
    const advisorParams = {
      ...params,
      position_names: '顾问,销售顾问,课程顾问,课程销售',
      is_active: params?.is_active !== false,
      include_identities: true,
      use_cache: false
    }

    // 过滤掉 undefined 值
    const filteredParams = Object.fromEntries(
      Object.entries(advisorParams).filter(([_, value]) => value !== undefined)
    )

    const response = await apiClient.get<ApiResponse<{
      items: EmployeeListItem[]
      total: number
      page: number
      size: number
      pages: number
    }>>('/employees', { params: filteredParams })
    return response
  },

  /**
   * 获取当前用户可访问的校区列表
   */
  async getCurrentUserCampuses(): Promise<Campus[]> {
    const response = await apiClient.get<ApiResponse<Campus[]>>('/auth/me/campuses')
    return response.data || []
  }
}

/**
 * 云客外呼 API
 * 用于拨打电话和挂断通话
 */
export const yunkeApi = {
  /**
   * 拨打电话
   */
  async dialPhone(phone: string): Promise<ApiResponse<{ call_id: string; status: string; message?: string }>> {
    const response = await apiClient.post<ApiResponse<{ call_id: string; status: string; message?: string }>>(
      '/yunke/call/dial',
      { phone }
    )
    return response
  },

  /**
   * 挂断通话
   */
  async hangUpCall(callId: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message?: string }>>(
      '/yunke/call/hangup',
      { call_id: callId }
    )
    return response
  }
}
