import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  Banner,
  Button,
  DatePicker,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconDownload, IconRefresh, IconSearch } from '@douyinfe/semi-icons'
import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Database,
  SlidersHorizontal,
  Table2,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { LeadStatusBadge } from '@/features/crm/leads/components/status-badges'
import leadsApi from '@/features/crm/leads/api'
import { leadStatusLabels, type LeadStatus } from '@/features/crm/leads/types'
import { leadPaymentStatisticsApi } from './api'
import {
  exceptionLabels,
  type LeadPaymentDashboardParams,
  type LeadPaymentDashboardResponse,
  type LeadPaymentException,
  type LeadPaymentFilterOption,
  type LeadPaymentFilters,
  type LeadPaymentGroupStat,
  type LeadPaymentLedgerItem,
  type LeadPaymentLedgerParams,
  type LeadPaymentLedgerSummary,
  type LeadPaymentMonthlyStat,
  yesNoOptions,
} from './types'

const { Text, Title } = Typography

type ActiveTab = 'ledger' | 'dashboard'
type PeriodKey = 'today' | 'month' | 'last30' | 'all' | 'custom'
type DashboardDimensionKey = 'parttime' | 'advisor' | 'month' | 'channel'

interface FilterOptionsResponse {
  campuses?: LeadPaymentFilterOption[]
  advisors?: LeadPaymentFilterOption[]
  source_channels?: LeadPaymentFilterOption[]
  creators?: LeadPaymentFilterOption[]
}

const periodOptions = [
  { value: 'today', label: '今天' },
  { value: 'month', label: '本月' },
  { value: 'last30', label: '最近30天' },
  { value: 'all', label: '全部日期' },
  { value: 'custom', label: '自定义' },
]

const exceptionOptions = [
  { value: '', label: '全部异常' },
  ...Object.entries(exceptionLabels).map(([value, label]) => ({ value, label })),
]

const statColumns: ColumnProps<LeadPaymentGroupStat>[] = [
  {
    key: 'rank',
    title: '#',
    width: 48,
    align: 'center',
    render: (_value: string, _record: LeadPaymentGroupStat, index?: number) => (
      <Text type="tertiary" size="small">
        {(index ?? 0) + 1}
      </Text>
    ),
  },
  {
    key: 'name',
    title: '名称',
    dataIndex: 'name',
    width: 156,
    ellipsis: true,
    render: (value: string) => (
      <Text strong ellipsis={{ showTooltip: true }}>
        {value || '-'}
      </Text>
    ),
  },
  {
    title: '线索',
    dataIndex: 'lead_count',
    width: 76,
    align: 'right',
    render: (value: number) => <MetricNumber value={value} />,
  },
  {
    title: '有效',
    dataIndex: 'valid_lead_count',
    width: 76,
    align: 'right',
    render: (value: number) => <MetricNumber value={value} />,
  },
  {
    title: '诺到',
    dataIndex: 'promised_count',
    width: 76,
    align: 'right',
    render: (value: number) => <MetricNumber value={value} />,
  },
  {
    title: '到访',
    dataIndex: 'visited_count',
    width: 76,
    align: 'right',
    render: (value: number) => <MetricNumber value={value} />,
  },
  {
    title: '缴费',
    dataIndex: 'paid_lead_count',
    width: 76,
    align: 'right',
    render: (value: number) => <MetricNumber value={value} />,
  },
  {
    title: '前端缴费',
    dataIndex: 'front_payment_amount',
    width: 116,
    align: 'right',
    render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
  },
  {
    key: 'payment_rate',
    title: '缴费率',
    width: 86,
    align: 'right',
    render: (_value: number, record: LeadPaymentGroupStat) => (
      <RateText numerator={record.paid_lead_count} denominator={record.lead_count} />
    ),
  },
]

const monthlyColumns: ColumnProps<LeadPaymentMonthlyStat>[] = [
  {
    title: '月份',
    dataIndex: 'month',
    width: 100,
  },
  {
    title: '缴费笔数',
    dataIndex: 'payment_count',
    width: 90,
    align: 'right',
    render: (value: number) => <MetricNumber value={value} />,
  },
  {
    title: '缴费线索',
    dataIndex: 'paid_lead_count',
    width: 90,
    align: 'right',
    render: (value: number) => <MetricNumber value={value} />,
  },
  {
    title: '前端缴费',
    dataIndex: 'front_payment_amount',
    width: 120,
    align: 'right',
    render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
  },
]

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateRange(period: PeriodKey): [string, string] | null {
  const now = new Date()
  const today = formatLocalDate(now)

  if (period === 'today') return [today, today]
  if (period === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    return [formatLocalDate(firstDay), today]
  }
  if (period === 'last30') {
    const startDay = new Date(now)
    startDay.setDate(now.getDate() - 29)
    return [formatLocalDate(startDay), today]
  }
  return null
}

function createDefaultFilters(): LeadPaymentFilters {
  return {
    dateRange: getDateRange('month'),
    campusId: '',
    advisorId: '',
    channelId: '',
    parttimeId: '',
    keyword: '',
    promised: '',
    visited: '',
    paid: '',
    exception: '',
  }
}

function asBoolean(value: '' | 'yes' | 'no'): boolean | undefined {
  if (value === 'yes') return true
  if (value === 'no') return false
  return undefined
}

function formatDateOnly(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatLocalDate(date)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(/\//g, '-')
}

function formatCurrency(value?: number | null) {
  return `¥${Number(value || 0).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
  })}`
}

function cleanParams<T extends Record<string, unknown>>(params: T): T {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as T
}

function buildPersonOptionLabel(item: LeadPaymentFilterOption) {
  if (item.username) return `${item.name} (${item.username})`
  return item.name || item.id
}

function buildOptions(
  items: LeadPaymentFilterOption[],
  allLabel: string,
  people = false,
) {
  return [
    { value: '', label: allLabel },
    ...items.map((item) => ({
      value: item.id,
      label: people ? buildPersonOptionLabel(item) : item.name,
    })),
  ]
}

export function LeadPaymentStatisticsPage() {
  useDocumentTitle('线索缴费统计')

  const [activeTab, setActiveTab] = useState<ActiveTab>('ledger')
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [filters, setFilters] = useState<LeadPaymentFilters>(() => createDefaultFilters())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)

  const optionsQuery = useQuery({
    queryKey: ['lead-payment-filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return (response.data ?? {}) as FilterOptionsResponse
    },
    staleTime: 5 * 60 * 1000,
  })

  const campuses = useMemo(
    () => optionsQuery.data?.campuses ?? [],
    [optionsQuery.data?.campuses],
  )
  const advisors = useMemo(
    () => optionsQuery.data?.advisors ?? [],
    [optionsQuery.data?.advisors],
  )
  const channels = useMemo(
    () => optionsQuery.data?.source_channels ?? [],
    [optionsQuery.data?.source_channels],
  )
  const parttimes = useMemo(
    () => optionsQuery.data?.creators ?? [],
    [optionsQuery.data?.creators],
  )

  const baseParams = useMemo<LeadPaymentDashboardParams>(() => {
    return cleanParams({
      date_from: filters.dateRange?.[0],
      date_to: filters.dateRange?.[1],
      owner_campus_id: filters.campusId,
      advisor_id: filters.advisorId,
      source_channel_id: filters.channelId,
      parttime_id: filters.parttimeId,
      keyword: filters.keyword.trim() || undefined,
    })
  }, [filters])

  const ledgerParams = useMemo<LeadPaymentLedgerParams>(() => {
    return cleanParams({
      ...baseParams,
      page,
      size: pageSize,
      promised: asBoolean(filters.promised),
      visited: asBoolean(filters.visited),
      paid: asBoolean(filters.paid),
      exception: filters.exception,
    })
  }, [baseParams, filters.exception, filters.paid, filters.promised, filters.visited, page, pageSize])

  const ledgerQuery = useQuery({
    queryKey: ['lead-payment-ledger', ledgerParams],
    queryFn: () => leadPaymentStatisticsApi.getLedger(ledgerParams),
    staleTime: 60 * 1000,
  })

  const dashboardQuery = useQuery({
    queryKey: ['lead-payment-dashboard', baseParams],
    queryFn: () => leadPaymentStatisticsApi.getDashboard(baseParams),
    staleTime: 60 * 1000,
  })

  const ledgerData = ledgerQuery.data?.data
  const dashboardData = dashboardQuery.data?.data
  const ledgerItems = useMemo(
    () => ledgerData?.items ?? [],
    [ledgerData?.items],
  )
  const ledgerSummary = useMemo(
    () => ledgerData?.summary ?? createEmptyLedgerSummary(),
    [ledgerData?.summary],
  )
  const dashboardSummary = dashboardData?.summary ?? createEmptyDashboard().summary
  const advancedFilterCount = useMemo(
    () =>
      [
        filters.advisorId,
        filters.parttimeId,
        filters.promised,
        filters.visited,
        filters.paid,
        filters.exception,
      ].filter(Boolean).length,
    [
      filters.advisorId,
      filters.exception,
      filters.paid,
      filters.parttimeId,
      filters.promised,
      filters.visited,
    ],
  )

  const resetPage = useCallback(() => setPage(1), [])

  const patchFilters = useCallback(
    (patch: Partial<LeadPaymentFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }))
      resetPage()
    },
    [resetPage],
  )

  const handlePeriodChange = useCallback(
    (value: string) => {
      const next = value as PeriodKey
      setPeriod(next)
      patchFilters({ dateRange: getDateRange(next) })
    },
    [patchFilters],
  )

  const handleDateChange = useCallback(
    (_date: unknown, value: string | string[] | Date | Date[] | undefined) => {
      if (Array.isArray(value) && value.length === 2) {
        const nextRange: [string, string] =
          value[0] instanceof Date && value[1] instanceof Date
            ? [formatLocalDate(value[0]), formatLocalDate(value[1])]
            : [String(value[0]), String(value[1])]
        setPeriod('custom')
        patchFilters({ dateRange: nextRange })
      } else {
        setPeriod('all')
        patchFilters({ dateRange: null })
      }
    },
    [patchFilters],
  )

  const filterTags: FilterTag[] = useMemo(() => {
    const tags: FilterTag[] = []
    if (filters.dateRange) {
      tags.push({
        key: 'date',
        label: '日期',
        value: `${filters.dateRange[0]} ~ ${filters.dateRange[1]}`,
        onClose: () => {
          setPeriod('all')
          patchFilters({ dateRange: null })
        },
      })
    }
    if (filters.campusId) {
      const item = campuses.find((campus) => campus.id === filters.campusId)
      tags.push({
        key: 'campus',
        label: '校区',
        value: item?.name || filters.campusId,
        onClose: () => patchFilters({ campusId: '' }),
      })
    }
    if (filters.channelId) {
      const item = channels.find((channel) => channel.id === filters.channelId)
      tags.push({
        key: 'channel',
        label: '渠道',
        value: item?.name || filters.channelId,
        onClose: () => patchFilters({ channelId: '' }),
      })
    }
    if (filters.advisorId) {
      const item = advisors.find((advisor) => advisor.id === filters.advisorId)
      tags.push({
        key: 'advisor',
        label: '咨询师',
        value: item?.name || filters.advisorId,
        onClose: () => patchFilters({ advisorId: '' }),
      })
    }
    if (filters.parttimeId) {
      const item = parttimes.find((parttime) => parttime.id === filters.parttimeId)
      tags.push({
        key: 'parttime',
        label: '兼职',
        value: item?.name || filters.parttimeId,
        onClose: () => patchFilters({ parttimeId: '' }),
      })
    }
    if (filters.keyword.trim()) {
      tags.push({
        key: 'keyword',
        label: '搜索',
        value: filters.keyword.trim(),
        onClose: () => patchFilters({ keyword: '' }),
      })
    }
    ;[
      ['promised', '诺到', filters.promised],
      ['visited', '到访', filters.visited],
      ['paid', '缴费', filters.paid],
    ].forEach(([key, label, value]) => {
      if (!value) return
      tags.push({
        key: String(key),
        label: String(label),
        value: value === 'yes' ? '是' : '否',
        onClose: () => patchFilters({ [key as 'promised' | 'visited' | 'paid']: '' }),
      })
    })
    if (filters.exception) {
      tags.push({
        key: 'exception',
        label: '异常',
        value: exceptionLabels[filters.exception],
        onClose: () => patchFilters({ exception: '' }),
      })
    }
    return tags
  }, [advisors, campuses, channels, filters, parttimes, patchFilters])

  const handleClearAllFilters = useCallback(() => {
    setPeriod('month')
    setFilters(createDefaultFilters())
    setPage(1)
  }, [])

  const handleClearAdvancedFilters = useCallback(() => {
    patchFilters({
      advisorId: '',
      parttimeId: '',
      promised: '',
      visited: '',
      paid: '',
      exception: '',
    })
  }, [patchFilters])

  const handleRefresh = useCallback(() => {
    void ledgerQuery.refetch()
    void dashboardQuery.refetch()
  }, [dashboardQuery, ledgerQuery])

  const handleExportCurrentPage = useCallback(() => {
    if (!ledgerItems.length) {
      Toast.warning('当前页暂无可导出数据')
      return
    }
    const header = [
      '登记时间',
      '手机号',
      '客户',
      '兼职',
      '咨询师',
      '渠道',
      '状态',
      '诺到',
      '到访',
      '缴费',
      '前端缴费',
      '最近缴费时间',
    ]
    const rows = ledgerItems.map((item) => [
      formatDateTime(item.registered_at),
      item.parent_phone || '',
      item.customer_name || '',
      item.parttime_name || '',
      item.advisor_name || '',
      item.channel_name || '',
      item.status_label || item.status,
      item.promised ? '是' : '否',
      item.visited ? '是' : '否',
      item.paid ? '是' : '否',
      String(item.front_payment_amount || 0),
      formatDateTime(item.latest_front_payment_at),
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `线索缴费统计_${formatLocalDate(new Date())}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [ledgerItems])

  const columns = useMemo<ColumnProps<LeadPaymentLedgerItem>[]>(
    () => [
      {
        title: '线索',
        dataIndex: 'customer_name',
        width: 260,
        fixed: 'left',
        render: (_, record) => <LeadIdentityCell record={record} />,
      },
      {
        title: '提交时间',
        dataIndex: 'registered_at',
        width: 116,
        render: (value: string) => (
          <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateOnly(value)}</Text>
        ),
      },
      {
        title: '兼职/推广员',
        dataIndex: 'parttime_name',
        width: 140,
        render: (value: string | null | undefined) => <DimensionText value={value} />,
      },
      {
        title: '咨询师',
        dataIndex: 'advisor_name',
        width: 120,
        render: (value: string | null | undefined) => <DimensionText value={value} missingLabel="未分配" />,
      },
      {
        title: '渠道',
        dataIndex: 'channel_name',
        width: 144,
        ellipsis: true,
        render: (value: string | null | undefined) => <DimensionText value={value} missingLabel="未设置" />,
      },
      {
        title: '线索状态',
        dataIndex: 'status',
        width: 118,
        render: (_, record) =>
          record.status && leadStatusLabels[record.status as LeadStatus] ? (
            <LeadStatusBadge status={record.status as LeadStatus} />
          ) : (
            <Tag color="grey" shape="circle">
              {record.status_label || record.status || '-'}
            </Tag>
          ),
      },
      {
        title: '转化进度',
        dataIndex: 'promised',
        width: 208,
        render: (_, record) => <ConversionStageCell record={record} />,
      },
      {
        title: '前端缴费',
        dataIndex: 'front_payment_amount',
        width: 126,
        align: 'right',
        render: (value: number) => <MoneyCell value={value} />,
      },
      {
        title: '最近缴费',
        dataIndex: 'latest_front_payment_at',
        width: 142,
        render: (value: string | null | undefined) => (
          <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(value)}</Text>
        ),
      },
      {
        title: '异常',
        dataIndex: 'exception_flags',
        width: 220,
        render: (value: LeadPaymentException[]) => <ExceptionTags value={value} />,
      },
    ],
    [],
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DataTableLayout
        title="线索缴费统计"
        total={activeTab === 'ledger' ? ledgerData?.total ?? 0 : dashboardSummary.total_leads}
        allowPageScroll={activeTab === 'dashboard'}
        contentOverflowVisible={activeTab === 'dashboard'}
        contentMinHeight={activeTab === 'dashboard' ? 'auto' : 560}
        headerActions={
          <>
            <ViewSwitcher
              activeTab={activeTab}
              ledgerCount={ledgerData?.total ?? 0}
              dashboardTotal={dashboardSummary.total_leads}
              onChange={setActiveTab}
            />
            <Button
              icon={<IconRefresh />}
              theme="light"
              onClick={handleRefresh}
              loading={ledgerQuery.isRefetching || dashboardQuery.isRefetching}
              title="刷新"
              aria-label="刷新"
            />
            <Button icon={<IconDownload />} theme="light" onClick={handleExportCurrentPage}>
              导出当前页
            </Button>
          </>
        }
        toolbar={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ledgerQuery.error || dashboardQuery.error ? (
              <Banner
                type="danger"
                closeIcon={null}
                description="线索缴费统计加载失败，请刷新后重试"
              />
            ) : null}

            <CompactSummaryBar
              summary={dashboardSummary}
              ledgerSummary={ledgerSummary}
              loading={dashboardQuery.isLoading}
            />

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                alignItems: 'center',
                border: '1px solid #dbe2ea',
                borderRadius: 8,
                background: '#fff',
                padding: 8,
              }}
            >
              <Input
                prefix={<IconSearch />}
                showClear
                value={filters.keyword}
                onChange={(value) => patchFilters({ keyword: value })}
                placeholder="搜索姓名 / 手机号"
                style={{ width: 220 }}
              />
              <Select
                value={period}
                onChange={(value) => handlePeriodChange(value as string)}
                optionList={periodOptions}
                style={{ width: 112 }}
              />
              <DatePicker
                type="dateRange"
                value={filters.dateRange ?? undefined}
                onChange={handleDateChange}
                format="yyyy-MM-dd"
                placeholder={['开始日期', '结束日期']}
                syncSwitchMonth
                weekStartsOn={1}
                style={{ width: 320, maxWidth: '100%' }}
              />
              <Select
                value={filters.campusId}
                onChange={(value) => patchFilters({ campusId: (value as string) || '' })}
                optionList={buildOptions(campuses, '全部校区')}
                filter
                style={{ width: 144 }}
              />
              <Select
                value={filters.channelId}
                onChange={(value) => patchFilters({ channelId: (value as string) || '' })}
                optionList={buildOptions(channels, '全部渠道')}
                filter
                style={{ width: 168 }}
              />
              <Button
                theme="light"
                icon={<SlidersHorizontal size={14} />}
                onClick={() => setFilterDialogOpen(true)}
              >
                更多筛选{advancedFilterCount ? ` ${advancedFilterCount}` : ''}
              </Button>
              <Button theme="light" icon={<IconRefresh />} onClick={handleClearAllFilters}>
                重置筛选
              </Button>
            </div>
          </div>
        }
        filterTags={filterTags}
        onClearAllFilters={handleClearAllFilters}
      >
        {activeTab === 'ledger' ? (
          <>
            <LedgerViewHeader
              total={ledgerData?.total ?? 0}
              pageSize={ledgerItems.length}
              summary={ledgerSummary}
            />
            <SemiDataTable<LeadPaymentLedgerItem>
              columns={columns}
              data={ledgerItems}
              total={ledgerData?.total ?? 0}
              page={page}
              pageSize={pageSize}
              isLoading={ledgerQuery.isLoading}
              scrollX={1494}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
              onRowClick={(record) => {
                setDetailLeadId(record.id)
                setDetailOpen(true)
              }}
              emptyText="暂无线索缴费数据"
            />
          </>
        ) : (
          <DashboardContent
            data={dashboardData ?? createEmptyDashboard()}
            loading={dashboardQuery.isLoading}
          />
        )}
      </DataTableLayout>

      <LeadDetailSheet
        leadId={detailLeadId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <AdvancedFilterDialog
        open={filterDialogOpen}
        activeTab={activeTab}
        filters={filters}
        advisors={advisors}
        parttimes={parttimes}
        patchFilters={patchFilters}
        onOpenChange={setFilterDialogOpen}
        onClear={handleClearAdvancedFilters}
      />
    </div>
  )
}

function AdvancedFilterDialog({
  open,
  activeTab,
  filters,
  advisors,
  parttimes,
  patchFilters,
  onOpenChange,
  onClear,
}: {
  open: boolean
  activeTab: ActiveTab
  filters: LeadPaymentFilters
  advisors: LeadPaymentFilterOption[]
  parttimes: LeadPaymentFilterOption[]
  patchFilters: (patch: Partial<LeadPaymentFilters>) => void
  onOpenChange: (open: boolean) => void
  onClear: () => void
}) {
  return (
    <Modal
      title="更多筛选"
      visible={open}
      width={560}
      onCancel={() => onOpenChange(false)}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Button theme="borderless" onClick={onClear}>
            清空
          </Button>
          <Button theme="solid" type="primary" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </div>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <FilterField label="咨询师">
          <Select
            value={filters.advisorId}
            onChange={(value) => patchFilters({ advisorId: (value as string) || '' })}
            optionList={buildOptions(advisors, '全部咨询师', true)}
            filter
            style={{ width: '100%' }}
          />
        </FilterField>
        <FilterField label="兼职">
          <Select
            value={filters.parttimeId}
            onChange={(value) => patchFilters({ parttimeId: (value as string) || '' })}
            optionList={buildOptions(parttimes, '全部兼职', true)}
            filter
            style={{ width: '100%' }}
          />
        </FilterField>
        {activeTab === 'ledger' ? (
          <>
            <FilterField label="诺到">
              <Select
                value={filters.promised}
                onChange={(value) =>
                  patchFilters({ promised: ((value as 'yes' | 'no') || '') as '' | 'yes' | 'no' })
                }
                optionList={[
                  { value: '', label: '全部诺到' },
                  ...yesNoOptions.slice(1),
                ]}
                style={{ width: '100%' }}
              />
            </FilterField>
            <FilterField label="到访">
              <Select
                value={filters.visited}
                onChange={(value) =>
                  patchFilters({ visited: ((value as 'yes' | 'no') || '') as '' | 'yes' | 'no' })
                }
                optionList={[
                  { value: '', label: '全部到访' },
                  ...yesNoOptions.slice(1),
                ]}
                style={{ width: '100%' }}
              />
            </FilterField>
            <FilterField label="缴费">
              <Select
                value={filters.paid}
                onChange={(value) =>
                  patchFilters({ paid: ((value as 'yes' | 'no') || '') as '' | 'yes' | 'no' })
                }
                optionList={[
                  { value: '', label: '全部缴费' },
                  ...yesNoOptions.slice(1),
                ]}
                style={{ width: '100%' }}
              />
            </FilterField>
            <FilterField label="异常">
              <Select
                value={filters.exception}
                onChange={(value) =>
                  patchFilters({ exception: ((value as LeadPaymentException) || '') as LeadPaymentException | '' })
                }
                optionList={exceptionOptions}
                style={{ width: '100%' }}
              />
            </FilterField>
          </>
        ) : null}
      </div>
    </Modal>
  )
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <Text type="tertiary" size="small">
        {label}
      </Text>
      {children}
    </div>
  )
}

function createEmptyLedgerSummary(): LeadPaymentLedgerSummary {
  return {
    total: 0,
    promised: 0,
    visited: 0,
    paid: 0,
    front_payment_amount: 0,
  }
}

function createEmptyDashboard(): LeadPaymentDashboardResponse {
  return {
    summary: {
      total_leads: 0,
      valid_leads: 0,
      promised_leads: 0,
      visited_leads: 0,
      paid_leads: 0,
      front_payment_amount: 0,
    },
    parttime_stats: [],
    advisor_stats: [],
    monthly_front_payments: [],
    channel_stats: [],
  }
}

function ViewSwitcher({
  activeTab,
  ledgerCount,
  dashboardTotal,
  onChange,
}: {
  activeTab: ActiveTab
  ledgerCount: number
  dashboardTotal: number
  onChange: (tab: ActiveTab) => void
}) {
  const views = [
    {
      key: 'ledger' as const,
      label: '数据表',
      count: ledgerCount,
      icon: <Table2 size={16} />,
    },
    {
      key: 'dashboard' as const,
      label: '统计透视',
      count: dashboardTotal,
      icon: <BarChart3 size={16} />,
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        border: '1px solid #dbe2ea',
        borderRadius: 8,
        background: '#f8fafc',
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      {views.map((view) => {
        const selected = activeTab === view.key
        return (
          <button
            key={view.key}
            type="button"
            onClick={() => onChange(view.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              minWidth: 104,
              border: selected ? '1px solid #2563eb' : '1px solid transparent',
              borderRadius: 6,
              background: selected ? '#fff' : 'transparent',
              color: selected ? '#1d4ed8' : 'var(--semi-color-text-1)',
              padding: '0 9px',
              boxShadow: selected ? '0 1px 3px rgba(37, 99, 235, 0.12)' : 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex', flexShrink: 0 }}>{view.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px', whiteSpace: 'nowrap' }}>
              {view.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--semi-color-text-2)', lineHeight: '14px' }}>
              {view.count.toLocaleString()}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function LedgerViewHeader({
  total,
  pageSize,
  summary,
}: {
  total: number
  pageSize: number
  summary: LeadPaymentLedgerSummary
}) {
  const cells = [
    { label: '当前页', value: `${pageSize} 行` },
    { label: '筛选总数', value: `${total.toLocaleString()} 条` },
    { label: '诺到', value: summary.promised.toLocaleString() },
    { label: '到访', value: summary.visited.toLocaleString() },
    { label: '缴费', value: summary.paid.toLocaleString() },
    { label: '前端缴费', value: formatCurrency(summary.front_payment_amount) },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 12px',
        borderBottom: '1px solid #e5eaf0',
        background: '#f8fafc',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Table2 size={16} color="#2563eb" />
        <Text strong>线索明细表</Text>
        <Text type="tertiary" size="small">
          固定首列，横向查看咨询、渠道、转化和缴费
        </Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {cells.map((cell, index) => (
          <div
            key={cell.label}
            style={{
              padding: '0 10px',
              borderLeft: index === 0 ? 'none' : '1px solid #e5eaf0',
              whiteSpace: 'nowrap',
            }}
          >
            <Text type="tertiary" size="small">
              {cell.label}
            </Text>
            <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompactSummaryBar({
  summary,
  ledgerSummary,
  loading,
}: {
  summary: LeadPaymentDashboardResponse['summary']
  ledgerSummary: LeadPaymentLedgerSummary
  loading: boolean
}) {
  const items = [
    { label: '线索数', value: summary.total_leads, color: 'var(--semi-color-primary)' },
    { label: '有效线索', value: summary.valid_leads, color: '#16a34a' },
    { label: '诺到', value: summary.promised_leads, color: '#7c3aed' },
    { label: '到访', value: summary.visited_leads, color: '#059669' },
    { label: '缴费线索', value: summary.paid_leads, color: '#0891b2' },
    { label: '前端缴费', value: summary.front_payment_amount || ledgerSummary.front_payment_amount, color: '#dc2626', currency: true },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        minHeight: 34,
        border: '1px solid #dbe2ea',
        borderRadius: 8,
        background: '#f8fafc',
        padding: '0 10px',
        overflowX: 'auto',
      }}
    >
      <Text strong size="small" style={{ marginRight: 10, whiteSpace: 'nowrap' }}>
        当前筛选
      </Text>
      {items.map((item, index) => (
        <div
          key={item.label}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 5,
            padding: '0 10px',
            borderLeft: index === 0 ? 'none' : '1px solid #dbe2ea',
            whiteSpace: 'nowrap',
          }}
        >
          <Text type="tertiary" size="small">
            {item.label}
          </Text>
          <div
            style={{
              fontSize: 14,
              lineHeight: '20px',
              fontWeight: 700,
              color: item.color,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {loading ? '-' : item.currency ? formatCurrency(item.value) : Number(item.value || 0).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}

function DashboardContent({
  data,
  loading,
}: {
  data: LeadPaymentDashboardResponse
  loading: boolean
}) {
  const [activeDimension, setActiveDimension] = useState<DashboardDimensionKey>('parttime')
  const monthlyData = data.monthly_front_payments
  const dimensions = [
    {
      key: 'parttime' as const,
      label: '兼职',
      title: '兼职统计',
      meta: `${data.parttime_stats.length} 人`,
      icon: <Database size={16} />,
    },
    {
      key: 'advisor' as const,
      label: '咨询师',
      title: '咨询统计',
      meta: `${data.advisor_stats.length} 人`,
      icon: <CheckCircle2 size={16} />,
    },
    {
      key: 'month' as const,
      label: '月份',
      title: '月度前端缴费',
      meta: `${monthlyData.length} 个月`,
      icon: <CircleDollarSign size={16} />,
    },
    {
      key: 'channel' as const,
      label: '渠道',
      title: '渠道缴费',
      meta: `${data.channel_stats.length} 个渠道`,
      icon: <BarChart3 size={16} />,
    },
  ]
  const activeConfig = dimensions.find((dimension) => dimension.key === activeDimension) ?? dimensions[0]
  const groupData =
    activeDimension === 'parttime'
      ? data.parttime_stats
      : activeDimension === 'advisor'
        ? data.advisor_stats
        : data.channel_stats
  const isMonthlyDimension = activeDimension === 'month'

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, background: '#f8fafc' }}>
      <DashboardDimensionSwitcher
        activeKey={activeDimension}
        dimensions={dimensions}
        onChange={setActiveDimension}
      />

      <DashboardSection
        title={activeConfig.title}
        meta={activeConfig.meta}
        icon={activeConfig.icon}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 1fr))',
            gap: 14,
            alignItems: 'start',
          }}
        >
          {isMonthlyDimension ? (
            <>
              <MonthlyAmountChart data={monthlyData} loading={loading} />
              <Table<LeadPaymentMonthlyStat>
                columns={monthlyColumns}
                dataSource={monthlyData}
                rowKey="month"
                pagination={false}
                loading={loading}
                size="small"
                scroll={{ x: 400, y: 420 }}
                empty={<EmptyBlock text="暂无月度缴费数据" compact />}
              />
            </>
          ) : (
            <>
              <GroupAmountChart data={groupData} loading={loading} />
              <GroupStatsTable data={groupData} loading={loading} />
            </>
          )}
        </div>
      </DashboardSection>
    </div>
  )
}

function DashboardDimensionSwitcher({
  activeKey,
  dimensions,
  onChange,
}: {
  activeKey: DashboardDimensionKey
  dimensions: Array<{
    key: DashboardDimensionKey
    label: string
    meta: string
    icon: ReactNode
  }>
  onChange: (key: DashboardDimensionKey) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        border: '1px solid #dbe2ea',
        borderRadius: 8,
        background: '#fff',
        padding: 6,
      }}
    >
      {dimensions.map((dimension) => {
        const selected = dimension.key === activeKey
        return (
          <button
            key={dimension.key}
            type="button"
            onClick={() => onChange(dimension.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 34,
              border: selected ? '1px solid #2563eb' : '1px solid transparent',
              borderRadius: 6,
              background: selected ? '#eff6ff' : 'transparent',
              color: selected ? '#1d4ed8' : 'var(--semi-color-text-1)',
              padding: '0 10px',
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex', flexShrink: 0 }}>{dimension.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{dimension.label}</span>
            <span style={{ fontSize: 11, color: 'var(--semi-color-text-2)', whiteSpace: 'nowrap' }}>
              {dimension.meta}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function DashboardSection({
  title,
  meta,
  icon,
  children,
}: {
  title: string
  meta?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      style={{
        border: '1px solid #dbe2ea',
        borderRadius: 8,
        background: '#fff',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #e5eaf0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', color: '#2563eb' }}>{icon}</span>
          <Title heading={6} style={{ margin: 0 }}>
            {title}
          </Title>
        </div>
        {meta ? (
          <Text type="tertiary" size="small">
            {meta}
          </Text>
        ) : null}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </section>
  )
}

function MonthlyAmountChart({
  data,
  loading,
}: {
  data: LeadPaymentMonthlyStat[]
  loading: boolean
}) {
  if (!data.length) {
    return <EmptyBlock text={loading ? '加载中' : '暂无月度缴费数据'} />
  }

  return (
    <div style={{ width: '100%', height: 340, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), '前端缴费']}
            labelFormatter={(label) => `月份: ${label}`}
          />
          <Bar dataKey="front_payment_amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function GroupAmountChart({
  data,
  loading,
}: {
  data: LeadPaymentGroupStat[]
  loading: boolean
}) {
  const chartData = data
    .slice(0, 10)
    .map((item) => ({
      ...item,
      displayName: item.name || '未记录',
    }))

  if (!chartData.length) {
    return <EmptyBlock text={loading ? '加载中' : '暂无统计数据'} />
  }

  return (
    <div style={{ width: '100%', height: 340, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 8, left: 18 }}
        >
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(value) => `${Number(value) / 1000}k`}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            width={96}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(value) => truncateChartLabel(String(value))}
          />
          <Tooltip
            formatter={(value, name) => [
              name === 'front_payment_amount' ? formatCurrency(Number(value)) : Number(value).toLocaleString(),
              name === 'front_payment_amount' ? '前端缴费' : String(name),
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="front_payment_amount" fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function GroupStatsTable({
  data,
  loading,
}: {
  data: LeadPaymentGroupStat[]
  loading: boolean
}) {
  return (
    <Table<LeadPaymentGroupStat>
      columns={statColumns}
      dataSource={data}
      rowKey="name"
      pagination={false}
      loading={loading}
      size="small"
      scroll={{ x: 680, y: 320 }}
      empty={<EmptyBlock text="暂无统计数据" compact />}
    />
  )
}

function truncateChartLabel(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}...` : value
}

function LeadIdentityCell({ record }: { record: LeadPaymentLedgerItem }) {
  const name = record.customer_name || record.parent_name || '-'
  const grade = record.grade_label || record.grade || '年级未填'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <Text strong ellipsis={{ showTooltip: true }}>
        {name}
      </Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Text
          type={record.parent_phone ? 'secondary' : 'quaternary'}
          size="small"
          ellipsis={{ showTooltip: true }}
          style={{ fontFamily: 'monospace', maxWidth: 126 }}
        >
          {record.parent_phone || '手机号为空'}
        </Text>
        <Tag size="small" color="grey" shape="circle">
          {grade}
        </Tag>
      </div>
    </div>
  )
}

function DimensionText({
  value,
  missingLabel = '未记录',
}: {
  value?: string | null
  missingLabel?: string
}) {
  if (!value) {
    return (
      <Tag size="small" color="orange" shape="circle">
        {missingLabel}
      </Tag>
    )
  }

  return (
    <Text ellipsis={{ showTooltip: true }} style={{ maxWidth: '100%' }}>
      {value}
    </Text>
  )
}

function ConversionStageCell({ record }: { record: LeadPaymentLedgerItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <StageToken label="诺到" active={record.promised} color="#7c3aed" />
      <StageToken label="到访" active={record.visited} color="#059669" />
      <StageToken label="缴费" active={record.paid} color="#0891b2" />
    </div>
  )
}

function StageToken({
  label,
  active,
  color,
}: {
  label: string
  active: boolean
  color: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 8px',
        borderRadius: 999,
        border: active ? `1px solid ${color}` : '1px solid #dbe2ea',
        color: active ? color : 'var(--semi-color-text-2)',
        background: active ? `${color}14` : '#f8fafc',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: active ? color : '#cbd5e1',
        }}
      />
      {label}
    </span>
  )
}

function MoneyCell({ value }: { value: number }) {
  const hasValue = Number(value || 0) > 0

  return (
    <Text strong={hasValue} type={hasValue ? undefined : 'tertiary'} style={{ color: hasValue ? '#dc2626' : undefined }}>
      {formatCurrency(value)}
    </Text>
  )
}

function ExceptionTags({ value }: { value: LeadPaymentException[] }) {
  if (!value?.length) {
    return <Text type="quaternary">-</Text>
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {value.map((flag) => (
        <Tag key={flag} size="small" color="orange" shape="circle">
          {exceptionLabels[flag]}
        </Tag>
      ))}
    </div>
  )
}

function RateText({
  numerator,
  denominator,
}: {
  numerator: number
  denominator: number
}) {
  const rate = denominator > 0 ? (numerator / denominator) * 100 : 0

  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
      {rate.toFixed(1)}%
    </span>
  )
}

function MetricNumber({ value }: { value: number }) {
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
      {Number(value || 0).toLocaleString()}
    </span>
  )
}

function EmptyBlock({
  text,
  compact = false,
}: {
  text: string
  compact?: boolean
}) {
  return (
    <div
      style={{
        padding: compact ? '20px 0' : '64px 0',
        textAlign: 'center',
        color: 'var(--semi-color-text-2)',
      }}
    >
      {text}
    </div>
  )
}
