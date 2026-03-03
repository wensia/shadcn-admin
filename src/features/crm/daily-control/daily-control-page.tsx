/**
 * 日控表主页面 - Semi Design 版
 * 简洁商务风格 - 基于 Semi Design 官方配色
 */

import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Select, DatePicker } from '@douyinfe/semi-ui-19'
import {
  IconUserGroup,
  IconCalendarClock,
  IconCreditCard,
  IconCalendar,
  IconHistogram,
  IconArrowUp,
} from '@douyinfe/semi-icons'
import { PromisedVisitTab } from './components/promised-visit-tab'
import { ActualVisitTab } from './components/actual-visit-tab'
import { PaymentTab } from './components/payment-tab'
import { CalendarTab } from './components/calendar-tab'
import { ReportTab } from './components/report-tab'
import { getVisitSchedules, getPayments } from './api'
import { brandColors, type TabType } from './theme'
import { apiClient } from '@/lib/api/client'

const { RangePicker } = DatePicker

// 获取本月第一天
const getMonthStartStr = () => format(startOfMonth(new Date()), 'yyyy-MM-dd')
// 获取本月最后一天
const getMonthEndStr = () => format(endOfMonth(new Date()), 'yyyy-MM-dd')

export function DailyControlPage() {
  useDocumentTitle('日控表')
  const [activeTab, setActiveTab] = useState<TabType>('promised')
  const [dateRange, setDateRange] = useState<{ from: string | undefined; to: string | undefined }>({
    from: getMonthStartStr(),
    to: getMonthEndStr(),
  })
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')

  // 获取校区列表
  const { data: campusesData } = useQuery({
    queryKey: ['campuses-for-daily-control'],
    queryFn: async () => {
      const response = await apiClient.get('/organization/campuses/simple')
      return response.data || []
    },
  })

  const campuses = campusesData || []

  // 获取当前选中的校区ID（用于传递给子组件）
  const creatorCampusId = selectedCampusId === 'all' ? undefined : selectedCampusId

  // 获取统计数据
  const { data: promisedStats } = useQuery({
    queryKey: ['daily-control-stats-promised', dateRange.from, dateRange.to, creatorCampusId],
    queryFn: async () => {
      const result = await getVisitSchedules({
        page: 1,
        size: 1,
        status: 'scheduled',
        visit_date_from: dateRange.from,
        visit_date_to: dateRange.to,
        creator_campus_id: creatorCampusId,
      })
      return result.data?.total ?? 0
    },
  })

  const { data: visitedStats } = useQuery({
    queryKey: ['daily-control-stats-visited', dateRange.from, dateRange.to, creatorCampusId],
    queryFn: async () => {
      const result = await getVisitSchedules({
        page: 1,
        size: 1,
        status: 'visited',
        visit_date_from: dateRange.from,
        visit_date_to: dateRange.to,
        creator_campus_id: creatorCampusId,
      })
      return result.data?.total ?? 0
    },
  })

  const { data: paymentStats } = useQuery({
    queryKey: ['daily-control-stats-payment', dateRange.from, dateRange.to, creatorCampusId],
    queryFn: async () => {
      const result = await getPayments({
        page: 1,
        size: 1,
        status: 'confirmed',
        date_from: dateRange.from,
        date_to: dateRange.to,
        creator_campus_id: creatorCampusId,
      })
      return result.data?.total ?? 0
    },
  })

  // 计算转化率
  const conversionRate = useMemo(() => {
    const promised = promisedStats || 0
    const visited = visitedStats || 0
    if (promised === 0) return 0
    return Math.round((visited / (promised + visited)) * 100)
  }, [promisedStats, visitedStats])

  // 统计卡片配置
  const statCards = [
    { id: 'promised', icon: IconUserGroup, label: '诺到预约', value: promisedStats, color: brandColors.orange },
    { id: 'visited', icon: IconCalendarClock, label: '实际到访', value: visitedStats, color: brandColors.blue },
    { id: 'payment', icon: IconCreditCard, label: '成功缴费', value: paymentStats, color: brandColors.green },
    { id: 'rate', icon: IconArrowUp, label: '到访转化率', value: `${conversionRate}%`, color: brandColors.midGray },
  ]

  // Tab 配置
  const tabConfig: { id: TabType; icon: React.ReactNode; label: string; count: number | null }[] = [
    { id: 'promised', icon: <IconUserGroup size="small" />, label: '诺到', count: promisedStats ?? null },
    { id: 'visited', icon: <IconCalendarClock size="small" />, label: '到访', count: visitedStats ?? null },
    { id: 'payment', icon: <IconCreditCard size="small" />, label: '缴费', count: paymentStats ?? null },
    { id: 'calendar', icon: <IconCalendar size="small" />, label: '日历', count: null },
    { id: 'report', icon: <IconHistogram size="small" />, label: '报表', count: null },
  ]

  // 处理日期范围变化
  const handleDateRangeChange = (dateStrings: string[]) => {
    if (dateStrings && dateStrings.length === 2) {
      setDateRange({ from: dateStrings[0], to: dateStrings[1] })
    }
  }

  // 解析日期范围为 Date[]
  const dateRangeValue = useMemo(() => {
    if (dateRange.from && dateRange.to) {
      return [new Date(dateRange.from), new Date(dateRange.to)] as [Date, Date]
    }
    return undefined
  }, [dateRange.from, dateRange.to])

  // 校区选项
  const campusOptions = [
    { value: 'all', label: '全部校区' },
    ...campuses.map((campus: { id: string; name: string }) => ({
      value: campus.id,
      label: campus.name,
    })),
  ]

  return (
    <Main fixed style={{ minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 20, overflow: 'hidden' }}>

        {/* 顶部统计栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: `${card.color}15`,
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ color: card.color }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
                    {card.value ?? '-'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                    {card.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabs 区域 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Tab 导航栏 + 筛选器 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 4, flexShrink: 0 }}>
            {/* Tab 按钮组 */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e8e6dc' }}>
              {tabConfig.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <Button
                    key={tab.id}
                    theme="borderless"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', fontSize: 14, fontWeight: 500,
                      transition: 'color 0.15s',
                      borderBottom: `2px solid ${isActive ? 'var(--semi-color-text-0)' : 'transparent'}`,
                      marginBottom: -1,
                      color: isActive ? 'var(--semi-color-text-0)' : 'var(--semi-color-text-2)',
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count > 0 && (
                      <span style={{
                        minWidth: 20, height: 20, padding: '0 6px',
                        borderRadius: 4, fontSize: 12, fontWeight: 500,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive ? 'var(--semi-color-text-0)' : '#e8e6dc',
                        color: isActive ? '#fff' : 'var(--semi-color-text-2)',
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </Button>
                )
              })}
            </div>

            {/* 筛选器 */}
            {activeTab !== 'calendar' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Select
                  value={selectedCampusId}
                  onChange={(v) => setSelectedCampusId(v as string)}
                  optionList={campusOptions}
                  style={{ width: 140 }}
                />
                <RangePicker
                  value={dateRangeValue}
                  onChange={(_date, dateStrings) => handleDateRangeChange(dateStrings as string[])}
                  style={{ width: 260 }}
                  density="compact"
                />
              </div>
            )}
          </div>

          {/* Tab 内容区域 */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', paddingTop: 16 }}>
            {activeTab === 'promised' && (
              <PromisedVisitTab dateFrom={dateRange.from} dateTo={dateRange.to} creatorCampusId={creatorCampusId} />
            )}
            {activeTab === 'visited' && (
              <ActualVisitTab dateFrom={dateRange.from} dateTo={dateRange.to} creatorCampusId={creatorCampusId} />
            )}
            {activeTab === 'payment' && (
              <PaymentTab dateFrom={dateRange.from} dateTo={dateRange.to} creatorCampusId={creatorCampusId} />
            )}
            {activeTab === 'calendar' && (
              <CalendarTab dateFrom={dateRange.from} dateTo={dateRange.to} creatorCampusId={creatorCampusId} />
            )}
            {activeTab === 'report' && (
              <ReportTab dateFrom={dateRange.from} dateTo={dateRange.to} />
            )}
          </div>
        </div>
      </div>
    </Main>
  )
}
