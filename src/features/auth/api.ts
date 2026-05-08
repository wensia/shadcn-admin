/**
 * 认证API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type { UserInfo, IdentityInfo } from '@/stores/auth-store'

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * 登录响应（单身份 - 直接进入系统）
 */
export interface LoginResponseSingle {
  access_token: string
  refresh_token: string
  token_type: string
  user: UserInfo
  requires_identity_selection: false
  identity: IdentityInfo
}

/**
 * 登录响应（多身份 - 需要选择身份）
 */
export interface LoginResponseMulti {
  access_token: string
  refresh_token: string
  token_type: string
  requires_identity_selection: true
  identities: IdentityInfo[]
}

/**
 * 登录响应联合类型
 */
export type LoginResponse = LoginResponseSingle | LoginResponseMulti

/**
 * 选择身份请求
 */
export interface SelectIdentityRequest {
  identity_id: string
}

/**
 * 选择身份响应
 */
export interface SelectIdentityResponse {
  user: UserInfo
  identity: IdentityInfo
  permissions: string[]
  campus_ids: string[]
}

/**
 * 认证API对象
 */
export const authApi = {
  /** 用户登录 */
  login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data)
  },

  /** 选择/切换身份 */
  selectIdentity(data: SelectIdentityRequest): Promise<ApiResponse<SelectIdentityResponse>> {
    return apiClient.post<ApiResponse<SelectIdentityResponse>>('/auth/select-identity', data)
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
  },

  /** 修改密码 */
  changePassword(data: {
    current_password: string
    new_password: string
    confirm_password: string
  }): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>('/auth/change-password', data)
  },

  /** 请求重置密码邮件 */
  resetPassword(data: { email: string }): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>('/auth/reset-password', data)
  },

  /** 确认重置/设置密码 */
  confirmResetPassword(data: {
    token: string
    new_password: string
    confirm_password: string
  }): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>('/auth/reset-password/confirm', data)
  },
}
