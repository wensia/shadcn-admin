/**
 * 咨询工作台类型定义
 */

import type { LeadListItem } from '../leads/types'

/**
 * 月度日历数据 - 日期到待跟进数量的映射
 */
export interface MonthCalendarData {
  [date: string]: number
}

/**
 * 工作台线索项 - 扩展 LeadListItem
 */
export interface WorkbenchLeadItem extends LeadListItem {
  /** 是否逾期 */
  is_overdue?: boolean
  /** 距离跟进的天数（负数为逾期） */
  days_until_followup?: number
}

/**
 * 个人统计数据
 */
export interface PersonalStatistics {
  /** 今日跟进 */
  today_followups: number
  /** 本周跟进 */
  week_followups: number
  /** 本月跟进 */
  month_followups: number
  /** 待跟进 */
  pending_followups: number
  /** 本月到访 */
  month_visits: number
  /** 本月成交 */
  month_deals: number
}

/**
 * Tab 类型
 */
export type WorkbenchTab = 'calendar' | 'today' | 'statistics'
