/**
 * 小地推数据收集统计区块
 * - 筛选：活动 / 日期范围 / 推广员
 * - 总览：区间收集、活跃推广员、活动累计、头部贡献
 * - 明细：推广员采集数量
 */

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Banner,
  Button,
  DatePicker,
  Empty,
  Select,
  Skeleton,
  Typography,
} from '@douyinfe/semi-ui-19'
import {
  IconActivity,
  IconBarChartVStroked,
  IconInfoCircle,
  IconPlus,
  IconRefresh,
  IconUserGroup,
} from '@douyinfe/semi-icons'
import { VChart, type IBarChartSpec } from '@visactor/react-vchart'

import {
  xiaoditangApi,
  type XiaoditangMarketGroup,
} from './api'
import { XiaodituiImportLeadsDialog } from './import-leads-dialog'

const { Text } = Typography

interface Props {
  /** 是否启用查询（账号失效时禁用） */
  enabled?: boolean
  embedded?: boolean
  overviewRefreshing?: boolean
  onRefreshOverview?: () => void
}

interface DatePreset {
  label: string
  getRange: () => [Date, Date]
}

function formatRel(value?: string | null): string {
  if (!value) return '—'
  try {
    const t = new Date(value.replace(' ', 'T') + '+08:00').getTime()
    const diff = Math.floor((Date.now() - t) / 1000)
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    return `${Math.floor(diff / 86400)} 天前`
  } catch {
    return value
  }
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

function getOneDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatRangeText(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`
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

export function TodayStatsBlock({
  enabled = true,
  embedded = false,
  overviewRefreshing = false,
  onRefreshOverview,
}: Props) {
  const [activityId, setActivityId] = useState<number | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Date, Date]>(todayRangeCN)
  const [selectedMarketIds, setSelectedMarketIds] = useState<number[]>([])
  const [importDialogOpen, setImportDialogOpen] = useState(false)

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

  const statsQuery = useQuery({
    queryKey: ['xiaoditui', 'stats', selectedActivityId, startDate, endDate],
    queryFn: () =>
      xiaoditangApi.getStats({
        activityId: selectedActivityId!,
        startDate,
        endDate,
      }),
    enabled: enabled && !!selectedActivityId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const stats = statsQuery.data?.data
  const errorMessage =
    statsQuery.data && !statsQuery.data.success ? statsQuery.data.message : null
  const marketOptions = useMemo(
    () =>
      (stats?.by_market || []).map((m) => ({
        label: m.name + (m.mobile ? ` · ${m.mobile}` : ''),
        value: m.market_id,
      })),
    [stats?.by_market],
  )

  const marketOptionIds = useMemo(
    () => new Set(marketOptions.map((o) => o.value)),
    [marketOptions],
  )
  const effectiveSelectedMarketIds = useMemo(() => {
    if (selectedMarketIds.length === 0) return selectedMarketIds
    return selectedMarketIds.filter((id) => marketOptionIds.has(id))
  }, [marketOptionIds, selectedMarketIds])

  const filteredMarkets = useMemo(() => {
    if (!stats) return []
    if (effectiveSelectedMarketIds.length === 0) return stats.by_market
    const set = new Set(effectiveSelectedMarketIds)
    return stats.by_market.filter((m) => set.has(m.market_id))
  }, [effectiveSelectedMarketIds, stats])

  const filteredTotal = useMemo(
    () => filteredMarkets.reduce((acc, m) => acc + m.count, 0),
    [filteredMarkets],
  )

  const hasMarketFilter = effectiveSelectedMarketIds.length > 0
  const displayTotal = hasMarketFilter ? filteredTotal : (stats?.range_total ?? 0)
  const activeMarketCount = filteredMarkets.length
  const avgPerMarket =
    activeMarketCount > 0 ? displayTotal / activeMarketCount : 0
  const showStatsSkeleton =
    activitiesQuery.isPending || (statsQuery.isPending && !!selectedActivityId)

  const toolbar = (
    <div style={filterPanelStyle}>
      <div className='xiaoditui-activity-filter-bar'>
        <div className='xiaoditui-activity-filter-grid'>
          <FilterField label='活动' className='xiaoditui-activity-filter-field'>
            <Select
              placeholder='选择活动'
              loading={activitiesQuery.isPending}
              value={selectedActivityId}
              onChange={(v) => setActivityId(v as number)}
              style={{ width: '100%' }}
              optionList={activities.map((a) => ({
                label: a.name,
                value: a.activity_id,
              }))}
              filter
            />
          </FilterField>

          <FilterField label='日期' className='xiaoditui-activity-filter-field'>
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
            />
          </FilterField>

          <FilterField label='推广员' className='xiaoditui-activity-filter-field'>
            <div style={promoterFilterRowStyle}>
              <Select
                multiple
                maxTagCount={2}
                placeholder='全部推广员'
                value={effectiveSelectedMarketIds}
                onChange={(v) => setSelectedMarketIds((v as number[]) || [])}
                style={{ flex: 1, minWidth: 0 }}
                optionList={marketOptions}
                disabled={marketOptions.length === 0}
                filter
                showClear
              />
              {hasMarketFilter && (
                <Button
                  theme='borderless'
                  type='tertiary'
                  onClick={() => setSelectedMarketIds([])}
                >
                  清除
                </Button>
              )}
            </div>
          </FilterField>
        </div>

        <div className='xiaoditui-activity-filter-actions'>
          <Button
            theme='solid'
            type='primary'
            icon={<IconPlus />}
            disabled={!enabled || !selectedActivityId}
            onClick={() => setImportDialogOpen(true)}
          >
            录入 CRM
          </Button>

          <Button
            theme='light'
            icon={<IconRefresh />}
            loading={statsQuery.isFetching || overviewRefreshing}
            onClick={() => {
              onRefreshOverview?.()
              statsQuery.refetch()
            }}
            title='刷新'
            aria-label='刷新'
          />
        </div>
      </div>
    </div>
  )

  let body: ReactNode

  if (showStatsSkeleton) {
    body = <StatsLoadingSkeleton />
  } else if (errorMessage) {
    body = (
      <Empty
        image={<IconUserGroup size='extra-large' />}
        title='暂时无法获取统计'
        description={errorMessage}
      />
    )
  } else if (!selectedActivityId) {
    body = (
      <Empty
        image={<IconUserGroup size='extra-large' />}
        title='请选择活动'
      />
    )
  } else if (!stats) {
    body = null
  } else {
    body = (
      <div style={statsContentStyle}>
        {stats.truncated && (
          <Banner
            fullMode={false}
            type='warning'
            icon={<IconInfoCircle />}
            description='本区间数据已接近接口扫描上限，统计值可能偏低。建议缩小日期范围后再查看。'
          />
        )}

        <div className='xiaoditui-overview-strip' style={kpiStripStyle}>
          <OverviewInlineMetric
            icon={<IconActivity />}
            label='区间收集'
            value={displayTotal.toLocaleString()}
            accent='#0f766e'
          />
          <OverviewInlineMetric
            icon={<IconUserGroup />}
            label='活跃推广员'
            value={activeMarketCount.toLocaleString()}
            accent='#16a34a'
          />
          <OverviewInlineMetric
            icon={<IconBarChartVStroked />}
            label='人均收集'
            value={getOneDecimal(avgPerMarket)}
            accent='#0f766e'
          />
          <OverviewInlineMetric
            icon={<IconActivity />}
            label='活动累计'
            value={stats.all_time_total.toLocaleString()}
            accent='#475569'
          />
        </div>

        <DataPanel title='推广员采集数量' meta={`${activeMarketCount} 人 · ${rangeText}`}>
          <PromoterCollectionBars
            markets={filteredMarkets}
            hasMarketFilter={hasMarketFilter}
            rangeText={rangeText}
          />
        </DataPanel>
      </div>
    )
  }

  return (
    <>
      <section style={embedded ? embeddedStatsShellStyle : statsShellStyle}>
        {toolbar}
        {body}
      </section>
      <XiaodituiImportLeadsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        activities={activities}
        defaultActivityId={selectedActivityId}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
        onSuccess={() => {
          onRefreshOverview?.()
          statsQuery.refetch()
        }}
      />
    </>
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
    <label className={className} style={{ ...compactFilterFieldStyle, ...style }}>
      <Text type='tertiary' size='small' style={compactFilterLabelStyle}>
        {label}
      </Text>
      {children}
    </label>
  )
}

interface OverviewInlineMetricProps {
  icon: ReactNode
  label: string
  value: string
  accent: string
}

function OverviewInlineMetric({
  icon,
  label,
  value,
  accent,
}: OverviewInlineMetricProps) {
  return (
    <div style={overviewInlineMetricStyle}>
      <span style={{ ...overviewInlineIconStyle, color: accent }}>{icon}</span>
      <Text type='tertiary' style={overviewInlineLabelStyle}>
        {label}
      </Text>
      <Text strong style={{ ...overviewInlineValueStyle, color: accent }}>
        {value}
      </Text>
    </div>
  )
}

function DataPanel({
  title,
  meta,
  children,
}: {
  title: string
  meta: string
  children: ReactNode
}) {
  return (
    <div style={dataPanelStyle}>
      <div style={dataPanelHeaderStyle}>
        <Text strong>{title}</Text>
        <Text type='tertiary' size='small'>
          {meta}
        </Text>
      </div>
      {children}
    </div>
  )
}

function StatsLoadingSkeleton() {
  return (
    <div style={statsContentStyle}>
      <div className='xiaoditui-overview-strip' style={kpiStripStyle}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} style={overviewSkeletonMetricStyle}>
            <Skeleton.Avatar shape='square' style={overviewSkeletonIconStyle} />
            <div style={overviewSkeletonTextStyle}>
              <Skeleton.Paragraph rows={1} style={{ width: 72 }} />
              <Skeleton.Title style={{ width: 96, height: 20, margin: 0 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={dataPanelStyle}>
        <div style={dataPanelHeaderStyle}>
          <Skeleton.Paragraph rows={1} style={{ width: 132 }} />
          <Skeleton.Paragraph rows={1} style={{ width: 120 }} />
        </div>
        <div style={statsChartSkeletonStyle}>
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} style={statsChartSkeletonRowStyle}>
              <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
              <div style={statsChartSkeletonTrackStyle}>
                <Skeleton.Title
                  style={{
                    width: `${Math.max(28, 82 - index * 8)}%`,
                    height: 18,
                    margin: 0,
                  }}
                />
              </div>
              <Skeleton.Paragraph rows={1} style={{ width: 48 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PromoterCollectionBars({
  markets,
  hasMarketFilter,
  rangeText,
}: {
  markets: XiaoditangMarketGroup[]
  hasMarketFilter: boolean
  rangeText: string
}) {
  const rows = [...markets].sort((a, b) => b.count - a.count)

  if (rows.length === 0) {
    return (
      <div style={promoterBarsEmptyStyle}>
        <Empty
          image={<IconUserGroup size='extra-large' />}
          title={hasMarketFilter ? '所选推广员该区间无数据' : '该区间还没有数据'}
          description={rangeText}
        />
      </div>
    )
  }

  const chartRows = rows.map((market) => ({
    promoter: market.name || '未记录',
    count: market.count,
    mobile: market.mobile || '—',
    lastCollectedText: formatRel(market.last_collected_at),
  }))
  const chartHeight = Math.max(220, rows.length * 34 + 62)
  const spec: IBarChartSpec = {
    type: 'bar',
    direction: 'horizontal',
    autoFit: true,
    padding: { top: 8, right: 72, bottom: 28, left: 8 },
    data: [{ id: 'promoterCollection', values: chartRows }],
    xField: 'count',
    yField: 'promoter',
    barMaxWidth: 18,
    bar: {
      style: {
        fill: '#0f766e',
        cornerRadius: [0, 7, 7, 0],
      },
      state: {
        hover: {
          fill: '#0d9488',
        },
      },
    },
    label: {
      visible: true,
      position: 'right',
      offset: 8,
      formatMethod: (_text, datum) =>
        `${Number(datum?.count || 0).toLocaleString()} 条`,
      style: {
        fill: '#0f766e',
        fontSize: 12,
        fontWeight: 600,
      },
    },
    axes: [
      {
        orient: 'left',
        type: 'band',
        domainLine: { visible: false },
        tick: { visible: false },
        label: {
          autoLimit: true,
          limitEllipsis: '...',
          style: {
            fill: '#334155',
            fontSize: 13,
            fontWeight: 500,
          },
        },
      },
      {
        orient: 'bottom',
        type: 'linear',
        nice: true,
        min: 0,
        domainLine: { visible: false },
        tick: { visible: false },
        grid: {
          visible: true,
          style: {
            stroke: '#dbe4ea',
            lineDash: [4, 4],
          },
        },
        label: {
          style: {
            fill: '#64748b',
            fontSize: 12,
          },
        },
      },
    ],
    tooltip: {
      visible: true,
      mark: {
        title: { value: (datum) => datum?.promoter || '未记录' },
        content: [
          {
            key: '采集数量',
            value: (datum) => `${Number(datum?.count || 0).toLocaleString()} 条`,
          },
          {
            key: '手机号',
            value: (datum) => datum?.mobile || '—',
          },
          {
            key: '最近采集',
            value: (datum) => datum?.lastCollectedText || '—',
          },
        ],
      },
    },
  }

  return (
    <div style={promoterChartScrollStyle}>
      <VChart
        spec={spec}
        style={{ height: chartHeight }}
        options={{ mode: 'desktop-browser' }}
      />
    </div>
  )
}

const statsShellStyle: CSSProperties = {
  border: '1px solid #d7dee8',
  borderRadius: 10,
  background: '#f7faf9',
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
}

const embeddedStatsShellStyle: CSSProperties = {
  background: '#f7faf9',
  overflow: 'hidden',
}

const overviewInlineMetricStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  minHeight: 48,
  minWidth: 0,
  padding: '0 16px',
  whiteSpace: 'nowrap',
}

const overviewInlineIconStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  lineHeight: 1,
}

const overviewInlineLabelStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: '20px',
}

const overviewInlineValueStyle: CSSProperties = {
  fontSize: 20,
  lineHeight: '24px',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 0,
}

const filterPanelStyle: CSSProperties = {
  borderBottom: '1px solid #dfe6ee',
  background: '#fbfcfd',
  padding: '8px 12px',
}

const compactFilterFieldStyle: CSSProperties = {
  minWidth: 0,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const compactFilterLabelStyle: CSSProperties = {
  lineHeight: '16px',
  width: 42,
  flexShrink: 0,
  textAlign: 'right',
}

const promoterFilterRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
  width: '100%',
}

const statsContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 12,
}

const kpiStripStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  alignItems: 'center',
  gap: 0,
  minHeight: 48,
  border: '1px solid #dbe4ea',
  borderRadius: 12,
  background: '#fff',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  overflow: 'hidden',
}

const overviewSkeletonMetricStyle: CSSProperties = {
  minHeight: 48,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '0 16px',
}

const overviewSkeletonIconStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 6,
}

const overviewSkeletonTextStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
}

const dataPanelStyle: CSSProperties = {
  border: '1px solid #e1e8ee',
  borderRadius: 8,
  background: '#fbfdff',
  overflow: 'hidden',
  minWidth: 0,
}

const dataPanelHeaderStyle: CSSProperties = {
  minHeight: 40,
  padding: '9px 12px',
  borderBottom: '1px solid #e1e8ee',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  background: '#fff',
}

const promoterChartScrollStyle: CSSProperties = {
  maxHeight: 430,
  overflowY: 'auto',
  padding: '12px 14px 8px',
  background: '#fbfdff',
}

const statsChartSkeletonStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '16px 14px 18px',
  background: '#fbfdff',
}

const statsChartSkeletonRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '110px minmax(0, 1fr) 56px',
  alignItems: 'center',
  gap: 12,
  minHeight: 26,
}

const statsChartSkeletonTrackStyle: CSSProperties = {
  minWidth: 0,
}

const promoterBarsEmptyStyle: CSSProperties = {
  minHeight: 180,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
