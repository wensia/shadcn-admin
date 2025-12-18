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
  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      {
        username: data.username,
        password: data.password
      }
    )
    return response
  },

  /**
   * 用户登出
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await apiClient.post<ApiResponse<void>>('/auth/logout')
    return response
  },

  /**
   * 刷新token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<{
    access_token: string
    token_type: string
  }>> {
    const response = await apiClient.post<ApiResponse<{
      access_token: string
      token_type: string
    }>>('/auth/refresh', {
      refresh_token: refreshToken
    })
    return response
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    const response = await apiClient.get<ApiResponse<UserInfo>>('/auth/me')
    return response
  }
}

export default authApi
