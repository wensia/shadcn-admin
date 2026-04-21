/**
 * 顾问数据中心
 * 合并了「顾问看板」、「通话统计」、「任务战情」三个页面
 * 共享顶部筛选工具栏（日期模式、校区、云客账号）
 * Tab 状态通过 URL search param ?tab=xxx 驱动
 */

import { useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  DatePicker,
  Select,
  Tabs,
  TabPane,
  Typography,
} from '@douyinfe/semi-ui-19'
import { Calendar } from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { adminApi } from '@/features/admin/api'
import { yunkeCredentialsApi } from '@/features/yunke/api'
import { useIsSuperUser } from '@/stores/auth-store'
import { AdvisorDashboardPage } from './advisor-dashboard-page'
import { AdvisorFollowupAnalysisPage } from './advisor-followup-analysis-page'
import { AdvisorTaskBattlePage } from './advisor-task-battle-page'
import { CallStatsTab } from './consulting-statistics-page'
import {
  calculateDateFrom,
  calculateDateTo,
  type DateMode,
} from './utils/date-filter'

const { Text } = Typography

type TabKey = 'overview' | 'call-stats' | 'tasks' | 'followup-analysis'

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

export function AdvisorCenterPage() {
  useDocumentTitle('顾问数据中心')

  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/crm/advisor-center' })
  const activeTab: TabKey = (search.tab as TabKey) ?? 'overview'

  const isSuperUser = useIsSuperUser()
  const today = useMemo(() => new Date(), [])

  // 共享筛选状态
  const [dateMode, setDateMode] = useState<DateMode>('today')
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [selectedRange, setSelectedRange] = useState<[Date, Date]>([today, today])
  const [selectedCampusId, setSelectedCampusId] = useState('all')
  const [selectedAccountId, setSelectedAccountId] = useState('')

  // 校区选项
  const { data: campusesData } = useQuery({
    queryKey: ['advisor-center-campuses-simple'],
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

  // 云客账号选项（仅超级用户）
  const { data: accountsData } = useQuery({
    queryKey: ['advisor-center-yunke-accounts'],
    queryFn: () => yunkeCredentialsApi.getCredentials({ status: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
    enabled: isSuperUser,
  })
  const accountOptions = useMemo(() => {
    const accounts = accountsData?.items || []
    return accounts.map((account) => ({
      value: account.id,
      label: account.company_name || account.phone,
    }))
  }, [accountsData])

  // 派生日期
  const dateFrom = useMemo(
    () => calculateDateFrom(dateMode, today, selectedDate, selectedRange),
    [dateMode, selectedDate, selectedRange, today],
  )
  const dateTo = useMemo(
    () => calculateDateTo(dateMode, today, selectedDate, selectedRange),
    [dateMode, selectedDate, selectedRange, today],
  )
  const dateDisplayText = dateFrom === dateTo ? dateFrom : `${dateFrom} 至 ${dateTo}`

  const handleTabChange = (key: string) => {
    void navigate({
      to: '/crm/advisor-center',
      search: { tab: key as TabKey },
      replace: true,
    })
  }

  // 传给各 Tab 的共享筛选 props
  const sharedFilter = useMemo(() => ({
    dateMode,
    selectedDate,
    selectedRange,
    selectedCampusId,
    selectedAccountId,
    dateFrom,
    dateTo,
  }), [dateMode, selectedDate, selectedRange, selectedCampusId, selectedAccountId, dateFrom, dateTo])

  return (
    <DataTableLayout
      title="顾问数据中心"
      allowPageScroll
      contentMinHeight={600}
      contentOverflowVisible
      toolbar={(
        <Card
          style={{
            borderRadius: 14,
            border: '1px solid var(--semi-color-border)',
            background: 'var(--semi-color-bg-0)',
            marginBottom: 4,
          }}
          bodyStyle={{ padding: 14 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 当前口径 badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: '#eff6ff',
                  color: '#1e3a8a',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Calendar size={13} />
                当前口径：
                {dateDisplayText}
              </div>
            </div>

            {/* 筛选控件行 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <FilterField label="校区">
                <Select
                  value={selectedCampusId}
                  onChange={(v) => setSelectedCampusId(v as string)}
                  optionList={campusOptions}
                  style={{ width: 160 }}
                />
              </FilterField>

              {isSuperUser && accountOptions.length > 1 && (
                <FilterField label="云客账号">
                  <Select
                    value={selectedAccountId || accountOptions[0]?.value || undefined}
                    onChange={(v) => setSelectedAccountId(v as string)}
                    optionList={accountOptions}
                    placeholder="选择云客账号"
                    style={{ width: 180 }}
                  />
                </FilterField>
              )}

              <FilterField label="日期模式">
                <Select
                  value={dateMode}
                  onChange={(v) => setDateMode(v as DateMode)}
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
                    onChange={(d) => { if (d) setSelectedDate(d as Date) }}
                    style={{ width: 160 }}
                  />
                </FilterField>
              )}

              {dateMode === 'range' && (
                <FilterField label="日期区间">
                  <DatePicker
                    type="dateRange"
                    value={selectedRange}
                    onChange={(d) => {
                      if (Array.isArray(d) && d[0] && d[1]) setSelectedRange(d as [Date, Date])
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
                      minWidth: 180,
                    }}
                  >
                    {dateDisplayText}
                  </div>
                </FilterField>
              )}
            </div>
          </div>
        </Card>
      )}
    >
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="line"
        style={{ flex: 1 }}
        tabBarStyle={{ paddingInline: 16 }}
        keepDOM={false}
      >
        <TabPane tab="综合看板" itemKey="overview">
          <AdvisorDashboardPage externalFilter={sharedFilter} />
        </TabPane>
        <TabPane tab="通话统计" itemKey="call-stats">
          <CallStatsTab externalFilter={sharedFilter} />
        </TabPane>
        <TabPane tab="任务战情" itemKey="tasks">
          <AdvisorTaskBattlePage externalFilter={sharedFilter} />
        </TabPane>
        <TabPane tab="跟进分析" itemKey="followup-analysis">
          <AdvisorFollowupAnalysisPage externalFilter={sharedFilter} />
        </TabPane>
      </Tabs>
    </DataTableLayout>
  )
}
