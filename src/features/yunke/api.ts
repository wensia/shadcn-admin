/**
 * 云客模块 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type {
  YunkeAdminStatus,
  YunkeAdminLoginResponse,
  YunkeSubAccount,
  YunkeAvailableEmployee,
  YunkePasswordResetResponse,
  YunkeBatchLoginResult,
  YunkeLoginStatusResult,
  YunkeAutoSyncResult,
  YunkeDashboardStats,
} from './types'

/**
 * 云客管理 API
 */
export const yunkeApi = {
  // ========================================================================
  // 管理员认证
  // ========================================================================

  /** 管理员登录 */
  async login(data?: { phone?: string; password?: string }): Promise<YunkeAdminLoginResponse> {
    const response = await apiClient.post<ApiResponse<YunkeAdminLoginResponse>>('/yunke/admin/login', data)
    return response.data!
  },

  /** 获取管理员状态 */
  async getStatus(): Promise<YunkeAdminStatus> {
    const response = await apiClient.get<ApiResponse<YunkeAdminStatus>>('/yunke/admin/status')
    return response.data!
  },

  /** 管理员登出 */
  async logout(): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<{ cookies_cleared: boolean }>>('/yunke/admin/logout')
    return response.data?.cookies_cleared ?? false
  },

  // ========================================================================
  // 子账号管理
  // ========================================================================

  /** 获取子账号列表 */
  async getSubAccounts(params?: {
    page?: number
    page_size?: number
    real_name?: string
    auth_status?: string
    department_id?: string
  }): Promise<{
    users: YunkeSubAccount[]
    total: number
    page: number
    page_size: number
  }> {
    const response = await apiClient.post<ApiResponse<{
      users: YunkeSubAccount[]
      total: number
      page: number
      page_size: number
    }>>('/yunke/admin/sub-accounts', params)
    return response.data!
  },

  /** 获取可绑定的员工列表 */
  async getAvailableEmployees(): Promise<YunkeAvailableEmployee[]> {
    const response = await apiClient.get<ApiResponse<YunkeAvailableEmployee[]>>('/yunke/admin/available-employees')
    return response.data || []
  },

  /** 绑定员工 */
  async bindEmployee(data: {
    yunke_phone: string
    yunke_user_id: string
    employee_id: string
  }): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message?: string }>>('/yunke/admin/bind-employee', data)
    return response.data!
  },

  /** 解绑员工 */
  async unbindEmployee(data: {
    employee_id: string
  }): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message?: string }>>('/yunke/admin/unbind-employee', data)
    return response.data!
  },

  /** 重置密码 */
  async resetPassword(data: {
    yunke_user_id: string
    phone: string
  }): Promise<YunkePasswordResetResponse> {
    const response = await apiClient.post<ApiResponse<YunkePasswordResetResponse>>('/yunke/auth/reset-password', data)
    return response.data!
  },

  /** 自动同步绑定（根据姓名匹配） */
  async autoSyncBindings(): Promise<YunkeAutoSyncResult> {
    const response = await apiClient.post<ApiResponse<YunkeAutoSyncResult>>('/yunke/admin/auto-sync-bindings')
    return response.data!
  },

  // ========================================================================
  // 登录状态管理
  // ========================================================================

  /** 检查所有员工的云客登录状态 */
  async checkAllLoginStatus(): Promise<YunkeLoginStatusResult> {
    const response = await apiClient.get<ApiResponse<YunkeLoginStatusResult>>('/yunke/admin/check-login-status')
    return response.data!
  },

  /** 批量更新登录状态 */
  async batchUpdateLogin(): Promise<YunkeBatchLoginResult> {
    const response = await apiClient.post<ApiResponse<YunkeBatchLoginResult>>('/yunke/admin/batch-update-login')
    return response.data!
  },

  // ========================================================================
  // 仪表盘统计
  // ========================================================================

  /** 获取仪表盘统计数据 */
  async getDashboardStats(): Promise<YunkeDashboardStats> {
    const response = await apiClient.get<ApiResponse<YunkeDashboardStats>>('/yunke/admin/dashboard-stats')
    return response.data || {
      total_accounts: 0,
      active_accounts: 0,
      logged_in_accounts: 0,
      bound_employees: 0,
      today_calls: 0,
      today_duration: 0,
    }
  },
}

// 导出默认 API
export default yunkeApi
