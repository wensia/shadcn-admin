/**
 * 小地推数据收集统计区块
 * - 筛选：活动 / 日期范围 / 推广员
 * - 总览：区间收集、活跃推广员、活动累计、头部贡献
 * - 明细：推广员排行 + 最新收集样本
 */

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Banner,
  Button,
  Card,
  DatePicker,
  Empty,
  Progress,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui-19'
import {
  IconActivity,
  IconBarChartVStroked,
  IconCalendar,
  IconClock,
  IconInfoCircle,
  IconList,
  IconMapPin,
  IconPhone,
  IconRefresh,
  IconUser,
  IconUserGroup,
} from '@douyinfe/semi-icons'

import {
  xiaoditangApi,
  type XiaoditangMarketGroup,
  type XiaoditangSampleItem,
} from './api'

const { Text, Title } = Typography

interface Props {
  /** 是否启用查询（账号失效时禁用） */
  enabled?: boolean
}

type DatePresetKey = 'today' | 'yesterday' | 'week' | 'sevenDays'

interface DatePreset {
  key: DatePresetKey
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

function daysBetweenInclusive(start: Date, end: Date): number {
  const startTime = new Date(start).setHours(0, 0, 0, 0)
  const endTime = new Date(end).setHours(0, 0, 0, 0)
  return Math.max(1, Math.round((endTime - startTime) / 86_400_000) + 1)
}

function getPercent(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

function getOneDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function getAvatarText(name?: string | null): string {
  return (name || '未').trim().slice(0, 1).toUpperCase()
}

function isSameDay(a: Date, b: Date): boolean {
  return toYMD(a) === toYMD(b)
}

function isSameRange(a: [Date, Date], b: [Date, Date]): boolean {
  return isSameDay(a[0], b[0]) && isSameDay(a[1], b[1])
}

function formatRangeText(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`
}

function formatSampleName(sample: XiaoditangSampleItem): string {
  return sample.nickname || sample.mobile || sample.col || '未命名线索'
}

function isRepeatSample(value?: string | null): boolean {
  const normalized = String(value || '').trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', '是', '重复'].includes(normalized)
}

const datePresets: DatePreset[] = [
  { key: 'today', label: '今天', getRange: todayRangeCN },
  { key: 'yesterday', label: '昨天', getRange: yesterdayRangeCN },
  { key: 'week', label: '本周', getRange: currentWeekRangeCN },
  { key: 'sevenDays', label: '近 7 天', getRange: lastSevenDaysRangeCN },
]

export function TodayStatsBlock({ enabled = true }: Props) {
  const [activityId, setActivityId] = useState<number | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Date, Date]>(todayRangeCN)
  const [selectedMarketIds, setSelectedMarketIds] = useState<number[]>([])
  const [showAllMarkets, setShowAllMarkets] = useState(false)

  const activitiesQuery = useQuery({
    queryKey: ['xiaoditui', 'activities'],
    queryFn: () => xiaoditangApi.listActivities(),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const activities = activitiesQuery.data?.data || []
  const selectedActivityId = activityId ?? activities[0]?.activity_id
  const selectedActivity = activities.find(
    (item) => item.activity_id === selectedActivityId,
  )

  const startDate = toYMD(dateRange[0])
  const endDate = toYMD(dateRange[1])
  const rangeText = formatRangeText(startDate, endDate)
  const rangeDays = daysBetweenInclusive(dateRange[0], dateRange[1])

  const activePreset = useMemo(
    () => datePresets.find((preset) => isSameRange(dateRange, preset.getRange())),
    [dateRange],
  )

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
  const topMarket = filteredMarkets[0]
  const topShare = topMarket ? getPercent(topMarket.count, displayTotal) : 0
  const activityShare = getPercent(displayTotal, stats?.all_time_total ?? 0)
  const avgPerMarket =
    activeMarketCount > 0 ? displayTotal / activeMarketCount : 0
  const visibleMarkets = showAllMarkets
    ? filteredMarkets
    : filteredMarkets.slice(0, 8)
  const hiddenMarketCount = Math.max(0, filteredMarkets.length - visibleMarkets.length)
  const latestSample = stats?.samples?.[0]

  const toolbar = (
    <div style={filterPanelStyle}>
      <div style={filterHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={filterIconStyle}>
            <IconCalendar />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text strong>筛选范围</Text>
            <Text type='tertiary' size='small'>
              {selectedActivity?.name || '等待活动数据'} · {rangeText}
            </Text>
          </div>
        </div>
        <Button
          theme='borderless'
          icon={<IconRefresh />}
          loading={statsQuery.isFetching}
          onClick={() => statsQuery.refetch()}
        >
          刷新
        </Button>
      </div>

      <div style={filterGridStyle}>
        <LabeledControl label='活动'>
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
        </LabeledControl>

        <LabeledControl label='日期'>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              style={{ width: '100%' }}
            />
            <div style={presetGroupStyle}>
              {datePresets.map((preset) => {
                const active = activePreset?.key === preset.key
                return (
                  <Button
                    key={preset.key}
                    theme={active ? 'solid' : 'borderless'}
                    type={active ? 'primary' : 'tertiary'}
                    size='small'
                    onClick={() => setDateRange(preset.getRange())}
                  >
                    {preset.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </LabeledControl>

        <LabeledControl label='推广员'>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Select
              multiple
              maxTagCount={2}
              placeholder='全部推广员'
              value={effectiveSelectedMarketIds}
              onChange={(v) => setSelectedMarketIds((v as number[]) || [])}
              style={{ width: '100%' }}
              optionList={marketOptions}
              disabled={marketOptions.length === 0}
              filter
              showClear
            />
            <div style={{ minHeight: 22 }}>
              {hasMarketFilter ? (
                <Button
                  theme='borderless'
                  type='tertiary'
                  size='small'
                  onClick={() => setSelectedMarketIds([])}
                  style={{ paddingLeft: 0 }}
                >
                  清除推广员筛选
                </Button>
              ) : (
                <Text type='tertiary' size='small'>
                  当前统计全部推广员
                </Text>
              )}
            </div>
          </div>
        </LabeledControl>
      </div>
    </div>
  )

  let body: ReactNode

  if (statsQuery.isPending && selectedActivityId) {
    body = (
      <div style={loadingStyle}>
        <Spin size='middle' />
        <Text type='tertiary'>正在拉取统计…</Text>
      </div>
    )
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {stats.truncated && (
          <Banner
            fullMode={false}
            type='warning'
            icon={<IconInfoCircle />}
            description='本区间数据已接近接口扫描上限，统计值可能偏低。建议缩小日期范围后再查看。'
          />
        )}

        <div style={overviewStyle}>
          <div style={heroMetricStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <Text type='tertiary'>区间收集</Text>
                <div style={heroNumberStyle}>{displayTotal.toLocaleString()}</div>
              </div>
              <Tooltip content={`活动累计 ${stats.all_time_total.toLocaleString()} 条`}>
                <div style={circleProgressStyle}>
                  <Progress
                    type='circle'
                    width={74}
                    percent={activityShare}
                    stroke='var(--semi-color-primary)'
                    aria-label='区间收集占活动累计比例'
                    format={(percent) => `${percent}%`}
                    showInfo
                  />
                </div>
              </Tooltip>
            </div>
            <div style={heroMetaStyle}>
              <Tag color='blue' size='small'>
                {activePreset?.label || '自定义'} · {rangeDays} 天
              </Tag>
              <Text type='tertiary' size='small'>
                扫描 {stats.page_count} 页
              </Text>
              {hasMarketFilter && (
                <Tag color='orange' size='small'>
                  已筛选 {effectiveSelectedMarketIds.length} 人
                </Tag>
              )}
            </div>
          </div>

          <MetricTile
            icon={<IconUserGroup />}
            label='活跃推广员'
            value={activeMarketCount.toLocaleString()}
            hint={
              hasMarketFilter
                ? `已选 ${effectiveSelectedMarketIds.length} 人`
                : '区间内有收集记录'
            }
            accent='#16a34a'
          />
          <MetricTile
            icon={<IconBarChartVStroked />}
            label='人均收集'
            value={getOneDecimal(avgPerMarket)}
            hint='按活跃推广员计算'
            accent='#0f766e'
          />
          <MetricTile
            icon={<IconActivity />}
            label='活动累计'
            value={stats.all_time_total.toLocaleString()}
            hint={topMarket ? `头名贡献 ${topShare}%` : '暂无推广员数据'}
            accent='#475569'
          />
        </div>

        <div style={insightGridStyle}>
          <section style={sectionStyle}>
            <SectionHeader
              icon={<IconUserGroup />}
              title='推广员表现'
              extra={
                <Text type='tertiary' size='small'>
                  {activeMarketCount} 人
                </Text>
              }
            />

            {filteredMarkets.length === 0 ? (
              <Empty
                image={<IconUserGroup size='extra-large' />}
                title={
                  hasMarketFilter ? '所选推广员该区间无数据' : '该区间还没有数据'
                }
                description={rangeText}
              />
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {visibleMarkets.map((market, index) => (
                    <MarketPerformanceRow
                      key={market.market_id}
                      market={market}
                      rank={index + 1}
                      total={displayTotal}
                    />
                  ))}
                </div>
                {hiddenMarketCount > 0 ? (
                  <Button
                    block
                    theme='borderless'
                    type='tertiary'
                    style={{ marginTop: 10 }}
                    onClick={() => setShowAllMarkets(true)}
                  >
                    展开其余 {hiddenMarketCount} 位推广员
                  </Button>
                ) : (
                  showAllMarkets &&
                  filteredMarkets.length > 8 && (
                    <Button
                      block
                      theme='borderless'
                      type='tertiary'
                      style={{ marginTop: 10 }}
                      onClick={() => setShowAllMarkets(false)}
                    >
                      收起排行
                    </Button>
                  )
                )}
              </>
            )}
          </section>

          <section style={sectionStyle}>
            <SectionHeader
              icon={<IconList />}
              title='最新收集'
              extra={
                latestSample ? (
                  <Text type='tertiary' size='small'>
                    最近 {formatRel(latestSample.created_at)}
                  </Text>
                ) : null
              }
            />
            <RecentSamples samples={stats.samples || []} />
          </section>
        </div>
      </div>
    )
  }

  return (
    <Card
      bordered
      bodyStyle={{ padding: 20 }}
      title={
        <div style={titleStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={titleIconStyle}>
              <IconActivity />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>数据收集统计</span>
              <Text type='tertiary' size='small'>
                {selectedActivity?.name || '小地推活动'} 的收集进展与推广员表现
              </Text>
            </div>
          </div>
          <Tag color='blue' size='small'>
            {rangeText}
          </Tag>
        </div>
      }
    >
      {toolbar}
      {body}
    </Card>
  )
}

function LabeledControl({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      {children}
    </label>
  )
}

interface MetricTileProps {
  icon: ReactNode
  label: string
  value: string
  hint: string
  accent: string
}

function MetricTile({ icon, label, value, hint, accent }: MetricTileProps) {
  return (
    <div style={metricTileStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...metricIconStyle, color: accent }}>{icon}</span>
        <Text type='tertiary' size='small'>
          {label}
        </Text>
      </div>
      <Text strong style={{ fontSize: 24, lineHeight: 1.1, color: accent }}>
        {value}
      </Text>
      <Text type='tertiary' size='small'>
        {hint}
      </Text>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  extra,
}: {
  icon: ReactNode
  title: string
  extra?: ReactNode
}) {
  return (
    <div style={sectionHeaderStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={sectionIconStyle}>{icon}</span>
        <Title heading={6} style={{ margin: 0 }}>
          {title}
        </Title>
      </div>
      {extra}
    </div>
  )
}

function MarketPerformanceRow({
  market,
  rank,
  total,
}: {
  market: XiaoditangMarketGroup
  rank: number
  total: number
}) {
  const percent = getPercent(market.count, total)
  const rankColor =
    rank === 1 ? '#d97706' : rank === 2 ? '#2563eb' : rank === 3 ? '#16a34a' : '#64748b'

  return (
    <div style={marketRowStyle}>
      <div style={rankStyle(rankColor)}>{rank}</div>
      <Avatar size='small' style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
        {getAvatarText(market.name)}
      </Avatar>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong ellipsis={{ showTooltip: true }} style={{ maxWidth: 180 }}>
            {market.name}
          </Text>
          {market.mobile && (
            <Text type='tertiary' size='small'>
              {market.mobile}
            </Text>
          )}
        </div>
        <Progress
          percent={percent}
          showInfo={false}
          size='small'
          stroke={rank <= 3 ? 'var(--semi-color-primary)' : '#94a3b8'}
          aria-label={`${market.name} 收集占比`}
          style={{ marginTop: 7 }}
        />
      </div>
      <div style={{ width: 86, textAlign: 'right' }}>
        <Text strong style={{ fontSize: 18, color: 'var(--semi-color-primary)' }}>
          {market.count.toLocaleString()}
        </Text>
        <div>
          <Text type='tertiary' size='small'>
            {percent}%
          </Text>
        </div>
      </div>
      <Tooltip content={market.last_collected_at || '暂无时间'}>
        <Text type='tertiary' size='small' style={{ width: 70, textAlign: 'right' }}>
          {formatRel(market.last_collected_at)}
        </Text>
      </Tooltip>
    </div>
  )
}

function RecentSamples({ samples }: { samples: XiaoditangSampleItem[] }) {
  if (samples.length === 0) {
    return (
      <Empty
        image={<IconUser size='extra-large' />}
        title='暂无最新收集'
        description='当前日期范围内没有可展示的样本'
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {samples.map((sample) => (
        <div
          key={`${sample.id ?? 'sample'}-${sample.created_at ?? ''}-${sample.mobile ?? ''}`}
          style={sampleRowStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size='small' style={{ backgroundColor: '#ecfeff', color: '#0e7490' }}>
              {getAvatarText(formatSampleName(sample))}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong ellipsis={{ showTooltip: true }} style={{ maxWidth: 180 }}>
                  {formatSampleName(sample)}
                </Text>
                {isRepeatSample(sample.is_repeat) && (
                  <Tag color='orange' size='small'>
                    重复
                  </Tag>
                )}
              </div>
              <div style={sampleMetaStyle}>
                {sample.mobile && (
                  <span style={inlineMetaStyle}>
                    <IconPhone size='small' />
                    <Text type='tertiary' size='small'>
                      {sample.mobile}
                    </Text>
                  </span>
                )}
                {sample.address && (
                  <span style={inlineMetaStyle}>
                    <IconMapPin size='small' />
                    <Text
                      type='tertiary'
                      size='small'
                      ellipsis={{ showTooltip: true }}
                      style={{ maxWidth: 220 }}
                    >
                      {sample.address}
                    </Text>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={sampleFooterStyle}>
            <span style={inlineMetaStyle}>
              <IconClock size='small' />
              <Text type='tertiary' size='small'>
                {formatRel(sample.created_at)}
              </Text>
            </span>
            <Text type='tertiary' size='small'>
              {sample.market_name || '未知推广员'}
            </Text>
          </div>
        </div>
      ))}
    </div>
  )
}

const titleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
}

const titleIconStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--semi-color-primary)',
  background: 'var(--semi-color-primary-light-default)',
}

const filterPanelStyle: CSSProperties = {
  border: '1px solid var(--semi-color-border)',
  borderRadius: 8,
  background: 'var(--semi-color-fill-0)',
  padding: 14,
  marginBottom: 16,
}

const filterHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
  marginBottom: 14,
}

const filterIconStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--semi-color-primary)',
  background: 'var(--semi-color-primary-light-default)',
  flexShrink: 0,
}

const filterGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 14,
  alignItems: 'start',
}

const presetGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexWrap: 'wrap',
}

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: '32px 0',
}

const overviewStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
}

const heroMetricStyle: CSSProperties = {
  border: '1px solid var(--semi-color-border)',
  borderRadius: 8,
  padding: '16px 18px',
  background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.10), rgba(20, 184, 166, 0.08))',
  minWidth: 0,
}

const heroNumberStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 42,
  lineHeight: 1,
  fontWeight: 700,
  color: 'var(--semi-color-primary)',
  fontVariantNumeric: 'tabular-nums',
}

const circleProgressStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const heroMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 14,
}

const metricTileStyle: CSSProperties = {
  border: '1px solid var(--semi-color-border)',
  borderRadius: 8,
  padding: '14px 16px',
  background: 'var(--semi-color-bg-0)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 0,
}

const metricIconStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const insightGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
  alignItems: 'start',
}

const sectionStyle: CSSProperties = {
  border: '1px solid var(--semi-color-border)',
  borderRadius: 8,
  padding: 14,
  background: 'var(--semi-color-bg-0)',
  minWidth: 0,
}

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 12,
}

const sectionIconStyle: CSSProperties = {
  color: 'var(--semi-color-primary)',
  display: 'inline-flex',
}

const marketRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '32px 32px minmax(0, 1fr) 86px 70px',
  alignItems: 'center',
  gap: 10,
  padding: '10px 8px',
  borderRadius: 8,
  background: 'var(--semi-color-fill-0)',
}

function rankStyle(color: string): CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 12,
    color,
    background: 'var(--semi-color-bg-0)',
    border: '1px solid var(--semi-color-border)',
  }
}

const sampleRowStyle: CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: '1px solid var(--semi-color-border)',
  background: 'var(--semi-color-fill-0)',
}

const sampleMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 5,
  minWidth: 0,
}

const inlineMetaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
}

const sampleFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 10,
}
