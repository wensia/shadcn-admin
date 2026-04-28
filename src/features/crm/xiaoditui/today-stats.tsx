/**
 * 小地推数据收集统计区块
 * - 工具栏：活动 / 日期范围 / 推广员 三段筛选
 * - KPI：区间收集总数 / 活跃推广员 / 累计总数
 * - 推广员排行（受筛选影响）
 */

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconRefresh, IconUserGroup } from '@douyinfe/semi-icons'

import {
  xiaoditangApi,
  type XiaoditangMarketGroup,
} from './api'

const { Text, Title } = Typography

interface Props {
  /** 是否启用查询（账号失效时禁用） */
  enabled?: boolean
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

export function TodayStatsBlock({ enabled = true }: Props) {
  // —— 筛选状态 ——
  const [activityId, setActivityId] = useState<number | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => {
    const t = todayCN()
    return [t, t]
  })
  const [selectedMarketIds, setSelectedMarketIds] = useState<number[]>([])

  // —— 活动列表 ——
  const activitiesQuery = useQuery({
    queryKey: ['xiaoditui', 'activities'],
    queryFn: () => xiaoditangApi.listActivities(),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  // 默认选第一个活动
  useEffect(() => {
    if (activityId === undefined && activitiesQuery.data?.data?.length) {
      setActivityId(activitiesQuery.data.data[0].activity_id)
    }
  }, [activityId, activitiesQuery.data])

  const activities = activitiesQuery.data?.data || []

  // —— 统计数据 ——
  const startDate = toYMD(dateRange[0])
  const endDate = toYMD(dateRange[1])

  const statsQuery = useQuery({
    queryKey: ['xiaoditui', 'stats', activityId, startDate, endDate],
    queryFn: () =>
      xiaoditangApi.getStats({
        activityId: activityId!,
        startDate,
        endDate,
      }),
    enabled: enabled && !!activityId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const stats = statsQuery.data?.data
  const errorMessage = statsQuery.data && !statsQuery.data.success ? statsQuery.data.message : null

  // 推广员选项 = 当前数据的所有推广员
  const marketOptions = useMemo(
    () =>
      (stats?.by_market || []).map((m) => ({
        label: m.name + (m.mobile ? ` · ${m.mobile}` : ''),
        value: m.market_id,
      })),
    [stats?.by_market],
  )

  // 应用推广员筛选
  const filteredMarkets = useMemo(() => {
    if (!stats) return []
    if (selectedMarketIds.length === 0) return stats.by_market
    const set = new Set(selectedMarketIds)
    return stats.by_market.filter((m) => set.has(m.market_id))
  }, [stats, selectedMarketIds])

  const filteredTotal = useMemo(
    () => filteredMarkets.reduce((acc, m) => acc + m.count, 0),
    [filteredMarkets],
  )

  // 选中失效推广员清理（活动 / 日期变化导致 marketOptions 变更）
  useEffect(() => {
    if (selectedMarketIds.length === 0) return
    const validIds = new Set(marketOptions.map((o) => o.value))
    const next = selectedMarketIds.filter((id) => validIds.has(id))
    if (next.length !== selectedMarketIds.length) {
      setSelectedMarketIds(next)
    }
  }, [marketOptions, selectedMarketIds])

  // —— 列定义 ——
  const columns: ColumnProps<XiaoditangMarketGroup>[] = useMemo(
    () => [
      {
        title: '排名',
        dataIndex: '__rank',
        width: 60,
        render: (_v, _record, index) => {
          const rankStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 12,
          }
          if (index === 0)
            return (
              <span
                style={{ ...rankStyle, background: '#fff7e6', color: '#d48806' }}
              >
                1
              </span>
            )
          if (index === 1)
            return (
              <span
                style={{ ...rankStyle, background: '#f0f5ff', color: '#1d39c4' }}
              >
                2
              </span>
            )
          if (index === 2)
            return (
              <span
                style={{ ...rankStyle, background: '#f6ffed', color: '#389e0d' }}
              >
                3
              </span>
            )
          return (
            <Text type='tertiary' size='small'>
              {index + 1}
            </Text>
          )
        },
      },
      {
        title: '推广员',
        dataIndex: 'name',
        render: (_text, record) => (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ fontSize: 13 }}>
              {record.name}
            </Text>
            {record.mobile && (
              <Text type='tertiary' size='small'>
                {record.mobile}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: '收集',
        dataIndex: 'count',
        width: 110,
        align: 'right',
        sorter: (a, b) => a.count - b.count,
        defaultSortOrder: 'descend',
        render: (text: number) => (
          <Text strong style={{ fontSize: 16, color: 'var(--semi-color-primary)' }}>
            {text}
          </Text>
        ),
      },
      {
        title: '最近一条',
        dataIndex: 'last_collected_at',
        width: 140,
        render: (text: string | null) => (
          <Text type='tertiary' size='small'>
            {formatRel(text)}
          </Text>
        ),
      },
    ],
    [],
  )

  const sameDay = startDate === endDate

  // —— Toolbar (always rendered) ——
  const toolbar = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Text type='tertiary' size='small' style={{ minWidth: 32 }}>
          活动
        </Text>
        <Select
          placeholder='选择活动'
          loading={activitiesQuery.isPending}
          value={activityId}
          onChange={(v) => setActivityId(v as number)}
          style={{ width: 240 }}
          optionList={activities.map((a) => ({
            label: a.name,
            value: a.activity_id,
          }))}
          filter
        />
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Text type='tertiary' size='small' style={{ minWidth: 32 }}>
          日期
        </Text>
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
          style={{ width: 260 }}
        />
        <Button
          theme='borderless'
          size='small'
          onClick={() => {
            const t = todayCN()
            setDateRange([t, t])
          }}
        >
          今天
        </Button>
        <Button
          theme='borderless'
          size='small'
          onClick={() => {
            const e = todayCN()
            const s = new Date(e)
            s.setDate(s.getDate() - 6)
            setDateRange([s, e])
          }}
        >
          近 7 天
        </Button>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Text type='tertiary' size='small' style={{ minWidth: 48 }}>
          推广员
        </Text>
        <Select
          multiple
          maxTagCount={2}
          placeholder='全部'
          value={selectedMarketIds}
          onChange={(v) => setSelectedMarketIds((v as number[]) || [])}
          style={{ width: 280 }}
          optionList={marketOptions}
          disabled={marketOptions.length === 0}
          filter
        />
      </div>

      <Button
        theme='borderless'
        icon={<IconRefresh />}
        loading={statsQuery.isFetching}
        onClick={() => statsQuery.refetch()}
        style={{ marginLeft: 'auto' }}
      >
        刷新
      </Button>
    </div>
  )

  // —— Body ——
  let body: React.ReactNode

  if (statsQuery.isPending && activityId) {
    body = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '32px 0',
        }}
      >
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
  } else if (!activityId) {
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
      <>
        {/* KPI 三栏 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <KpiTile
            label={selectedMarketIds.length > 0 ? '筛选后收集' : '区间收集'}
            value={selectedMarketIds.length > 0 ? filteredTotal : stats.range_total}
            accent='var(--semi-color-primary)'
            hint={
              stats.truncated
                ? '⚠ 接近翻页上限，数字可能偏低'
                : `共 ${stats.page_count} 页扫描`
            }
          />
          <KpiTile
            label='活跃推广员'
            value={filteredMarkets.length}
            accent='#16a34a'
            hint={
              selectedMarketIds.length > 0
                ? `已选 ${selectedMarketIds.length} 人`
                : '区间内有数据收集'
            }
          />
          <KpiTile
            label='活动累计'
            value={stats.all_time_total}
            accent='#475569'
            hint='活动开播至今'
          />
        </div>

        {/* 推广员排行榜 */}
        <div style={{ marginBottom: 8 }}>
          <Title heading={6} style={{ margin: 0, marginBottom: 8 }}>
            推广员排行
          </Title>
        </div>
        {filteredMarkets.length === 0 ? (
          <Empty
            image={<IconUserGroup size='extra-large' />}
            title={
              selectedMarketIds.length > 0
                ? '所选推广员该区间无数据'
                : '该区间还没有数据'
            }
            description={sameDay ? `日期：${startDate}` : `${startDate} ~ ${endDate}`}
          />
        ) : (
          <Table<XiaoditangMarketGroup>
            columns={columns}
            dataSource={filteredMarkets}
            rowKey='market_id'
            size='small'
            pagination={false}
            bordered={false}
          />
        )}
      </>
    )
  }

  return (
    <Card
      bordered
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>数据收集统计</span>
          <Tag color='blue' size='small'>
            {sameDay ? startDate : `${startDate} ~ ${endDate}`}
          </Tag>
        </div>
      }
    >
      {toolbar}
      {body}
    </Card>
  )
}

interface KpiTileProps {
  label: string
  value: number
  accent: string
  hint?: string
}

function KpiTile({ label, value, accent, hint }: KpiTileProps) {
  return (
    <div
      style={{
        background: 'var(--semi-color-fill-0)',
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      <Text
        strong
        style={{
          fontSize: 28,
          lineHeight: 1.1,
          color: accent,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value.toLocaleString()}
      </Text>
      {hint && (
        <Text type='tertiary' size='small'>
          {hint}
        </Text>
      )}
    </div>
  )
}
