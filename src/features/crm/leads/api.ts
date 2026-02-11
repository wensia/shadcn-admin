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

  /** 获取线索详情 */
  getLead(id: string, includeStyles = false): Promise<ApiResponse<Lead>> {
    return apiClient.get<ApiResponse<Lead>>(`/leads/${id}`, {
      params: { include_styles: includeStyles }
    })
  },

  /** 创建线索 */
  createLead(data: LeadCreate): Promise<ApiResponse<Lead>> {
    return apiClient.post<ApiResponse<Lead>>('/leads', data)
  },

  /** 更新线索 */
  updateLead(id: string, data: Partial<LeadUpdate>): Promise<ApiResponse<Lead>> {
    return apiClient.put<ApiResponse<Lead>>(`/leads/${id}`, data)
  },

  /** 删除线索 */
  deleteLead(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/leads/${id}`)
  },

  // ==================== 导出功能 ====================

  /** 导出线索 */
  exportLeads(params?: LeadListParams): Promise<any> {
    return apiClient.get('/leads/export', { params, responseType: 'blob' })
  },

  // ==================== 跟进记录 ====================

  /** 获取跟进记录 */
  getLeadFollowups(
    leadId: string,
    params?: { page?: number; size?: number }
  ): Promise<ApiResponse<LeadFollowup[]>> {
    return apiClient.get<ApiResponse<LeadFollowup[]>>(
      `/leads/${leadId}/followups`,
      { params }
    )
  },

  /** 添加跟进记录 */
  addLeadFollowup(
    leadId: string,
    data: LeadFollowupCreate
  ): Promise<ApiResponse<LeadFollowup>> {
    return apiClient.post<ApiResponse<LeadFollowup>>(
      `/leads/${leadId}/followups`,
      data
    )
  },

  // ==================== 变更记录 ====================

  /** 获取线索信息变更记录 */
  getLeadInfoChangeLogs(
    leadId: string,
    params?: { page?: number; size?: number }
  ): Promise<ApiResponse<LeadInfoChangeLog[]>> {
    return apiClient.get<ApiResponse<LeadInfoChangeLog[]>>(
      `/leads/${leadId}/info-change-logs`,
      { params }
    )
  },

  /** 获取线索归属变更记录 */
  getLeadOwnershipChangeLogs(
    leadId: string,
    params?: { page?: number; size?: number }
  ): Promise<ApiResponse<LeadOwnershipChangeLog[]>> {
    return apiClient.get<ApiResponse<LeadOwnershipChangeLog[]>>(
      `/leads/${leadId}/ownership-change-logs`,
      { params }
    )
  },

  // ==================== 批量操作 ====================

  /** 批量分配线索 */
  batchAssignLeads(data: {
    lead_ids: string[]
    advisor_id: string
    status?: LeadStatus
  }): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>('/leads/batch-assign', data)
  },

  /** 批量释放到公海 */
  batchReleaseLeads(data: {
    lead_ids: string[]
    reason: string
    remark?: string
  }): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>('/lead-pool/release', data)
  },

  /** 批量删除线索 */
  batchDeleteLeads(leadIds: string[]): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>('/leads/batch-delete', { lead_ids: leadIds })
  },

  /** 批量修改状态 */
  batchUpdateStatus(data: {
    lead_ids: string[]
    status: LeadStatus
  }): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>('/leads/batch-status-update', data)
  },

  /** 批量标记为待回访 */
  batchMarkFollowup(data: {
    lead_ids: string[]
    priority?: number
    next_followup_at?: string
    remark?: string
  }): Promise<ApiResponse<{
    success_count: number
    failed_count: number
    total: number
  }>> {
    return apiClient.post('/leads/batch-mark-followup', data)
  },

  /** 批量删除线索（仅超级管理员） */
  batchDelete(data: {
    lead_ids: string[]
    delete_reason?: string
  }): Promise<ApiResponse<{
    success_count: number
    failed_count: number
    total: number
    failed_leads?: Array<{ id: string; reason: string }>
  }>> {
    return apiClient.post('/leads/batch-delete', data)
  },

  // ==================== 辅助功能 ====================

  /** 获取筛选选项 */
  getFilterOptions(): Promise<ApiResponse<{
    source_channels: Array<{ id: string; name: string; category: string }>
    creators: Array<{ id: string; name: string; username: string }>
    advisors: Array<{ id: string; name: string; username: string }>
    campuses?: Array<{ id: string; name: string }>
    followup_results?: Array<{ value: string; label: string }>
  }>> {
    return apiClient.get('/leads/filter-options')
  },

  /** 检查手机号重复 */
  checkPhoneDuplicate(
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
    const params: Record<string, string> = { phone }
    if (excludeLeadId) params.exclude_lead_id = excludeLeadId
    return apiClient.get('/leads/check-phone-duplicate', { params })
  },

  /** 通过手机号搜索线索（用于到访预约等场景） */
  searchLeadsByPhone(phone: string): Promise<ApiResponse<{
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
    return apiClient.get('/leads', { params: { search: phone, page: 1, size: 10 } })
  },

  // ==================== 待回访管理 ====================

  /** 获取待回访线索列表 */
  getPendingFollowupLeads(params?: {
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
    return apiClient.get('/leads/pending-followup', { params })
  },

  /** 更新线索回访信息 */
  updateFollowupInfo(
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
    return apiClient.put(`/leads/${leadId}/followup-info`, data)
  },

  // ==================== 统计功能 ====================

  /** 获取市场数据统计 */
  getMarketStatistics(params?: {
    date_from?: string
    date_to?: string
    staff_id?: string
    campus_id?: string
  }): Promise<ApiResponse<MarketStatisticsResponse>> {
    return apiClient.get('/leads/statistics/market', { params })
  },

  /** 获取地推采单人统计 */
  getDituiCollectorStats(params?: {
    start_date?: string
    end_date?: string
    marketer_id?: string
  }): Promise<ApiResponse<Array<{
    collector_name: string
    count: number
    percentage: string
  }>>> {
    return apiClient.get('/leads/statistics/ditui-collectors', { params })
  },

  /** 获取地推采单地点统计 */
  getDituiLocationStats(params?: {
    start_date?: string
    end_date?: string
  }): Promise<ApiResponse<Array<{
    location: string
    count: number
    percentage: string
  }>>> {
    return apiClient.get('/leads/statistics/ditui-locations', { params })
  },

  /** 获取地推首次回访状态统计 */
  getDituiFirstFollowupStats(params?: {
    start_date?: string
    end_date?: string
    marketer_id?: string
  }): Promise<ApiResponse<DituiFirstFollowupStats>> {
    return apiClient.get('/leads/statistics/ditui-first-followup', { params })
  },

  /** 获取地推待处理统计 */
  getDituiPendingStats(params?: {
    start_date?: string
    end_date?: string
    marketer_id?: string
  }): Promise<ApiResponse<DituiPendingStats>> {
    return apiClient.get('/leads/statistics/ditui-pending', { params })
  },

  /** 获取地推采单时间统计 */
  getDituiCollectionTimeStats(params?: {
    start_date?: string
    end_date?: string
    marketer_id?: string
  }): Promise<ApiResponse<{ items: DituiCollectionTimeStat[]; total: number }>> {
    return apiClient.get('/leads/statistics/ditui-collection-time', { params })
  },

  /** 获取顾问今日活动统计 */
  getAdvisorTodayActivity(): Promise<ApiResponse<AdvisorTodayActivityResponse>> {
    return apiClient.get('/leads/statistics/advisor-today-activity')
  },

  /** 获取顾问线索汇总 */
  getAdvisorLeadSummary(): Promise<ApiResponse<AdvisorLeadSummaryResponse>> {
    return apiClient.get('/leads/statistics/advisor-lead-summary')
  },

  /** 获取顾问待回访线索按渠道分组统计 */
  getAdvisorPendingByChannel(): Promise<ApiResponse<AdvisorPendingByChannelResponse>> {
    return apiClient.get('/leads/statistics/advisor-pending-by-channel')
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
/** 过滤掉 undefined 值 */
function filterUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  )
}

type EmployeeListResponse = ApiResponse<{
  items: EmployeeListItem[]
  total: number
  page: number
  size: number
  pages: number
}>

export const employeeApi = {
  /** 获取员工列表（通用） */
  getEmployees(params?: {
    page?: number
    size?: number
    search?: string
    campus_name?: string
    is_active?: boolean
  }): Promise<EmployeeListResponse> {
    return apiClient.get<EmployeeListResponse>('/employees', {
      params: filterUndefined({
        ...params,
        is_active: params?.is_active !== false,
        include_identities: true,
        use_cache: false
      })
    })
  },

  /** 获取课程顾问列表（用于线索分配） */
  getCourseAdvisors(params?: {
    page?: number
    size?: number
    search?: string
    campus_name?: string
    is_active?: boolean
  }): Promise<EmployeeListResponse> {
    return apiClient.get<EmployeeListResponse>('/employees', {
      params: filterUndefined({
        ...params,
        position_names: '顾问,销售顾问,课程顾问,课程销售',
        is_active: params?.is_active !== false,
        include_identities: true,
        use_cache: false
      })
    })
  },

  /** 获取当前用户可访问的校区列表 */
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
  /** 拨打电话 */
  dialPhone(phone: string): Promise<ApiResponse<{ call_id: string; status: string; message?: string }>> {
    return apiClient.post('/yunke/call/dial', { phone })
  },

  /** 挂断通话 */
  hangUpCall(callId: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    return apiClient.post('/yunke/call/hangup', { call_id: callId })
  }
}
