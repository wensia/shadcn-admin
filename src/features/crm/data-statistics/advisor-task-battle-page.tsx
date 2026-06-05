import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import {
  Banner,
  Button,
  DatePicker,
  Empty,
  Input,
  Select,
  Tag,
  Typography,
} from '@douyinfe/semi-ui-19'
import {
  ClipboardCheck,
  Search,
} from 'lucide-react'
import { motion } from 'motion/react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { adminApi } from '@/features/admin/api'
import { yunkeCredentialsApi } from '@/features/yunke/api'
import { useIsSuperUser } from '@/stores/auth-store'
import { AdvisorTaskMatrix } from './components/advisor-task-matrix'
import { AdvisorTaskOverviewTable } from './components/advisor-task-overview-table'
import { AdvisorTaskReviewDrawer } from './components/advisor-task-review-drawer'
import {
  useAdvisorTaskActions,
  useAdvisorTaskDashboard,
  useAdvisorTaskDetail,
} from './hooks/use-advisor-task-dashboard'
import type {
  AdvisorTaskDateMode,
  AdvisorTaskManualEntryPayload,
  AdvisorTaskManualReviewPayload,
  AdvisorTaskRow,
} from './api/advisor-task-api'

const { Text } = Typography

type DateMode = 'today' | 'week' | 'month' | 'single' | 'range'
type StatusFilter = 'all' | 'pending_review' | 'failed' | 'qualified'

/** 从顾问数据中心传入的共享筛选状态 */
export interface TaskBattleExternalFilter {
  dateMode: DateMode
  selectedDate: Date
  selectedRange: [Date, Date]
  selectedCampusId: string
  selectedAccountId: string
  dateFrom: string
  dateTo: string
}

function formatDate(value: Date) {
  return format(value, 'yyyy-MM-dd')
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

function formatGeneratedAt(value?: string) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return format(parsed, 'MM-dd HH:mm')
}

function getStatusFilterCount(rows: AdvisorTaskRow[], filter: StatusFilter) {
  if (filter === 'all') return rows.length
  if (filter === 'pending_review') return rows.filter((row) => row.finalStatus === 'pending_review').length
  if (filter === 'failed') return rows.filter((row) => row.finalStatus === 'failed').length
  return rows.filter((row) => row.finalStatus === 'auto_pass' || row.finalStatus === 'manual_pass').length
}

function matchesStatusFilter(row: AdvisorTaskRow, filter: StatusFilter) {
  if (filter === 'all') return true
  if (filter === 'pending_review') return row.finalStatus === 'pending_review'
  if (filter === 'failed') return row.finalStatus === 'failed'
  return row.finalStatus === 'auto_pass' || row.finalStatus === 'manual_pass'
}

function getStatusRank(row: AdvisorTaskRow) {
  switch (row.finalStatus) {
    case 'pending_review':
      return 0
    case 'failed':
      return 1
    case 'manual_pass':
      return 2
    case 'auto_pass':
      return 3
    default:
      return 4
  }
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <Text
        type="tertiary"
        size="small"
        style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.03em' }}
      >
        {label}
      </Text>
      {children}
    </div>
  )
}

function StatusFilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <Button
      theme={active ? 'solid' : 'light'}
      type={active ? 'primary' : 'tertiary'}
      onClick={onClick}
      style={{
        borderRadius: 999,
        fontWeight: 600,
        paddingInline: 14,
        boxShadow: 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {label} · {count}
    </Button>
  )
}

export interface AdvisorTaskBattlePageProps {
  externalFilter?: TaskBattleExternalFilter
}

export function AdvisorTaskBattlePage({ externalFilter }: AdvisorTaskBattlePageProps = {}) {
  useDocumentTitle('顾问任务战情')

  const isSuperUser = useIsSuperUser()
  const today = useMemo(() => new Date(), [])

  // 内部状态（仅在无外部 filter 时使用）
  const [internalCampusId, setInternalCampusId] = useState('all')
  const [internalDateMode, setInternalDateMode] = useState<DateMode>('today')
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date>(today)
  const [internalSelectedRange, setInternalSelectedRange] = useState<[Date, Date]>([today, today])
  const [internalAccountId, setInternalAccountId] = useState('')

  // 优先使用外部 filter
  const selectedCampusId = externalFilter?.selectedCampusId ?? internalCampusId
  const setSelectedCampusId = (v: string) => { if (!externalFilter) setInternalCampusId(v) }
  const dateMode = externalFilter?.dateMode ?? internalDateMode
  const setDateMode = (v: DateMode) => { if (!externalFilter) setInternalDateMode(v) }
  const selectedDate = externalFilter?.selectedDate ?? internalSelectedDate
  const setSelectedDate = (v: Date) => { if (!externalFilter) setInternalSelectedDate(v) }
  const selectedRange = externalFilter?.selectedRange ?? internalSelectedRange
  const setSelectedRange = (v: [Date, Date]) => { if (!externalFilter) setInternalSelectedRange(v) }
  const selectedAccountId = externalFilter?.selectedAccountId ?? internalAccountId
  const setSelectedAccountId = (v: string) => { if (!externalFilter) setInternalAccountId(v) }
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [keyword, setKeyword] = useState('')
  const [activeRow, setActiveRow] = useState<AdvisorTaskRow | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const { data: campusesData } = useQuery({
    queryKey: ['advisor-task-battle-campuses-simple'],
    queryFn: () => adminApi.getCampusesSimple(),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: accountsData,
    isLoading: isAccountsLoading,
  } = useQuery({
    queryKey: ['advisor-task-battle-yunke-accounts'],
    queryFn: async () => yunkeCredentialsApi.getCredentials({ status: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
    enabled: isSuperUser,
  })

  const campusOptions = useMemo(() => {
    const items = campusesData?.data || []
    return [
      { value: 'all', label: '全部校区' },
      ...items.map((item) => ({ value: item.id, label: item.name })),
    ]
  }, [campusesData])

  const accountOptions = useMemo(() => {
    const accounts = accountsData?.items || []
    return accounts.map((account) => ({
      value: account.id,
      label: account.company_name || account.phone,
    }))
  }, [accountsData])

  const effectiveAccountId = isSuperUser ? (selectedAccountId || accountOptions[0]?.value || '') : ''
  const selectedAccountLabel = useMemo(() => {
    const matched = accountOptions.find((option) => option.value === effectiveAccountId)
    return matched?.label || '默认账号'
  }, [accountOptions, effectiveAccountId])

  const internalDateFrom = useMemo(() => {
    if (externalFilter) return externalFilter.dateFrom
    if (dateMode === 'today') return formatDate(today)
    if (dateMode === 'week') return formatDate(getCurrentWeekRange(today)[0])
    if (dateMode === 'month') return formatDate(getCurrentMonthRange(today)[0])
    if (dateMode === 'single') return formatDate(selectedDate)
    return formatDate(selectedRange[0])
  }, [externalFilter, dateMode, selectedDate, selectedRange, today])

  const internalDateTo = useMemo(() => {
    if (externalFilter) return externalFilter.dateTo
    if (dateMode === 'today') return formatDate(today)
    if (dateMode === 'week') return formatDate(getCurrentWeekRange(today)[1])
    if (dateMode === 'month') return formatDate(getCurrentMonthRange(today)[1])
    if (dateMode === 'single') return formatDate(selectedDate)
    return formatDate(selectedRange[1])
  }, [externalFilter, dateMode, selectedDate, selectedRange, today])

  const dateFrom = internalDateFrom
  const dateTo = internalDateTo

  const taskDateMode: AdvisorTaskDateMode = dateMode === 'today'
    ? 'today'
    : dateMode === 'single'
      ? 'single'
      : 'range'

  const queryParams = useMemo(() => ({
    campusId: selectedCampusId,
    accountId: effectiveAccountId || undefined,
    dateMode: taskDateMode,
    dateFrom,
    dateTo,
  }), [dateFrom, dateTo, effectiveAccountId, selectedCampusId, taskDateMode])

  const dashboardQuery = useAdvisorTaskDashboard(queryParams, true)
  const detailQuery = useAdvisorTaskDetail(
    drawerVisible ? (activeRow?.advisorId ?? null) : null,
    queryParams,
    drawerVisible && Boolean(activeRow),
  )
  const actions = useAdvisorTaskActions(queryParams)

  const generatedAtLabel = formatGeneratedAt(dashboardQuery.data.generatedAt)
  const currentRecordId = detailQuery.data?.row.recordId ?? null
  const currentAdvisorId = detailQuery.data?.row.advisorId ?? activeRow?.advisorId ?? null
  const actionsReady = Boolean(
    currentRecordId &&
    currentAdvisorId &&
    detailQuery.isFetched &&
    !detailQuery.isFetching,
  )

  const statusCounts = useMemo(() => ({
    all: getStatusFilterCount(dashboardQuery.data.rows, 'all'),
    pending_review: getStatusFilterCount(dashboardQuery.data.rows, 'pending_review'),
    failed: getStatusFilterCount(dashboardQuery.data.rows, 'failed'),
    qualified: getStatusFilterCount(dashboardQuery.data.rows, 'qualified'),
  }), [dashboardQuery.data.rows])

  const filteredRows = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase()

    return [...dashboardQuery.data.rows]
      .filter((row) => matchesStatusFilter(row, statusFilter))
      .filter((row) => {
        if (!trimmedKeyword) return true
        const haystack = [row.advisorName, row.campusName || '']
          .join(' ')
          .toLowerCase()
        return haystack.includes(trimmedKeyword)
      })
      .sort((left, right) => {
        const statusDiff = getStatusRank(left) - getStatusRank(right)
        if (statusDiff !== 0) return statusDiff

        const penaltyDiff = right.suggestedPenaltyAmount - left.suggestedPenaltyAmount
        if (penaltyDiff !== 0) return penaltyDiff

        return right.connectedCount - left.connectedCount
      })
  }, [dashboardQuery.data.rows, keyword, statusFilter])

  const dateDisplayText = dateFrom === dateTo ? dateFrom : `${dateFrom} 至 ${dateTo}`
  const isRangeReadonly = taskDateMode === 'range'

  const handleRefresh = async () => {
    await dashboardQuery.refetch()
    if (drawerVisible && activeRow) {
      await detailQuery.refetch()
    }
  }

  const handleOpenDrawer = (row: AdvisorTaskRow) => {
    setActiveRow(row)
    setDrawerVisible(true)
  }

  const handleCloseDrawer = () => {
    setDrawerVisible(false)
    setActiveRow(null)
  }

  const handleManualEntrySubmit = (payload: AdvisorTaskManualEntryPayload) => {
    if (!actionsReady || !currentRecordId || !currentAdvisorId) return
    actions.manualEntryMutation.mutate({ recordId: currentRecordId, advisorId: currentAdvisorId, payload })
  }

  const handleManualReviewSubmit = (payload: AdvisorTaskManualReviewPayload) => {
    if (!actionsReady || !currentRecordId || !currentAdvisorId) return
    actions.manualReviewMutation.mutate({ recordId: currentRecordId, advisorId: currentAdvisorId, payload })
  }

  return (
    <>
      <DataTableLayout
        title="任务战情"
        total={filteredRows.length}
        allowPageScroll
        contentMinHeight={720}
        contentOverflowVisible
        onRefresh={() => { void handleRefresh() }}
        isRefreshing={dashboardQuery.isRefetching}
        toolbar={(
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              flexWrap: 'wrap',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-bg-0)',
            }}
          >
            {!externalFilter && (
              <FilterField label="校区">
                <Select
                  value={selectedCampusId}
                  onChange={(value) => setSelectedCampusId(value as string)}
                  optionList={campusOptions}
                  style={{ width: 160 }}
                />
              </FilterField>
            )}

            {!externalFilter && isSuperUser && accountOptions.length > 1 && (
              <FilterField label="云客账号">
                <Select
                  value={effectiveAccountId || undefined}
                  onChange={(value) => setSelectedAccountId(value as string)}
                  optionList={accountOptions}
                  loading={isAccountsLoading}
                  style={{ width: 160 }}
                />
              </FilterField>
            )}

            {!externalFilter && (
              <>
                <FilterField label="日期模式">
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
                    style={{ width: 120 }}
                  />
                </FilterField>

                {dateMode === 'single' && (
                  <FilterField label="指定日期">
                    <DatePicker
                      type="date"
                      value={selectedDate}
                      onChange={(date) => {
                        if (date) setSelectedDate(date as Date)
                      }}
                      style={{ width: 160 }}
                    />
                  </FilterField>
                )}

                {dateMode === 'range' && (
                  <FilterField label="日期区间">
                    <DatePicker
                      type="dateRange"
                      value={selectedRange}
                      onChange={(date) => {
                        if (Array.isArray(date) && date[0] && date[1]) {
                          setSelectedRange(date as [Date, Date])
                        }
                      }}
                      style={{ width: 260 }}
                    />
                  </FilterField>
                )}

                {(dateMode === 'week' || dateMode === 'month') && (
                  <FilterField label={dateMode === 'week' ? '本周区间' : '本月区间'}>
                    <div
                      style={{
                        height: 32,
                        borderRadius: 6,
                        border: '1px solid var(--semi-color-border)',
                        background: 'var(--semi-color-fill-0)',
                        display: 'flex',
                        alignItems: 'center',
                        paddingInline: 12,
                        color: 'var(--semi-color-text-0)',
                        fontSize: 13,
                        fontWeight: 500,
                        minWidth: 200,
                      }}
                    >
                      {dateDisplayText}
                    </div>
                  </FilterField>
                )}
              </>
            )}

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Tag size="small" style={{ margin: 0, borderRadius: 999, background: '#eff6ff', color: '#1e3a8a', border: 'none', fontWeight: 600, paddingInline: 10 }}>
                {dashboardQuery.data.dateLabel || dateDisplayText}
              </Tag>
              <Tag size="small" style={{ margin: 0, borderRadius: 999, background: 'var(--semi-color-fill-0)', color: 'var(--semi-color-text-2)', border: '1px solid var(--semi-color-border)', fontWeight: 500, paddingInline: 10 }}>
                {selectedAccountLabel}
              </Tag>
              {generatedAtLabel && (
                <Tag size="small" style={{ margin: 0, borderRadius: 999, background: 'var(--semi-color-fill-0)', color: 'var(--semi-color-text-2)', border: '1px solid var(--semi-color-border)', fontWeight: 500, paddingInline: 10 }}>
                  {generatedAtLabel}
                </Tag>
              )}
            </div>
          </div>
        )}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 16,
            overflow: 'visible',
          }}
        >
          {/* 任务总览指标表 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <AdvisorTaskOverviewTable
              summary={dashboardQuery.data.summary}
              loading={dashboardQuery.isLoading || isAccountsLoading}
            />
          </motion.div>

          {/* 规则说明横幅 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-fill-0)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text type="tertiary" size="small" style={{ lineHeight: 1.7 }}>
                A-D 任一命中即自动达标；截图、微信、朋友圈等项进入主管确认。
                {isRangeReadonly ? ' 区间汇总仅查看。' : ''}
              </Text>
              <span style={{ display: 'inline-flex', gap: 4 }}>
                <Tag size="small" style={{ margin: 0, borderRadius: 999, background: '#dcfce7', color: '#166534', border: 'none', paddingInline: 8, fontSize: 11 }}>自动达标</Tag>
                <Tag size="small" style={{ margin: 0, borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', border: 'none', paddingInline: 8, fontSize: 11 }}>人工达标</Tag>
                <Tag size="small" style={{ margin: 0, borderRadius: 999, background: '#fff7ed', color: '#c2410c', border: 'none', paddingInline: 8, fontSize: 11 }}>待确认</Tag>
                <Tag size="small" style={{ margin: 0, borderRadius: 999, background: 'var(--semi-color-fill-0)', color: 'var(--semi-color-text-2)', border: '1px solid var(--semi-color-border)', paddingInline: 8, fontSize: 11 }}>未完成</Tag>
              </span>
            </div>
          </motion.div>

          {dashboardQuery.serviceUnavailable && (
            <Banner
              fullMode={false}
              type="warning"
              bordered
              title="任务考核数据加载失败"
              description="请先确认后端接口可用，再刷新战情页。当前页面只展示已缓存结果。"
            />
          )}

          {/* 顾问任务矩阵 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusFilterButton active={statusFilter === 'all'} label="全部" count={statusCounts.all} onClick={() => setStatusFilter('all')} />
                <StatusFilterButton active={statusFilter === 'pending_review'} label="待审核" count={statusCounts.pending_review} onClick={() => setStatusFilter('pending_review')} />
                <StatusFilterButton active={statusFilter === 'failed'} label="未达标" count={statusCounts.failed} onClick={() => setStatusFilter('failed')} />
                <StatusFilterButton active={statusFilter === 'qualified'} label="已达标" count={statusCounts.qualified} onClick={() => setStatusFilter('qualified')} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Input
                  prefix={<Search size={14} />}
                  value={keyword}
                  onChange={(value) => setKeyword(value)}
                  placeholder="搜索顾问或校区"
                  showClear
                  style={{ width: 220 }}
                />
                <Tag
                  size="small"
                  color="white"
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    border: '1px solid var(--semi-color-border)',
                    background: 'var(--semi-color-fill-0)',
                    color: 'var(--semi-color-text-2)',
                    fontWeight: 600,
                    paddingInline: 10,
                  }}
                >
                  {filteredRows.length} / {dashboardQuery.data.rows.length} 位顾问
                </Tag>
              </div>
            </div>

            {dashboardQuery.isLoading ? (
              <AdvisorTaskMatrix
                rows={[]}
                loading
                onViewDetail={handleOpenDrawer}
                onOpenReview={handleOpenDrawer}
              />
            ) : filteredRows.length === 0 ? (
              <div
                style={{
                  borderRadius: 14,
                  border: '1px dashed var(--semi-color-border)',
                  background: 'var(--semi-color-fill-0)',
                  padding: '36px 24px',
                }}
              >
                <Empty
                  image={<ClipboardCheck size={36} style={{ color: '#94a3b8' }} />}
                  title="当前筛选下没有顾问任务记录"
                  description="尝试切换日期、校区或状态筛选后再查看。"
                />
              </div>
            ) : (
              <AdvisorTaskMatrix
                rows={filteredRows}
                loading={dashboardQuery.isLoading}
                onViewDetail={handleOpenDrawer}
                onOpenReview={handleOpenDrawer}
              />
            )}
          </motion.div>
        </div>
      </DataTableLayout>

      <AdvisorTaskReviewDrawer
        open={drawerVisible}
        selectedRow={activeRow}
        detail={detailQuery.data}
        loading={detailQuery.isLoading || detailQuery.isFetching}
        actionsReady={actionsReady}
        onClose={handleCloseDrawer}
        onSubmitManualEntry={handleManualEntrySubmit}
        onSubmitReview={handleManualReviewSubmit}
        manualEntryLoading={actions.manualEntryMutation.isPending}
        manualReviewLoading={actions.manualReviewMutation.isPending}
      />
    </>
  )
}
