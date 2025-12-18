/**
 * 认证状态管理Store
 * 使用Zustand + localStorage持久化
 * 与Vue版本共享localStorage keys
 * 参考: frontend-vue/src/stores/auth.ts
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  created_at: string
  updated_at: string
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

  // Actions
  setAuthState: (token: string, refreshToken: string, user: UserInfo) => void
  clearAuthState: () => void
  restoreFromStorage: () => void
  updateUser: (user: Partial<UserInfo>) => void
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
          isAuthenticated: false
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
        } catch (error) {
          console.error('Failed to restore auth state from localStorage:', error)
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
      }
    }),
    {
      name: 'auth-storage', // localStorage key for zustand persist
      // 只持久化这些字段
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
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
