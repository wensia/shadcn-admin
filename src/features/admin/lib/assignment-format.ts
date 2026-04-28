/**
 * 任命显示格式化 — 在多个页面共享
 *
 * - roleTagColor: 根据角色返回 Semi Tag 颜色
 * - scopeLabel: 组合作用域描述（校区：XX / 区域：YY 等）
 * - formatDate: 日期短格式 YYYY-MM-DD
 * - scopeLabelByType: scopeType → 中文标签（作用域下拉用）
 */

import type { SemiTagColor } from '@/lib/semi-types'
import type { AssignmentItem, AssignmentRole } from '../types'

export function roleTagColor(role: AssignmentRole | string): SemiTagColor {
  const map: Record<string, SemiTagColor> = {
    principal: 'red',
    vice_principal: 'orange',
    area_director: 'purple',
    area_manager: 'violet',
    teaching_supervisor: 'cyan',
    dept_manager: 'blue',
    dept_deputy: 'light-blue',
    dept_supervisor: 'grey',
  }
  return map[role as string] || 'grey'
}

export function scopeLabel(a: AssignmentItem): string {
  if (a.campus_name) return `校区：${a.campus_name}`
  if (a.area_name) return `区域：${a.area_name}`
  if (a.campus_department_label) return `校区部门：${a.campus_department_label}`
  if (a.area_department_label) return `区域部门：${a.area_department_label}`
  if (a.district_department_label) return `地区部门：${a.district_department_label}`
  return '（作用域未知）'
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return '-'
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function scopeLabelByType(
  t:
    | 'campus_id'
    | 'area_id'
    | 'campus_department_id'
    | 'area_department_id'
    | 'district_department_id'
    | string,
): string {
  return (
    {
      campus_id: '校区',
      area_id: '区域',
      campus_department_id: '校区部门',
      area_department_id: '区域部门',
      district_department_id: '地区部门',
    }[t] || '作用域'
  )
}

/** 组织架构树节点 type → 中文标签 */
export function orgNodeTypeLabel(type: string): string {
  return (
    {
      region: '大区',
      district: '地区',
      area: '区域',
      area_office: '区域办',
      campus: '校区',
      campus_department: '校区部门',
      area_department: '区域部门',
      district_department: '地区部门',
    }[type] || type
  )
}

/** 组织架构树节点 type → Semi Tag 颜色 */
export function orgNodeTypeColor(type: string): SemiTagColor {
  const map: Record<string, SemiTagColor> = {
    region: 'red',
    district: 'orange',
    area: 'amber',
    area_office: 'purple',
    campus: 'blue',
    campus_department: 'cyan',
    area_department: 'teal',
    district_department: 'green',
  }
  return map[type] || 'grey'
}
