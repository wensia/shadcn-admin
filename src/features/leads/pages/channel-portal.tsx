/**
 * 渠道数据看板 — 公开页面
 *
 * 让线索提供方（付费渠道如抖音）实时查看回访情况。
 * 所有数据均脱敏显示（手机号/姓名），无需登录。
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
  Card,
  Tabs,
  TabPane,
  Table,
  Tag,
  Spin,
  Empty,
  Typography,
  DatePicker,
  Select,
  Space,
  Banner,
  Toast,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconRefresh } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import {
  validateChannelToken,
  fetchPortalLeads,
  fetchPortalStats,
  type PortalLeadItem,
  type PortalLeadsResponse,
  type PortalStatsResponse,
} from '../api/channel-submit'
import { LeadDetailSheet } from '../../crm/leads/components/lead-detail-sheet'

const { Title, Text } = Typography

/** ISO 时间字符串 → "MM-DD HH:mm" */
function fmtTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${M}-${D} ${h}:${m}`
}

/** ISO 时间字符串 → "YYYY-MM-DD" */
function fmtDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const Y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  return `${Y}-${M}-${D}`
}

type Phase = 'loading' | 'invalid' | 'ready'

/* ─── 居中样式（加载 / 错误页） ─── */
const centeredPageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  backgroundColor: 'var(--semi-color-bg-1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

/* ─── 有效性配色 ─── */
const VALIDITY_CONFIG: Record<string, { label: string; color: string }> = {
  valid: { label: '有效', color: 'green' },
  invalid: { label: '无效', color: 'red' },
  pending: { label: '待处理', color: 'grey' },
}

/* ─── 状态颜色 ─── */
const STATUS_COLOR: Record<string, string> = {
  pending_assign: 'grey',
  pending_followup: 'orange',
  following_up: 'blue',
  followed_up: 'cyan',
  trial_scheduled: 'teal',
  visited: 'green',
  paid: 'green',
  invalid: 'red',
  closed: 'red',
}

const VALIDITY_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'valid', label: '有效' },
  { value: 'invalid', label: '无效' },
  { value: 'pending', label: '待处理' },
]

/* ═════════════════ 线索列表视图 ═════════════════ */

function PortalLeadsView({ token }: { token: string }) {
  const [data, setData] = useState<PortalLeadsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [validity, setValidity] = useState<string>('')
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchPortalLeads({
        token,
        page,
        size: pageSize,
        date_from: dateRange?.[0] || undefined,
        date_to: dateRange?.[1] || undefined,
        validity: (validity as 'valid' | 'invalid' | 'pending' | '') || undefined,
      })
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize, validity, dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const columns: ColumnProps<PortalLeadItem>[] = useMemo(
    () => [
      {
        title: '登记日期',
        dataIndex: 'registered_at',
        width: 110,
        render: (_: string, record: PortalLeadItem) => (
          <Text>{fmtDate(record.registered_at)}</Text>
        ),
      },
      {
        title: '客户',
        dataIndex: 'name_masked',
        width: 130,
        render: (_: string, record: PortalLeadItem) => (
          <div>
            <Text strong>
              {record.name_masked || '-'}
            </Text>
            <div>
              <Text
                type="tertiary"
                style={{ fontFamily: 'monospace' }}
              >
                {record.phone_masked}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: '备注',
        dataIndex: 'notes',
        width: 150,
        ellipsis: { showTooltip: false },
        render: (_: string, record: PortalLeadItem) => {
          const extra = record.source_extra_info || {}
          const extraText = Object.values(extra).filter(Boolean).join(' / ')
          if (!record.notes && !extraText) {
            return (
              <Text type="quaternary">
                -
              </Text>
            )
          }
          return (
            <div>
              {record.notes && (
                <span
                  title={record.notes}
                  style={{
                    display: 'block',
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {record.notes}
                </span>
              )}
              {extraText && (
                <Text type="tertiary">
                  {extraText}
                </Text>
              )}
            </div>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'status_label',
        width: 100,
        render: (_: string, record: PortalLeadItem) => (
          <Tag color={STATUS_COLOR[record.status] || 'grey'} shape="circle">
            {record.status_label}
          </Tag>
        ),
      },
      {
        title: '有效性',
        dataIndex: 'validity',
        width: 80,
        render: (val: string) => {
          const cfg = VALIDITY_CONFIG[val] || VALIDITY_CONFIG.pending
          return (
            <Tag color={cfg.color} shape="circle">
              {cfg.label}
            </Tag>
          )
        },
      },
      {
        title: '校区',
        dataIndex: 'campus_name',
        width: 90,
        render: (v: string) => (
          <Text>{v || '-'}</Text>
        ),
      },
      {
        title: '创建/激活人',
        dataIndex: 'owner_name',
        width: 90,
        render: (v: string) =>
          v ? (
            <Text>{v}</Text>
          ) : (
            <Text type="quaternary">
              -
            </Text>
          ),
      },
      {
        title: '跟进',
        dataIndex: 'followup_count',
        width: 60,
        align: 'center' as const,
        render: (v: number) =>
          v > 0 ? (
            <Tag color="blue" shape="circle">
              {v}
            </Tag>
          ) : (
            <Text type="quaternary">
              0
            </Text>
          ),
      },
      {
        title: '最近跟进',
        dataIndex: 'latest_followup_result',
        width: 150,
        render: (_: string, record: PortalLeadItem) =>
          record.latest_followup_result ? (
            <div>
              <div>
                {record.latest_followup_result}
              </div>
              <Text type="tertiary">
                {fmtTime(record.latest_followup_at)}
              </Text>
            </div>
          ) : (
            <Text type="quaternary">
              -
            </Text>
          ),
      },
      {
        title: '下步计划',
        dataIndex: 'next_action',
        width: 130,
        ellipsis: { showTooltip: false },
        render: (v: string) =>
          v ? (
            <span
              title={v}
              style={{
                display: 'block',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {v}
            </span>
          ) : (
            <Text type="quaternary">
              -
            </Text>
          ),
      },
    ],
    []
  )

  const handleDateChange = useCallback(
    (dateString: string | string[] | undefined) => {
      if (Array.isArray(dateString) && dateString.length === 2) {
        setDateRange([dateString[0], dateString[1]])
        setPage(1)
      } else {
        setDateRange(null)
        setPage(1)
      }
    },
    []
  )

  const handleValidityChange = useCallback(
    (val: string | number | undefined) => {
      setValidity(typeof val === 'string' ? val : '')
      setPage(1)
    },
    []
  )

  const handleRefresh = useCallback(() => {
    loadData()
    Toast.success({ content: '已刷新' })
  }, [loadData])

  const handleRowClick = useCallback((record: PortalLeadItem) => {
    setDetailLeadId(record.id)
    setDetailOpen(true)
  }, [])

  /* ── 筛选标签 ── */
  const filterTags: FilterTag[] = useMemo(() => {
    const tags: FilterTag[] = []
    if (dateRange) {
      tags.push({
        key: 'date',
        label: '日期',
        value: `${dateRange[0]} ~ ${dateRange[1]}`,
        onClose: () => {
          setDateRange(null)
          setPage(1)
        },
      })
    }
    if (validity) {
      const cfg = VALIDITY_CONFIG[validity]
      tags.push({
        key: 'validity',
        label: '有效性',
        value: cfg?.label || validity,
        onClose: () => {
          setValidity('')
          setPage(1)
        },
      })
    }
    return tags
  }, [dateRange, validity])

  const handleClearAllFilters = useCallback(() => {
    setDateRange(null)
    setValidity('')
    setPage(1)
  }, [])

  const leads = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0

  return (
    <>
      <DataTableLayout
        title="线索列表"
        total={total}
        onRefresh={handleRefresh}
        isRefreshing={loading}
        toolbar={
          <>
            {error && (
              <Banner
                type="danger"
                description={error}
                style={{ marginBottom: 8 }}
              />
            )}
            <Space align="center">
              <DatePicker
                type="dateRange"
                placeholder={['开始日期', '结束日期']}
                onChange={(_, dateString) =>
                  handleDateChange(dateString as string[])
                }
                style={{ width: 260 }}
              />
              <Select
                value={validity}
                onChange={handleValidityChange}
                optionList={VALIDITY_OPTIONS}
                style={{ width: 100 }}
              />
            </Space>
          </>
        }
        filterTags={filterTags}
        onClearAllFilters={handleClearAllFilters}
      >
        <SemiDataTable<PortalLeadItem>
          columns={columns}
          data={leads}
          total={total}
          page={page}
          pageSize={pageSize}
          isLoading={loading}
          scrollX={1100}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          onRowClick={handleRowClick}
          emptyText="暂无线索数据"
        />
      </DataTableLayout>

      <LeadDetailSheet
        leadId={detailLeadId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}

/* ═════════════════ 统计分析 Tab ═════════════════ */

function StatsTab({ token }: { token: string }) {
  const [stats, setStats] = useState<PortalStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchPortalStats(
        token,
        dateRange?.[0],
        dateRange?.[1]
      )
      setStats(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [token, dateRange])

  const handleStatsDateChange = useCallback(
    (dateString: string | string[] | undefined) => {
      if (
        Array.isArray(dateString) &&
        dateString.length === 2 &&
        dateString[0]
      ) {
        setDateRange([dateString[0], dateString[1]])
      } else {
        setDateRange(null)
      }
    },
    []
  )

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const { overview, by_owner, daily_trend } = stats || {}

  return (
    <div>
      {error && (
        <Banner
          type="danger"
          description={error}
          style={{ marginBottom: 12 }}
        />
      )}
      <Space style={{ marginBottom: 16 }} align="center">
        <DatePicker
          type="dateRange"
          placeholder={['开始日期', '结束日期']}
          onChange={(_, dateString) =>
            handleStatsDateChange(dateString as string[])
          }
          style={{ width: 260 }}
        />
        <span
          onClick={loadStats}
          style={{ cursor: 'pointer', color: 'var(--semi-color-primary)' }}
        >
          <IconRefresh />
        </span>
      </Space>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}

      {!loading && overview && (
        <>
          {/* 总览卡片 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <StatCard label="总线索" value={overview.total} />
            <StatCard label="有效" value={overview.valid} color="green" />
            <StatCard label="无效" value={overview.invalid} color="red" />
            <StatCard
              label="待处理"
              value={overview.pending}
              color="orange"
            />
            <StatCard
              label="已跟进"
              value={overview.followed_up}
              color="blue"
            />
          </div>

          {/* 创建/激活人排名 */}
          {by_owner && by_owner.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <Title heading={6} style={{ marginBottom: 8 }}>
                创建/激活人跟进排名
              </Title>
              <Table
                columns={[
                  { title: '创建/激活人', dataIndex: 'owner_name', width: 100 },
                  {
                    title: '总数',
                    dataIndex: 'total',
                    width: 70,
                    align: 'center' as const,
                  },
                  {
                    title: '有效',
                    dataIndex: 'valid',
                    width: 70,
                    align: 'center' as const,
                  },
                  {
                    title: '无效',
                    dataIndex: 'invalid',
                    width: 70,
                    align: 'center' as const,
                  },
                  {
                    title: '待处理',
                    dataIndex: 'pending',
                    width: 70,
                    align: 'center' as const,
                  },
                  {
                    title: '已跟进',
                    dataIndex: 'followed_up',
                    width: 70,
                    align: 'center' as const,
                  },
                  {
                    title: '跟进率',
                    dataIndex: 'followed_up',
                    width: 80,
                    align: 'center' as const,
                    render: (
                      _: number,
                      record: { total: number; followed_up: number }
                    ) =>
                      record.total > 0
                        ? `${Math.round((record.followed_up / record.total) * 100)}%`
                        : '-',
                  },
                ]}
                dataSource={by_owner}
                rowKey="owner_name"
                pagination={false}
              />
            </div>
          )}

          {/* 日趋势 — 简易条形图 */}
          {daily_trend && daily_trend.length > 0 && (
            <div>
              <Title heading={6} style={{ marginBottom: 8 }}>
                每日趋势
              </Title>
              <DailyTrendChart data={daily_trend} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── 统计卡片组件 ─── */
function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <Card
      bodyStyle={{
        padding: '12px 16px',
        textAlign: 'center',
      }}
    >
      <Text type="tertiary">
        {label}
      </Text>
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: color
            ? `var(--semi-color-${color})`
            : 'var(--semi-color-text-0)',
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
    </Card>
  )
}

/* ─── 简易条形图 ─── */
function DailyTrendChart({
  data,
}: {
  data: { date: string; total: number; valid: number; invalid: number }[]
}) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {data.map((item) => (
        <div
          key={item.date}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text
            type="tertiary"
            style={{ width: 80, flexShrink: 0 }}
          >
            {item.date.slice(5)}
          </Text>
          <div
            style={{
              flex: 1,
              display: 'flex',
              height: 18,
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: 'var(--semi-color-fill-0)',
            }}
          >
            {item.valid > 0 && (
              <div
                style={{
                  width: `${(item.valid / maxTotal) * 100}%`,
                  backgroundColor: 'var(--semi-color-success)',
                  minWidth: 2,
                }}
              />
            )}
            {item.invalid > 0 && (
              <div
                style={{
                  width: `${(item.invalid / maxTotal) * 100}%`,
                  backgroundColor: 'var(--semi-color-danger)',
                  minWidth: 2,
                }}
              />
            )}
            {item.total - item.valid - item.invalid > 0 && (
              <div
                style={{
                  width: `${((item.total - item.valid - item.invalid) / maxTotal) * 100}%`,
                  backgroundColor: 'var(--semi-color-warning)',
                  minWidth: 2,
                }}
              />
            )}
          </div>
          <Text style={{ width: 30, textAlign: 'right' }}>
            {item.total}
          </Text>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
          marginTop: 4,
        }}
      >
        <Legend color="var(--semi-color-success)" label="有效" />
        <Legend color="var(--semi-color-danger)" label="无效" />
        <Legend color="var(--semi-color-warning)" label="待处理" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <Text type="tertiary">
        {label}
      </Text>
    </div>
  )
}

/* ═════════════════ 主组件 ═════════════════ */

export function ChannelPortal() {
  const { token } = useSearch({ from: '/channel-portal' })
  const [phase, setPhase] = useState<Phase>('loading')
  const [channelName, setChannelName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setPhase('invalid')
      setErrorMsg('缺少访问令牌')
      return
    }

    validateChannelToken(token)
      .then((res) => {
        setChannelName(res.channel_name)
        setPhase('ready')
      })
      .catch((err) => {
        setPhase('invalid')
        setErrorMsg(err instanceof Error ? err.message : '链接无效或已过期')
      })
  }, [token])

  if (phase === 'loading') {
    return (
      <div style={centeredPageStyle}>
        <Spin tip="加载中..." />
      </div>
    )
  }

  if (phase === 'invalid') {
    return (
      <div style={centeredPageStyle}>
        <Empty
          title="无法访问"
          description={errorMsg || '链接无效或已过期'}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--semi-color-bg-1)',
      }}
    >
      {/* 顶部：渠道名称 */}
      <div style={{ flexShrink: 0, padding: '16px 20px 0' }}>
        <Title heading={4} style={{ textAlign: 'center', marginBottom: 4 }}>
          {channelName} · 数据看板
        </Title>
      </div>

      {/* Tabs 填满剩余高度（全局 CSS 已处理 flex 穿透） */}
      <Tabs
        type="line"
        defaultActiveKey="leads"
        keepDOM={false}
        tabBarStyle={{ padding: '0 20px' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <TabPane tab="线索列表" itemKey="leads">
          <PortalLeadsView token={token!} />
        </TabPane>
        <TabPane tab="统计分析" itemKey="stats">
          <div
            style={{
              height: '100%',
              overflow: 'auto',
              padding: '16px 20px',
            }}
          >
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              <StatsTab token={token!} />
            </div>
          </div>
        </TabPane>
      </Tabs>
    </div>
  )
}
