/**
 * 部门功能权限 Hook
 *
 * 从 auth store 读取当前用户的 permissions 列表，
 * 提供 hasPermission / hasAnyPermission 判断函数。
 *
 * 规则:
 * - 超管 (is_superuser) → 所有权限返回 true
 * - permissions 为空/undefined → 全开放（向后兼容）
 * - permissions 包含指定码 → true
 */

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 权限码常量（与后端 Permission 枚举保持一致）
 */
export const PERMISSIONS = {
  LEADS_LIST: 'leads:list',
  LEADS_CREATE: 'leads:create',
  ORDERS_CREATE: 'orders:create',
  STUDENTS_LIST: 'students:list',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * 权限预设模板（与后端 PERMISSION_PRESETS 保持一致）
 */
export const PERMISSION_PRESETS: Record<string, PermissionCode[]> = {
  '咨询部': [PERMISSIONS.LEADS_LIST, PERMISSIONS.LEADS_CREATE, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.STUDENTS_LIST],
  '市场部': [PERMISSIONS.LEADS_LIST, PERMISSIONS.LEADS_CREATE],
  '学管部': [PERMISSIONS.LEADS_LIST, PERMISSIONS.LEADS_CREATE, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.STUDENTS_LIST],
  'TMK': [PERMISSIONS.LEADS_LIST],
}

/**
 * 权限码的中文标签
 */
export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.LEADS_LIST]: '线索列表',
  [PERMISSIONS.LEADS_CREATE]: '创建线索',
  [PERMISSIONS.ORDERS_CREATE]: '创建订单',
  [PERMISSIONS.STUDENTS_LIST]: '学员列表',
}

/**
 * 所有可用的权限码列表（用于 UI 展示）
 */
export const ALL_PERMISSIONS: PermissionCode[] = Object.values(PERMISSIONS)

export function usePermission() {
  const user = useAuthStore((s) => s.user)
  const isSuperUser = user?.is_superuser ?? false
  const permissions = user?.permissions

  const hasPermission = useCallback(
    (code: string): boolean => {
      // 超管拥有所有权限
      if (isSuperUser) return true
      // permissions 为空/undefined → 全开放
      if (!permissions || permissions.length === 0) return true
      return permissions.includes(code)
    },
    [isSuperUser, permissions]
  )

  const hasAnyPermission = useCallback(
    (codes: string[]): boolean => {
      if (isSuperUser) return true
      if (!permissions || permissions.length === 0) return true
      return codes.some((code) => permissions.includes(code))
    },
    [isSuperUser, permissions]
  )

  return { hasPermission, hasAnyPermission, permissions: permissions ?? [], isSuperUser }
}
