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
  YunkeCredential,
  YunkeCredentialCreate,
  YunkeCredentialUpdate,
  YunkeCredentialStatus,
  YunkeCredentialListResponse,
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

/**
 * 云客账号凭证管理 API
 */
export const yunkeCredentialsApi = {
  /** 获取账号凭证列表 */
  async getCredentials(params?: {
    company_id?: string
    status?: number
    skip?: number
    limit?: number
  }): Promise<YunkeCredentialListResponse> {
    const response = await apiClient.get<ApiResponse<YunkeCredentialListResponse>>(
      '/external/yunke-accounts',
      { params }
    )
    return response.data!
  },

  /** 获取单个账号凭证 */
  async getCredential(id: string): Promise<YunkeCredential> {
    const response = await apiClient.get<ApiResponse<YunkeCredential>>(
      `/external/yunke-accounts/${id}`
    )
    return response.data!
  },

  /** 创建账号凭证（Upsert） */
  async createCredential(data: YunkeCredentialCreate): Promise<YunkeCredential> {
    const response = await apiClient.post<ApiResponse<YunkeCredential>>(
      '/external/yunke-accounts',
      data
    )
    return response.data!
  },

  /** 更新账号密码 */
  async updateCredential(id: string, data: YunkeCredentialUpdate): Promise<YunkeCredential> {
    const response = await apiClient.put<ApiResponse<YunkeCredential>>(
      `/external/yunke-accounts/${id}`,
      data
    )
    return response.data!
  },

  /** 删除账号凭证 */
  async deleteCredential(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(
      `/external/yunke-accounts/${id}`
    )
    return response.data!
  },

  /** 手动登录/刷新登录 */
  async loginCredential(id: string): Promise<{ success: boolean; message: string; status?: number }> {
    const response = await apiClient.post<ApiResponse<{ status: number }>>(
      `/external/yunke-accounts/${id}/refresh`
    )
    // apiClient 返回的是完整的 ApiResponse，需要根据 success 字段判断
    const apiResponse = response as unknown as ApiResponse<{ status: number }>
    return {
      success: apiResponse.success,
      message: apiResponse.message || '',
      status: apiResponse.data?.status,
    }
  },

  /** 检查账号状态 */
  async checkCredentialStatus(id: string): Promise<YunkeCredentialStatus> {
    const response = await apiClient.get<ApiResponse<YunkeCredentialStatus>>(
      `/external/yunke-accounts/${id}/status`
    )
    return response.data!
  },

  /** 获取所有凭证的子账号列表 */
  async getSubAccountsFromCredentials(params?: {
    page?: number
    page_size?: number
    real_name?: string
  }): Promise<{
    users: YunkeSubAccount[]
    total: number
    accounts_count: number
    errors?: Array<{ account_id: string; account_phone: string; error: string }>
  }> {
    const response = await apiClient.post<ApiResponse<{
      users: YunkeSubAccount[]
      total: number
      accounts_count: number
      errors?: Array<{ account_id: string; account_phone: string; error: string }>
    }>>('/external/yunke-accounts/sub-accounts', params)
    return response.data!
  },

  /** 获取指定凭证的子账号列表 */
  async getSubAccountsByCredential(
    accountId: string,
    params?: {
      page?: number
      page_size?: number
      real_name?: string
    }
  ): Promise<{
    users: YunkeSubAccount[]
    total: number
    account: {
      id: string
      phone: string
      company_code: string | null
      company_name: string | null
    }
  }> {
    const response = await apiClient.post<ApiResponse<{
      users: YunkeSubAccount[]
      total: number
      account: {
        id: string
        phone: string
        company_code: string | null
        company_name: string | null
      }
    }>>(`/external/yunke-accounts/${accountId}/sub-accounts`, params)
    return response.data!
  },
}

// 导出默认 API
export default yunkeApi
