/**
 * 共享日期筛选工具函数
 * 供顾问数据中心各 Tab 使用
 */

import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'

export type DateMode = 'today' | 'week' | 'month' | 'single' | 'range'

export function formatDateStr(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}

export function getCurrentWeekRange(baseDate: Date): [Date, Date] {
  return [
    startOfWeek(baseDate, { weekStartsOn: 1 }),
    endOfWeek(baseDate, { weekStartsOn: 1 }),
  ]
}

export function getCurrentMonthRange(baseDate: Date): [Date, Date] {
  return [startOfMonth(baseDate), endOfMonth(baseDate)]
}

export function calculateDateFrom(
  dateMode: DateMode,
  today: Date,
  selectedDate: Date,
  selectedRange: [Date, Date],
): string {
  if (dateMode === 'today') return formatDateStr(today)
  if (dateMode === 'week') return formatDateStr(getCurrentWeekRange(today)[0])
  if (dateMode === 'month') return formatDateStr(getCurrentMonthRange(today)[0])
  if (dateMode === 'single') return formatDateStr(selectedDate)
  return formatDateStr(selectedRange[0])
}

export function calculateDateTo(
  dateMode: DateMode,
  today: Date,
  selectedDate: Date,
  selectedRange: [Date, Date],
): string {
  if (dateMode === 'today') return formatDateStr(today)
  if (dateMode === 'week') return formatDateStr(getCurrentWeekRange(today)[1])
  if (dateMode === 'month') return formatDateStr(getCurrentMonthRange(today)[1])
  if (dateMode === 'single') return formatDateStr(selectedDate)
  return formatDateStr(selectedRange[1])
}

/** dateMode 转 period 数字（0=今天, 1=本周, 2=本月）, 其余返回 undefined */
export function dateModeToCallPeriod(dateMode: DateMode): number | undefined {
  if (dateMode === 'today') return 0
  if (dateMode === 'week') return 1
  if (dateMode === 'month') return 2
  return undefined
}
