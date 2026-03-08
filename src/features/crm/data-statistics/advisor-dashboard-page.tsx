import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Button,
  Card,
  DatePicker,
  Select,
  Skeleton,
  Table,
  Tabs,
  TabPane,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  BarChart3,
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
import { useTableScroll } from '@/components/semi/use-table-scroll'
import { adminApi } from '@/features/admin/api'
import { AdvisorTaskSection } from './components/advisor-task-section'
import {
  useAdvisorAppCallRankingData,
  type AdvisorAppCallRankingRow,
} from './hooks/use-advisor-app-call-ranking-data'
import { useAdvisorCallData } from './hooks/use-advisor-call-data'
import { useAdvisorConversionData, type AdvisorConversionRow } from './hooks/use-advisor-conversion-data'
import { useAdvisorCurrentLoadData } from './hooks/use-advisor-current-load-data'
import { formatDurationShort, type AdvisorCallRow } from './utils/advisor-call-stats'

const { Text, Title } = Typography

type DateMode = 'today' | 'single' | 'range'
type ConversionMetric = 'promisedCount' | 'visitedCount' | 'visitRate' | 'paymentAmount'
type CallMetric = 'callCount' | 'contactCount' | 'duration'
type AppCallMetric = 'outboundCallCount' | 'inboundCallCount' | 'totalDuration'
type DetailTab = 'conversion' | 'call'

interface ConversionDetailRow extends AdvisorConversionRow {
  currentLeads: number
  pendingFollowup: number
}

interface RankingItem {
  id: string
  name: string
  subLabel?: string
  value: number
  valueText: string
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
  row: {
    callCount: number
    contactCount: number
    duration: number
  },
  metric: CallMetric,
) {
  switch (metric) {
    case 'callCount':
      return row.callCount
    case 'contactCount':
      return row.contactCount
    case 'duration':
      return row.duration
  }
}

function getAppCallMetricValue(
  row: Pick<AdvisorAppCallRankingRow, 'outboundCallCount' | 'inboundCallCount' | 'totalDuration'>,
  metric: AppCallMetric,
) {
  switch (metric) {
    case 'outboundCallCount':
      return row.outboundCallCount
    case 'inboundCallCount':
      return row.inboundCallCount
    case 'totalDuration':
      return row.totalDuration
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

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  backgroundColor,
  loading,
}: {
  label: string
  value: string
  icon: LucideIcon
  color: string
  backgroundColor: string
  loading?: boolean
}) {
  return (
    <Card
      style={{
        borderRadius: 18,
        border: '1px solid #dbe3ef',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
      }}
      bodyStyle={{ padding: 18 }}
    >
      {loading ? (
        <>
          <Skeleton.Title style={{ width: '42%', marginBottom: 12 }} />
          <Skeleton.Paragraph rows={1} style={{ width: '68%' }} />
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div
              style={{
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#475569',
                fontWeight: 600,
              }}
            >
              <Icon size={15} color={color} />
              {label}
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: `linear-gradient(135deg, color-mix(in srgb, ${backgroundColor} 86%, white 14%) 0%, white 100%)`,
                border: '1px solid #dbe3ef',
                color: color === 'var(--semi-color-text-0)' ? '#0f172a' : color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={18} strokeWidth={2.1} />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 30,
                lineHeight: 1.05,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: '#0f172a',
              }}
            >
              {value}
            </div>
            <div
              style={{
                marginTop: 12,
                height: 6,
                borderRadius: 999,
                background: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '68%',
                  height: '100%',
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${color} 0%, color-mix(in srgb, ${backgroundColor} 82%, white 18%) 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

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
    <div
      style={{
        flex: wide ? '1 1 320px' : '1 1 180px',
        minWidth: wide ? 260 : 170,
      }}
    >
      <Text
        type="tertiary"
        size="small"
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: 11,
          letterSpacing: '0.03em',
          fontWeight: 600,
        }}
      >
        {label}
      </Text>
      {children}
    </div>
  )
}

function DetailInfoBanner({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      style={{
        margin: '0 16px 14px',
        padding: '14px 16px',
        borderRadius: 16,
        border: '1px solid #dbe3ef',
        background: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#e2e8f0',
            color: '#334155',
          }}
        >
          <BarChart3 size={14} strokeWidth={2.1} />
        </div>
        <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{description}</div>
    </div>
  )
}

function RankingPanel({
  title,
  subtitle,
  metricOptions,
  activeMetric,
  onMetricChange,
  items,
  loading,
  emptyText,
}: {
  title: string
  subtitle: string
  metricOptions: Array<{ key: string; label: string }>
  activeMetric: string
  onMetricChange: (metric: string) => void
  items: RankingItem[]
  loading?: boolean
  emptyText: string
}) {
  const maxValue = useMemo(() => Math.max(...items.map((item) => item.value), 1), [items])

  return (
    <Card
      style={{
        borderRadius: 18,
        border: '1px solid #dbe3ef',
        background: '#ffffff',
        boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)',
      }}
      bodyStyle={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d4ed8',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={20} strokeWidth={2.1} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {metricOptions.map((option) => (
            <Button
              key={option.key}
              theme={activeMetric === option.key ? 'solid' : 'light'}
              type={activeMetric === option.key ? 'primary' : 'tertiary'}
              onClick={() => onMetricChange(option.key)}
              style={{
                borderRadius: 999,
                fontWeight: 600,
                paddingInline: 14,
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff' }}>
              <Skeleton.Title style={{ width: 32, height: 32, marginBottom: 0 }} />
              <div style={{ flex: 1 }}>
                <Skeleton.Title style={{ width: '30%', marginBottom: 8 }} />
                <Skeleton.Paragraph rows={1} style={{ width: '80%' }} />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px dashed #cbd5e1' }}>
            <BarChart3 size={32} style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 18, marginBottom: 8, fontWeight: 700, color: '#0f172a' }}>暂无排行数据</div>
            <div style={{ color: '#64748b' }}>{emptyText}</div>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                background: index < 3 ? '#f8fbff' : '#fff',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: index < 3 ? '#1d4ed8' : '#e2e8f0',
                  color: index < 3 ? '#fff' : '#334155',
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                    {item.subLabel && <div style={{ fontSize: 12, color: '#64748b' }}>{item.subLabel}</div>}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: '#f1f5f9',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  >
                    {item.valueText}
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: '#e2e8f0', width: '100%', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: index < 3 ? '#1d4ed8' : '#94a3b8',
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

export function AdvisorDashboardPage() {
  useDocumentTitle('顾问领导看板')

  const today = useMemo(() => getTodayDate(), [])
  const [selectedCampusId, setSelectedCampusId] = useState('all')
  const [dateMode, setDateMode] = useState<DateMode>('today')
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [selectedRange, setSelectedRange] = useState<[Date, Date]>([today, today])
  const [selectedCallAccountId, setSelectedCallAccountId] = useState('')
  const [conversionMetric, setConversionMetric] = useState<ConversionMetric>('visitedCount')
  const [callMetric, setCallMetric] = useState<CallMetric>('callCount')
  const [appCallMetric, setAppCallMetric] = useState<AppCallMetric>('outboundCallCount')
  const [detailTab, setDetailTab] = useState<DetailTab>('conversion')

  const { data: campusesData } = useQuery({
    queryKey: ['campuses-simple'],
    queryFn: () => adminApi.getCampusesSimple(),
    staleTime: 5 * 60 * 1000,
  })

  const campusOptions = useMemo(() => {
    const items = campusesData?.data || []
    return [
      { value: 'all', label: '全部校区' },
      ...items.map((item) => ({ value: item.id, label: item.name })),
    ]
  }, [campusesData])

  const dateFrom = useMemo(() => {
    if (dateMode === 'today') return formatDate(today)
    if (dateMode === 'single') return formatDate(selectedDate)
    return formatDate(selectedRange[0])
  }, [dateMode, selectedDate, selectedRange, today])

  const dateTo = useMemo(() => {
    if (dateMode === 'today') return formatDate(today)
    if (dateMode === 'single') return formatDate(selectedDate)
    return formatDate(selectedRange[1])
  }, [dateMode, selectedDate, selectedRange, today])

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
    backgroundColor: 'var(--semi-color-primary-light-default)',
    loading: shouldUseSingleDayCallSummary ? appCallRankingData.isLoading : callData.isLoading,
  }), [
    appCallRankingData.isLoading,
    callData.isLoading,
    callData.totals.totalCallCount,
    shouldUseSingleDayCallSummary,
    singleDayAppCallSummary.totalOutboundCallCount,
  ])

  const secondaryCallMetricCard = useMemo(() => ({
    label: shouldUseSingleDayCallSummary ? '总呼入电话量' : '联系人数',
    value: shouldUseSingleDayCallSummary
      ? formatCount(singleDayAppCallSummary.totalInboundCallCount)
      : formatCount(callData.totals.totalContactCount),
    icon: shouldUseSingleDayCallSummary ? PhoneIncoming : Users,
    color: 'var(--semi-color-success)',
    backgroundColor: 'var(--semi-color-success-light-default)',
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
    return [...callData.rows].sort((a, b) => {
      const metricDiff = getCallMetricValue(b, callMetric) - getCallMetricValue(a, callMetric)
      if (metricDiff !== 0) return metricDiff
      const callDiff = b.callCount - a.callCount
      if (callDiff !== 0) return callDiff
      return a.name.localeCompare(b.name, 'zh-Hans-CN')
    })
  }, [callData.rows, callMetric])

  const sortedAppCallRows = useMemo(() => {
    return [...appCallRankingData.rows].sort((a, b) => {
      const metricDiff = getAppCallMetricValue(b, appCallMetric) - getAppCallMetricValue(a, appCallMetric)
      if (metricDiff !== 0) return metricDiff
      const outboundDiff = b.outboundCallCount - a.outboundCallCount
      if (outboundDiff !== 0) return outboundDiff
      return a.name.localeCompare(b.name, 'zh-Hans-CN')
    })
  }, [appCallMetric, appCallRankingData.rows])

  const selectedAccountLabel = useMemo(() => {
    const matched = callData.accountOptions.find((option) => option.value === callData.effectiveAccountId)
    return matched?.label || '全部云客账号'
  }, [callData.accountOptions, callData.effectiveAccountId])

  const conversionRankingItems = useMemo<RankingItem[]>(() => {
    return sortedConversionRows.slice(0, 8).map((row) => ({
      id: row.id,
      name: row.advisorName,
      subLabel: row.campusName,
      value: getConversionMetricValue(row, conversionMetric),
      valueText: conversionMetric === 'paymentAmount'
        ? formatMoney(row.paymentAmount)
        : conversionMetric === 'visitRate'
          ? formatPercent(row.visitRate)
          : `${getConversionMetricValue(row, conversionMetric)}`,
    }))
  }, [conversionMetric, sortedConversionRows])

  const { wrapperRef: conversionTableRef, scrollY: conversionScrollY } = useTableScroll()
  const { wrapperRef: callTableRef, scrollY: callScrollY } = useTableScroll()

  const conversionColumns = useMemo<ColumnProps<ConversionDetailRow>[]>(() => [
    {
      title: '顾问姓名',
      dataIndex: 'advisorName',
      width: 140,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusName',
      width: 140,
      render: (text: string | undefined) => <span style={{ color: 'var(--semi-color-text-2)' }}>{text || '-'}</span>,
    },
    {
      title: '诺到数',
      dataIndex: 'promisedCount',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '到访数',
      dataIndex: 'visitedCount',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '到访率',
      dataIndex: 'visitRate',
      width: 100,
      align: 'right' as const,
      render: (value: number) => formatPercent(value),
    },
    {
      title: '缴费笔数',
      dataIndex: 'paymentCount',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '缴费金额',
      dataIndex: 'paymentAmount',
      width: 140,
      align: 'right' as const,
      render: (value: number) => formatMoney(value),
    },
    {
      title: '当前线索数(实时)',
      dataIndex: 'currentLeads',
      width: 120,
      align: 'right' as const,
    },
    {
      title: '当前待回访数(实时)',
      dataIndex: 'pendingFollowup',
      width: 140,
      align: 'right' as const,
    },
  ], [])

  const callColumns = useMemo<ColumnProps<AdvisorCallRow>[]>(() => [
    {
      title: '顾问姓名',
      dataIndex: 'name',
      width: 140,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusNames',
      width: 180,
      render: (text: string) => <span style={{ color: 'var(--semi-color-text-2)' }}>{text || '-'}</span>,
    },
    {
      title: '总电话量',
      dataIndex: 'callCount',
      width: 110,
      align: 'right' as const,
    },
    {
      title: '联系人数',
      dataIndex: 'contactCount',
      width: 110,
      align: 'right' as const,
    },
    {
      title: '联系率',
      dataIndex: 'contactRate',
      width: 100,
      align: 'right' as const,
      render: (value: number) => formatPercent(value),
    },
    {
      title: '通话时长',
      dataIndex: 'duration',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '平均通时',
      dataIndex: 'avgDuration',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
  ], [])

  const callPerformanceColumns = useMemo<ColumnProps<AdvisorCallRow>[]>(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 64,
      align: 'center' as const,
      render: (_: unknown, __: AdvisorCallRow, index: number) => (
        <span
          style={{
            display: 'inline-flex',
            width: 24,
            height: 24,
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
      width: 120,
      render: (text: string) => <span style={{ fontWeight: 600, color: 'var(--semi-color-text-0)' }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusNames',
      width: 160,
      render: (text: string) => (
        <span
          style={{
            color: 'var(--semi-color-text-2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}
        >
          {text || '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: callMetric === 'callCount' ? 'var(--semi-color-primary)' : undefined }}>总电话量</span>,
      dataIndex: 'callCount',
      width: 96,
      align: 'right' as const,
      render: (value: number) => formatCount(value),
    },
    {
      title: <span style={{ color: callMetric === 'contactCount' ? 'var(--semi-color-primary)' : undefined }}>联系人数</span>,
      dataIndex: 'contactCount',
      width: 96,
      align: 'right' as const,
      render: (value: number) => formatCount(value),
    },
    {
      title: <span style={{ color: callMetric === 'duration' ? 'var(--semi-color-primary)' : undefined }}>通话时长</span>,
      dataIndex: 'duration',
      width: 110,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
  ], [callMetric])

  const appCallPerformanceColumns = useMemo<ColumnProps<AdvisorAppCallRankingRow>[]>(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 64,
      align: 'center' as const,
      render: (_: unknown, __: AdvisorAppCallRankingRow, index: number) => (
        <span
          style={{
            display: 'inline-flex',
            width: 24,
            height: 24,
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
      width: 120,
      render: (text: string) => <span style={{ fontWeight: 600, color: 'var(--semi-color-text-0)' }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusNames',
      width: 160,
      render: (text: string) => (
        <span
          style={{
            color: 'var(--semi-color-text-2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}
        >
          {text || '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: appCallMetric === 'outboundCallCount' ? 'var(--semi-color-primary)' : undefined }}>总呼出电话量</span>,
      dataIndex: 'outboundCallCount',
      width: 112,
      align: 'right' as const,
      render: (value: number) => formatCount(value),
    },
    {
      title: '总呼出时长',
      dataIndex: 'outboundDuration',
      width: 108,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: <span style={{ color: appCallMetric === 'inboundCallCount' ? 'var(--semi-color-primary)' : undefined }}>总呼入电话量</span>,
      dataIndex: 'inboundCallCount',
      width: 112,
      align: 'right' as const,
      render: (value: number) => formatCount(value),
    },
    {
      title: '总呼入时长',
      dataIndex: 'inboundDuration',
      width: 108,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: <span style={{ color: appCallMetric === 'totalDuration' ? 'var(--semi-color-primary)' : undefined }}>总通话时长</span>,
      dataIndex: 'totalDuration',
      width: 110,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '未接来电',
      dataIndex: 'missedInboundCount',
      width: 96,
      align: 'right' as const,
      render: (value: number) => formatCount(value),
    },
  ], [appCallMetric])

  const appCallDetailColumns = useMemo<ColumnProps<AdvisorAppCallRankingRow>[]>(() => [
    {
      title: '顾问姓名',
      dataIndex: 'name',
      width: 140,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusNames',
      width: 180,
      render: (text: string) => <span style={{ color: 'var(--semi-color-text-2)' }}>{text || '-'}</span>,
    },
    {
      title: '总呼出电话量',
      dataIndex: 'outboundCallCount',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatCount(value),
    },
    {
      title: '总呼出时长',
      dataIndex: 'outboundDuration',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '总呼入电话量',
      dataIndex: 'inboundCallCount',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatCount(value),
    },
    {
      title: '总呼入时长',
      dataIndex: 'inboundDuration',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '总通话时长',
      dataIndex: 'totalDuration',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '未接来电',
      dataIndex: 'missedInboundCount',
      width: 100,
      align: 'right' as const,
      render: (value: number) => formatCount(value),
    },
  ], [])

  const handleRefresh = async () => {
    await Promise.all([
      conversionData.refetch(),
      callData.refetch(),
      appCallRankingData.refetch(),
      currentLoadData.refetch(),
    ])
  }

  const isRefreshingDashboard = conversionData.isRefetching
    || callData.isRefetching
    || appCallRankingData.isRefetching
    || currentLoadData.isRefetching

  return (
    <DataTableLayout
      title="顾问领导看板"
      allowPageScroll
      contentMinHeight={620}
      headerActions={(
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 12px',
            borderRadius: 999,
            background: '#f8fafc',
            border: '1px solid #dbe3ef',
            color: '#334155',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          管理视图
        </div>
      )}
      toolbar={(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card
            style={{
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid #dbe3ef',
              background: '#ffffff',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
            }}
            bodyStyle={{ padding: 18 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <Text
                    strong
                    style={{
                      display: 'block',
                      marginBottom: 4,
                      color: '#0f172a',
                    }}
                  >
                    筛选控制台
                  </Text>
                  <Text type="tertiary" size="small">
                    顶部统一控制校区、账号与统计日期，所有卡片、排行和明细共享同一组条件。
                  </Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 12px',
                      borderRadius: 999,
                      background: '#eff6ff',
                      color: '#1e3a8a',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <Calendar size={14} />
                    当前口径：
                    {' '}
                    {dateDisplayText}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 12px',
                      borderRadius: 999,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    当前账号：
                    {' '}
                    {selectedAccountLabel}
                  </div>
                  <Button
                    theme="solid"
                    type="primary"
                    icon={<RefreshCw size={15} />}
                    loading={isRefreshingDashboard}
                    onClick={handleRefresh}
                    style={{
                      borderRadius: 12,
                      paddingInline: 14,
                      boxShadow: 'none',
                    }}
                  >
                    刷新数据
                  </Button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 12,
                  flexWrap: 'wrap',
                  paddingTop: 2,
                }}
              >
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
                      onChange={(date) => {
                        if (date) setSelectedDate(date as Date)
                      }}
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
                        if (Array.isArray(date) && date[0] && date[1]) {
                          setSelectedRange(date as [Date, Date])
                        }
                      }}
                      style={{ width: '100%' }}
                    />
                  </FilterToolbarField>
                )}
              </div>
            </div>
          </Card>

          <AdvisorTaskSection
            campusId={selectedCampusId}
            accountId={callData.effectiveAccountId || undefined}
            accountLabel={selectedAccountLabel}
            accountLoading={callData.isLoading}
            dateMode={dateMode}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <MetricCard
              label={outboundMetricCard.label}
              value={outboundMetricCard.value}
              icon={outboundMetricCard.icon}
              color={outboundMetricCard.color}
              backgroundColor={outboundMetricCard.backgroundColor}
              loading={outboundMetricCard.loading}
            />
            <MetricCard
              label={secondaryCallMetricCard.label}
              value={secondaryCallMetricCard.value}
              icon={secondaryCallMetricCard.icon}
              color={secondaryCallMetricCard.color}
              backgroundColor={secondaryCallMetricCard.backgroundColor}
              loading={secondaryCallMetricCard.loading}
            />
            <MetricCard
              label="诺到数"
              value={formatCount(conversionData.summary.totalPromised)}
              icon={Calendar}
              color="var(--semi-color-warning)"
              backgroundColor="var(--semi-color-warning-light-default)"
              loading={conversionData.isLoading}
            />
            <MetricCard
              label="到访数"
              value={formatCount(conversionData.summary.totalVisited)}
              icon={TrendingUp}
              color="var(--semi-color-info)"
              backgroundColor="var(--semi-color-info-light-default)"
              loading={conversionData.isLoading}
            />
            <MetricCard
              label="到访率"
              value={formatPercent(conversionData.summary.visitRate)}
              icon={BarChart3}
              color="var(--semi-color-text-0)"
              backgroundColor="var(--semi-color-fill-0)"
              loading={conversionData.isLoading}
            />
          </div>

          {shouldUseSingleDayCallSummary && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                background: '#eff6ff',
                color: '#1e3a8a',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Phone size={14} />
              指定单日下，外呼过程指标改为复用云客“手机统计 &gt; 使用状态分析”单日口径。
            </div>
          )}

          <Card
            style={{
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid #dbe3ef',
              background: '#ffffff',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
            }}
            bodyStyle={{ padding: 18 }}
          >
            <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px', minWidth: 260 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 11px',
                    borderRadius: 999,
                    background: '#f8fafc',
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  <Wallet size={14} />
                  次级结果
                </div>
                <Title heading={6} style={{ margin: 0, marginBottom: 8 }}>
                  缴费结果与库存口径说明
                </Title>
                <Text type="secondary" size="small" style={{ lineHeight: 1.8 }}>
                  缴费结果保留为次级指标，用于辅助判断转化结果质量；线索数与待回访数保持实时口径，帮助领导同步查看库存压力。
                </Text>
              </div>

              <div
                style={{
                  flex: '1 1 440px',
                  minWidth: 260,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>
                    缴费笔数
                  </Text>
                  {conversionData.isLoading ? (
                    <Skeleton.Title style={{ width: 60, marginBottom: 0 }} />
                  ) : (
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>
                      {conversionData.summary.totalPaymentCount}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 8 }}>
                    缴费金额
                  </Text>
                  {conversionData.isLoading ? (
                    <Skeleton.Title style={{ width: 110, marginBottom: 0 }} />
                  ) : (
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>
                      {formatMoney(conversionData.summary.totalPaymentAmount)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <RankingPanel
              title="转化结果排行"
              subtitle="按顾问展示诺到、到访与缴费结果"
              metricOptions={[
                { key: 'promisedCount', label: '诺到数' },
                { key: 'visitedCount', label: '到访数' },
                { key: 'visitRate', label: '到访率' },
                { key: 'paymentAmount', label: '缴费金额' },
              ]}
              activeMetric={conversionMetric}
              onMetricChange={(metric) => setConversionMetric(metric as ConversionMetric)}
              items={conversionRankingItems}
              loading={conversionData.isLoading || currentLoadData.isLoading}
              emptyText="当前筛选下暂无转化数据"
            />
            <Card
              style={{
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid #dbe3ef',
                background: '#ffffff',
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
              }}
              bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}
              header={(
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                      }}
                    >
                      <Phone size={18} />
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: '#f8fafc',
                          color: '#64748b',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          marginBottom: 8,
                        }}
                      >
                        外呼表现
                      </div>
                      <Title heading={6} style={{ margin: 0 }}>
                        外呼绩效排行
                      </Title>
                      <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 4 }}>
                        {shouldUseAppCallRanking
                          ? '单日复用云客“手机统计 > 使用状态分析”接口'
                          : '日期区间继续沿用顾问外呼统计聚合逻辑'}
                      </Text>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: 5,
                      borderRadius: 999,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {(shouldUseAppCallRanking
                      ? [
                        { key: 'outboundCallCount', label: '总呼出电话量' },
                        { key: 'inboundCallCount', label: '总呼入电话量' },
                        { key: 'totalDuration', label: '总通话时长' },
                      ]
                      : [
                        { key: 'callCount', label: '总电话量' },
                        { key: 'contactCount', label: '联系人数' },
                        { key: 'duration', label: '通话时长' },
                      ]).map((option) => {
                        const isActive = shouldUseAppCallRanking
                          ? appCallMetric === option.key
                          : callMetric === option.key
                        return (
                          <Button
                            key={option.key}
                            theme="borderless"
                            onClick={() => {
                              if (shouldUseAppCallRanking) {
                                setAppCallMetric(option.key as AppCallMetric)
                              } else {
                                setCallMetric(option.key as CallMetric)
                              }
                            }}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 999,
                              background: isActive ? '#e0e7ff' : 'transparent',
                              color: isActive ? '#1e3a8a' : '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                  </div>
                </div>
              )}
            >
              <div style={{ padding: '0 16px 12px', color: 'var(--semi-color-text-2)', fontSize: 12 }}>
                {shouldUseAppCallRanking ? (
                  <>
                    当前按
                    {' '}
                    {appCallMetric === 'outboundCallCount'
                      ? '总呼出电话量'
                      : appCallMetric === 'inboundCallCount'
                        ? '总呼入电话量'
                        : '总通话时长'}
                    {' '}
                    降序排列，单日数据直接复用云客手机统计接口。
                  </>
                ) : (
                  <>
                    当前按
                    {' '}
                    {callMetric === 'callCount' ? '总电话量' : callMetric === 'contactCount' ? '联系人数' : '通话时长'}
                    {' '}
                    降序排列，区间数据使用顾问外呼聚合结果。
                  </>
                )}
              </div>
              <div style={{ padding: '0 14px 16px' }}>
                <div
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                  }}
                >
                  {shouldUseAppCallRanking ? (
                    <Table
                      columns={appCallPerformanceColumns}
                      dataSource={sortedAppCallRows}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      scroll={{ y: 330 }}
                      loading={appCallRankingData.isLoading}
                      empty={(
                        <div style={{ padding: 54, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
                          {callData.hasAccounts ? '当前筛选下暂无手机统计数据' : '未配置云客账号'}
                        </div>
                      )}
                    />
                  ) : (
                    <Table
                      columns={callPerformanceColumns}
                      dataSource={sortedCallRows}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      scroll={{ y: 330 }}
                      loading={callData.isLoading}
                      empty={(
                        <div style={{ padding: 54, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
                          {callData.hasAccounts ? '当前筛选下暂无外呼数据' : '未配置云客账号'}
                        </div>
                      )}
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          background: '#f8fafc',
        }}
      >
        <Tabs
          type="button"
          activeKey={detailTab}
          onChange={(key) => setDetailTab(key as DetailTab)}
          tabPaneMotion={false}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          tabBarStyle={{ padding: '16px 16px 0', flexShrink: 0 }}
          contentStyle={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '12px 0 16px', display: 'flex', flexDirection: 'column' }}
        >
          <TabPane
            tab={(
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>顾问转化明细</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 22,
                    height: 22,
                    paddingInline: 6,
                    borderRadius: 999,
                    background: '#e2e8f0',
                    color: '#334155',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {sortedConversionRows.length}
                </span>
              </div>
            )}
            itemKey="conversion"
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <DetailInfoBanner
                title="转化数据说明"
                description="当前线索数 / 当前待回访数为实时库存值，不跟随日期切换变化，用于辅助判断顾问当下承载压力。"
              />
              <div ref={conversionTableRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 16px' }}>
                <div
                  style={{
                    height: '100%',
                    minHeight: 0,
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <Table
                    columns={conversionColumns}
                    dataSource={sortedConversionRows}
                    rowKey="id"
                    pagination={false}
                    scroll={{ y: conversionScrollY }}
                    loading={conversionData.isLoading || currentLoadData.isLoading}
                    empty={<div style={{ padding: 72, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>当前筛选下暂无转化明细</div>}
                  />
                </div>
              </div>
            </div>
          </TabPane>
          <TabPane
            tab={(
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>顾问外呼明细</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 22,
                    height: 22,
                    paddingInline: 6,
                    borderRadius: 999,
                    background: '#e2e8f0',
                    color: '#334155',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {shouldUseAppCallRanking ? sortedAppCallRows.length : sortedCallRows.length}
                </span>
              </div>
            )}
            itemKey="call"
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <DetailInfoBanner
                title="外呼数据说明"
                description={shouldUseAppCallRanking
                  ? '单日明细与上方外呼绩效排行复用同一套云客“手机统计 > 使用状态分析”接口，按顾问展示呼出、呼入与通话时长。'
                  : '外呼明细与现有“咨询数据统计”复用同一套聚合逻辑，按顾问姓名进行展示；日期区间下的排行和明细保持一致。'}
              />
              <div ref={callTableRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 16px' }}>
                <div
                  style={{
                    height: '100%',
                    minHeight: 0,
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  {shouldUseAppCallRanking ? (
                    <Table
                      columns={appCallDetailColumns}
                      dataSource={sortedAppCallRows}
                      rowKey="id"
                      pagination={false}
                      scroll={{ y: callScrollY }}
                      loading={appCallRankingData.isLoading}
                      empty={<div style={{ padding: 72, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>{callData.hasAccounts ? '当前筛选下暂无手机统计外呼明细' : '未配置云客账号'}</div>}
                    />
                  ) : (
                    <Table
                      columns={callColumns}
                      dataSource={sortedCallRows}
                      rowKey="id"
                      pagination={false}
                      scroll={{ y: callScrollY }}
                      loading={callData.isLoading}
                      empty={<div style={{ padding: 72, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>{callData.hasAccounts ? '当前筛选下暂无外呼明细' : '未配置云客账号'}</div>}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </DataTableLayout>
  )
}

export default AdvisorDashboardPage
