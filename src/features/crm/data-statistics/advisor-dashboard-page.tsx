import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Button,
  Card,
  DatePicker,
  Select,
  Skeleton,
  Table,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  Calendar,
  Phone,
  PhoneIncoming,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { adminApi } from '@/features/admin/api'
import {
  useAdvisorAppCallRankingData,
  type AdvisorAppCallRankingRow,
} from './hooks/use-advisor-app-call-ranking-data'
import { useAdvisorCallData } from './hooks/use-advisor-call-data'
import { useAdvisorConversionData, type AdvisorConversionRow } from './hooks/use-advisor-conversion-data'
import { useAdvisorCurrentLoadData } from './hooks/use-advisor-current-load-data'
import {
  getEffectiveOutboundCountByName,
  useAdvisorEffectiveOutboundData,
} from './hooks/use-advisor-effective-outbound-data'
import { formatDurationShort, type AdvisorCallRow } from './utils/advisor-call-stats'

const { Text, Title } = Typography

type DateMode = 'today' | 'week' | 'month' | 'single' | 'range'
type ConversionMetric = 'promisedCount' | 'visitedCount' | 'visitRate' | 'paymentAmount'
type CallMetric = 'callCount' | 'effectiveOutboundCallCount' | 'contactCount' | 'contactRate' | 'duration' | 'avgDuration'
type AppCallMetric = 'outboundCallCount' | 'effectiveOutboundCallCount' | 'outboundDuration' | 'inboundCallCount' | 'inboundDuration' | 'totalDuration' | 'missedInboundCount'
type TableSortOrder = 'ascend' | 'descend'

const CALL_SORTABLE_METRICS = ['callCount', 'effectiveOutboundCallCount', 'contactCount', 'contactRate', 'duration', 'avgDuration'] as const satisfies readonly CallMetric[]
const APP_CALL_SORTABLE_METRICS = ['outboundCallCount', 'effectiveOutboundCallCount', 'outboundDuration', 'inboundCallCount', 'inboundDuration', 'totalDuration', 'missedInboundCount'] as const satisfies readonly AppCallMetric[]

interface TableSorterChange {
  dataIndex?: string
  sortOrder?: boolean | TableSortOrder
}

interface ConversionDetailRow extends AdvisorConversionRow {
  currentLeads: number
  pendingFollowup: number
}

interface CallPerformanceRow extends AdvisorCallRow {
  effectiveOutboundCallCount: number
}

interface AppCallPerformanceRow extends AdvisorAppCallRankingRow {
  effectiveOutboundCallCount: number
}

interface AppCallSummary {
  totalOutboundCallCount: number
  totalInboundCallCount: number
  totalMissedInboundCount: number
  totalOutboundDuration: number
  totalInboundDuration: number
  totalDuration: number
}

function formatDate(value: Date) {
  return format(value, 'yyyy-MM-dd')
}

function toSafeNumber(value?: number | null) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

function formatCount(value?: number | null) {
  return toSafeNumber(value).toLocaleString()
}

function formatPercent(value?: number | null) {
  return `${toSafeNumber(value).toFixed(1)}%`
}

function formatMoney(value?: number | null) {
  return `¥${toSafeNumber(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getTodayDate() {
  return new Date()
}

function getCurrentWeekRange(baseDate: Date): [Date, Date] {
  return [
    startOfWeek(baseDate, { weekStartsOn: 1 }),
    endOfWeek(baseDate, { weekStartsOn: 1 }),
  ]
}

function getCurrentMonthRange(baseDate: Date): [Date, Date] {
  return [startOfMonth(baseDate), endOfMonth(baseDate)]
}

function getConversionMetricValue(row: ConversionDetailRow, metric: ConversionMetric) {
  switch (metric) {
    case 'promisedCount':
      return row.promisedCount
    case 'visitedCount':
      return row.visitedCount
    case 'visitRate':
      return row.visitRate
    case 'paymentAmount':
      return row.paymentAmount
  }
}

function getCallMetricValue(
  row: CallPerformanceRow,
  metric: CallMetric,
) {
  switch (metric) {
    case 'callCount':
      return row.callCount
    case 'effectiveOutboundCallCount':
      return row.effectiveOutboundCallCount
    case 'contactCount':
      return row.contactCount
    case 'contactRate':
      return row.contactRate
    case 'duration':
      return row.duration
    case 'avgDuration':
      return row.avgDuration
  }
}

function getAppCallMetricValue(
  row: AppCallPerformanceRow,
  metric: AppCallMetric,
) {
  switch (metric) {
    case 'outboundCallCount':
      return row.outboundCallCount
    case 'effectiveOutboundCallCount':
      return row.effectiveOutboundCallCount
    case 'outboundDuration':
      return row.outboundDuration
    case 'inboundCallCount':
      return row.inboundCallCount
    case 'inboundDuration':
      return row.inboundDuration
    case 'totalDuration':
      return row.totalDuration
    case 'missedInboundCount':
      return row.missedInboundCount
  }
}

function compareMetricValues(a: number, b: number, sortOrder: TableSortOrder) {
  const diff = a - b
  return sortOrder === 'ascend' ? diff : -diff
}

function compareNames(a: string, b: string) {
  return a.localeCompare(b, 'zh-Hans-CN')
}

function getNextMetricSortState<T extends string>(
  sorter: TableSorterChange | undefined,
  currentMetric: T,
  currentSortOrder: TableSortOrder,
  sortableMetrics: readonly T[],
) {
  const nextMetric = sorter?.dataIndex as T | undefined
  if (!nextMetric || !sortableMetrics.includes(nextMetric)) {
    return { metric: currentMetric, sortOrder: currentSortOrder }
  }

  if (nextMetric !== currentMetric) {
    return { metric: nextMetric, sortOrder: 'descend' as const }
  }

  const nextSortOrder = sorter?.sortOrder
  if (nextSortOrder === 'ascend' || nextSortOrder === 'descend') {
    return { metric: nextMetric, sortOrder: nextSortOrder }
  }

  return {
    metric: nextMetric,
    sortOrder: currentSortOrder === 'descend' ? 'ascend' as const : 'descend' as const,
  }
}

function summarizeAppCallRows(rows: AdvisorAppCallRankingRow[]): AppCallSummary {
  return rows.reduce<AppCallSummary>((summary, row) => ({
    totalOutboundCallCount: summary.totalOutboundCallCount + toSafeNumber(row.outboundCallCount),
    totalInboundCallCount: summary.totalInboundCallCount + toSafeNumber(row.inboundCallCount),
    totalMissedInboundCount: summary.totalMissedInboundCount + toSafeNumber(row.missedInboundCount),
    totalOutboundDuration: summary.totalOutboundDuration + toSafeNumber(row.outboundDuration),
    totalInboundDuration: summary.totalInboundDuration + toSafeNumber(row.inboundDuration),
    totalDuration: summary.totalDuration + toSafeNumber(row.totalDuration),
  }), {
    totalOutboundCallCount: 0,
    totalInboundCallCount: 0,
    totalMissedInboundCount: 0,
    totalOutboundDuration: 0,
    totalInboundDuration: 0,
    totalDuration: 0,
  })
}

/* ── 紧凑指标卡片 ── */
function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: string
  icon: LucideIcon
  color: string
  loading?: boolean
}) {
  return (
    <Card
      style={{ borderRadius: 10, border: '1px solid var(--semi-color-border)' }}
      bodyStyle={{ padding: '14px 16px' }}
    >
      {loading ? (
        <Skeleton.Title style={{ width: '60%', marginBottom: 0 }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginBottom: 4, fontWeight: 500 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--semi-color-text-0)' }}>
              {value}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--semi-color-fill-0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={18} color={color} />
          </div>
        </div>
      )}
    </Card>
  )
}

/* ── 筛选字段（独立模式使用） ── */
function FilterToolbarField({
  label,
  children,
  wide = false,
}: {
  label: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div style={{ flex: wide ? '1 1 320px' : '1 1 180px', minWidth: wide ? 260 : 170 }}>
      <Text
        type="tertiary"
        size="small"
        style={{ display: 'block', marginBottom: 6, fontSize: 11, letterSpacing: '0.03em', fontWeight: 600 }}
      >
        {label}
      </Text>
      {children}
    </div>
  )
}

/* ── 指标切换按钮组 ── */
function MetricToggle<T extends string>({
  options,
  active,
  onChange,
}: {
  options: Array<{ key: T; label: string }>
  active: T
  onChange: (key: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <Button
          key={opt.key}
          size="small"
          theme={active === opt.key ? 'solid' : 'light'}
          type={active === opt.key ? 'primary' : 'tertiary'}
          onClick={() => onChange(opt.key)}
          style={{ borderRadius: 6 }}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

export interface AdvisorOverviewExternalFilter {
  dateMode: DateMode
  selectedDate: Date
  selectedRange: [Date, Date]
  selectedCampusId: string
  selectedAccountId: string
  dateFrom: string
  dateTo: string
}

export interface AdvisorDashboardPageProps {
  externalFilter?: AdvisorOverviewExternalFilter
}

export function AdvisorDashboardPage({ externalFilter }: AdvisorDashboardPageProps = {}) {
  useDocumentTitle('顾问领导看板')

  const today = useMemo(() => getTodayDate(), [])
  const [internalCampusId, setInternalCampusId] = useState('all')
  const [internalDateMode, setInternalDateMode] = useState<DateMode>('today')
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date>(today)
  const [internalSelectedRange, setInternalSelectedRange] = useState<[Date, Date]>([today, today])
  const [internalCallAccountId, setInternalCallAccountId] = useState('')

  const [conversionMetric, setConversionMetric] = useState<ConversionMetric>('visitedCount')
  const [callMetric, setCallMetric] = useState<CallMetric>('callCount')
  const [appCallMetric, setAppCallMetric] = useState<AppCallMetric>('outboundCallCount')
  const [callSortOrder, setCallSortOrder] = useState<TableSortOrder>('descend')
  const [appCallSortOrder, setAppCallSortOrder] = useState<TableSortOrder>('descend')

  const selectedCampusId = externalFilter?.selectedCampusId ?? internalCampusId
  const setSelectedCampusId = (v: string) => { if (!externalFilter) setInternalCampusId(v) }
  const dateMode = externalFilter?.dateMode ?? internalDateMode
  const setDateMode = (v: DateMode) => { if (!externalFilter) setInternalDateMode(v) }
  const selectedDate = externalFilter?.selectedDate ?? internalSelectedDate
  const setSelectedDate = (v: Date) => { if (!externalFilter) setInternalSelectedDate(v) }
  const selectedRange = externalFilter?.selectedRange ?? internalSelectedRange
  const setSelectedRange = (v: [Date, Date]) => { if (!externalFilter) setInternalSelectedRange(v) }
  const selectedCallAccountId = externalFilter?.selectedAccountId ?? internalCallAccountId
  const setSelectedCallAccountId = (v: string) => { if (!externalFilter) setInternalCallAccountId(v) }

  const { data: campusesData } = useQuery({
    queryKey: ['campuses-simple'],
    queryFn: () => adminApi.getCampusesSimple(),
    staleTime: 5 * 60 * 1000,
    enabled: !externalFilter,
  })

  const campusOptions = useMemo(() => {
    if (externalFilter) return []
    const items = campusesData?.data || []
    return [
      { value: 'all', label: '全部校区' },
      ...items.map((item) => ({ value: item.id, label: item.name })),
    ]
  }, [externalFilter, campusesData])

  const dateFrom = useMemo(() => {
    if (externalFilter) return externalFilter.dateFrom
    if (dateMode === 'today') return formatDate(today)
    if (dateMode === 'week') return formatDate(getCurrentWeekRange(today)[0])
    if (dateMode === 'month') return formatDate(getCurrentMonthRange(today)[0])
    if (dateMode === 'single') return formatDate(selectedDate)
    return formatDate(selectedRange[0])
  }, [externalFilter, dateMode, selectedDate, selectedRange, today])

  const dateTo = useMemo(() => {
    if (externalFilter) return externalFilter.dateTo
    if (dateMode === 'today') return formatDate(today)
    if (dateMode === 'week') return formatDate(getCurrentWeekRange(today)[1])
    if (dateMode === 'month') return formatDate(getCurrentMonthRange(today)[1])
    if (dateMode === 'single') return formatDate(selectedDate)
    return formatDate(selectedRange[1])
  }, [externalFilter, dateMode, selectedDate, selectedRange, today])

  const dateDisplayText = dateFrom === dateTo ? dateFrom : `${dateFrom} 至 ${dateTo}`

  const callPeriod = dateMode === 'today' ? 0 : undefined
  const callStartDate = dateMode === 'today' ? undefined : dateFrom
  const callEndDate = dateMode === 'today' ? undefined : dateTo

  const callData = useAdvisorCallData({
    selectedCampusId,
    selectedAccountId: selectedCallAccountId,
    period: callPeriod,
    startDate: callStartDate,
    endDate: callEndDate,
  })

  const conversionData = useAdvisorConversionData({
    campusId: selectedCampusId,
    dateFrom,
    dateTo,
  })

  const currentLoadData = useAdvisorCurrentLoadData()
  const shouldUseAppCallRanking = dateFrom === dateTo
  const shouldUseSingleDayCallSummary = dateMode === 'single'
  const appCallRankingData = useAdvisorAppCallRankingData({
    selectedAccountId: callData.effectiveAccountId,
    departmentId: callData.effectiveDepartmentId,
    selectedCampusId,
    time: dateMode === 'today' ? '0' : dateFrom,
    enabled: shouldUseAppCallRanking,
  })
  const effectiveOutboundData = useAdvisorEffectiveOutboundData({
    dateFrom,
    dateTo,
    selectedCampusId,
    minDuration: 30,
  })

  const singleDayAppCallSummary = useMemo(
    () => summarizeAppCallRows(appCallRankingData.rows),
    [appCallRankingData.rows],
  )

  const outboundMetricCard = useMemo(() => ({
    label: '外呼总量',
    value: shouldUseSingleDayCallSummary
      ? formatCount(singleDayAppCallSummary.totalOutboundCallCount)
      : formatCount(callData.totals.totalCallCount),
    icon: Phone,
    color: 'var(--semi-color-primary)',
    loading: shouldUseSingleDayCallSummary ? appCallRankingData.isLoading : callData.isLoading,
  }), [
    appCallRankingData.isLoading,
    callData.isLoading,
    callData.totals.totalCallCount,
    shouldUseSingleDayCallSummary,
    singleDayAppCallSummary.totalOutboundCallCount,
  ])

  const secondaryCallMetricCard = useMemo(() => ({
    label: shouldUseSingleDayCallSummary ? '呼入电话量' : '联系人数',
    value: shouldUseSingleDayCallSummary
      ? formatCount(singleDayAppCallSummary.totalInboundCallCount)
      : formatCount(callData.totals.totalContactCount),
    icon: shouldUseSingleDayCallSummary ? PhoneIncoming : Users,
    color: 'var(--semi-color-success)',
    loading: shouldUseSingleDayCallSummary ? appCallRankingData.isLoading : callData.isLoading,
  }), [
    appCallRankingData.isLoading,
    callData.isLoading,
    callData.totals.totalContactCount,
    shouldUseSingleDayCallSummary,
    singleDayAppCallSummary.totalInboundCallCount,
  ])

  const conversionDetailRows = useMemo<ConversionDetailRow[]>(() => {
    return conversionData.rows.map((row) => {
      const currentLoad = currentLoadData.summaryMap.get(row.advisorId)
      return {
        ...row,
        currentLeads: currentLoad?.totalLeads || 0,
        pendingFollowup: currentLoad?.pendingFollowup || 0,
      }
    })
  }, [conversionData.rows, currentLoadData.summaryMap])

  const callPerformanceRows = useMemo<CallPerformanceRow[]>(() => {
    return callData.rows.map((row) => ({
      ...row,
      effectiveOutboundCallCount: getEffectiveOutboundCountByName(
        effectiveOutboundData.countByAdvisorName,
        row.name,
      ),
    }))
  }, [callData.rows, effectiveOutboundData.countByAdvisorName])

  const appCallPerformanceRows = useMemo<AppCallPerformanceRow[]>(() => {
    return appCallRankingData.rows.map((row) => ({
      ...row,
      effectiveOutboundCallCount: getEffectiveOutboundCountByName(
        effectiveOutboundData.countByAdvisorName,
        row.name,
      ),
    }))
  }, [appCallRankingData.rows, effectiveOutboundData.countByAdvisorName])

  const sortedConversionRows = useMemo(() => {
    return [...conversionDetailRows].sort((a, b) => {
      const metricDiff = getConversionMetricValue(b, conversionMetric) - getConversionMetricValue(a, conversionMetric)
      if (metricDiff !== 0) return metricDiff
      const paymentDiff = b.paymentAmount - a.paymentAmount
      if (paymentDiff !== 0) return paymentDiff
      return a.advisorName.localeCompare(b.advisorName, 'zh-Hans-CN')
    })
  }, [conversionDetailRows, conversionMetric])

  const sortedCallRows = useMemo(() => {
    return [...callPerformanceRows].sort((a, b) => {
      const metricDiff = compareMetricValues(getCallMetricValue(a, callMetric), getCallMetricValue(b, callMetric), callSortOrder)
      if (metricDiff !== 0) return metricDiff
      const callDiff = compareMetricValues(a.callCount, b.callCount, 'descend')
      if (callDiff !== 0) return callDiff
      return compareNames(a.name, b.name)
    })
  }, [callPerformanceRows, callMetric, callSortOrder])

  const sortedAppCallRows = useMemo(() => {
    return [...appCallPerformanceRows].sort((a, b) => {
      const metricDiff = compareMetricValues(getAppCallMetricValue(a, appCallMetric), getAppCallMetricValue(b, appCallMetric), appCallSortOrder)
      if (metricDiff !== 0) return metricDiff
      const outboundDiff = compareMetricValues(a.outboundCallCount, b.outboundCallCount, 'descend')
      if (outboundDiff !== 0) return outboundDiff
      return compareNames(a.name, b.name)
    })
  }, [appCallMetric, appCallPerformanceRows, appCallSortOrder])

  const conversionColumns = useMemo<ColumnProps<ConversionDetailRow>[]>(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, __: ConversionDetailRow, index: number) => (
        <span
          style={{
            display: 'inline-flex',
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: index < 3 ? 'var(--semi-color-primary-light-default)' : 'var(--semi-color-fill-0)',
            color: index < 3 ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: '顾问',
      dataIndex: 'advisorName',
      width: 100,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusName',
      width: 100,
      render: (text: string | undefined) => <span style={{ color: 'var(--semi-color-text-2)' }}>{text || '-'}</span>,
    },
    {
      title: '诺到数',
      dataIndex: 'promisedCount',
      width: 80,
      align: 'right' as const,
    },
    {
      title: '到访数',
      dataIndex: 'visitedCount',
      width: 80,
      align: 'right' as const,
    },
    {
      title: '到访率',
      dataIndex: 'visitRate',
      width: 80,
      align: 'right' as const,
      render: (value: number) => formatPercent(value),
    },
    {
      title: '业绩笔数',
      dataIndex: 'paymentCount',
      width: 80,
      align: 'right' as const,
    },
    {
      title: '净业绩额',
      dataIndex: 'paymentAmount',
      width: 110,
      align: 'right' as const,
      render: (value: number) => formatMoney(value),
    },
    {
      title: '线索数(实时)',
      dataIndex: 'currentLeads',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '待回访(实时)',
      dataIndex: 'pendingFollowup',
      width: 100,
      align: 'right' as const,
    },
  ], [])

  const callPerformanceColumns = useMemo<ColumnProps<CallPerformanceRow>[]>(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, __: CallPerformanceRow, index: number) => (
        <span
          style={{
            display: 'inline-flex',
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: index < 3 ? 'var(--semi-color-primary-light-default)' : 'var(--semi-color-fill-0)',
            color: index < 3 ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: '顾问',
      dataIndex: 'name',
      width: 100,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusNames',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'var(--semi-color-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: '总电话量',
      dataIndex: 'callCount',
      width: 90,
      align: 'right' as const,
      sorter: true,
      sortOrder: callMetric === 'callCount' ? callSortOrder : false,
      render: (value: number) => formatCount(value),
    },
    {
      title: '30s+外呼',
      dataIndex: 'effectiveOutboundCallCount',
      width: 95,
      align: 'right' as const,
      sorter: true,
      sortOrder: callMetric === 'effectiveOutboundCallCount' ? callSortOrder : false,
      render: (value: number) => formatCount(value),
    },
    {
      title: '联系人数',
      dataIndex: 'contactCount',
      width: 90,
      align: 'right' as const,
      sorter: true,
      sortOrder: callMetric === 'contactCount' ? callSortOrder : false,
      render: (value: number) => formatCount(value),
    },
    {
      title: '联系率',
      dataIndex: 'contactRate',
      width: 80,
      align: 'right' as const,
      sorter: true,
      sortOrder: callMetric === 'contactRate' ? callSortOrder : false,
      render: (value: number) => formatPercent(value),
    },
    {
      title: '通话时长',
      dataIndex: 'duration',
      width: 100,
      align: 'right' as const,
      sorter: true,
      sortOrder: callMetric === 'duration' ? callSortOrder : false,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '平均通时',
      dataIndex: 'avgDuration',
      width: 100,
      align: 'right' as const,
      sorter: true,
      sortOrder: callMetric === 'avgDuration' ? callSortOrder : false,
      render: (value: number) => formatDurationShort(value),
    },
  ], [callMetric, callSortOrder])

  const appCallPerformanceColumns = useMemo<ColumnProps<AppCallPerformanceRow>[]>(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, __: AppCallPerformanceRow, index: number) => (
        <span
          style={{
            display: 'inline-flex',
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: index < 3 ? 'var(--semi-color-primary-light-default)' : 'var(--semi-color-fill-0)',
            color: index < 3 ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: '顾问',
      dataIndex: 'name',
      width: 100,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusNames',
      width: 120,
      render: (text: string) => (
        <span style={{ color: 'var(--semi-color-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: '呼出量',
      dataIndex: 'outboundCallCount',
      width: 80,
      align: 'right' as const,
      sorter: true,
      sortOrder: appCallMetric === 'outboundCallCount' ? appCallSortOrder : false,
      render: (value: number) => formatCount(value),
    },
    {
      title: '30s+外呼',
      dataIndex: 'effectiveOutboundCallCount',
      width: 95,
      align: 'right' as const,
      sorter: true,
      sortOrder: appCallMetric === 'effectiveOutboundCallCount' ? appCallSortOrder : false,
      render: (value: number) => formatCount(value),
    },
    {
      title: '呼出时长',
      dataIndex: 'outboundDuration',
      width: 90,
      align: 'right' as const,
      sorter: true,
      sortOrder: appCallMetric === 'outboundDuration' ? appCallSortOrder : false,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '呼入量',
      dataIndex: 'inboundCallCount',
      width: 80,
      align: 'right' as const,
      sorter: true,
      sortOrder: appCallMetric === 'inboundCallCount' ? appCallSortOrder : false,
      render: (value: number) => formatCount(value),
    },
    {
      title: '呼入时长',
      dataIndex: 'inboundDuration',
      width: 90,
      align: 'right' as const,
      sorter: true,
      sortOrder: appCallMetric === 'inboundDuration' ? appCallSortOrder : false,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '总通话时长',
      dataIndex: 'totalDuration',
      width: 100,
      align: 'right' as const,
      sorter: true,
      sortOrder: appCallMetric === 'totalDuration' ? appCallSortOrder : false,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '未接来电',
      dataIndex: 'missedInboundCount',
      width: 80,
      align: 'right' as const,
      sorter: true,
      sortOrder: appCallMetric === 'missedInboundCount' ? appCallSortOrder : false,
      render: (value: number) => formatCount(value),
    },
  ], [appCallMetric, appCallSortOrder])

  const handleCallTableChange = (changeInfo: { sorter?: TableSorterChange }) => {
    const nextState = getNextMetricSortState(
      changeInfo.sorter,
      callMetric,
      callSortOrder,
      CALL_SORTABLE_METRICS,
    )
    setCallMetric(nextState.metric)
    setCallSortOrder(nextState.sortOrder)
  }

  const handleAppCallTableChange = (changeInfo: { sorter?: TableSorterChange }) => {
    const nextState = getNextMetricSortState(
      changeInfo.sorter,
      appCallMetric,
      appCallSortOrder,
      APP_CALL_SORTABLE_METRICS,
    )
    setAppCallMetric(nextState.metric)
    setAppCallSortOrder(nextState.sortOrder)
  }

  const handleRefresh = async () => {
    await Promise.all([
      conversionData.refetch(),
      callData.refetch(),
      appCallRankingData.refetch(),
      effectiveOutboundData.refetch(),
      currentLoadData.refetch(),
    ])
  }

  const isRefreshing = conversionData.isRefetching
    || callData.isRefetching
    || appCallRankingData.isRefetching
    || effectiveOutboundData.isRefetching
    || currentLoadData.isRefetching

  /* ── 主内容区（嵌入和独立模式共用） ── */
  const dashboardContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
      {/* 指标卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>
        <MetricCard
          label={outboundMetricCard.label}
          value={outboundMetricCard.value}
          icon={outboundMetricCard.icon}
          color={outboundMetricCard.color}
          loading={outboundMetricCard.loading}
        />
        <MetricCard
          label={secondaryCallMetricCard.label}
          value={secondaryCallMetricCard.value}
          icon={secondaryCallMetricCard.icon}
          color={secondaryCallMetricCard.color}
          loading={secondaryCallMetricCard.loading}
        />
        <MetricCard
          label="诺到数"
          value={formatCount(conversionData.summary.totalPromised)}
          icon={Calendar}
          color="var(--semi-color-warning)"
          loading={conversionData.isLoading}
        />
        <MetricCard
          label="到访数"
          value={formatCount(conversionData.summary.totalVisited)}
          icon={TrendingUp}
          color="var(--semi-color-info)"
          loading={conversionData.isLoading}
        />
        <MetricCard
          label="到访率"
          value={formatPercent(conversionData.summary.visitRate)}
          icon={TrendingUp}
          color="var(--semi-color-text-2)"
          loading={conversionData.isLoading}
        />
        <MetricCard
          label="业绩笔数"
          value={formatCount(conversionData.summary.totalPaymentCount)}
          icon={Wallet}
          color="var(--semi-color-success)"
          loading={conversionData.isLoading}
        />
        <MetricCard
          label="净业绩额"
          value={formatMoney(conversionData.summary.totalPaymentAmount)}
          icon={Wallet}
          color="var(--semi-color-primary)"
          loading={conversionData.isLoading}
        />
      </div>

      {/* 转化结果 */}
      <Card
        style={{ borderRadius: 10, border: '1px solid var(--semi-color-border)' }}
        bodyStyle={{ padding: 0 }}
        header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Title heading={6} style={{ margin: 0 }}>转化结果排行</Title>
            <MetricToggle
              options={[
                { key: 'promisedCount' as ConversionMetric, label: '诺到数' },
                { key: 'visitedCount' as ConversionMetric, label: '到访数' },
                { key: 'visitRate' as ConversionMetric, label: '到访率' },
                { key: 'paymentAmount' as ConversionMetric, label: '净业绩额' },
              ]}
              active={conversionMetric}
              onChange={(key) => setConversionMetric(key as ConversionMetric)}
            />
          </div>
        }
      >
        <Table
          columns={conversionColumns}
          dataSource={sortedConversionRows}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ y: 380 }}
          loading={conversionData.isLoading || currentLoadData.isLoading}
          empty={<div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>当前筛选下暂无转化数据</div>}
        />
      </Card>

      {/* 外呼绩效 */}
      <Card
        style={{ borderRadius: 10, border: '1px solid var(--semi-color-border)' }}
        bodyStyle={{ padding: 0 }}
        header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Title heading={6} style={{ margin: 0 }}>外呼绩效排行</Title>
            {shouldUseAppCallRanking ? (
              <MetricToggle
                options={[
                  { key: 'outboundCallCount' as AppCallMetric, label: '呼出量' },
                  { key: 'outboundDuration' as AppCallMetric, label: '呼出时长' },
                  { key: 'inboundCallCount' as AppCallMetric, label: '呼入量' },
                  { key: 'totalDuration' as AppCallMetric, label: '总通话时长' },
                ]}
                active={appCallMetric}
                onChange={(key) => {
                  setAppCallMetric(key as AppCallMetric)
                  setAppCallSortOrder('descend')
                }}
              />
            ) : (
              <MetricToggle
                options={[
                  { key: 'callCount' as CallMetric, label: '总电话量' },
                  { key: 'contactCount' as CallMetric, label: '联系人数' },
                  { key: 'duration' as CallMetric, label: '通话时长' },
                ]}
                active={callMetric}
                onChange={(key) => {
                  setCallMetric(key as CallMetric)
                  setCallSortOrder('descend')
                }}
              />
            )}
          </div>
        }
      >
        {shouldUseAppCallRanking ? (
          <Table
            columns={appCallPerformanceColumns}
            dataSource={sortedAppCallRows}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ y: 380 }}
            loading={appCallRankingData.isLoading || effectiveOutboundData.isLoading}
            onChange={handleAppCallTableChange}
            empty={
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
                {callData.hasAccounts ? '当前筛选下暂无手机统计数据' : '未配置云客账号'}
              </div>
            }
          />
        ) : (
          <Table
            columns={callPerformanceColumns}
            dataSource={sortedCallRows}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ y: 380 }}
            loading={callData.isLoading || effectiveOutboundData.isLoading}
            onChange={handleCallTableChange}
            empty={
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
                {callData.hasAccounts ? '当前筛选下暂无外呼数据' : '未配置云客账号'}
              </div>
            }
          />
        )}
      </Card>
    </div>
  )

  /* 嵌入模式：直接返回内容，不套 DataTableLayout */
  if (externalFilter) {
    return dashboardContent
  }

  /* 独立模式：带筛选工具栏 */
  return (
    <DataTableLayout
      title="顾问领导看板"
      allowPageScroll
      contentMinHeight={620}
      headerActions={
        <Button
          theme="light"
          icon={<RefreshCw size={14} />}
          loading={isRefreshing}
          onClick={handleRefresh}
          style={{ borderRadius: 8 }}
        >
          刷新
        </Button>
      }
      toolbar={
        <Card
          style={{ borderRadius: 10, border: '1px solid var(--semi-color-border)', marginBottom: 4 }}
          bodyStyle={{ padding: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <FilterToolbarField label="校区">
              <Select
                value={selectedCampusId}
                onChange={(value) => setSelectedCampusId(value as string)}
                optionList={campusOptions}
                style={{ width: '100%' }}
              />
            </FilterToolbarField>

            {callData.accountOptions.length > 1 && (
              <FilterToolbarField label="云客账号">
                <Select
                  value={callData.effectiveAccountId || undefined}
                  onChange={(value) => setSelectedCallAccountId(value as string)}
                  optionList={callData.accountOptions}
                  placeholder="选择云客账号"
                  style={{ width: '100%' }}
                />
              </FilterToolbarField>
            )}

            <FilterToolbarField label="日期模式">
              <Select
                value={dateMode}
                onChange={(value) => setDateMode(value as DateMode)}
                optionList={[
                  { value: 'today', label: '今天' },
                  { value: 'week', label: '本周' },
                  { value: 'month', label: '本月' },
                  { value: 'single', label: '指定单日' },
                  { value: 'range', label: '日期区间' },
                ]}
                style={{ width: '100%' }}
              />
            </FilterToolbarField>

            {dateMode === 'single' && (
              <FilterToolbarField label="指定日期" wide>
                <DatePicker
                  type="date"
                  value={selectedDate}
                  onChange={(date) => { if (date) setSelectedDate(date as Date) }}
                  style={{ width: '100%' }}
                />
              </FilterToolbarField>
            )}

            {dateMode === 'range' && (
              <FilterToolbarField label="日期区间" wide>
                <DatePicker
                  type="dateRange"
                  value={selectedRange}
                  onChange={(date) => {
                    if (Array.isArray(date) && date[0] && date[1]) setSelectedRange(date as [Date, Date])
                  }}
                  style={{ width: '100%' }}
                />
              </FilterToolbarField>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <Text type="tertiary" size="small">{dateDisplayText}</Text>
            </div>
          </div>
        </Card>
      }
    >
      {dashboardContent}
    </DataTableLayout>
  )
}

export default AdvisorDashboardPage
