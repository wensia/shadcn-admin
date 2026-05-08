/**
 * 市场部数据统计页面
 * 展示市场专员的录入数量和渠道分布统计
 * Semi Design 重构 — DataTableLayout + useTableScroll
 * 注：无分页统计排行榜，使用 useTableScroll 替代手动 ResizeObserver
 */

import { useCallback, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Table,
  Button,
  Select,
  Skeleton,
  Progress,
  Toast,
  SideSheet,
  Empty,
  DatePicker,
  Tabs,
  TabPane,
  Tag,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { SemiTagColor } from '@/lib/semi-types'
import {
  IconChevronDown,
  IconChevronRight,
} from '@douyinfe/semi-icons'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  FileUp,
  PhoneCall,
  Users,
  Tag as TagIcon,
} from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { useTableScroll } from '@/components/semi/use-table-scroll'
import { brandColors } from '@/features/crm/daily-control/theme'
import { showApiErrorToast } from '@/lib/api/error-toast'
import leadsApi from '@/features/crm/leads/api'
import { adminApi } from '@/features/admin/api'
import {
  type ChannelStatItem,
  type MarketStaffChannelBreakdownItem,
  type MarketStaffDetailResponse,
  type MarketStaffPendingChannelItem,
  type MarketStaffRecentImportBatchItem,
  type MarketStaffStatItem,
} from '@/features/crm/leads/types'

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value?: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

// 获取时间范围辅助函数
function getDateRange(period: string): { date_from: string; date_to: string } {
  const now = new Date()
  const today = formatLocalDate(now)

  switch (period) {
    case 'today': {
      return { date_from: today, date_to: today }
    }
    case 'week': {
      const dayOfWeek = now.getDay() || 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - dayOfWeek + 1)
      return { date_from: formatLocalDate(monday), date_to: today }
    }
    case 'last30': {
      const startDay = new Date(now)
      startDay.setDate(now.getDate() - 29)
      return { date_from: formatLocalDate(startDay), date_to: today }
    }
    case 'month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      return { date_from: formatLocalDate(firstDay), date_to: today }
    }
    default:
      return { date_from: '', date_to: '' }
  }
}

function formatShortDate(value: string): string {
  return value.slice(5)
}

function formatRangeLabel(range: { date_from: string; date_to: string }) {
  if (!range.date_from || !range.date_to) return '-'
  return `${range.date_from} 至 ${range.date_to}`
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(/\//g, '-')
}

// 渠道分类颜色映射
const categoryConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  ONLINE: { label: '线上', color: '#1D4ED8', bgColor: '#DBEAFE' },
  OFFLINE: { label: '线下', color: '#15803D', bgColor: '#DCFCE7' },
  REFERRAL: { label: '转介绍', color: '#7C3AED', bgColor: '#EDE9FE' },
  OTHER: { label: '其他', color: '#4B5563', bgColor: '#F3F4F6' },
}

const channelDistributionPalette = [
  '#2563EB',
  '#16A34A',
  '#F97316',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#4B5563',
  '#CA8A04',
]

const importStatusLabels: Record<string, string> = {
  processing: '处理中',
  completed: '已完成',
  partial: '部分成功',
  failed: '失败',
}

const importStatusColorMap: Record<string, SemiTagColor> = {
  processing: 'blue',
  completed: 'green',
  partial: 'orange',
  failed: 'red',
}

// 时间周期选项
const periodOptions = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'last30', label: '最近30天' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' },
]

export function MarketingStatisticsPage() {
  useDocumentTitle('市场数据统计')

  const [period, setPeriod] = useState('month')
  const [dateRange, setDateRange] = useState(() => getDateRange('month'))
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set())
  const [selectedStaff, setSelectedStaff] = useState<MarketStaffStatItem | null>(null)

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

  const datePickerValue = useMemo(() => {
    const startDate = parseLocalDate(dateRange.date_from)
    const endDate = parseLocalDate(dateRange.date_to)
    return startDate && endDate ? ([startDate, endDate] as [Date, Date]) : undefined
  }, [dateRange.date_from, dateRange.date_to])

  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    if (value !== 'custom') {
      setDateRange(getDateRange(value))
    }
  }

  const handleDateRangeChange = (value: unknown) => {
    if (!Array.isArray(value) || value.length !== 2) return

    const [startDate, endDate] = value as [Date | undefined, Date | undefined]
    if (!startDate || !endDate) return

    setPeriod('custom')
    setDateRange({
      date_from: formatLocalDate(startDate),
      date_to: formatLocalDate(endDate),
    })
  }

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
  const staffDetailParams = useMemo(() => ({
    date_from: dateRange.date_from,
    date_to: dateRange.date_to,
    ...(selectedCampusId !== 'all' ? { campus_id: selectedCampusId } : {}),
  }), [dateRange.date_from, dateRange.date_to, selectedCampusId])

  const {
    data: staffDetail,
    isLoading: staffDetailLoading,
    isFetching: staffDetailFetching,
    refetch: refetchStaffDetail,
  } = useQuery({
    queryKey: ['marketing-staff-detail', selectedStaff?.staff_id, staffDetailParams],
    queryFn: async () => {
      if (!selectedStaff?.staff_id) return null
      try {
        const response = await leadsApi.getMarketStaffDetail(selectedStaff.staff_id, staffDetailParams)
        return response.data
      } catch (error) {
        showApiErrorToast(error, '获取市场人员明细失败')
        throw error
      }
    },
    enabled: Boolean(selectedStaff?.staff_id && dateRange.date_from && dateRange.date_to),
    staleTime: 60 * 1000,
  })

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
  const toggleExpand = useCallback((staffId: string) => {
    setExpandedStaff(prev => {
      const next = new Set(prev)
      if (next.has(staffId)) next.delete(staffId)
      else next.add(staffId)
      return next
    })
  }, [])

  const handleRefresh = () => {
    refetch()
    if (selectedStaff?.staff_id) {
      refetchStaffDetail()
    }
    Toast.success('已刷新')
  }

  const channelBreakdownColumns = useMemo<ColumnProps<MarketStaffChannelBreakdownItem>[]>(() => [
    {
      title: '渠道',
      dataIndex: 'channel_name',
      width: 180,
      render: (value: string, record: MarketStaffChannelBreakdownItem) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <CategoryBadge category={record.category} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value || '未知渠道'}
          </span>
        </div>
      ),
    },
    {
      title: '总量',
      dataIndex: 'total_count',
      width: 76,
      align: 'right' as const,
      render: (value: number) => <MetricNumber value={value} />,
    },
    {
      title: '待回访',
      dataIndex: 'pending_followup_count',
      width: 84,
      align: 'right' as const,
      render: (value: number) => <MetricNumber value={value} />,
    },
    {
      title: '待分配',
      dataIndex: 'pending_assign_count',
      width: 84,
      align: 'right' as const,
      render: (value: number) => <MetricNumber value={value} />,
    },
    {
      title: '无效',
      dataIndex: 'invalid_count',
      width: 76,
      align: 'right' as const,
      render: (value: number) => <MetricNumber value={value} />,
    },
    {
      title: '成交',
      dataIndex: 'paid_count',
      width: 76,
      align: 'right' as const,
      render: (value: number) => <MetricNumber value={value} />,
    },
  ], [])

  // 主表格列
  const columns = useMemo<ColumnProps<MarketStaffStatItem>[]>(() => [
    {
      title: '专员姓名',
      dataIndex: 'staff_name',
      width: 112,
      fixed: 'left',
      render: (t: string, record: MarketStaffStatItem) => (
        <Button
          theme="borderless"
          type="primary"
          onClick={() => setSelectedStaff(record)}
          style={{ padding: 0, height: 'auto', fontWeight: 600 }}
        >
          {t}
        </Button>
      ),
    },
    {
      title: '所在校区',
      dataIndex: 'campus_name',
      width: 112,
      render: (t: string) => <span style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>{t || '-'}</span>,
    },
    {
      title: '创建/激活',
      dataIndex: 'total_count',
      width: 96,
      align: 'right' as const,
      render: (val: number) => <span style={{ fontFamily: 'monospace' }}>{val.toLocaleString()}</span>,
    },
    {
      title: '待回访',
      dataIndex: 'pending_followup_count',
      width: 86,
      align: 'right' as const,
      render: (val: number) => <MetricNumber value={val} />,
    },
    {
      title: '待分配',
      dataIndex: 'pending_assign_count',
      width: 86,
      align: 'right' as const,
      render: (val: number) => <MetricNumber value={val} />,
    },
    {
      title: '人员占比',
      dataIndex: 'dist',
      width: 150,
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
      title: '待回访来源',
      dataIndex: 'pending_followup_channels',
      width: 260,
      render: (_: unknown, record: MarketStaffStatItem) => (
        <StaffChannelShareList
          channels={record.pending_followup_channels ?? []}
          total={record.pending_followup_count}
          emptyText="无待回访"
          expanded={expandedStaff.has(record.staff_id)}
          onToggle={() => toggleExpand(record.staff_id)}
        />
      ),
    },
    {
      title: '待分配来源',
      dataIndex: 'pending_assign_channels',
      width: 260,
      render: (_: unknown, record: MarketStaffStatItem) => (
        <StaffChannelShareList
          channels={record.pending_assign_channels ?? []}
          total={record.pending_assign_count}
          emptyText="无待分配"
          expanded={expandedStaff.has(record.staff_id)}
          onToggle={() => toggleExpand(record.staff_id)}
        />
      ),
    },
  ], [maxCount, totalLeads, expandedStaff, toggleExpand])

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
                onChange={(val) => handlePeriodChange(val as string)}
                optionList={periodOptions}
                style={{ width: 112 }}
              />
              <DatePicker
                type="dateRange"
                value={datePickerValue}
                onChange={handleDateRangeChange}
                format="yyyy-MM-dd"
                placeholder={['开始日期', '结束日期']}
                showClear={false}
                syncSwitchMonth
                weekStartsOn={1}
                style={{ width: 260 }}
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
        <div ref={wrapperRef} style={{ minHeight: 0, flex: 1, overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={staffList}
            rowKey="staff_id"
            pagination={false}
            scroll={{ x: 1162, y: scrollY }}
            loading={isLoading}
            empty={<div style={{ padding: 64, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无数据</div>}
          />
        </div>
      </DataTableLayout>
      <SideSheet
        title={selectedStaff ? `${selectedStaff.staff_name} · 市场明细` : '市场明细'}
        visible={Boolean(selectedStaff)}
        width={760}
        onCancel={() => setSelectedStaff(null)}
        bodyStyle={{ padding: 0, overflow: 'hidden' }}
      >
        <MarketStaffDetailSheet
          detail={staffDetail ?? null}
          staff={selectedStaff}
          dateRangeLabel={formatRangeLabel(dateRange)}
          loading={staffDetailLoading}
          fetching={staffDetailFetching}
          channelColumns={channelBreakdownColumns}
        />
      </SideSheet>
    </>
  )
}

function CategoryBadge({ category }: { category?: string | null }) {
  const cfg = categoryConfig[category || 'OTHER'] || categoryConfig.OTHER
  return (
    <span style={{
      display: 'inline-flex',
      flexShrink: 0,
      borderRadius: 4,
      padding: '1px 6px',
      fontSize: 10,
      fontWeight: 500,
      backgroundColor: cfg.bgColor,
      color: cfg.color,
      lineHeight: '18px',
    }}>
      {cfg.label}
    </span>
  )
}

function MetricNumber({ value }: { value: number }) {
  return <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{Number(value || 0).toLocaleString()}</span>
}

function StaffChannelShareList({
  channels,
  total,
  emptyText,
  expanded,
  onToggle,
}: {
  channels: ChannelStatItem[]
  total: number
  emptyText: string
  expanded: boolean
  onToggle: () => void
}) {
  const totalCount = total > 0 ? total : channels.reduce((sum, channel) => sum + channel.lead_count, 0)

  if (channels.length === 0 || totalCount <= 0) {
    return <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>{emptyText}</span>
  }

  const displayChannels = expanded ? channels : channels.slice(0, 2)
  const hiddenCount = channels.length - displayChannels.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      {displayChannels.map(channel => {
        const percent = channel.percentage ?? (channel.lead_count / totalCount) * 100
        return (
          <div
            key={channel.channel_id || channel.channel_name}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, minWidth: 0 }}
          >
            <CategoryBadge category={channel.category} />
            <span style={{
              width: 52,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--semi-color-text-2)',
            }}>
              {channel.channel_name}
            </span>
            <span style={{ minWidth: 24, textAlign: 'right', fontFamily: 'monospace', fontWeight: 650 }}>
              {channel.lead_count.toLocaleString()}
            </span>
            <Progress
              percent={Math.min(percent, 100)}
              size="small"
              showInfo={false}
              style={{ width: 52 }}
            />
            <span style={{ width: 42, textAlign: 'right', color: 'var(--semi-color-text-2)' }}>
              {percent.toFixed(1)}%
            </span>
          </div>
        )
      })}
      {channels.length > 2 && (
        <Button
          theme="borderless"
          onClick={onToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 10,
            color: 'var(--semi-color-text-2)',
            padding: 0,
            minWidth: 'auto',
            height: 'auto',
          }}
        >
          {expanded ? (
            <><IconChevronDown size="small" /> 收起</>
          ) : (
            <><IconChevronRight size="small" /> 还有 {hiddenCount} 个渠道</>
          )}
        </Button>
      )}
    </div>
  )
}

function DetailMetric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      padding: '14px 16px',
      border: '1px solid var(--semi-color-border)',
      borderRadius: 8,
      backgroundColor: 'var(--semi-color-bg-0)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}16`,
          color,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, lineHeight: '26px', fontWeight: 650 }}>
            {value.toLocaleString()}
          </div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}

function MarketStaffDetailSheet({
  detail,
  staff,
  dateRangeLabel,
  loading,
  fetching,
  channelColumns,
}: {
  detail: MarketStaffDetailResponse | null
  staff: MarketStaffStatItem | null
  dateRangeLabel: string
  loading: boolean
  fetching: boolean
  channelColumns: ColumnProps<MarketStaffChannelBreakdownItem>[]
}) {
  const [activeTab, setActiveTab] = useState<'summary' | 'recent'>('summary')

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Skeleton.Title style={{ width: 220 }} />
        <Skeleton.Paragraph rows={4} />
        <Skeleton.Paragraph rows={6} />
      </div>
    )
  }

  if (!staff || !detail) {
    return (
      <div style={{ padding: 40 }}>
        <Empty description="请选择市场人员查看明细" />
      </div>
    )
  }

  const hasAnyData = detail.summary.total_count > 0 || detail.channel_breakdown.length > 0
  const scopeLabel = activeTab === 'recent' ? '最近30次导入' : dateRangeLabel

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      padding: 24,
      backgroundColor: 'var(--semi-color-bg-0)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--semi-color-border)',
      }}>
        <div style={{
          minWidth: 0,
          fontSize: 13,
          color: 'var(--semi-color-text-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {detail.staff.campus_name || staff.campus_name || '全部校区'} · {scopeLabel}
        </div>
        {fetching && (
          <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            更新中...
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
        <DetailMetric
          icon={<FileUp style={{ width: 17, height: 17 }} />}
          label="总录入"
          value={detail.summary.total_count}
          color={brandColors.blue}
        />
        <DetailMetric
          icon={<PhoneCall style={{ width: 17, height: 17 }} />}
          label="待回访"
          value={detail.summary.pending_followup_count}
          color={brandColors.orange}
        />
        <DetailMetric
          icon={<TagIcon style={{ width: 17, height: 17 }} />}
          label="渠道数"
          value={detail.summary.channel_count}
          color={brandColors.green}
        />
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'summary' | 'recent')}
        type="line"
        style={{ marginTop: 20 }}
      >
        <TabPane tab="统计概览" itemKey="summary">
          {!hasAnyData ? (
            <div style={{ padding: '72px 0' }}>
              <Empty description="当前筛选范围内暂无线索数据" />
            </div>
          ) : (
            <>
              <section style={{ marginTop: 8 }}>
                <SectionTitle icon={<BarChart3 style={{ width: 16, height: 16 }} />} title="每日录入分布" />
                <div style={{
                  height: 260,
                  marginTop: 12,
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 8,
                  padding: '16px 12px 8px',
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detail.daily_distribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--semi-color-border)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(value) => [`${value} 条`, '录入量']}
                        labelFormatter={(label) => `日期：${label}`}
                      />
                      <Bar dataKey="count" fill={brandColors.blue} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section style={{ marginTop: 24 }}>
                <SectionTitle icon={<PhoneCall style={{ width: 16, height: 16 }} />} title="待回访情况" />
                <PendingFollowupPanel pending={detail.pending_followup} totalLeads={detail.summary.total_count} />
              </section>

              <section style={{ marginTop: 24 }}>
                <SectionTitle icon={<TagIcon style={{ width: 16, height: 16 }} />} title="库内每渠道情况" />
                <Table
                  columns={channelColumns}
                  dataSource={detail.channel_breakdown}
                  rowKey={(record) => record?.channel_id || record?.channel_name || 'unknown-channel'}
                  pagination={false}
                  size="small"
                  style={{ marginTop: 12 }}
                  empty={<Empty description="暂无渠道数据" />}
                />
              </section>
            </>
          )}
        </TabPane>
        <TabPane tab="最近30次导入" itemKey="recent">
          <RecentImportBatchesTable batches={detail.recent_import_batches ?? []} />
        </TabPane>
      </Tabs>
    </div>
  )
}

function RecentImportBatchesTable({ batches }: { batches: MarketStaffRecentImportBatchItem[] }) {
  const columns = useMemo<ColumnProps<MarketStaffRecentImportBatchItem>[]>(() => [
    {
      title: '日期',
      dataIndex: 'started_at',
      width: 142,
      render: (value: string) => (
        <span style={{ fontSize: 13, color: 'var(--semi-color-text-1)' }}>
          {formatDateTime(value)}
        </span>
      ),
    },
    {
      title: '数量',
      dataIndex: 'lead_count',
      width: 126,
      align: 'right' as const,
      render: (_: number, record: MarketStaffRecentImportBatchItem) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span>
            <MetricNumber value={record.lead_count} />
            <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>入库</span>
          </span>
          <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            总量 {record.total_count.toLocaleString()} / 失败 {record.failed_count.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      title: '来源渠道分布',
      dataIndex: 'channels',
      width: 300,
      render: (_: unknown, record: MarketStaffRecentImportBatchItem) => (
        <BatchChannels channels={record.channels} total={record.lead_count} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 92,
      render: (status: string) => (
        <Tag color={importStatusColorMap[status] || 'grey'} shape="circle">
          {importStatusLabels[status] || status}
        </Tag>
      ),
    },
  ], [])

  return (
    <div style={{ marginTop: 8 }}>
      <Table
        columns={columns}
        dataSource={batches}
        rowKey="batch_id"
        pagination={false}
        size="small"
        scroll={{ x: 660 }}
        empty={<Empty description="暂无最近导入数据" />}
      />
    </div>
  )
}

function BatchChannels({
  channels,
  total,
}: {
  channels: MarketStaffRecentImportBatchItem['channels']
  total: number
}) {
  const totalCount = total > 0 ? total : channels.reduce((sum, channel) => sum + channel.count, 0)

  if (!channels.length || totalCount <= 0) {
    return <span style={{ color: 'var(--semi-color-text-2)' }}>暂无入库渠道</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{
        display: 'flex',
        width: '100%',
        height: 10,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: 'var(--semi-color-fill-0)',
        border: '1px solid var(--semi-color-border)',
      }}>
        {channels.map((channel, index) => {
          const percent = (channel.count / totalCount) * 100
          const color = channelDistributionPalette[index % channelDistributionPalette.length]
          return (
            <span
              key={channel.channel_id || channel.channel_name}
              title={`${channel.channel_name} ${channel.count}条 ${percent.toFixed(1)}%`}
              style={{
                width: `${percent}%`,
                minWidth: percent > 0 ? 2 : 0,
                height: '100%',
                backgroundColor: color,
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px' }}>
        {channels.map((channel, index) => {
          const percent = (channel.count / totalCount) * 100
          const color = channelDistributionPalette[index % channelDistributionPalette.length]
          const percentLabel = percent >= 10 ? percent.toFixed(0) : percent.toFixed(1)
          return (
            <span
              key={channel.channel_id || channel.channel_name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                maxWidth: '100%',
                fontSize: 12,
                lineHeight: '18px',
              }}
            >
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                flexShrink: 0,
                backgroundColor: color,
              }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {channel.channel_name}
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 650 }}>
                {channel.count}
              </span>
              <span style={{ color: 'var(--semi-color-text-2)' }}>
                {percentLabel}%
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 650 }}>
      <span style={{ color: 'var(--semi-color-text-2)', display: 'inline-flex' }}>{icon}</span>
      <span>{title}</span>
    </div>
  )
}

function PendingFollowupPanel({
  pending,
  totalLeads,
}: {
  pending: MarketStaffDetailResponse['pending_followup']
  totalLeads: number
}) {
  const maxCount = Math.max(...pending.channels.map(item => item.count), 1)

  return (
    <div style={{
      marginTop: 12,
      border: '1px solid var(--semi-color-border)',
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 650 }}>{pending.total_count.toLocaleString()}</span>
        <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
          待回访线索，占总录入 {totalLeads > 0 ? ((pending.total_count / totalLeads) * 100).toFixed(1) : 0}%
        </span>
      </div>

      {pending.channels.length === 0 ? (
        <div style={{ marginTop: 18 }}>
          <Empty description="当前没有待回访线索" />
        </div>
      ) : (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.channels.map(channel => (
            <PendingChannelRow
              key={channel.channel_id || channel.channel_name}
              channel={channel}
              maxCount={maxCount}
              totalPending={pending.total_count}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PendingChannelRow({
  channel,
  maxCount,
  totalPending,
}: {
  channel: MarketStaffPendingChannelItem
  maxCount: number
  totalPending: number
}) {
  const percent = totalPending > 0 ? ((channel.count / totalPending) * 100).toFixed(1) : '0.0'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <CategoryBadge category={channel.category} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channel.channel_name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
          <MetricNumber value={channel.count} />
          <span style={{ width: 44, textAlign: 'right', fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            {percent}%
          </span>
        </div>
      </div>
      <Progress
        percent={(channel.count / maxCount) * 100}
        size="small"
        showInfo={false}
        style={{ marginTop: 6 }}
      />
    </div>
  )
}

export default MarketingStatisticsPage
