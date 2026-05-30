import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banner,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popover,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui-19'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  IconAlertTriangle,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconCopy,
  IconDownload,
  IconDelete,
  IconEdit,
  IconExternalOpen,
  IconImage,
  IconInfoCircle,
  IconPlus,
  IconRefresh,
  IconSetting,
  IconTick,
  IconUserGroup,
} from '@douyinfe/semi-icons'
import { toBlob } from 'html-to-image'

import { toast } from '@/lib/toast'
import { copyToClipboard } from '@/lib/utils'
import { tableToXlsx, type ExportColumn } from '@/lib/craft-renderer/markdown/table-export'
import {
  xiaoditangApi,
  type XiaoditangActivityOption,
  type XiaodituiMarketOption,
  type XiaodituiSalaryDailyItem,
  type XiaodituiSalaryMarketRow,
  type XiaodituiSalaryStandard,
  type XiaodituiSalaryStandardPayload,
} from './api'

const { Text } = Typography

interface Props {
  enabled?: boolean
}

type SalaryWorkspaceMode = 'full' | 'summary'

export interface XiaodituiSalaryWorkspaceOpenParams {
  activityId?: number
  startDate: string
  endDate: string
  marketId?: number
}

interface SalaryWorkspaceProps extends Props {
  mode?: SalaryWorkspaceMode
  initialActivityId?: number
  initialStartDate?: string
  initialEndDate?: string
  initialMarketId?: number
  onOpenFullPage?: (params: XiaodituiSalaryWorkspaceOpenParams) => void
}

type SalaryFormValues = {
  effectiveDate: Date | string
  baseSalary: number
  guaranteedCount: number
  unitPrice: number
  startCount: number
  notes?: string
}

type ParttimeStatusFilter = 'all' | 'configured' | 'unconfigured' | 'unbound'

type ParttimeSettlementFilter = 'all' | 'none' | 'partial' | 'settled'

type ParttimeMarketRow = XiaodituiMarketOption & {
  salaryReport?: XiaodituiSalaryMarketRow | null
}

type CalendarDailyEntry = {
  marketId: number
  name: string
  nickname?: string | null
  mobile?: string | null
  count: number
  salary: number
  configured: boolean
}

type SalarySettlementMutationPayload = {
  action: 'settle' | 'unsettle'
  market: XiaodituiMarketOption
  dates: string[]
}

type SettlementExportColumnKey =
  | 'date'
  | 'count'
  | 'salary'
  | 'standard'
  | 'settled'
  | 'settled_at'

type SettlementExportColumn = ExportColumn & {
  key: SettlementExportColumnKey
  width: number
  align?: 'left' | 'right' | 'center'
  getValue: (item: XiaodituiSalaryDailyItem) => string
  getExcelValue?: (item: XiaodituiSalaryDailyItem) => string | number
}

type DailySettlementSummary = {
  totalDays: number
  configuredDays: number
  unconfiguredDays: number
  settledDays: number
  unsettledDays: number
  totalCount: number
  totalSalary: number
}

type SalarySummaryStats = {
  totalSalary: number
  settledSalary: number
  unsettledSalary: number
  settledDays: number
  unsettledDays: number
  unconfiguredMarketCount: number
}

interface DatePreset {
  label: string
  getRange: () => [Date, Date]
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function todayCN(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function todayRangeCN(): [Date, Date] {
  const t = todayCN()
  return [t, t]
}

function yesterdayRangeCN(): [Date, Date] {
  const y = todayCN()
  y.setDate(y.getDate() - 1)
  return [y, y]
}

function currentWeekRangeCN(): [Date, Date] {
  const end = todayCN()
  const start = new Date(end)
  const day = start.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - daysFromMonday)
  return [start, end]
}

function lastSevenDaysRangeCN(): [Date, Date] {
  const end = todayCN()
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return [start, end]
}

function currentMonthRangeCN(): [Date, Date] {
  const end = todayCN()
  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  return [start, end]
}

function previousMonthRangeCN(): [Date, Date] {
  const today = todayCN()
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const end = new Date(today.getFullYear(), today.getMonth(), 0)
  return [start, end]
}

function formatMoney(value?: number | null): string {
  return `¥${Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatRangeText(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`
}

function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_') || '未命名'
}

function normalizeFormDate(value: Date | string | undefined): string {
  if (!value) return toYMD(todayCN())
  if (value instanceof Date) return toYMD(value)
  return String(value).slice(0, 10)
}

function parseDate(value?: string | null): Date {
  if (!value) return todayCN()
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function isYMD(value?: string): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function getInitialDateRange(startDate?: string, endDate?: string): [Date, Date] {
  if (isYMD(startDate) && isYMD(endDate)) {
    return [parseDate(startDate), parseDate(endDate)]
  }
  return todayRangeCN()
}

function getSalaryFormValues(
  standard: XiaodituiSalaryStandard | null,
  startDate: string,
  joinedAt?: string | null,
): SalaryFormValues {
  if (standard) {
    return {
      effectiveDate: parseDate(standard.effective_date),
      baseSalary: standard.base_salary,
      guaranteedCount: standard.guaranteed_count,
      unitPrice: standard.unit_price,
      startCount: standard.start_count,
      notes: standard.notes || '',
    }
  }

  return {
    effectiveDate: parseDate(joinedAt || startDate),
    baseSalary: 0,
    guaranteedCount: 0,
    unitPrice: 0,
    startCount: 0,
    notes: '',
  }
}

function formatDateTime(value?: string | null): string {
  return value || '—'
}

function getLatestSalaryStandard(
  standards: XiaodituiSalaryStandard[],
): XiaodituiSalaryStandard | null {
  if (standards.length === 0) return null
  return [...standards].sort((a, b) =>
    String(b.effective_date || '').localeCompare(String(a.effective_date || '')),
  )[0] || null
}

function formatSalaryStandardSummary(standard: XiaodituiSalaryStandard): string {
  return `${standard.effective_date} 起 · 底薪 ${formatMoney(standard.base_salary)} · 保底 ${Number(
    standard.guaranteed_count || 0,
  ).toLocaleString()} 条 · 单价 ${formatMoney(standard.unit_price)} · 起算 ${Number(
    standard.start_count || 0,
  ).toLocaleString()} 条`
}

function getDailyStandardText(item: XiaodituiSalaryDailyItem): string {
  return item.standard ? '已配置' : '未配置'
}

function getDailySettlementText(item: XiaodituiSalaryDailyItem): string {
  if (!item.standard) return '未配置'
  return item.settled ? '已结算' : '未结算'
}

function getDailySettlementSummary(items: XiaodituiSalaryDailyItem[]): DailySettlementSummary {
  return items.reduce<DailySettlementSummary>((summary, item) => {
    const configured = Boolean(item.standard)
    summary.totalDays += 1
    summary.totalCount += Number(item.count || 0)
    summary.totalSalary += Number(item.salary || 0)
    if (configured) {
      summary.configuredDays += 1
      if (item.settled) {
        summary.settledDays += 1
      } else {
        summary.unsettledDays += 1
      }
    } else {
      summary.unconfiguredDays += 1
    }
    return summary
  }, {
    totalDays: 0,
    configuredDays: 0,
    unconfiguredDays: 0,
    settledDays: 0,
    unsettledDays: 0,
    totalCount: 0,
    totalSalary: 0,
  })
}

function getSettlementSummaryDisplayValue(
  key: SettlementExportColumnKey,
  summary: DailySettlementSummary,
): string {
  switch (key) {
    case 'date':
      return `合计 ${summary.totalDays.toLocaleString()} 天`
    case 'count':
      return `${summary.totalCount.toLocaleString()} 条`
    case 'salary':
      return formatMoney(summary.totalSalary)
    case 'standard':
      return `已配置 ${summary.configuredDays.toLocaleString()} 天 / 未配置 ${summary.unconfiguredDays.toLocaleString()} 天`
    case 'settled':
      return `已结 ${summary.settledDays.toLocaleString()} 天 / 未结 ${summary.unsettledDays.toLocaleString()} 天`
    case 'settled_at':
      return '—'
  }
}

function getSettlementSummaryExcelValue(
  key: SettlementExportColumnKey,
  summary: DailySettlementSummary,
): string | number {
  if (key === 'count') return summary.totalCount
  if (key === 'salary') return summary.totalSalary
  return getSettlementSummaryDisplayValue(key, summary)
}

function buildSettlementInfoCopyText(
  market: XiaodituiMarketOption,
  summary: DailySettlementSummary,
  rangeText: string,
): string {
  const marketName = market.name || market.nickname || '未记录'
  return [
    '结算信息',
    `结算时间段：${rangeText}`,
    `兼职姓名：${marketName}`,
    `出勤天数：${summary.totalDays.toLocaleString()} 天`,
    `收集数量：${summary.totalCount.toLocaleString()} 条`,
    `兼职工资：${formatMoney(summary.totalSalary)}`,
  ].join('\n')
}

function normalizeSettlementPlainTextCell(value: string | number): string {
  return String(value).replace(/[\t\r\n]+/g, ' ').trim()
}

function buildSettlementPlainTextTable(
  columns: SettlementExportColumn[],
  items: XiaodituiSalaryDailyItem[],
  summary: DailySettlementSummary,
): string {
  const header = columns.map((column) => normalizeSettlementPlainTextCell(column.label)).join('\t')
  const rows = items.map((item) =>
    columns
      .map((column) => normalizeSettlementPlainTextCell(column.getValue(item)))
      .join('\t'),
  )
  const summaryRow = columns
    .map((column) => normalizeSettlementPlainTextCell(getSettlementSummaryDisplayValue(column.key, summary)))
    .join('\t')
  return [header, ...rows, summaryRow].join('\n')
}

const settlementExportColumns: SettlementExportColumn[] = [
  {
    key: 'date',
    label: '日期',
    width: 132,
    getValue: (item) => item.date || '—',
  },
  {
    key: 'count',
    label: '信息量',
    type: 'number',
    width: 96,
    align: 'right',
    getValue: (item) => `${Number(item.count || 0).toLocaleString()} 条`,
    getExcelValue: (item) => Number(item.count || 0),
  },
  {
    key: 'salary',
    label: '工资',
    type: 'cny',
    width: 118,
    align: 'right',
    getValue: (item) => formatMoney(Number(item.salary || 0)),
    getExcelValue: (item) => Number(item.salary || 0),
  },
  {
    key: 'standard',
    label: '工资配置',
    width: 104,
    getValue: getDailyStandardText,
  },
  {
    key: 'settled',
    label: '结算状态',
    width: 104,
    getValue: getDailySettlementText,
  },
  {
    key: 'settled_at',
    label: '结算时间',
    width: 168,
    getValue: (item) => formatDateTime(item.settled_at),
  },
]

const defaultSettlementExportColumnKeys = settlementExportColumns.map((column) => column.key)

function getSettlementStatusMeta(row?: XiaodituiSalaryMarketRow | null) {
  if (!row || !row.settlement_status || row.settlement_status === 'none') {
    return { text: '未结算', color: 'grey' as const, accent: '#6b7280' }
  }
  if (row.settlement_status === 'settled') {
    return { text: '已结算', color: 'green' as const, accent: '#16a34a' }
  }
  return { text: '部分结算', color: 'orange' as const, accent: '#d97706' }
}

function getSettleableDailyItems(row?: XiaodituiSalaryMarketRow | null): XiaodituiSalaryDailyItem[] {
  return row?.daily.filter((item) => !!item.standard) || []
}

function normalizeSalaryMarketRow(row: XiaodituiSalaryMarketRow): XiaodituiSalaryMarketRow {
  const daily = (row.daily || []).map((item) => ({
    ...item,
    settled: Boolean(item.settled),
  }))
  const settleableItems = daily.filter((item) => !!item.standard)
  const derivedSettledDayCount = settleableItems.filter((item) => item.settled).length
  const derivedUnsettledDayCount = settleableItems.length - derivedSettledDayCount
  const derivedSettledSalary = settleableItems.reduce(
    (sum, item) => sum + (item.settled ? Number(item.salary || 0) : 0),
    0,
  )
  const derivedUnsettledSalary = settleableItems.reduce(
    (sum, item) => sum + (!item.settled ? Number(item.salary || 0) : 0),
    0,
  )
  const settlementStatus =
    row.settlement_status ||
    (settleableItems.length > 0 &&
    derivedSettledDayCount === settleableItems.length &&
    row.configured
      ? 'settled'
      : derivedSettledDayCount > 0
        ? 'partial'
        : 'none')

  return {
    ...row,
    daily,
    settled_day_count:
      typeof row.settled_day_count === 'number'
        ? row.settled_day_count
        : derivedSettledDayCount,
    unsettled_day_count:
      typeof row.unsettled_day_count === 'number'
        ? row.unsettled_day_count
        : derivedUnsettledDayCount,
    settled_salary:
      typeof row.settled_salary === 'number'
        ? row.settled_salary
        : derivedSettledSalary,
    unsettled_salary:
      typeof row.unsettled_salary === 'number'
        ? row.unsettled_salary
        : derivedUnsettledSalary,
    settlement_status: settlementStatus,
  }
}

const datePresets: DatePreset[] = [
  { label: '今天', getRange: todayRangeCN },
  { label: '昨天', getRange: yesterdayRangeCN },
  { label: '本周', getRange: currentWeekRangeCN },
  { label: '近 7 天', getRange: lastSevenDaysRangeCN },
  { label: '本月', getRange: currentMonthRangeCN },
  { label: '上个月', getRange: previousMonthRangeCN },
]

const datePickerPresets = datePresets.map((preset) => () => {
  const [start, end] = preset.getRange()
  return { text: preset.label, start, end }
})

function filterParttimeRows(
  rows: ParttimeMarketRow[],
  marketKeyword: string,
  statusFilter: ParttimeStatusFilter,
  settlementFilter: ParttimeSettlementFilter = 'all',
): ParttimeMarketRow[] {
  const keyword = marketKeyword.trim().toLowerCase()
  return rows.filter((market) => {
    const nickname = String(market.nickname || '').toLowerCase()
    const name = String(market.name || '').toLowerCase()
    const mobile = String(market.mobile || '').toLowerCase()
    const matchedKeyword =
      !keyword ||
      nickname.includes(keyword) ||
      name.includes(keyword) ||
      mobile.includes(keyword)
    if (!matchedKeyword) return false
    if (statusFilter === 'configured' && !market.salaryReport?.configured) {
      return false
    }
    if (statusFilter === 'unconfigured' && market.salaryReport?.configured) {
      return false
    }
    if (statusFilter === 'unbound' && !market.unbound) {
      return false
    }
    if (settlementFilter !== 'all') {
      return market.salaryReport?.settlement_status === settlementFilter
    }
    return true
  })
}

function sortParttimeRowsForSettlement(
  a: ParttimeMarketRow,
  b: ParttimeMarketRow,
): number {
  return (
    Number(b.salaryReport?.unsettled_salary || 0) -
      Number(a.salaryReport?.unsettled_salary || 0) ||
    Number(b.salaryReport?.unsettled_day_count || 0) -
      Number(a.salaryReport?.unsettled_day_count || 0) ||
    Number(b.lead_count || 0) - Number(a.lead_count || 0)
  )
}

function buildSalarySummaryStats(
  report: { total_salary?: number; unconfigured_market_count?: number; by_market?: XiaodituiSalaryMarketRow[] } | undefined,
  rows: ParttimeMarketRow[],
): SalarySummaryStats {
  const rawRows = report?.by_market?.length
    ? report.by_market
    : rows
        .map((row) => row.salaryReport)
        .filter((row): row is XiaodituiSalaryMarketRow => Boolean(row))
  const sourceRows = rawRows.map((row) => normalizeSalaryMarketRow(row))

  return {
    totalSalary:
      typeof report?.total_salary === 'number'
        ? report.total_salary
        : sourceRows.reduce((sum, row) => sum + Number(row?.salary || 0), 0),
    settledSalary: sourceRows.reduce(
      (sum, row) => sum + Number(row?.settled_salary || 0),
      0,
    ),
    unsettledSalary: sourceRows.reduce(
      (sum, row) => sum + Number(row?.unsettled_salary || 0),
      0,
    ),
    settledDays: sourceRows.reduce(
      (sum, row) => sum + Number(row?.settled_day_count || 0),
      0,
    ),
    unsettledDays: sourceRows.reduce(
      (sum, row) => sum + Number(row?.unsettled_day_count || 0),
      0,
    ),
    unconfiguredMarketCount:
      typeof report?.unconfigured_market_count === 'number'
        ? report.unconfigured_market_count
        : rows.filter((row) => row.salaryReport && !row.salaryReport.configured)
            .length,
  }
}

function buildParttimeRows(
  markets: XiaodituiMarketOption[],
  rowsByMarketId: Map<number, XiaodituiSalaryMarketRow>,
): ParttimeMarketRow[] {
  return markets.map((market) => ({
    ...market,
    salaryReport: rowsByMarketId.get(market.market_id) || null,
  }))
}

function buildSalaryRowsByMarketId(
  rows?: XiaodituiSalaryMarketRow[],
): Map<number, XiaodituiSalaryMarketRow> {
  const map = new Map<number, XiaodituiSalaryMarketRow>()
  for (const row of rows || []) {
    map.set(row.market_id, normalizeSalaryMarketRow(row))
  }
  return map
}

function monthRange(month: Date): { start: Date; end: Date; startDate: string; endDate: string } {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  return { start, end, startDate: toYMD(start), endDate: toYMD(end) }
}

function getMarketDisplayName(row: ParttimeMarketRow): string {
  return row.name || row.nickname || row.salaryReport?.name || '未记录'
}

export function XiaodituiCollectionCalendarTab({ enabled = true }: Props) {
  const [activityId, setActivityId] = useState<number | undefined>(undefined)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => todayCN())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => todayCN())
  const [marketKeyword, setMarketKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<ParttimeStatusFilter>('all')

  const activitiesQuery = useQuery({
    queryKey: ['xiaoditui', 'activities'],
    queryFn: () => xiaoditangApi.listActivities(),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const activities = activitiesQuery.data?.data || []
  const selectedActivityId = activityId ?? activities[0]?.activity_id
  const calendarRange = useMemo(() => monthRange(calendarMonth), [calendarMonth])

  const calendarReportQuery = useQuery({
    queryKey: [
      'xiaoditui',
      'salary-report',
      selectedActivityId,
      calendarRange.startDate,
      calendarRange.endDate,
      'calendar',
    ],
    queryFn: () =>
      xiaoditangApi.getSalaryReport({
        activityId: selectedActivityId!,
        startDate: calendarRange.startDate,
        endDate: calendarRange.endDate,
      }),
    enabled: enabled && !!selectedActivityId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const calendarReport = calendarReportQuery.data?.data

  const marketsQuery = useQuery({
    queryKey: ['xiaoditui', 'markets'],
    queryFn: () => xiaoditangApi.listMarkets(),
    enabled,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
  const globalMarkets = useMemo(
    () => marketsQuery.data?.data?.items || [],
    [marketsQuery.data?.data?.items],
  )
  const calendarRowsByMarketId = useMemo(
    () => buildSalaryRowsByMarketId(calendarReport?.by_market),
    [calendarReport?.by_market],
  )
  const calendarParttimeRows = useMemo<ParttimeMarketRow[]>(
    () => buildParttimeRows(globalMarkets, calendarRowsByMarketId),
    [calendarRowsByMarketId, globalMarkets],
  )
  const calendarDisplayRows = useMemo(
    () => filterParttimeRows(calendarParttimeRows, marketKeyword, statusFilter),
    [calendarParttimeRows, marketKeyword, statusFilter],
  )
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [calendarMonth])
  const calendarEntriesByDate = useMemo(() => {
    const map = new Map<string, CalendarDailyEntry[]>()
    for (const row of calendarDisplayRows) {
      const reportRow = row.salaryReport
      if (!reportRow) continue
      for (const daily of reportRow.daily || []) {
        const count = Number(daily.count || 0)
        if (count <= 0) continue
        const entries = map.get(daily.date) || []
        entries.push({
          marketId: row.market_id,
          name: getMarketDisplayName(row),
          nickname: row.nickname,
          mobile: row.mobile,
          count,
          salary: Number(daily.salary || 0),
          configured: !!daily.standard,
        })
        map.set(daily.date, entries)
      }
    }
    map.forEach((entries) => {
      entries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
    })
    return map
  }, [calendarDisplayRows])

  const goCalendarMonth = (offset: number) => {
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1)
    setCalendarMonth(next)
    setSelectedCalendarDate(next)
  }

  const goCalendarToday = () => {
    const today = todayCN()
    setCalendarMonth(today)
    setSelectedCalendarDate(today)
  }

  return (
    <section style={salaryShellStyle}>
      <div style={filterPanelStyle}>
        <div className='xiaoditui-parttime-filter-bar'>
          <div className='xiaoditui-parttime-filter-grid xiaoditui-parttime-filter-grid--calendar'>
            <FilterField label='活动' className='xiaoditui-filter-field'>
              <Select
                placeholder='选择活动'
                loading={activitiesQuery.isPending}
                value={selectedActivityId}
                onChange={(v) => setActivityId(v as number)}
                style={{ width: '100%' }}
                optionList={activities.map((activity: XiaoditangActivityOption) => ({
                  label: activity.name,
                  value: activity.activity_id,
                }))}
                filter
                disabled={!enabled}
              />
            </FilterField>

            <FilterField label='搜索' className='xiaoditui-filter-field'>
              <Input
                value={marketKeyword}
                placeholder='微信昵称 / 姓名 / 手机号'
                showClear
                onChange={setMarketKeyword}
                style={{ width: '100%' }}
                disabled={!enabled}
              />
            </FilterField>

            <FilterField label='筛选' className='xiaoditui-filter-field'>
              <Select
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as ParttimeStatusFilter)}
                style={{ width: '100%' }}
                optionList={[
                  { label: '全部兼职', value: 'all' },
                  { label: '已配置工资', value: 'configured' },
                  { label: '未配置工资', value: 'unconfigured' },
                  { label: '已解绑', value: 'unbound' },
                ]}
                disabled={!enabled}
              />
            </FilterField>
          </div>

          <div className='xiaoditui-parttime-filter-actions'>
            <Button
              theme='light'
              icon={<IconRefresh />}
              loading={calendarReportQuery.isFetching || marketsQuery.isFetching}
              disabled={!enabled || !selectedActivityId}
              onClick={() => {
                calendarReportQuery.refetch()
                marketsQuery.refetch()
              }}
              title='刷新'
              aria-label='刷新'
            />
          </div>
        </div>
      </div>

      {!enabled ? (
        <Empty
          image={<IconAlertTriangle size='extra-large' />}
          title='小地推登录不可用'
          description='恢复小地推登录态后才能查看采单日历。'
        />
      ) : marketsQuery.isPending || (calendarReportQuery.isPending && !!selectedActivityId) ? (
        <div style={loadingStyle}>
          <Spin size='middle' />
          <Text type='tertiary'>正在加载兼职采单日历…</Text>
        </div>
      ) : !selectedActivityId ? (
        <Empty image={<IconUserGroup size='extra-large' />} title='请选择活动' />
      ) : globalMarkets.length === 0 ? (
        <Empty
          image={<IconUserGroup size='extra-large' />}
          title='暂无兼职推广员'
          description='未能从小地推推广员列表中加载到数据。'
        />
      ) : (
        <div style={contentStyle}>
          {calendarReport?.truncated && (
            <Banner
              fullMode={false}
              type='warning'
              icon={<IconInfoCircle />}
              description='本月数据已接近接口扫描上限，采单日历可能偏低。建议拆分日期范围后再核对。'
            />
          )}
          <ParttimeCollectionCalendar
            currentMonth={calendarMonth}
            selectedDate={selectedCalendarDate}
            calendarDays={calendarDays}
            entriesByDate={calendarEntriesByDate}
            rangeTotal={calendarReport?.range_total || 0}
            displayedMarketCount={calendarDisplayRows.length}
            totalMarketCount={globalMarkets.length}
            onPrevMonth={() => goCalendarMonth(-1)}
            onNextMonth={() => goCalendarMonth(1)}
            onToday={goCalendarToday}
            onSelectDate={setSelectedCalendarDate}
          />
        </div>
      )}
    </section>
  )
}

export function XiaodituiParttimeTab({
  enabled = true,
  onOpenSalaryTab,
}: Props & {
  onOpenSalaryTab?: (params: XiaodituiSalaryWorkspaceOpenParams) => void
}) {
  return (
    <XiaodituiSalaryWorkspace
      enabled={enabled}
      mode='summary'
      onOpenFullPage={onOpenSalaryTab}
    />
  )
}

export function XiaodituiSalaryWorkspace({
  enabled = true,
  mode = 'full',
  initialActivityId,
  initialStartDate,
  initialEndDate,
  initialMarketId,
  onOpenFullPage,
}: SalaryWorkspaceProps) {
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi<SalaryFormValues> | null>(null)
  const isSummaryMode = mode === 'summary'
  const [activityId, setActivityId] = useState<number | undefined>(
    () => initialActivityId,
  )
  const [dateRange, setDateRange] = useState<[Date, Date]>(() =>
    getInitialDateRange(initialStartDate, initialEndDate),
  )
  const [marketKeyword, setMarketKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<ParttimeStatusFilter>('all')
  const [settlementFilter, setSettlementFilter] =
    useState<ParttimeSettlementFilter>('all')
  const [standardFormOpen, setStandardFormOpen] = useState(false)
  const [standardConfigOpen, setStandardConfigOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [targetMarket, setTargetMarket] = useState<XiaodituiMarketOption | null>(null)
  const [editingStandard, setEditingStandard] = useState<XiaodituiSalaryStandard | null>(null)

  const activitiesQuery = useQuery({
    queryKey: ['xiaoditui', 'activities'],
    queryFn: () => xiaoditangApi.listActivities(),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const activities = activitiesQuery.data?.data || []
  const selectedActivityId = activityId ?? activities[0]?.activity_id
  const startDate = toYMD(dateRange[0])
  const endDate = toYMD(dateRange[1])
  const rangeText = formatRangeText(startDate, endDate)
  const salaryQuery = useQuery({
    queryKey: ['xiaoditui', 'salary-report', selectedActivityId, startDate, endDate],
    queryFn: () =>
      xiaoditangApi.getSalaryReport({
        activityId: selectedActivityId!,
        startDate,
        endDate,
      }),
    enabled: enabled && !!selectedActivityId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const report = salaryQuery.data?.data
  const marketsQuery = useQuery({
    queryKey: ['xiaoditui', 'markets'],
    queryFn: () => xiaoditangApi.listMarkets(),
    enabled,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
  const globalMarkets = useMemo(
    () => marketsQuery.data?.data?.items || [],
    [marketsQuery.data?.data?.items],
  )
  const salaryRowsByMarketId = useMemo(
    () => buildSalaryRowsByMarketId(report?.by_market),
    [report?.by_market],
  )
  const parttimeRows = useMemo<ParttimeMarketRow[]>(
    () => buildParttimeRows(globalMarkets, salaryRowsByMarketId),
    [globalMarkets, salaryRowsByMarketId],
  )
  const displayRows = useMemo(
    () =>
      filterParttimeRows(
        parttimeRows,
        marketKeyword,
        statusFilter,
        isSummaryMode ? 'all' : settlementFilter,
      ).sort(sortParttimeRowsForSettlement),
    [isSummaryMode, marketKeyword, parttimeRows, settlementFilter, statusFilter],
  )
  const summaryStats = useMemo(
    () => buildSalarySummaryStats(report, displayRows),
    [displayRows, report],
  )
  const selectedReportMarket = useMemo(
    () =>
      targetMarket
        ? salaryRowsByMarketId.get(targetMarket.market_id) || null
        : null,
    [salaryRowsByMarketId, targetMarket],
  )
  const settleableDailyItems = useMemo(
    () => getSettleableDailyItems(selectedReportMarket),
    [selectedReportMarket],
  )
  const unsettledDates = useMemo(
    () => settleableDailyItems.filter((item) => !item.settled).map((item) => item.date),
    [settleableDailyItems],
  )
  const settledDates = useMemo(
    () => settleableDailyItems.filter((item) => item.settled).map((item) => item.date),
    [settleableDailyItems],
  )
  const selectedDailySettlementSummary = useMemo(
    () => getDailySettlementSummary(selectedReportMarket?.daily || []),
    [selectedReportMarket?.daily],
  )
  const settlementMeta = getSettlementStatusMeta(selectedReportMarket)

  const standardsQuery = useQuery({
    queryKey: ['xiaoditui', 'salary-standards', targetMarket?.market_id],
    queryFn: () => xiaoditangApi.listSalaryStandards({ marketId: targetMarket!.market_id }),
    enabled: enabled && !isSummaryMode && !!targetMarket,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const standards = useMemo(
    () => standardsQuery.data?.data || [],
    [standardsQuery.data?.data],
  )
  const latestStandard = useMemo(
    () => getLatestSalaryStandard(standards) || selectedReportMarket?.current_standard || null,
    [selectedReportMarket?.current_standard, standards],
  )
  const hasStandardNotes = useMemo(
    () => standards.some((standard) => Boolean(standard.notes?.trim())),
    [standards],
  )
  const standardNotesColumnWidth = hasStandardNotes ? 240 : 72
  const standardTableScrollX = 630 + standardNotesColumnWidth

  const saveMutation = useMutation({
    mutationFn: (payload: XiaodituiSalaryStandardPayload) => {
      if (editingStandard?.id) {
        return xiaoditangApi.updateSalaryStandard(editingStandard.id, {
          effectiveDate: payload.effectiveDate,
          baseSalary: payload.baseSalary,
          guaranteedCount: payload.guaranteedCount,
          unitPrice: payload.unitPrice,
          startCount: payload.startCount,
          notes: payload.notes,
        })
      }
      return xiaoditangApi.createSalaryStandard(payload)
    },
    onSuccess: (resp) => {
      toast.success(resp.message || '工资标准已保存')
      setStandardFormOpen(false)
      setEditingStandard(null)
      formRef.current?.reset()
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'salary-standards'] })
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'salary-report'] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '工资标准保存失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (standardId: string) => xiaoditangApi.deleteSalaryStandard(standardId),
    onSuccess: () => {
      toast.success('工资标准已删除')
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'salary-standards'] })
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'salary-report'] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '工资标准删除失败')
    },
  })

  const settlementMutation = useMutation({
    mutationFn: ({ action, market, dates }: SalarySettlementMutationPayload) => {
      const payload = {
        marketId: market.market_id,
        marketName: market.name,
        marketMobile: market.mobile,
        dates,
      }
      return action === 'settle'
        ? xiaoditangApi.settleSalaryDates(payload)
        : xiaoditangApi.unsettleSalaryDates(payload)
    },
    onSuccess: (resp) => {
      toast.success(resp.message || '结算状态已更新')
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'salary-report'] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '结算状态更新失败')
    },
  })

  useEffect(() => {
    if (!standardFormOpen || !targetMarket) return
    const timer = window.setTimeout(() => {
      formRef.current?.setValues(
        getSalaryFormValues(editingStandard, startDate, targetMarket.joined_at),
      )
    }, 0)
    return () => window.clearTimeout(timer)
  }, [editingStandard, standardFormOpen, startDate, targetMarket])

  useEffect(() => {
    if (targetMarket || globalMarkets.length === 0) return
    const initialMarket = initialMarketId
      ? globalMarkets.find((market) => market.market_id === initialMarketId)
      : undefined
    const nextMarket = initialMarket || globalMarkets[0]
    setTargetMarket(nextMarket)
    if (!isSummaryMode && initialMarket && nextMarket) {
      setDetailDialogOpen(true)
    }
  }, [globalMarkets, initialMarketId, isSummaryMode, targetMarket])

  const handleSubmit = (values: SalaryFormValues) => {
    if (!targetMarket) return
    saveMutation.mutate({
      marketId: targetMarket.market_id,
      marketName: targetMarket.name,
      marketMobile: targetMarket.mobile,
      effectiveDate: normalizeFormDate(values.effectiveDate),
      baseSalary: Number(values.baseSalary || 0),
      guaranteedCount: Number(values.guaranteedCount || 0),
      unitPrice: Number(values.unitPrice || 0),
      startCount: Number(values.startCount || 0),
      notes: values.notes || null,
    })
  }

  const closeStandardForm = () => {
    setStandardFormOpen(false)
    setEditingStandard(null)
    formRef.current?.reset()
  }

  const selectTargetMarket = (market: XiaodituiMarketOption) => {
    setTargetMarket(market)
    setStandardFormOpen(false)
    setStandardConfigOpen(false)
    setEditingStandard(null)
    if (!isSummaryMode) {
      setDetailDialogOpen(true)
    }
  }

  const updateSettlement = useCallback((action: 'settle' | 'unsettle', dates: string[]) => {
    if (!targetMarket || dates.length === 0) return
    settlementMutation.mutate({ action, market: targetMarket, dates })
  }, [settlementMutation, targetMarket])

  const copySettlementInfo = useCallback(async () => {
    if (!targetMarket || !selectedReportMarket || selectedDailySettlementSummary.totalDays === 0) {
      toast.warning('暂无可复制的结算信息')
      return
    }
    const ok = await copyToClipboard(
      buildSettlementInfoCopyText(targetMarket, selectedDailySettlementSummary, rangeText),
    )
    if (ok) {
      toast.success('结算信息已复制')
    } else {
      toast.error('复制失败，请重试')
    }
  }, [rangeText, selectedDailySettlementSummary, selectedReportMarket, targetMarket])

  const standardColumns = useMemo<ColumnProps<XiaodituiSalaryStandard>[]>(
    () => [
      {
        title: <span style={standardTableHeaderNoWrapStyle}>生效起日</span>,
        dataIndex: 'effective_date',
        width: 130,
        render: (value) => <span style={standardTableCellNoWrapStyle}>{String(value || '—')}</span>,
      },
      {
        title: <span style={standardTableHeaderNoWrapStyle}>底薪</span>,
        dataIndex: 'base_salary',
        width: 100,
        align: 'right',
        render: (value) => formatMoney(Number(value || 0)),
      },
      {
        title: <span style={standardTableHeaderNoWrapStyle}>保底</span>,
        dataIndex: 'guaranteed_count',
        width: 88,
        align: 'right',
      },
      {
        title: <span style={standardTableHeaderNoWrapStyle}>单价</span>,
        dataIndex: 'unit_price',
        width: 100,
        align: 'right',
        render: (value) => formatMoney(Number(value || 0)),
      },
      {
        title: <span style={standardTableHeaderNoWrapStyle}>起算量</span>,
        dataIndex: 'start_count',
        width: 92,
        align: 'right',
      },
      {
        title: <span style={standardTableHeaderNoWrapStyle}>备注</span>,
        dataIndex: 'notes',
        width: standardNotesColumnWidth,
        render: (value) => (
          <Text ellipsis={{ showTooltip: true }}>{(value as string) || '—'}</Text>
        ),
      },
      {
        title: <span style={standardTableHeaderNoWrapStyle}>操作</span>,
        dataIndex: 'action',
        width: 120,
        render: (_value, record) => (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <Tooltip content='编辑'>
              <Button
                theme='borderless'
                type='tertiary'
                icon={<IconEdit />}
                onClick={() => {
                  setEditingStandard(record)
                  setStandardFormOpen(true)
                }}
              />
            </Tooltip>
            <Tooltip content='删除'>
              <Button
                theme='borderless'
                type='danger'
                icon={<IconDelete />}
                loading={deleteMutation.isPending}
                onClick={() => {
                  Modal.confirm({
                    title: '删除工资标准',
                    content: `确定删除 ${record.effective_date} 起生效的工资标准吗？`,
                    okText: '删除',
                    okButtonProps: { type: 'danger' },
                    cancelText: '取消',
                    onOk: () => deleteMutation.mutate(record.id),
                  })
                }}
              />
            </Tooltip>
          </div>
        ),
      },
    ],
    [deleteMutation, standardNotesColumnWidth],
  )

  return (
    <>
      <section style={salaryShellStyle}>
        <div style={filterPanelStyle}>
          <div className='xiaoditui-parttime-filter-bar'>
            <div
              className={
                isSummaryMode
                  ? 'xiaoditui-parttime-filter-grid xiaoditui-parttime-filter-grid--summary'
                  : 'xiaoditui-parttime-filter-grid xiaoditui-parttime-filter-grid--salary'
              }
            >
              <FilterField label='活动' className='xiaoditui-filter-field'>
                <Select
                  placeholder='选择活动'
                  loading={activitiesQuery.isPending}
                  value={selectedActivityId}
                  onChange={(v) => setActivityId(v as number)}
                  style={{ width: '100%' }}
                  optionList={activities.map((activity: XiaoditangActivityOption) => ({
                    label: activity.name,
                    value: activity.activity_id,
                  }))}
                  filter
                  disabled={!enabled}
                />
              </FilterField>

              <FilterField label='日期' className='xiaoditui-filter-field xiaoditui-date-filter-field'>
                <DatePicker
                  type='dateRange'
                  value={dateRange}
                  onChange={(value) => {
                    if (Array.isArray(value) && value.length === 2) {
                      const [s, e] = value as [Date, Date]
                      if (s && e) setDateRange([s, e])
                    }
                  }}
                  density='compact'
                  format='yyyy-MM-dd'
                  placeholder={['开始日期', '结束日期']}
                  showClear={false}
                  syncSwitchMonth
                  weekStartsOn={1}
                  presets={datePickerPresets}
                  presetPosition='bottom'
                  style={{ width: '100%' }}
                  disabled={!enabled}
                />
              </FilterField>

              <FilterField label='搜索' className='xiaoditui-filter-field'>
                <Input
                  value={marketKeyword}
                  placeholder='微信昵称 / 姓名 / 手机号'
                  showClear
                  onChange={setMarketKeyword}
                  style={{ width: '100%' }}
                  disabled={!enabled}
                />
              </FilterField>

              <FilterField label='筛选' className='xiaoditui-filter-field'>
                <Select
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as ParttimeStatusFilter)}
                  style={{ width: '100%' }}
                  optionList={[
                    { label: '全部兼职', value: 'all' },
                    { label: '已配置工资', value: 'configured' },
                    { label: '未配置工资', value: 'unconfigured' },
                    { label: '已解绑', value: 'unbound' },
                  ]}
                  disabled={!enabled}
                />
              </FilterField>

              {!isSummaryMode && (
                <FilterField label='结算' className='xiaoditui-filter-field'>
                  <Select
                    value={settlementFilter}
                    onChange={(v) =>
                      setSettlementFilter(v as ParttimeSettlementFilter)
                    }
                    style={{ width: '100%' }}
                    optionList={[
                      { label: '全部结算状态', value: 'all' },
                      { label: '未结算', value: 'none' },
                      { label: '部分结算', value: 'partial' },
                      { label: '已结算', value: 'settled' },
                    ]}
                    disabled={!enabled}
                  />
                </FilterField>
              )}
            </div>

            <div className='xiaoditui-parttime-filter-actions'>
              <Button
                theme='light'
                icon={<IconRefresh />}
                loading={salaryQuery.isFetching || marketsQuery.isFetching}
                disabled={!enabled || !selectedActivityId}
                onClick={() => {
                  salaryQuery.refetch()
                  marketsQuery.refetch()
                }}
                title='刷新'
                aria-label='刷新'
              />
            </div>
          </div>
        </div>
        {!enabled ? (
          <Empty
            image={<IconAlertTriangle size='extra-large' />}
            title='小地推登录不可用'
            description='恢复小地推登录态后才能查看兼职和计算工资。'
          />
        ) : marketsQuery.isPending || (salaryQuery.isPending && !!selectedActivityId) ? (
            <div style={loadingStyle}>
              <Spin size='middle' />
              <Text type='tertiary'>正在加载兼职和工资数据…</Text>
            </div>
        ) : !selectedActivityId ? (
          <Empty image={<IconUserGroup size='extra-large' />} title='请选择活动' />
        ) : globalMarkets.length === 0 ? (
            <Empty
              image={<IconUserGroup size='extra-large' />}
              title='暂无兼职推广员'
              description='未能从小地推推广员列表中加载到数据。'
            />
        ) : (
          <div style={contentStyle}>
            {report?.truncated && (
              <Banner
                fullMode={false}
                type='warning'
                icon={<IconInfoCircle />}
                description='本区间数据已接近接口扫描上限，工资计算可能偏低。建议缩小日期范围后再查看。'
              />
            )}
            {!isSummaryMode && <SalarySummaryStrip stats={summaryStats} />}
            {isSummaryMode ? (
              <ParttimeSalarySummary
                rows={displayRows}
                selectedMarketId={targetMarket?.market_id}
                targetMarket={targetMarket}
                selectedReportMarket={selectedReportMarket}
                totalMarketCount={globalMarkets.length}
                rangeText={rangeText}
                summaryStats={summaryStats}
                hasActiveFilter={!!marketKeyword.trim() || statusFilter !== 'all'}
                onSelect={selectTargetMarket}
                onOpenFullPage={() =>
                  onOpenFullPage?.({
                    activityId: selectedActivityId,
                    startDate,
                    endDate,
                    marketId: targetMarket?.market_id,
                  })
                }
              />
            ) : (
            <div
              className='xiaoditui-parttime-layout'
              style={salaryListOnlyLayoutStyle}
            >
              <div style={marketListPanelStyle}>
                <div style={marketListHeaderStyle}>
                  <div style={marketListTitleStyle}>
                    <Text strong>兼职推广员</Text>
                    <Text type='tertiary' size='small'>
                      共 {globalMarkets.length.toLocaleString()} 人
                      {marketKeyword.trim() || statusFilter !== 'all'
                        ? `，当前显示 ${displayRows.length.toLocaleString()} 人`
                        : `，工资区间 ${rangeText}`}
                    </Text>
                  </div>
                  {targetMarket && (
                    <div style={marketListHeaderActionsStyle}>
                      <Text type='tertiary' size='small'>
                        当前选择：{targetMarket.name || targetMarket.nickname || '未记录'}
                      </Text>
                      <Button
                        theme='light'
                        icon={<IconExternalOpen />}
                        onClick={() => setDetailDialogOpen(true)}
                      >
                        查看配置
                      </Button>
                    </div>
                  )}
                </div>
                <ParttimeMarketGrid
                  rows={displayRows}
                  selectedMarketId={targetMarket?.market_id}
                  onSelect={selectTargetMarket}
                />
              </div>
            </div>
            )}
          </div>
        )}
      </section>

      <Modal
        className='xiaoditui-salary-detail-modal'
        visible={!isSummaryMode && detailDialogOpen && !!targetMarket}
        title={
          targetMarket ? (
            <div style={salaryDetailDialogTitleStyle}>
              <span>兼职信息与工资配置</span>
              <span style={salaryDetailDialogTitleDividerStyle} />
              <span style={salaryDetailDialogTitleNameStyle}>
                {targetMarket.name || targetMarket.nickname || '未记录'}
              </span>
              <span style={salaryDetailDialogTitleMetaStyle}>
                {targetMarket.nickname || '—'} · {targetMarket.mobile || '—'}
              </span>
            </div>
          ) : '兼职信息与工资配置'
        }
        centered
        width='min(1120px, calc(100vw - 48px))'
        footer={null}
        bodyStyle={salaryDetailDialogModalBodyStyle}
        onCancel={() => setDetailDialogOpen(false)}
      >
        {targetMarket && (
          <div style={salaryDetailDialogBodyStyle}>
            <DetailMetricTable
              rows={[
                [
                  { label: '首次加入', value: formatDateTime(targetMarket.joined_at) },
                  { label: '累计名单', value: `${targetMarket.lead_count.toLocaleString()} 条` },
                ],
                [
                  {
                    label: '区间信息量',
                    value: `${Number(selectedReportMarket?.count || 0).toLocaleString()} 条`,
                  },
                  {
                    label: '区间工资',
                    value: formatMoney(selectedReportMarket?.salary || 0),
                    accent: '#0f766e',
                  },
                ],
                [
                  {
                    label: '未结算工资',
                    value: formatMoney(selectedReportMarket?.unsettled_salary || 0),
                    accent: '#dc2626',
                  },
                  {
                    label: '结算状态',
                    value: selectedReportMarket ? settlementMeta.text : '无区间数据',
                    accent: selectedReportMarket ? settlementMeta.accent : '#6b7280',
                  },
                ],
                [
                  {
                    label: '工资状态',
                    value: selectedReportMarket
                      ? selectedReportMarket.configured
                        ? '已配置'
                        : '未配置完整'
                      : '无区间数据',
                    accent: selectedReportMarket?.configured ? '#16a34a' : '#dc2626',
                  },
                  {
                    label: '解绑状态',
                    value: targetMarket.unbound
                      ? `已解绑 ${targetMarket.unbound_at || ''}`
                      : '未解绑',
                    accent: targetMarket.unbound ? '#dc2626' : '#16a34a',
                  },
                ],
              ]}
            />
            <SalaryStandardEntryButton
              standard={latestStandard}
              standardCount={standards.length}
              loading={standardsQuery.isFetching}
              configured={!!selectedReportMarket?.configured}
              onClick={() => {
                setStandardConfigOpen(true)
              }}
            />
            <div style={settlementHeaderStyle}>
              <div style={inlineTitleMetaStyle}>
                <Text strong>每日工资结算</Text>
                <Text type='tertiary' size='small'>
                  已结 {Number(selectedReportMarket?.settled_day_count || 0).toLocaleString()} 天，
                  未结 {Number(selectedReportMarket?.unsettled_day_count || 0).toLocaleString()} 天
                </Text>
              </div>
              <div style={settlementBatchActionsStyle}>
                <Button
                  theme='light'
                  icon={<IconCopy />}
                  disabled={selectedDailySettlementSummary.totalDays === 0}
                  onClick={copySettlementInfo}
                >
                  复制结算信息
                </Button>
                <Button
                  theme='light'
                  type='primary'
                  icon={<IconTick />}
                  loading={settlementMutation.isPending}
                  disabled={settlementMutation.isPending || unsettledDates.length === 0}
                  onClick={() => updateSettlement('settle', unsettledDates)}
                >
                  结算区间
                </Button>
                <Button
                  theme='borderless'
                  type='tertiary'
                  icon={<IconClose />}
                  loading={settlementMutation.isPending}
                  disabled={settlementMutation.isPending || settledDates.length === 0}
                  onClick={() => updateSettlement('unsettle', settledDates)}
                >
                  取消结算
                </Button>
              </div>
            </div>
            <DailySalarySettlementList
              items={selectedReportMarket?.daily || []}
              pending={settlementMutation.isPending}
              exportName={`每日工资结算_${targetMarket.name || targetMarket.nickname || targetMarket.market_id}_${rangeText}`}
              onSettle={(date) => updateSettlement('settle', [date])}
              onUnsettle={(date) => updateSettlement('unsettle', [date])}
            />
          </div>
        )}
      </Modal>

      <Modal
        visible={!isSummaryMode && standardConfigOpen && !!targetMarket}
        title='工资标准配置'
        centered
        width='min(920px, calc(100vw - 48px))'
        footer={null}
        bodyStyle={salaryStandardConfigModalBodyStyle}
        onCancel={() => setStandardConfigOpen(false)}
      >
        {targetMarket && (
          <div style={salaryStandardConfigBodyStyle}>
            <div style={salaryStandardConfigHeaderStyle}>
              <div style={inlineTitleMetaStyle}>
                <Text strong>{targetMarket.name || targetMarket.nickname || '未记录'}</Text>
                <Text type='tertiary' size='small'>
                  {targetMarket.nickname || '—'} · {targetMarket.mobile || '—'}
                </Text>
                <Text type='tertiary' size='small'>
                  {latestStandard
                    ? `最新 ${formatSalaryStandardSummary(latestStandard)}`
                    : '暂无工资标准'}
                </Text>
              </div>
              <Button
                theme='light'
                icon={<IconPlus />}
                onClick={() => {
                  setEditingStandard(null)
                  setStandardFormOpen(true)
                }}
              >
                新增工资标准
              </Button>
            </div>
            <div style={salaryStandardTableFrameStyle}>
              <Table<XiaodituiSalaryStandard>
                columns={standardColumns}
                dataSource={standards}
                rowKey='id'
                pagination={false}
                size='small'
                loading={standardsQuery.isFetching}
                scroll={{ x: standardTableScrollX, y: 420 }}
                empty={<Empty title='暂无工资标准' description='新增一条标准后即可计算工资。' />}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        visible={standardFormOpen && !!targetMarket}
        title={editingStandard ? '编辑工资标准' : '新增工资标准'}
        width={380}
        onCancel={closeStandardForm}
        footer={
          <div style={standardFormFooterStyle}>
            <Button onClick={closeStandardForm}>取消</Button>
            <Button
              theme='solid'
              type='primary'
              loading={saveMutation.isPending}
              onClick={() => formRef.current?.submitForm()}
            >
              {editingStandard ? '保存修改' : '新增标准'}
            </Button>
          </div>
        }
        maskClosable={false}
      >
        {targetMarket && (
          <div style={standardFormDialogStyle}>
            <div style={standardFormTargetStyle}>
              <Text type='tertiary' size='small'>推广员</Text>
              <Text strong>{targetMarket.name || targetMarket.nickname || '未记录'}</Text>
              {targetMarket.mobile && (
                <Text type='tertiary' size='small'>{targetMarket.mobile}</Text>
              )}
            </div>
            <Form<SalaryFormValues>
              key={`${targetMarket.market_id}-${editingStandard?.id || 'new'}-${startDate}`}
              initValues={getSalaryFormValues(editingStandard, startDate, targetMarket.joined_at)}
              getFormApi={(api) => (formRef.current = api)}
              onSubmit={handleSubmit}
              labelPosition='left'
              labelWidth={82}
            >
              <Form.DatePicker
                field='effectiveDate'
                label='生效起日'
                type='date'
                format='yyyy-MM-dd'
                rules={[{ required: true, message: '请选择生效起日' }]}
                style={{ width: 220 }}
              />
              <Form.InputNumber
                field='baseSalary'
                label='底薪'
                min={0}
                precision={2}
                prefix='¥'
                hideButtons
                rules={[{ required: true, message: '请填写底薪' }]}
                style={{ width: 220 }}
              />
              <Form.InputNumber
                field='guaranteedCount'
                label='保底数量'
                min={0}
                precision={0}
                suffix='条'
                hideButtons
                rules={[{ required: true, message: '请填写保底数量' }]}
                style={{ width: 220 }}
              />
              <Form.InputNumber
                field='unitPrice'
                label='信息单价'
                min={0}
                precision={2}
                prefix='¥'
                hideButtons
                rules={[{ required: true, message: '请填写信息量单价' }]}
                style={{ width: 220 }}
              />
              <Form.InputNumber
                field='startCount'
                label='起算量'
                min={0}
                precision={0}
                suffix='条'
                hideButtons
                rules={[{ required: true, message: '请填写起算量' }]}
                style={{ width: 220 }}
              />
              <Form.TextArea
                field='notes'
                label='备注'
                placeholder='可选'
                autosize={{ minRows: 2, maxRows: 4 }}
              />
            </Form>
          </div>
        )}
      </Modal>
    </>
  )
}

function ParttimeCollectionCalendar({
  currentMonth,
  selectedDate,
  calendarDays,
  entriesByDate,
  rangeTotal,
  displayedMarketCount,
  totalMarketCount,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectDate,
}: {
  currentMonth: Date
  selectedDate: Date
  calendarDays: Date[]
  entriesByDate: Map<string, CalendarDailyEntry[]>
  rangeTotal: number
  displayedMarketCount: number
  totalMarketCount: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onSelectDate: (date: Date) => void
}) {
  const [detailOpen, setDetailOpen] = useState(false)
  const weekDays = ['一', '二', '三', '四', '五', '六', '日']
  const selectedDateKey = toYMD(selectedDate)
  const selectedEntries = entriesByDate.get(selectedDateKey) || []
  const selectedTotal = selectedEntries.reduce((acc, entry) => acc + entry.count, 0)
  const selectedSalaryTotal = selectedEntries.reduce((acc, entry) => acc + entry.salary, 0)
  const selectedWeekday = weekDays[(selectedDate.getDay() + 6) % 7]
  const maxEntriesInCell = 5

  return (
    <div style={detailOpen ? collectionCalendarLayoutStyle : collectionCalendarCollapsedLayoutStyle}>
      <div style={collectionCalendarPanelStyle}>
        <div style={collectionCalendarToolbarStyle}>
          <div style={collectionCalendarTitleStyle}>
            <IconCalendar size='small' style={{ color: 'var(--semi-color-primary)' }} />
            <Text strong style={{ fontSize: 18 }}>
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </Text>
            <Text type='tertiary' size='small'>
              本月 {rangeTotal.toLocaleString()} 条，显示 {displayedMarketCount.toLocaleString()} / {totalMarketCount.toLocaleString()} 名兼职
            </Text>
          </div>
          <div style={collectionCalendarActionsStyle}>
            {!detailOpen && (
              <Button theme='light' onClick={() => setDetailOpen(true)}>
                显示详情
              </Button>
            )}
            <Button theme='borderless' icon={<IconChevronLeft />} onClick={onPrevMonth} />
            <Button onClick={onToday}>今天</Button>
            <Button theme='borderless' icon={<IconChevronRight />} onClick={onNextMonth} />
          </div>
        </div>

        <div style={collectionCalendarGridStyle}>
          <div style={collectionWeekHeaderStyle}>
            {weekDays.map((day) => (
              <div key={day} style={collectionWeekCellStyle}>
                周{day}
              </div>
            ))}
          </div>
          <div style={collectionDateGridStyle}>
            {calendarDays.map((day, index) => {
              const dateKey = toYMD(day)
              const entries = entriesByDate.get(dateKey) || []
              const dayTotal = entries.reduce((acc, entry) => acc + entry.count, 0)
              const daySalaryTotal = entries.reduce((acc, entry) => acc + entry.salary, 0)
              const visibleEntries = entries.slice(0, maxEntriesInCell)
              const remaining = entries.length - visibleEntries.length
              const current = isSameMonth(day, currentMonth)
              const today = isToday(day)
              const selected = isSameDay(day, selectedDate)

              return (
                <button
                  key={dateKey}
                  type='button'
                  onClick={() => onSelectDate(day)}
                  style={{
                    ...collectionDateCellStyle,
                    borderRight: (index + 1) % 7 === 0 ? 'none' : collectionDateCellStyle.borderRight,
                    background: !current
                      ? 'var(--semi-color-fill-0)'
                      : selected
                        ? 'var(--semi-color-primary-light-default)'
                        : '#fff',
                    outline: selected ? '1px solid var(--semi-color-primary)' : 'none',
                    zIndex: selected ? 1 : 0,
                  }}
                >
                  <div style={collectionCellHeaderStyle}>
                    <div style={collectionCellHeaderTopStyle}>
                      <span
                        style={{
                          ...collectionDateNumberStyle,
                          background: today ? 'var(--semi-color-primary)' : 'transparent',
                          color: today
                            ? '#fff'
                            : current
                              ? 'var(--semi-color-text-0)'
                              : 'var(--semi-color-text-3)',
                          fontWeight: selected || today ? 700 : 500,
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                      <span
                        style={{
                          ...collectionDaySalaryStyle,
                          color: daySalaryTotal > 0 ? '#0f766e' : 'var(--semi-color-text-3)',
                        }}
                      >
                        {formatMoney(daySalaryTotal)}
                      </span>
                      <span
                        style={{
                          ...collectionDayTotalStyle,
                          background: dayTotal > 0 ? 'rgba(37, 99, 235, 0.1)' : 'var(--semi-color-fill-0)',
                          color: dayTotal > 0 ? '#2563eb' : 'var(--semi-color-text-3)',
                        }}
                      >
                        {dayTotal.toLocaleString()} 条
                      </span>
                    </div>
                  </div>

                  <div style={collectionEntryListStyle}>
                    {visibleEntries.map((entry) => (
                      <div key={`${dateKey}-${entry.marketId}`} style={collectionEntryStyle}>
                        <span style={collectionEntryNameStyle}>
                          {entry.nickname || entry.name}
                        </span>
                        <strong style={collectionEntryCountStyle}>{entry.count}</strong>
                      </div>
                    ))}
                    {remaining > 0 && (
                      <Text type='tertiary' size='small' style={collectionRemainingStyle}>
                        +{remaining} 人
                      </Text>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {detailOpen && (
        <aside style={collectionDetailPanelStyle}>
          <div style={collectionDetailHeaderStyle}>
            <div style={collectionDetailHeaderTopStyle}>
              <Text strong>{format(selectedDate, 'M月d日', { locale: zhCN })}</Text>
              <div style={collectionDetailHeaderActionsStyle}>
                <div style={collectionDetailSalaryTotalStyle}>
                  <Text type='tertiary' size='small'>兼职工资</Text>
                  <Text strong style={collectionDetailSalaryValueStyle}>
                    {formatMoney(selectedSalaryTotal)}
                  </Text>
                </div>
                <Tooltip content='关闭详情，扩大日历'>
                  <Button
                    theme='borderless'
                    type='tertiary'
                    icon={<IconClose />}
                    aria-label='关闭详情'
                    onClick={() => setDetailOpen(false)}
                  />
                </Tooltip>
              </div>
            </div>
            <Text type='tertiary' size='small'>
              周{selectedWeekday} · 共 {selectedTotal.toLocaleString()} 条
            </Text>
          </div>
          <div style={collectionDetailListStyle}>
            {selectedEntries.length > 0 ? (
              selectedEntries.map((entry) => (
                <div key={`${selectedDateKey}-${entry.marketId}`} style={collectionDetailItemStyle}>
                  <div style={promoterCellStyle}>
                    <Text strong ellipsis={{ showTooltip: true }}>
                      {entry.nickname || entry.name}
                    </Text>
                    <Text type='tertiary' size='small'>
                      {entry.name}
                      {entry.mobile ? ` · ${entry.mobile}` : ''}
                    </Text>
                  </div>
                  <div style={collectionDetailCountStyle}>
                    <Text strong style={{ color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
                      {entry.count.toLocaleString()} 条
                    </Text>
                    <Text type='tertiary' size='small'>
                      {formatMoney(entry.salary)}
                    </Text>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                image={<IconCalendar size='extra-large' />}
                title='当日暂无采单'
                description='左侧切换日期查看其他兼职采单情况。'
              />
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

function DailySalarySettlementList({
  items,
  pending,
  exportName,
  onSettle,
  onUnsettle,
}: {
  items: XiaodituiSalaryDailyItem[]
  pending: boolean
  exportName: string
  onSettle: (date: string) => void
  onUnsettle: (date: string) => void
}) {
  const captureRef = useRef<HTMLDivElement>(null)
  const [copyingImage, setCopyingImage] = useState(false)
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<SettlementExportColumnKey[]>(
    defaultSettlementExportColumnKeys,
  )
  const selectedExportColumns = useMemo(
    () => settlementExportColumns.filter((column) => selectedColumnKeys.includes(column.key)),
    [selectedColumnKeys],
  )
  const settlementSummary = useMemo(() => getDailySettlementSummary(items), [items])
  const exportRows = useMemo(
    () => {
      const rows = items.map((item) =>
        Object.fromEntries(
          selectedExportColumns.map((column) => [
            column.key,
            column.getExcelValue ? column.getExcelValue(item) : column.getValue(item),
          ]),
        ),
      )
      rows.push(
        Object.fromEntries(
          selectedExportColumns.map((column) => [
            column.key,
            getSettlementSummaryExcelValue(column.key, settlementSummary),
          ]),
        ),
      )
      return rows
    },
    [items, selectedExportColumns, settlementSummary],
  )
  const exportFilename = useMemo(
    () => `${sanitizeFilenamePart(exportName)}.xlsx`,
    [exportName],
  )

  const updateSelectedColumn = useCallback((key: SettlementExportColumnKey, checked: boolean) => {
    setSelectedColumnKeys((prev) => {
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key]
      }
      if (prev.length <= 1) {
        toast.warning('至少保留一列')
        return prev
      }
      return prev.filter((item) => item !== key)
    })
  }, [])

  const handleExportExcel = useCallback(() => {
    if (items.length === 0) {
      toast.warning('暂无可导出的每日工资数据')
      return
    }
    tableToXlsx(selectedExportColumns, exportRows, exportFilename)
    toast.success('Excel 已导出')
  }, [exportFilename, exportRows, items.length, selectedExportColumns])

  const handleCopyPlainText = useCallback(async () => {
    if (items.length === 0) {
      toast.warning('暂无可复制的每日工资数据')
      return
    }
    const ok = await copyToClipboard(
      buildSettlementPlainTextTable(selectedExportColumns, items, settlementSummary),
    )
    if (ok) {
      toast.success('纯文本已复制')
    } else {
      toast.error('复制纯文本失败，请重试')
    }
  }, [items, selectedExportColumns, settlementSummary])

  const handleCopyImage = useCallback(async () => {
    if (items.length === 0) {
      toast.warning('暂无可复制的每日工资数据')
      return
    }
    if (!captureRef.current) return
    setCopyingImage(true)
    try {
      const blob = await toBlob(captureRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      })
      if (!blob) throw new Error('生成图片失败')

      if (navigator.clipboard?.write && window.isSecureContext) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        toast.success('表格图片已复制')
      } else {
        toast.error('当前浏览器环境不支持直接复制图片')
      }
    } catch {
      toast.error('复制图片失败，请重试')
    } finally {
      setCopyingImage(false)
    }
  }, [items.length])

  const columns = useMemo<ColumnProps<XiaodituiSalaryDailyItem>[]>(
    () => [
      {
        title: '日期',
        dataIndex: 'date',
        width: 130,
        render: (value) => <Text strong>{String(value || '—')}</Text>,
      },
      {
        title: '信息量',
        dataIndex: 'count',
        width: 100,
        align: 'right',
        render: (value) => `${Number(value || 0).toLocaleString()} 条`,
      },
      {
        title: '工资',
        dataIndex: 'salary',
        width: 120,
        align: 'right',
        render: (value) => (
          <Text strong style={settlementSalaryValueStyle}>
            {formatMoney(Number(value || 0))}
          </Text>
        ),
      },
      {
        title: '工资配置',
        dataIndex: 'standard',
        width: 110,
        render: (_value, record) => {
          return record.standard ? (
            <Tag color='green' size='small'>
              已配置
            </Tag>
          ) : (
            <Tooltip content='请先配置工资标准'>
              <Tag color='orange' size='small'>
                未配置
              </Tag>
            </Tooltip>
          )
        },
      },
      {
        title: '结算状态',
        dataIndex: 'settled',
        width: 110,
        render: (_value, record) => {
          const configured = !!record.standard
          const statusColor: 'green' | 'grey' | 'orange' = configured
            ? record.settled
              ? 'green'
              : 'grey'
            : 'orange'
          const statusText = configured
            ? record.settled
              ? '已结算'
              : '未结算'
            : '未配置'
          return (
            <Tag color={statusColor} size='small'>
              {statusText}
            </Tag>
          )
        },
      },
      {
        title: '结算时间',
        dataIndex: 'settled_at',
        render: (value) =>
          value ? (
            <Text type='tertiary' size='small' ellipsis={{ showTooltip: true }}>
              {formatDateTime(String(value))}
            </Text>
          ) : (
            <Text type='tertiary' size='small'>
              —
            </Text>
          ),
      },
      {
        title: '操作',
        dataIndex: 'action',
        width: 120,
        align: 'right',
        render: (_value, record) => {
          const configured = !!record.standard
          if (!configured) {
            return (
              <Tooltip content='请先配置工资标准'>
                <Button disabled>
                  结算
                </Button>
              </Tooltip>
            )
          }
          if (record.settled) {
            return (
              <Button
                theme='borderless'
                type='tertiary'
                icon={<IconClose />}
                loading={pending}
                disabled={pending}
                onClick={() => onUnsettle(record.date)}
              >
                取消
              </Button>
            )
          }
          return (
            <Button
              theme='light'
              type='primary'
              icon={<IconTick />}
              loading={pending}
              disabled={pending}
              onClick={() => onSettle(record.date)}
            >
              结算
            </Button>
          )
        },
      },
    ],
    [onSettle, onUnsettle, pending],
  )

  if (items.length === 0) {
    return (
      <div style={settlementEmptyStyle}>
        <Empty title='暂无每日工资' description='当前区间没有该兼职的工资数据。' />
      </div>
    )
  }

  return (
    <div style={settlementTableWrapStyle}>
      <div style={settlementTableToolbarStyle}>
        <Text type='tertiary' size='small'>
          导出/复制列：{selectedExportColumns.length} 列
        </Text>
        <div style={settlementTableToolbarActionsStyle}>
          <Popover
            trigger='click'
            position='bottomRight'
            showArrow
            content={
              <div style={settlementColumnPopoverStyle}>
                <div style={inlineTitleMetaStyle}>
                  <Text strong>导出与复制列</Text>
                  <Text type='tertiary' size='small'>
                    不影响当前表格操作列
                  </Text>
                </div>
                <div style={settlementColumnListStyle}>
                  {settlementExportColumns.map((column) => (
                    <Checkbox
                      key={column.key}
                      checked={selectedColumnKeys.includes(column.key)}
                      onChange={(event) =>
                        updateSelectedColumn(column.key, Boolean(event.target.checked))
                      }
                    >
                      {column.label}
                    </Checkbox>
                  ))}
                </div>
                <div style={settlementColumnFooterStyle}>
                  <Button
                    theme='borderless'
                    onClick={() => setSelectedColumnKeys(defaultSettlementExportColumnKeys)}
                  >
                    重置
                  </Button>
                  <Button
                    theme='light'
                    onClick={() =>
                      setSelectedColumnKeys(settlementExportColumns.map((column) => column.key))
                    }
                  >
                    全选
                  </Button>
                </div>
              </div>
            }
          >
            <Button theme='borderless' icon={<IconSetting />}>
              列设置
            </Button>
          </Popover>
          <Button
            theme='light'
            icon={<IconDownload />}
            disabled={items.length === 0}
            onClick={handleExportExcel}
          >
            导出 Excel
          </Button>
          <Button
            theme='light'
            icon={<IconCopy />}
            disabled={items.length === 0}
            onClick={handleCopyPlainText}
          >
            复制纯文本
          </Button>
          <Button
            theme='light'
            icon={<IconImage />}
            loading={copyingImage}
            disabled={items.length === 0 || copyingImage}
            onClick={handleCopyImage}
          >
            复制图片
          </Button>
        </div>
      </div>
      <Table<XiaodituiSalaryDailyItem>
        className='xiaoditui-settlement-table'
        columns={columns}
        dataSource={items}
        rowKey='date'
        pagination={false}
        size='small'
        footer={<SettlementSummaryFooter summary={settlementSummary} />}
        scroll={{ x: 760, y: 280 }}
      />
      <SalarySettlementImageTable
        refEl={captureRef}
        columns={selectedExportColumns}
        rows={items}
        summary={settlementSummary}
      />
    </div>
  )
}

function SettlementSummaryFooter({ summary }: { summary: DailySettlementSummary }) {
  const cells: Array<{ key: SettlementExportColumnKey | 'action'; value: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'date', value: getSettlementSummaryDisplayValue('date', summary) },
    { key: 'count', value: getSettlementSummaryDisplayValue('count', summary), align: 'right' },
    { key: 'salary', value: getSettlementSummaryDisplayValue('salary', summary), align: 'right' },
    { key: 'standard', value: getSettlementSummaryDisplayValue('standard', summary) },
    { key: 'settled', value: getSettlementSummaryDisplayValue('settled', summary) },
    { key: 'settled_at', value: getSettlementSummaryDisplayValue('settled_at', summary) },
    { key: 'action', value: '—', align: 'right' },
  ]

  return (
    <div style={settlementSummaryFooterStyle}>
      {cells.map((cell) => (
        <span
          key={cell.key}
          title={cell.value}
          style={{
            ...settlementSummaryFooterCellStyle,
            textAlign: cell.align || 'left',
          }}
        >
          {cell.value}
        </span>
      ))}
    </div>
  )
}

function SalarySettlementImageTable({
  refEl,
  columns,
  rows,
  summary,
}: {
  refEl: RefObject<HTMLDivElement | null>
  columns: SettlementExportColumn[]
  rows: XiaodituiSalaryDailyItem[]
  summary: DailySettlementSummary
}) {
  const tableWidth = Math.max(
    640,
    columns.reduce((sum, column) => sum + column.width, 0),
  )

  return (
    <div ref={refEl} aria-hidden style={{ ...settlementImageCaptureStyle, width: tableWidth }}>
      <table style={settlementImageTableStyle}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  ...settlementImageHeaderCellStyle,
                  width: column.width,
                  textAlign: column.align || 'left',
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    ...settlementImageBodyCellStyle,
                    textAlign: column.align || 'left',
                  }}
                >
                  {column.getValue(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            {columns.map((column) => (
              <td
                key={column.key}
                style={{
                  ...settlementImageSummaryCellStyle,
                  textAlign: column.align || 'left',
                }}
              >
                {getSettlementSummaryDisplayValue(column.key, summary)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function SalarySummaryStrip({ stats }: { stats: SalarySummaryStats }) {
  return (
    <div className='xiaoditui-salary-summary-strip' style={salarySummaryStripStyle}>
      <SummaryMetric label='未结算工资' value={formatMoney(stats.unsettledSalary)} accent='#dc2626' />
      <SummaryMetric label='已结工资' value={formatMoney(stats.settledSalary)} accent='#16a34a' />
      <SummaryMetric label='区间工资' value={formatMoney(stats.totalSalary)} accent='#0f766e' />
      <SummaryMetric
        label='未结天数'
        value={`${stats.unsettledDays.toLocaleString()} 天`}
        accent='#d97706'
      />
      <SummaryMetric
        label='未配置人数'
        value={`${stats.unconfiguredMarketCount.toLocaleString()} 人`}
        accent={stats.unconfiguredMarketCount > 0 ? '#dc2626' : '#16a34a'}
      />
    </div>
  )
}

function SummaryMetric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div style={salarySummaryMetricStyle}>
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      <Text strong style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </div>
  )
}

function ParttimeSalarySummary({
  rows,
  selectedMarketId,
  targetMarket,
  selectedReportMarket,
  totalMarketCount,
  rangeText,
  summaryStats,
  hasActiveFilter,
  onSelect,
  onOpenFullPage,
}: {
  rows: ParttimeMarketRow[]
  selectedMarketId?: number
  targetMarket: XiaodituiMarketOption | null
  selectedReportMarket: XiaodituiSalaryMarketRow | null
  totalMarketCount: number
  rangeText: string
  summaryStats: SalarySummaryStats
  hasActiveFilter: boolean
  onSelect: (market: XiaodituiMarketOption) => void
  onOpenFullPage: () => void
}) {
  const settlementMeta = getSettlementStatusMeta(selectedReportMarket)

  return (
    <div className='xiaoditui-parttime-layout' style={parttimeLayoutStyle}>
      <div style={marketListPanelStyle}>
        <div style={marketListHeaderStyle}>
          <div style={marketListTitleStyle}>
            <Text strong>兼职推广员概览</Text>
            <Text type='tertiary' size='small'>
              共 {totalMarketCount.toLocaleString()} 人
              {hasActiveFilter
                ? `，当前显示 ${rows.length.toLocaleString()} 人`
                : `，工资区间 ${rangeText}`}
            </Text>
          </div>
          {targetMarket && (
            <Text type='tertiary' size='small'>
              当前选择：{targetMarket.name || targetMarket.nickname || '未记录'}
            </Text>
          )}
        </div>
        <ParttimeMarketGrid
          rows={rows}
          selectedMarketId={selectedMarketId}
          onSelect={onSelect}
        />
      </div>

      <aside className='xiaoditui-parttime-detail' style={parttimeSummaryPanelStyle}>
        <div style={inlineTitleMetaStyle}>
          <Text strong style={{ fontSize: 16 }}>
            兼职工资已整合到当前页面
          </Text>
          <Text type='tertiary' size='small'>
            这里保留兼职概览；工资配置、每日结算和批量结算统一在「兼职工资」Tab 处理。
          </Text>
        </div>

        <div style={salarySummaryInlineGridStyle}>
          <DetailMetric label='未结算工资' value={formatMoney(summaryStats.unsettledSalary)} accent='#dc2626' />
          <DetailMetric label='已结工资' value={formatMoney(summaryStats.settledSalary)} accent='#16a34a' />
          <DetailMetric label='未结天数' value={`${summaryStats.unsettledDays.toLocaleString()} 天`} accent='#d97706' />
          <DetailMetric label='未配置人数' value={`${summaryStats.unconfiguredMarketCount.toLocaleString()} 人`} accent={summaryStats.unconfiguredMarketCount > 0 ? '#dc2626' : '#16a34a'} />
        </div>

        {targetMarket ? (
          <div style={summarySelectedMarketStyle}>
            <div style={inlineTitleMetaStyle}>
              <Text strong>{targetMarket.name || targetMarket.nickname || '未记录'}</Text>
              <Text type='tertiary' size='small'>
                {targetMarket.nickname || '—'} · {targetMarket.mobile || '—'}
              </Text>
            </div>
            <div style={parttimeDetailMetaStyle}>
              <DetailMetric
                label='区间信息量'
                value={`${Number(selectedReportMarket?.count || 0).toLocaleString()} 条`}
              />
              <DetailMetric
                label='区间工资'
                value={formatMoney(selectedReportMarket?.salary || 0)}
                accent='#0f766e'
              />
              <DetailMetric
                label='结算状态'
                value={
                  selectedReportMarket
                    ? `${settlementMeta.text} · 未结 ${formatMoney(selectedReportMarket.unsettled_salary || 0)}`
                    : '无区间数据'
                }
                accent={selectedReportMarket ? settlementMeta.accent : '#6b7280'}
              />
              <DetailMetric
                label='工资状态'
                value={
                  selectedReportMarket
                    ? selectedReportMarket.configured
                      ? '已配置'
                      : '未配置完整'
                    : '无区间数据'
                }
                accent={selectedReportMarket?.configured ? '#16a34a' : '#dc2626'}
              />
            </div>
          </div>
        ) : (
          <Empty
            image={<IconUserGroup size='extra-large' />}
            title='请选择兼职'
            description='选择后可带着当前兼职进入工资 Tab。'
          />
        )}

        <Button
          theme='solid'
          type='primary'
          icon={<IconExternalOpen />}
          onClick={onOpenFullPage}
          style={summaryOpenButtonStyle}
        >
          进入兼职工资
        </Button>
      </aside>
    </div>
  )
}

function FilterField({
  label,
  children,
  style,
  className,
}: {
  label: string
  children: ReactNode
  style?: CSSProperties
  className?: string
}) {
  return (
    <label className={className} style={{ ...filterFieldStyle, ...style }}>
      <Text type='tertiary' size='small' style={filterLabelStyle}>
        {label}
      </Text>
      {children}
    </label>
  )
}

function ParttimeMarketGrid({
  rows,
  selectedMarketId,
  onSelect,
}: {
  rows: ParttimeMarketRow[]
  selectedMarketId?: number
  onSelect: (market: XiaodituiMarketOption) => void
}) {
  if (rows.length === 0) {
    return (
      <div style={marketGridEmptyStyle}>
        <Empty title='没有匹配的兼职' description='请调整搜索关键词或筛选条件。' />
      </div>
    )
  }

  return (
    <div style={marketGridViewportStyle}>
      <div style={marketGridStyle}>
        {rows.map((market) => {
          const selected = selectedMarketId === market.market_id
          const report = market.salaryReport
          const statusColor = report
            ? report.configured
              ? 'green'
              : 'orange'
            : 'grey'
          const statusText = report
            ? report.configured
              ? '已配置'
              : '部分缺失'
            : '无区间数据'
          const settlement = getSettlementStatusMeta(report)

          return (
            <button
              key={market.market_id}
              type='button'
              style={{
                ...marketGridItemStyle,
                background: selected ? 'var(--semi-color-primary-light-default)' : '#fff',
                borderColor: selected ? '#2563eb' : 'transparent',
              }}
              onClick={() => onSelect(market)}
            >
              <div style={marketGridItemHeaderStyle}>
                <div style={promoterCellStyle}>
                  <Text strong ellipsis={{ showTooltip: true }}>
                    {market.name || market.nickname || '未记录'}
                  </Text>
                  <Text type='tertiary' size='small' ellipsis={{ showTooltip: true }}>
                    {market.nickname || '—'} · {market.mobile || '—'}
                  </Text>
                </div>
                <Tag color={market.unbound ? 'red' : 'green'} size='small'>
                  {market.unbound ? '已解绑' : '未解绑'}
                </Tag>
              </div>

              <div style={marketGridMetricsStyle}>
                <GridMetric label='累计名单' value={`${Number(market.lead_count || 0).toLocaleString()} 条`} />
                <GridMetric label='区间信息' value={`${Number(report?.count || 0).toLocaleString()} 条`} />
                <GridMetric label='区间工资' value={formatMoney(report?.salary || 0)} accent='#0f766e' />
                <GridMetric label='未结算工资' value={formatMoney(report?.unsettled_salary || 0)} accent='#dc2626' />
              </div>

              <div style={marketGridFooterStyle}>
                <div style={marketGridTagGroupStyle}>
                  <Tag color={statusColor} size='small'>
                    {statusText}
                  </Tag>
                  <Tag color={settlement.color} size='small'>
                    {settlement.text}
                  </Tag>
                </div>
                <Text type='tertiary' size='small'>
                  加入 {formatDateTime(market.joined_at)}
                </Text>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GridMetric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div style={marketGridMetricStyle}>
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      <Text strong style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </div>
  )
}

function DetailMetric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div style={detailMetricStyle}>
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      <Text strong style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
    </div>
  )
}

type DetailMetricTableCell = {
  label: string
  value: string
  accent?: string
}

function DetailMetricTable({ rows }: { rows: [DetailMetricTableCell, DetailMetricTableCell][] }) {
  return (
    <div style={detailMetricTableWrapStyle}>
      <table style={detailMetricTableStyle}>
        <tbody>
          {rows.map(([left, right], index) => (
            <tr key={`${left.label}-${right.label}`}>
              <DetailMetricTableCells cell={left} isLastRow={index === rows.length - 1} />
              <DetailMetricTableCells cell={right} isLastRow={index === rows.length - 1} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetailMetricTableCells({
  cell,
  isLastRow,
}: {
  cell: DetailMetricTableCell
  isLastRow: boolean
}) {
  const labelStyle = isLastRow
    ? detailMetricTableLastRowLabelStyle
    : detailMetricTableLabelStyle
  const valueStyle = isLastRow
    ? detailMetricTableLastRowValueStyle
    : detailMetricTableValueStyle

  return (
    <>
      <th style={labelStyle}>
        <Text type='tertiary' size='small'>
          {cell.label}
        </Text>
      </th>
      <td style={valueStyle}>
        <Text
          strong
          ellipsis={{ showTooltip: true }}
          style={{ color: cell.accent, fontVariantNumeric: 'tabular-nums' }}
        >
          {cell.value}
        </Text>
      </td>
    </>
  )
}

function SalaryStandardEntryButton({
  standard,
  standardCount,
  loading,
  configured,
  onClick,
}: {
  standard: XiaodituiSalaryStandard | null
  standardCount: number
  loading: boolean
  configured: boolean
  onClick: () => void
}) {
  const tagText = loading
    ? '加载中'
    : standardCount > 0
      ? `${standardCount.toLocaleString()} 条标准`
      : '未配置'
  const tagColor = configured ? 'green' : standardCount > 0 ? 'orange' : 'red'
  const summary = loading
    ? '正在加载工资标准'
    : standard
      ? formatSalaryStandardSummary(standard)
      : '点击后查看并配置该兼职工资标准'

  return (
    <button type='button' style={salaryStandardEntryButtonStyle} onClick={onClick}>
      <div style={salaryStandardEntryMainStyle}>
        <Text strong>工资标准</Text>
        <Text type='tertiary' size='small' ellipsis={{ showTooltip: true }}>
          {standard ? `最新 ${summary}` : summary}
        </Text>
      </div>
      <div style={salaryStandardEntryActionStyle}>
        <Tag color={tagColor} size='small'>
          {tagText}
        </Tag>
        <IconExternalOpen />
      </div>
    </button>
  )
}

function SalaryStandardCell({ record }: { record: XiaodituiSalaryMarketRow }) {
  const standard = record.current_standard
  if (!standard) {
    return (
      <div style={standardCellStyle}>
        <Tag color='red' size='small'>未配置</Tag>
        <Text type='tertiary' size='small'>
          缺少 {record.missing_days.length} 个采集日的工资标准
        </Text>
      </div>
    )
  }
  return (
    <div style={standardCellStyle}>
      <Tag color={record.configured ? 'green' : 'orange'} size='small'>
        {record.configured ? '已配置' : '部分缺失'}
      </Tag>
      <Text size='small' ellipsis={{ showTooltip: true }}>
        {standard.effective_date} 起 · 底薪 {formatMoney(standard.base_salary)} · 保底{' '}
        {standard.guaranteed_count} · 单价 {formatMoney(standard.unit_price)} · 起算{' '}
        {standard.start_count}
      </Text>
    </div>
  )
}

const salaryShellStyle: CSSProperties = {
  flex: '1 1 0',
  width: '100%',
  maxWidth: '100%',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #d7dee8',
  borderRadius: 12,
  background: '#fff',
  overflow: 'hidden',
}

const filterPanelStyle: CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid #e6edf3',
  background: '#f8fafc',
  flexShrink: 0,
  minWidth: 0,
  maxWidth: '100%',
}

const filterFieldStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  width: '100%',
}

const filterLabelStyle: CSSProperties = {
  width: 48,
  flexShrink: 0,
  textAlign: 'right',
}

const contentStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 12,
  overflow: 'hidden',
}

const parttimeLayoutStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: 0,
  display: 'grid',
  gap: 12,
  alignItems: 'stretch',
  overflow: 'hidden',
}

const salaryListOnlyLayoutStyle: CSSProperties = {
  ...parttimeLayoutStyle,
  gridTemplateColumns: 'minmax(0, 1fr)',
}

const salarySummaryStripStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 1,
  border: '1px solid #e6edf3',
  borderRadius: 10,
  background: '#e6edf3',
  overflow: 'hidden',
  flexShrink: 0,
}

const salarySummaryMetricStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 58,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 4,
  background: '#fff',
}

const salarySummaryInlineGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
}

const summarySelectedMarketStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 12,
  border: '1px solid #e6edf3',
  borderRadius: 8,
  background: '#fff',
}

const summaryOpenButtonStyle: CSSProperties = {
  width: '100%',
  justifyContent: 'center',
  marginTop: 'auto',
}

const collectionCalendarLayoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 3fr) minmax(280px, 0.9fr)',
  gap: 12,
  minHeight: 680,
}

const collectionCalendarCollapsedLayoutStyle: CSSProperties = {
  ...collectionCalendarLayoutStyle,
  gridTemplateColumns: 'minmax(0, 1fr)',
}

const collectionCalendarPanelStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 12,
  border: '1px solid #e6edf3',
  borderRadius: 10,
  background: '#fff',
}

const collectionCalendarToolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minWidth: 0,
}

const collectionCalendarTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  flexWrap: 'wrap',
}

const collectionCalendarActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
}

const collectionCalendarGridStyle: CSSProperties = {
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #e6edf3',
  borderRadius: 8,
  overflow: 'hidden',
}

const collectionWeekHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  background: '#f8fafc',
  borderBottom: '1px solid #e6edf3',
}

const collectionWeekCellStyle: CSSProperties = {
  padding: '8px 0',
  textAlign: 'center',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--semi-color-text-2)',
  borderRight: '1px solid #e6edf3',
}

const collectionDateGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gridAutoRows: 'minmax(106px, 1fr)',
  background: '#fff',
}

const collectionDateCellStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 0,
  padding: 8,
  border: 'none',
  borderBottom: '1px solid #e6edf3',
  borderRight: '1px solid #e6edf3',
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
  overflow: 'hidden',
}

const collectionCellHeaderStyle: CSSProperties = {
  display: 'block',
  minHeight: 24,
  flexShrink: 0,
}

const collectionCellHeaderTopStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
}

const collectionDateNumberStyle: CSSProperties = {
  width: 24,
  height: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  fontSize: 13,
}

const collectionDayTotalStyle: CSSProperties = {
  minWidth: 24,
  height: 22,
  padding: '0 7px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
}

const collectionDaySalaryStyle: CSSProperties = {
  justifySelf: 'end',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 11,
  fontWeight: 700,
  lineHeight: '14px',
  fontVariantNumeric: 'tabular-nums',
}

const collectionEntryListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minHeight: 0,
  overflow: 'hidden',
}

const collectionEntryStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
  padding: '3px 6px',
  borderRadius: 6,
  background: '#f1f5f9',
}

const collectionEntryNameStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--semi-color-text-1)',
  fontSize: 12,
}

const collectionEntryCountStyle: CSSProperties = {
  color: '#2563eb',
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
}

const collectionRemainingStyle: CSSProperties = {
  paddingLeft: 4,
}

const collectionDetailPanelStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #e6edf3',
  borderRadius: 10,
  background: '#fff',
  overflow: 'hidden',
}

const collectionDetailHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 12,
  borderBottom: '1px solid #e6edf3',
  background: '#f8fafc',
}

const collectionDetailHeaderTopStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  minWidth: 0,
}

const collectionDetailHeaderActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
  flexShrink: 0,
}

const collectionDetailSalaryTotalStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 2,
  flexShrink: 0,
}

const collectionDetailSalaryValueStyle: CSSProperties = {
  color: '#0f766e',
  fontVariantNumeric: 'tabular-nums',
}

const collectionDetailListStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 10,
}

const collectionDetailItemStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 10,
  padding: '10px 0',
  borderBottom: '1px solid #edf2f7',
}

const collectionDetailCountStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 2,
  flexShrink: 0,
}

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  minHeight: 220,
}

const promoterCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
}

const standardCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
}

const marketGridViewportStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: 0,
  overflow: 'auto',
  background: '#e6edf3',
}

const marketGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
  gap: 1,
  background: '#e6edf3',
}

const marketGridItemStyle: CSSProperties = {
  boxSizing: 'border-box',
  minWidth: 0,
  minHeight: 156,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 12,
  border: '1px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
}

const marketGridItemHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'start',
  gap: 8,
  minWidth: 0,
}

const marketGridMetricsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
}

const marketGridMetricStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const marketGridFooterStyle: CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minWidth: 0,
}

const marketGridTagGroupStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
}

const marketGridEmptyStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fff',
}

const marketListPanelStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #e6edf3',
  borderRadius: 10,
  background: '#fff',
  overflow: 'hidden',
}

const marketListHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 12px',
  borderBottom: '1px solid #e6edf3',
  background: '#f8fafc',
  flexShrink: 0,
}

const marketListTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  minWidth: 0,
}

const marketListHeaderActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  flexShrink: 0,
}

const parttimeDetailPanelStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  maxHeight: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 12,
  border: '1px solid #e6edf3',
  borderRadius: 10,
  background: '#fbfdff',
  overflow: 'auto',
}

const salaryDetailDialogModalBodyStyle: CSSProperties = {
  padding: 0,
  overflow: 'hidden',
}

const salaryDetailDialogBodyStyle: CSSProperties = {
  maxHeight: 'calc(100vh - 180px)',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '8px 16px 16px',
  background: '#fbfdff',
  overflow: 'auto',
}

const parttimeSummaryPanelStyle: CSSProperties = {
  ...parttimeDetailPanelStyle,
  justifyContent: 'flex-start',
}

const salaryDetailDialogTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  columnGap: 10,
  rowGap: 4,
  flexWrap: 'wrap',
  minWidth: 0,
  paddingRight: 32,
}

const salaryDetailDialogTitleDividerStyle: CSSProperties = {
  width: 1,
  height: 18,
  background: '#dbe5ef',
  flexShrink: 0,
  transform: 'translateY(3px)',
}

const salaryDetailDialogTitleNameStyle: CSSProperties = {
  fontWeight: 700,
  color: '#111827',
}

const salaryDetailDialogTitleMetaStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  color: '#6b7280',
}

const inlineTitleMetaStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  alignItems: 'baseline',
  columnGap: 10,
  rowGap: 4,
  flexWrap: 'wrap',
}

const parttimeDetailMetaStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
}

const salaryStandardEntryButtonStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  flexShrink: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 12,
  padding: '10px 12px',
  border: '1px solid #e6edf3',
  borderRadius: 8,
  background: '#fff',
  color: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
}

const salaryStandardEntryMainStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
}

const salaryStandardEntryActionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  color: '#1677ff',
  flexShrink: 0,
}

const settlementHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'start',
  gap: 10,
  minWidth: 0,
  flexShrink: 0,
}

const settlementBatchActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 6,
  flexShrink: 0,
}

const settlementTableWrapStyle: CSSProperties = {
  minWidth: 0,
  flexShrink: 0,
  border: '1px solid #e6edf3',
  borderRadius: 8,
  background: '#fff',
  overflow: 'hidden',
}

const settlementTableToolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  minWidth: 0,
  padding: '8px 10px',
  borderBottom: '1px solid #e6edf3',
  background: '#f8fafc',
}

const settlementTableToolbarActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 6,
  minWidth: 0,
  flexWrap: 'wrap',
}

const settlementColumnPopoverStyle: CSSProperties = {
  width: 240,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 4,
}

const settlementColumnListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '8px 10px',
}

const settlementColumnFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 6,
  paddingTop: 8,
  borderTop: '1px solid #edf2f7',
}

const settlementImageCaptureStyle: CSSProperties = {
  position: 'fixed',
  left: -10000,
  top: 0,
  zIndex: -1,
  padding: 16,
  background: '#fff',
  color: '#111827',
  pointerEvents: 'none',
}

const settlementImageTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: 14,
  lineHeight: '20px',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  background: '#fff',
}

const settlementImageHeaderCellStyle: CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #dbe5ef',
  background: '#f8fafc',
  color: '#4b5563',
  fontWeight: 700,
  whiteSpace: 'nowrap',
}

const settlementImageBodyCellStyle: CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #dbe5ef',
  color: '#111827',
  whiteSpace: 'nowrap',
}

const settlementImageSummaryCellStyle: CSSProperties = {
  ...settlementImageBodyCellStyle,
  background: '#f8fafc',
  color: '#6b7280',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: '18px',
}

const settlementSalaryValueStyle: CSSProperties = {
  color: '#0f766e',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
}

const settlementSummaryFooterStyle: CSSProperties = {
  minWidth: 760,
  display: 'grid',
  gridTemplateColumns: '130px 100px 120px 110px 110px minmax(70px, 1fr) 120px',
  alignItems: 'center',
  background: '#f8fafc',
}

const settlementSummaryFooterCellStyle: CSSProperties = {
  minWidth: 0,
  padding: '6px 12px',
  color: '#6b7280',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '18px',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const settlementEmptyStyle: CSSProperties = {
  minHeight: 116,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #e6edf3',
  borderRadius: 8,
  background: '#fff',
}

const parttimeEmptyPanelStyle: CSSProperties = {
  ...parttimeDetailPanelStyle,
  minHeight: 360,
  justifyContent: 'center',
}

const detailMetricStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
  padding: '8px 10px',
  border: '1px solid #e6edf3',
  borderRadius: 8,
  background: '#fff',
}

const detailMetricTableWrapStyle: CSSProperties = {
  flexShrink: 0,
  border: '1px solid #e6edf3',
  borderRadius: 8,
  marginBottom: 8,
  background: '#fff',
  overflow: 'hidden',
}

const detailMetricTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  tableLayout: 'fixed',
}

const detailMetricTableLabelStyle: CSSProperties = {
  width: '18%',
  padding: '7px 10px',
  borderRight: '1px solid #e6edf3',
  borderBottom: '1px solid #e6edf3',
  background: '#f8fafc',
  textAlign: 'left',
  fontWeight: 400,
  whiteSpace: 'nowrap',
}

const detailMetricTableValueStyle: CSSProperties = {
  width: '32%',
  padding: '7px 10px',
  borderRight: '1px solid #e6edf3',
  borderBottom: '1px solid #e6edf3',
  minWidth: 0,
  overflow: 'hidden',
}

const detailMetricTableLastRowLabelStyle: CSSProperties = {
  ...detailMetricTableLabelStyle,
  borderBottom: 0,
}

const detailMetricTableLastRowValueStyle: CSSProperties = {
  ...detailMetricTableValueStyle,
  borderBottom: 0,
}

const standardFormDialogStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const salaryStandardConfigModalBodyStyle: CSSProperties = {
  padding: 0,
  overflow: 'hidden',
}

const salaryStandardConfigBodyStyle: CSSProperties = {
  maxHeight: 'calc(100vh - 180px)',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  background: '#fbfdff',
  overflow: 'auto',
}

const salaryStandardConfigHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 12,
  minWidth: 0,
  flexShrink: 0,
}

const salaryStandardTableFrameStyle: CSSProperties = {
  border: '1px solid #e6edf3',
  borderRadius: 8,
  background: '#fff',
  overflow: 'hidden',
  flexShrink: 0,
}

const standardTableHeaderNoWrapStyle: CSSProperties = {
  whiteSpace: 'nowrap',
}

const standardTableCellNoWrapStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
}

const standardFormTargetStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  border: '1px solid #e6edf3',
  borderRadius: 10,
  background: '#f8fafc',
}

const standardFormFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
}
