/**
 * 市场部数据统计页面
 * 展示市场专员的录入数量和渠道分布统计
 * Semi Design 重构 — DataTableLayout + useTableScroll
 * 注：无分页统计排行榜，使用 useTableScroll 替代手动 ResizeObserver
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Table,
  Button,
  Select,
  Skeleton,
  Progress,
  Toast,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  IconChevronDown,
  IconChevronRight,
} from '@douyinfe/semi-icons'
import {
  FileUp,
  Users,
  Tag as TagIcon,
} from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { useTableScroll } from '@/components/semi/use-table-scroll'
import { brandColors } from '@/features/crm/daily-control/theme'
import leadsApi from '@/features/crm/leads/api'
import { adminApi } from '@/features/admin/api'
import type { MarketStaffStatItem, ChannelTotalItem } from '@/features/crm/leads/types'

// 获取时间范围辅助函数
function getDateRange(period: string): { date_from: string; date_to: string } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  switch (period) {
    case 'today': {
      return { date_from: today, date_to: today }
    }
    case 'week': {
      const dayOfWeek = now.getDay() || 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - dayOfWeek + 1)
      return { date_from: monday.toISOString().slice(0, 10), date_to: today }
    }
    case 'month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      return { date_from: firstDay.toISOString().slice(0, 10), date_to: today }
    }
    default:
      return { date_from: '', date_to: '' }
  }
}

// 渠道分类颜色映射
const categoryConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  ONLINE: { label: '线上', color: '#1D4ED8', bgColor: '#DBEAFE' },
  OFFLINE: { label: '线下', color: '#15803D', bgColor: '#DCFCE7' },
  REFERRAL: { label: '转介绍', color: '#7C3AED', bgColor: '#EDE9FE' },
  OTHER: { label: '其他', color: '#4B5563', bgColor: '#F3F4F6' },
}

// 时间周期选项
const periodOptions = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

export function MarketingStatisticsPage() {
  useDocumentTitle('市场数据统计')

  const [period, setPeriod] = useState('month')
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set())

  // 使用 useTableScroll 替代手动 ResizeObserver
  const { wrapperRef, scrollY } = useTableScroll()

  // 获取校区列表
  const { data: campusesData } = useQuery({
    queryKey: ['campuses-simple'],
    queryFn: () => adminApi.getCampusesSimple(),
    staleTime: 5 * 60 * 1000,
  })

  const campusList = useMemo(() => {
    const items = campusesData?.data || []
    return items as Array<{ id: string; name: string }>
  }, [campusesData])

  // 获取统计数据
  const dateRange = useMemo(() => getDateRange(period), [period])

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['marketing-statistics', selectedCampusId, dateRange.date_from, dateRange.date_to],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (dateRange.date_from) params.date_from = dateRange.date_from
      if (dateRange.date_to) params.date_to = dateRange.date_to
      if (selectedCampusId !== 'all') params.campus_id = selectedCampusId
      return leadsApi.getMarketStatistics(params)
    },
    staleTime: 60 * 1000,
  })

  const statistics = data?.data
  const staffList = useMemo<MarketStaffStatItem[]>(() => statistics?.staff_statistics ?? [], [statistics?.staff_statistics])
  const channelTotals: ChannelTotalItem[] = statistics?.channel_totals || []

  // 计算指标
  const totalLeads = statistics?.total_leads || 0
  const totalStaff = statistics?.total_staff || 0
  const uniqueChannels = useMemo(() => {
    const names = new Set<string>()
    staffList.forEach(s => s.channels.forEach(c => names.add(c.channel_name)))
    return names.size
  }, [staffList])

  // 最大录入量
  const maxCount = useMemo(() => Math.max(...staffList.map(s => s.total_count), 1), [staffList])

  // 切换展开/收起
  const toggleExpand = (staffId: string) => {
    setExpandedStaff(prev => {
      const next = new Set(prev)
      if (next.has(staffId)) next.delete(staffId)
      else next.add(staffId)
      return next
    })
  }

  const handleRefresh = () => {
    refetch()
    Toast.success('已刷新')
  }

  // 主表格列
  const columns = useMemo<ColumnProps<MarketStaffStatItem>[]>(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 64,
      align: 'center' as const,
      render: (_: unknown, __: MarketStaffStatItem, index: number) => {
        const rankStyle: React.CSSProperties = {
          display: 'inline-flex',
          width: 24, height: 24,
          alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', fontSize: 12, fontWeight: 500,
        }
        if (index === 0) Object.assign(rankStyle, { background: '#FEF3C7', color: '#A16207' })
        else if (index === 1) Object.assign(rankStyle, { background: '#F3F4F6', color: '#374151' })
        else if (index === 2) Object.assign(rankStyle, { background: '#FFEDD5', color: '#C2410C' })
        else Object.assign(rankStyle, { color: 'var(--semi-color-text-2)' })
        return <span style={rankStyle}>{index + 1}</span>
      },
    },
    {
      title: '专员姓名',
      dataIndex: 'staff_name',
      width: 112,
      render: (t: string) => <span style={{ fontWeight: 500 }}>{t}</span>,
    },
    {
      title: '所在校区',
      dataIndex: 'campus_name',
      width: 112,
      render: (t: string) => <span style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>{t || '-'}</span>,
    },
    {
      title: '总录入量',
      dataIndex: 'total_count',
      width: 96,
      align: 'right' as const,
      render: (val: number) => <span style={{ fontFamily: 'monospace' }}>{val.toLocaleString()}</span>,
    },
    {
      title: '录入分布',
      dataIndex: 'dist',
      width: 180,
      render: (_: unknown, record: MarketStaffStatItem) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={(record.total_count / maxCount) * 100} size="small" showInfo={false} style={{ flex: 1 }} />
          <span style={{ width: 48, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            {totalLeads > 0 ? ((record.total_count / totalLeads) * 100).toFixed(1) : 0}%
          </span>
        </div>
      ),
    },
    {
      title: '渠道明细',
      dataIndex: 'channels',
      width: 220,
      render: (_: unknown, record: MarketStaffStatItem) => {
        if (record.channels.length === 0) {
          return <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>-</span>
        }

        const isExpanded = expandedStaff.has(record.staff_id)
        const displayChannels = isExpanded ? record.channels : record.channels.slice(0, 2)

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {displayChannels.map(ch => {
              const cfg = categoryConfig[ch.category || 'OTHER'] || categoryConfig.OTHER
              return (
                <div key={ch.channel_id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{
                    display: 'inline-flex',
                    borderRadius: 4, padding: '1px 6px',
                    fontSize: 10, fontWeight: 500,
                    backgroundColor: cfg.bgColor, color: cfg.color,
                  }}>
                    {cfg.label}
                  </span>
                  <span style={{ color: 'var(--semi-color-text-2)' }}>{ch.channel_name}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{ch.lead_count}</span>
                </div>
              )
            })}
            {record.channels.length > 2 && (
              <Button
                theme="borderless"
                onClick={() => toggleExpand(record.staff_id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  fontSize: 10, color: 'var(--semi-color-text-2)',
                  padding: 0, minWidth: 'auto', height: 'auto',
                }}
              >
                {isExpanded ? (
                  <><IconChevronDown size="small" /> 收起</>
                ) : (
                  <><IconChevronRight size="small" /> 还有 {record.channels.length - 2} 个渠道</>
                )}
              </Button>
            )}
          </div>
        )
      },
    },
  ], [maxCount, totalLeads, expandedStaff])

  return (
    <>
      <DataTableLayout
        title="市场数据统计"
        total={totalLeads}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
        toolbar={
          <>
            {/* 顶部指标 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 14 }}>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Skeleton.Avatar size="small" style={{ width: 32, height: 32 }} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <Skeleton.Paragraph rows={1} style={{ width: 48 }} />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${brandColors.blue}15`,
                    }}>
                      <FileUp style={{ width: 16, height: 16, color: brandColors.blue }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 600 }}>{totalLeads.toLocaleString()}</span>
                      <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>总录入量</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${brandColors.green}15`,
                    }}>
                      <Users style={{ width: 16, height: 16, color: brandColors.green }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 600 }}>{totalStaff}</span>
                      <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>市场专员数</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${brandColors.orange}15`,
                    }}>
                      <TagIcon style={{ width: 16, height: 16, color: brandColors.orange }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 600 }}>{uniqueChannels}</span>
                      <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>来源渠道数</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 工具栏 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Select
                value={period}
                onChange={(val) => setPeriod(val as string)}
                optionList={periodOptions}
                style={{ width: 112 }}
              />
              <Select
                value={selectedCampusId}
                onChange={(val) => setSelectedCampusId(val as string)}
                optionList={[
                  { value: 'all', label: '全部校区' },
                  ...campusList.map(c => ({ value: c.id, label: c.name })),
                ]}

                style={{ width: 144 }}
              />
            </div>
          </>
        }
      >
        {/* 内容区域：左侧表格 + 右侧渠道汇总 */}
        <div style={{ display: 'flex', minHeight: 0, flex: 1, gap: 0, overflow: 'hidden' }}>
          {/* 主表格 */}
          <div ref={wrapperRef} style={{ flex: 3, minHeight: 0, overflow: 'hidden' }}>
            <Table
              columns={columns}
              dataSource={staffList}
              rowKey="staff_id"
              pagination={false}
              scroll={{ y: scrollY }}
              loading={isLoading}
              empty={<div style={{ padding: 64, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无数据</div>}
            />
          </div>

          {/* 右侧渠道汇总 */}
          <div style={{ width: 288, flexShrink: 0, minHeight: 0, borderLeft: '1px solid var(--semi-color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--semi-color-border)' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--semi-color-text-2)' }}>渠道汇总</span>
            </div>
            <div style={{ padding: '12px 16px', overflow: 'auto', flex: 1 }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton.Paragraph key={i} rows={1} style={{ width: '100%' }} />
                  ))}
                </div>
              ) : channelTotals.length === 0 ? (
                <ChannelTotalsFromStaff staffList={staffList} totalLeads={totalLeads} />
              ) : (
                <ChannelTotalsList channels={channelTotals} totalLeads={totalLeads} />
              )}
            </div>
          </div>
        </div>
      </DataTableLayout>
    </>
  )
}

// 渠道汇总列表组件
function ChannelTotalsList({ channels, totalLeads }: { channels: ChannelTotalItem[]; totalLeads: number }) {
  const maxTotal = Math.max(...channels.map(c => c.total), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {channels.map(ch => {
        const cfg = categoryConfig[ch.category || 'OTHER'] || categoryConfig.OTHER
        return (
          <div key={ch.channel_name}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-flex', borderRadius: 4, padding: '1px 6px',
                  fontSize: 10, fontWeight: 500,
                  backgroundColor: cfg.bgColor, color: cfg.color,
                }}>
                  {cfg.label}
                </span>
                <span>{ch.channel_name}</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{ch.total}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Progress percent={(ch.total / maxTotal) * 100} size="small" showInfo={false} style={{ flex: 1 }} />
              <span style={{ width: 40, textAlign: 'right', fontSize: 10, color: 'var(--semi-color-text-2)' }}>
                {totalLeads > 0 ? ((ch.total / totalLeads) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 备用：从 staffList 中聚合渠道汇总
function ChannelTotalsFromStaff({ staffList, totalLeads }: { staffList: MarketStaffStatItem[]; totalLeads: number }) {
  const aggregated = useMemo(() => {
    const map = new Map<string, { name: string; category: string; total: number }>()
    staffList.forEach(s => {
      s.channels.forEach(ch => {
        const existing = map.get(ch.channel_name)
        if (existing) {
          existing.total += ch.lead_count
        } else {
          map.set(ch.channel_name, {
            name: ch.channel_name,
            category: ch.category || 'OTHER',
            total: ch.lead_count,
          })
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [staffList])

  const maxTotal = Math.max(...aggregated.map(c => c.total), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {aggregated.map(ch => {
        const cfg = categoryConfig[ch.category] || categoryConfig.OTHER
        return (
          <div key={ch.name}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-flex', borderRadius: 4, padding: '1px 6px',
                  fontSize: 10, fontWeight: 500,
                  backgroundColor: cfg.bgColor, color: cfg.color,
                }}>
                  {cfg.label}
                </span>
                <span>{ch.name}</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{ch.total}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Progress percent={(ch.total / maxTotal) * 100} size="small" showInfo={false} style={{ flex: 1 }} />
              <span style={{ width: 40, textAlign: 'right', fontSize: 10, color: 'var(--semi-color-text-2)' }}>
                {totalLeads > 0 ? ((ch.total / totalLeads) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        )
      })}
      {aggregated.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>暂无数据</p>
      )}
    </div>
  )
}

export default MarketingStatisticsPage
