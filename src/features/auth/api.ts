/**
 * 认证API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type { UserInfo } from '@/stores/auth-store'

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * 登录响应
 */
export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: UserInfo
}

/**
 * 认证API对象
 */
export const authApi = {
  /** 用户登录 */
  login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data)
  },

  /** 用户登出 */
  logout(): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>('/auth/logout')
  },

  /** 刷新token */
  refreshToken(refreshToken: string): Promise<ApiResponse<{
    access_token: string
    token_type: string
  }>> {
    return apiClient.post('/auth/refresh', { refresh_token: refreshToken })
  },

  /** 获取当前用户信息 */
  getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    return apiClient.get<ApiResponse<UserInfo>>('/auth/me')
  }
}
