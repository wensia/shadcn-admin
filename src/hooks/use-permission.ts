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
  STUDENTS_CREATE: 'students:create',
  STUDENTS_UPDATE: 'students:update',
  PARENTS_LIST: 'parents:list',
  PARENTS_UPDATE: 'parents:update',
  TEACHERS_LIST: 'teachers:list',
  TEACHERS_UPDATE: 'teachers:update',
  EDUCATION_SCHEDULE: 'education:schedule',
  EDUCATION_CONSUME: 'education:consume',
  EDUCATION_BALANCE: 'education:balance',
  EDUCATION_FINANCE: 'education:finance',
  TEACHER_SETTLEMENT_LIST: 'teacher_settlement:list',
  TEACHER_SETTLEMENT_CONFIRM: 'teacher_settlement:confirm',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * 权限预设模板（与后端 PERMISSION_PRESETS 保持一致）
 */
const CONSULTING_PERMISSION_PRESET: PermissionCode[] = [
  PERMISSIONS.LEADS_LIST,
  PERMISSIONS.LEADS_CREATE,
  PERMISSIONS.ORDERS_CREATE,
  PERMISSIONS.STUDENTS_LIST,
  PERMISSIONS.STUDENTS_CREATE,
  PERMISSIONS.STUDENTS_UPDATE,
  PERMISSIONS.PARENTS_LIST,
  PERMISSIONS.PARENTS_UPDATE,
  PERMISSIONS.TEACHERS_LIST,
  PERMISSIONS.EDUCATION_SCHEDULE,
  PERMISSIONS.EDUCATION_CONSUME,
  PERMISSIONS.EDUCATION_BALANCE,
]

export const PERMISSION_PRESETS: Record<string, PermissionCode[]> = {
  '咨询部': [...CONSULTING_PERMISSION_PRESET],
  '市场部': [PERMISSIONS.LEADS_LIST, PERMISSIONS.LEADS_CREATE],
  '学管部': [
    PERMISSIONS.LEADS_LIST,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.STUDENTS_LIST,
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_UPDATE,
    PERMISSIONS.PARENTS_LIST,
    PERMISSIONS.PARENTS_UPDATE,
    PERMISSIONS.TEACHERS_LIST,
    PERMISSIONS.TEACHERS_UPDATE,
    PERMISSIONS.EDUCATION_SCHEDULE,
    PERMISSIONS.EDUCATION_CONSUME,
    PERMISSIONS.EDUCATION_BALANCE,
    PERMISSIONS.EDUCATION_FINANCE,
    PERMISSIONS.TEACHER_SETTLEMENT_LIST,
    PERMISSIONS.TEACHER_SETTLEMENT_CONFIRM,
  ],
  'TMK': [...CONSULTING_PERMISSION_PRESET],
  '行政部': [
    PERMISSIONS.EDUCATION_FINANCE,
    PERMISSIONS.TEACHER_SETTLEMENT_LIST,
    PERMISSIONS.TEACHER_SETTLEMENT_CONFIRM,
  ],
}

/**
 * 权限码的中文标签
 */
export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.LEADS_LIST]: '线索列表',
  [PERMISSIONS.LEADS_CREATE]: '创建线索',
  [PERMISSIONS.ORDERS_CREATE]: '创建订单',
  [PERMISSIONS.STUDENTS_LIST]: '学员列表',
  [PERMISSIONS.STUDENTS_CREATE]: '创建学员',
  [PERMISSIONS.STUDENTS_UPDATE]: '编辑学员',
  [PERMISSIONS.PARENTS_LIST]: '家长列表',
  [PERMISSIONS.PARENTS_UPDATE]: '编辑家长',
  [PERMISSIONS.TEACHERS_LIST]: '老师列表',
  [PERMISSIONS.TEACHERS_UPDATE]: '编辑老师',
  [PERMISSIONS.EDUCATION_SCHEDULE]: '教务排课',
  [PERMISSIONS.EDUCATION_CONSUME]: '消课管理',
  [PERMISSIONS.EDUCATION_BALANCE]: '课时余额',
  [PERMISSIONS.EDUCATION_FINANCE]: '教务收费',
  [PERMISSIONS.TEACHER_SETTLEMENT_LIST]: '老师结算列表',
  [PERMISSIONS.TEACHER_SETTLEMENT_CONFIRM]: '确认老师结算',
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
