/**
 * 日控表公共工具函数
 * 提取自 promised-visit-tab / actual-visit-tab / payment-tab 的重复代码
 */

import type { ApprovalStatus } from './api'

export const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

/** 格式化日期字符串为 "YYYY-MM-DD 周X" */
export function formatDateWithWeekday(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  try {
    const datePart = dateStr.split('T')[0]
    const date = new Date(datePart)
    const weekday = weekDays[date.getDay()]
    return `${datePart} ${weekday}`
  } catch {
    return dateStr
  }
}

/** 审批状态 → Semi Tag 颜色映射 */
export const approvalStatusColorMap: Record<ApprovalStatus, 'grey' | 'yellow' | 'green' | 'red'> = {
  draft: 'grey',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
}

/** 缴费状态 → Semi Tag 颜色映射 */
export const paymentStatusColorMap: Record<string, 'orange' | 'green' | 'red' | 'grey'> = {
  pending: 'orange',
  confirmed: 'green',
  rejected: 'red',
  refunded: 'grey',
}
