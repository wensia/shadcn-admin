/**
 * 身份相关工具函数
 */

import type { IdentityInfo } from '@/stores/auth-store'

/**
 * 获取身份的 scope 显示名称
 */
export function getIdentityScopeName(identity: IdentityInfo): string {
  switch (identity.scope_type) {
    case 'campus':
      return identity.campus_name || '未知校区'
    case 'area':
      return identity.area_name || '未知大区'
    case 'district':
      return identity.district_name || '未知地区'
    case 'region':
      return identity.region_name || '未知片区'
    default:
      return '未知'
  }
}

/**
 * 获取 scope_type 的中文标签
 */
export function getScopeTypeLabel(scopeType: IdentityInfo['scope_type']): string {
  const labels: Record<string, string> = {
    campus: '校区',
    area: '大区',
    district: '地区',
    region: '片区',
  }
  return labels[scopeType] || '未知'
}
