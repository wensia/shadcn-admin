/**
 * 认证状态管理Store
 * 使用Zustand + localStorage持久化
 * 与Vue版本共享localStorage keys
 * 参考: 旧版前端认证状态实现
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'

// localStorage Keys - 与Vue版本保持一致
const AUTH_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info'
}

/**
 * 用户信息接口
 * 与后端UserPublic schema对应
 */
export interface UserInfo {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  is_superuser: boolean
  campus_id?: string
  campus_name?: string
  department_id?: string
  department_name?: string
  position_id?: string
  position_name?: string
  is_active: boolean
  employee_type?: string
  roles?: string[]
  accessible_pages?: string[]
  permissions?: string[]
  created_at: string
  updated_at: string
}

/**
 * 身份信息接口
 * 对应后端 EmployeeIdentity
 */
export interface IdentityInfo {
  id: string
  scope_type: 'campus' | 'area' | 'district' | 'region'
  campus_name?: string
  area_name?: string
  district_name?: string
  region_name?: string
  department_name: string
  position_name: string
  is_last_used: boolean
}

/**
 * 选择身份响应
 */
interface SelectIdentityResponse {
  user: UserInfo
  identity: IdentityInfo
  permissions: string[]
  campus_ids: string[]
}

/**
 * 认证状态接口
 */
interface AuthState {
  // 状态
  user: UserInfo | null
  accessToken: string
  refreshToken: string
  isAuthenticated: boolean

  // 身份上下文
  currentIdentity: IdentityInfo | null
  availableIdentities: IdentityInfo[]
  identityPermissions: string[]
  campusIds: string[]

  // Actions
  setAuthState: (token: string, refreshToken: string, user: UserInfo) => void
  clearAuthState: () => void
  restoreFromStorage: () => void
  updateUser: (user: Partial<UserInfo>) => void

  // 身份相关 Actions
  setTempToken: (token: string, refreshToken: string) => void
  setAvailableIdentities: (identities: IdentityInfo[]) => void
  setCurrentIdentity: (identity: IdentityInfo) => void
  setIdentityContext: (identity: IdentityInfo, permissions: string[], campusIds: string[]) => void
  selectIdentity: (identityId: string) => Promise<SelectIdentityResponse>
}

/**
 * 认证Store
 * 使用persist中间件实现localStorage持久化
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      accessToken: '',
      refreshToken: '',
      isAuthenticated: false,

      // 身份上下文初始状态
      currentIdentity: null,
      availableIdentities: [],
      identityPermissions: [],
      campusIds: [],

      /**
       * 设置认证状态（登录成功后调用）
       */
      setAuthState: (token: string, refreshToken: string, user: UserInfo) => {
        // 同时写入独立的localStorage keys以与Vue版本共享
        localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, token)
        localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, refreshToken)
        localStorage.setItem(AUTH_KEYS.USER_INFO, JSON.stringify(user))

        set({
          accessToken: token,
          refreshToken,
          user,
          isAuthenticated: true
        })
      },

      /**
       * 清除认证状态（登出时调用）
       */
      clearAuthState: () => {
        // 同时清除独立的localStorage keys
        localStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN)
        localStorage.removeItem(AUTH_KEYS.USER_INFO)

        set({
          user: null,
          accessToken: '',
          refreshToken: '',
          isAuthenticated: false,
          currentIdentity: null,
          availableIdentities: [],
          identityPermissions: [],
          campusIds: [],
        })
      },

      /**
       * 从localStorage恢复认证状态
       * 应用启动时调用
       */
      restoreFromStorage: () => {
        try {
          const token = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN)
          const refresh = localStorage.getItem(AUTH_KEYS.REFRESH_TOKEN)
          const userStr = localStorage.getItem(AUTH_KEYS.USER_INFO)

          if (token && userStr) {
            const user = JSON.parse(userStr) as UserInfo

            set({
              accessToken: token,
              refreshToken: refresh || '',
              user,
              isAuthenticated: true
            })
          }
        } catch {
          get().clearAuthState()
        }
      },

      /**
       * 更新用户信息（部分更新）
       */
      updateUser: (updates: Partial<UserInfo>) => {
        const currentUser = get().user
        if (!currentUser) return

        const updatedUser = { ...currentUser, ...updates }

        // 同步到独立的localStorage key
        localStorage.setItem(AUTH_KEYS.USER_INFO, JSON.stringify(updatedUser))

        set({ user: updatedUser })
      },

      /**
       * 设置临时token（多身份登录，选择身份前）
       */
      setTempToken: (token: string, refreshToken: string) => {
        localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, token)
        localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, refreshToken)

        set({
          accessToken: token,
          refreshToken,
        })
      },

      /**
       * 设置可用身份列表
       */
      setAvailableIdentities: (identities: IdentityInfo[]) => {
        set({ availableIdentities: identities })
      },

      /**
       * 设置当前身份
       */
      setCurrentIdentity: (identity: IdentityInfo) => {
        set({ currentIdentity: identity })
      },

      /**
       * 设置身份上下文（身份 + 权限 + 数据范围）
       */
      setIdentityContext: (identity: IdentityInfo, permissions: string[], campusIds: string[]) => {
        set({
          currentIdentity: identity,
          identityPermissions: permissions,
          campusIds,
        })
      },

      /**
       * 选择/切换身份
       * 调用后端 API，更新本地状态
       */
      selectIdentity: async (identityId: string) => {
        const response = await apiClient.post<ApiResponse<SelectIdentityResponse>>(
          '/auth/select-identity',
          { identity_id: identityId }
        )

        if (!response.success || !response.data) {
          throw new Error(response.message || '选择身份失败')
        }

        const { user, identity, permissions, campus_ids } = response.data

        // 更新用户信息
        localStorage.setItem(AUTH_KEYS.USER_INFO, JSON.stringify(user))

        set({
          user,
          isAuthenticated: true,
          currentIdentity: identity,
          identityPermissions: permissions,
          campusIds: campus_ids,
        })

        return response.data
      },
    }),
    {
      name: 'auth-storage', // localStorage key for zustand persist
      // 持久化字段（含身份上下文）
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        currentIdentity: state.currentIdentity,
        availableIdentities: state.availableIdentities,
        identityPermissions: state.identityPermissions,
        campusIds: state.campusIds,
      })
    }
  )
)

/**
 * 便捷的hook用于判断是否已登录
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)

/**
 * 便捷的hook用于获取当前用户
 */
export const useCurrentUser = () => useAuthStore((state) => state.user)

/**
 * 便捷的hook用于判断是否为超级管理员
 */
export const useIsSuperUser = () => useAuthStore((state) => state.user?.is_superuser ?? false)

/**
 * 便捷的hook用于获取当前身份
 */
export const useCurrentIdentity = () => useAuthStore((state) => state.currentIdentity)

/**
 * 便捷的hook用于获取可用身份列表
 */
export const useAvailableIdentities = () => useAuthStore((state) => state.availableIdentities)

/**
 * 便捷的hook用于判断是否有多个身份
 */
export const useHasMultipleIdentities = () => useAuthStore((state) => state.availableIdentities.length > 1)
