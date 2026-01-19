/**
 * 日控表主页面
 * 简洁商务风格 - 基于 Anthropic 品牌色彩系统
 */

import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { DateRangePickerSingle } from '@/components/date-picker'
import {
  UserCheck,
  CalendarCheck,
  Wallet,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PromisedVisitTab } from './components/promised-visit-tab'
import { ActualVisitTab } from './components/actual-visit-tab'
import { PaymentTab } from './components/payment-tab'
import { CalendarTab } from './components/calendar-tab'
import { getVisitSchedules, getPayments } from './api'
import { tabThemes, brandColors, type TabType } from './theme'

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

  // 获取统计数据
  const { data: promisedStats } = useQuery({
    queryKey: ['daily-control-stats-promised', dateRange.from, dateRange.to],
    queryFn: async () => {
      const result = await getVisitSchedules({
        page: 1,
        size: 1,
        status: 'scheduled',
        visit_date_from: dateRange.from,
        visit_date_to: dateRange.to,
      }) as any
      return result?.total || 0
    },
  })

  const { data: visitedStats } = useQuery({
    queryKey: ['daily-control-stats-visited', dateRange.from, dateRange.to],
    queryFn: async () => {
      const result = await getVisitSchedules({
        page: 1,
        size: 1,
        status: 'visited',
        visit_date_from: dateRange.from,
        visit_date_to: dateRange.to,
      }) as any
      return result?.total || 0
    },
  })

  const { data: paymentStats } = useQuery({
    queryKey: ['daily-control-stats-payment', dateRange.from, dateRange.to],
    queryFn: async () => {
      const result = await getPayments({
        page: 1,
        size: 1,
        status: 'confirmed',
        date_from: dateRange.from,
        date_to: dateRange.to,
      }) as any
      return result?.total || 0
    },
  })

  // 计算转化率
  const conversionRate = useMemo(() => {
    const promised = promisedStats || 0
    const visited = visitedStats || 0
    if (promised === 0) return 0
    return Math.round((visited / (promised + visited)) * 100)
  }, [promisedStats, visitedStats])

  // Tab 配置
  const tabs = [
    { id: 'promised' as const, icon: UserCheck, label: '诺到', count: promisedStats },
    { id: 'visited' as const, icon: CalendarCheck, label: '到访', count: visitedStats },
    { id: 'payment' as const, icon: Wallet, label: '缴费', count: paymentStats },
    { id: 'calendar' as const, icon: Calendar, label: '日历', count: null },
  ]

  // 统计卡片配置
  const statCards = [
    {
      id: 'promised',
      icon: UserCheck,
      label: '诺到预约',
      value: promisedStats,
      color: brandColors.orange,
    },
    {
      id: 'visited',
      icon: CalendarCheck,
      label: '实际到访',
      value: visitedStats,
      color: brandColors.blue,
    },
    {
      id: 'payment',
      icon: Wallet,
      label: '成功缴费',
      value: paymentStats,
      color: brandColors.green,
    },
    {
      id: 'rate',
      icon: TrendingUp,
      label: '到访转化率',
      value: `${conversionRate}%`,
      color: brandColors.midGray,
    },
  ]

  return (
    <Main fixed className="min-h-0">
      {/* 页面容器 */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">

        {/* 顶部统计栏 - 紧凑内联样式 */}
        <div className="flex-shrink-0 flex items-center gap-6">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.id} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-[#141413] dark:text-slate-100">
                    {card.value ?? '-'}
                  </span>
                  <span className="text-xs text-[#b0aea5] dark:text-slate-400">
                    {card.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabs 区域 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Tab 导航栏 - 简洁风格 */}
          <div className="flex flex-shrink-0 items-center justify-between gap-4 pb-1">
            {/* Tab 按钮组 */}
            <div className="flex items-center border-b border-[#e8e6dc] dark:border-slate-800">
              {tabs.map((tab) => {
                const theme = tabThemes[tab.id]
                const isActive = activeTab === tab.id
                const Icon = tab.icon

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                      'border-b-2 -mb-[1px]',
                      isActive ? [
                        'border-[#141413] dark:border-slate-100',
                        'text-[#141413] dark:text-slate-100',
                      ] : [
                        'border-transparent',
                        'text-[#b0aea5] dark:text-slate-500',
                        'hover:text-[#141413] dark:hover:text-slate-300',
                      ]
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4',
                      isActive ? 'text-[#141413] dark:text-slate-100' : 'text-[#b0aea5]'
                    )} />
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count > 0 && (
                      <span className={cn(
                        'min-w-[20px] h-5 px-1.5 rounded text-xs font-medium flex items-center justify-center',
                        isActive
                          ? 'bg-[#141413] text-white dark:bg-slate-100 dark:text-slate-900'
                          : 'bg-[#e8e6dc] text-[#b0aea5] dark:bg-slate-800 dark:text-slate-500'
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* 日期选择器 */}
            {activeTab !== 'calendar' && (
              <DateRangePickerSingle
                value={dateRange}
                onChange={setDateRange}
                placeholder="选择日期范围"
              />
            )}
          </div>

          {/* Tab 内容区域 */}
          <TabsContent value="promised" className="mt-4 flex-1 overflow-auto">
            <PromisedVisitTab dateFrom={dateRange.from} dateTo={dateRange.to} />
          </TabsContent>

          <TabsContent value="visited" className="mt-4 flex-1 overflow-auto">
            <ActualVisitTab dateFrom={dateRange.from} dateTo={dateRange.to} />
          </TabsContent>

          <TabsContent value="payment" className="mt-4 flex-1 overflow-auto">
            <PaymentTab dateFrom={dateRange.from} dateTo={dateRange.to} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4 flex-1 overflow-hidden">
            <CalendarTab dateFrom={dateRange.from} dateTo={dateRange.to} />
          </TabsContent>
        </Tabs>
      </div>
    </Main>
  )
}
