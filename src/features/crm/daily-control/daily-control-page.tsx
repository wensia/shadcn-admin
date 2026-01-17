/**
 * 日控表主页面
 * 包含诺到、到访、缴费三个 Tab
 */

import { useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePickerSingle } from '@/components/date-picker'
import { UserCheck, CalendarCheck, Wallet } from 'lucide-react'
import { PromisedVisitTab } from './components/promised-visit-tab'
import { ActualVisitTab } from './components/actual-visit-tab'
import { PaymentTab } from './components/payment-tab'

type DailyControlTab = 'promised' | 'visited' | 'payment'

// 获取本月第一天
const getMonthStartStr = () => format(startOfMonth(new Date()), 'yyyy-MM-dd')
// 获取本月最后一天
const getMonthEndStr = () => format(endOfMonth(new Date()), 'yyyy-MM-dd')

export function DailyControlPage() {
  useDocumentTitle('日控表')
  const [activeTab, setActiveTab] = useState<DailyControlTab>('promised')
  const [dateRange, setDateRange] = useState<{ from: string | undefined; to: string | undefined }>({
    from: getMonthStartStr(),
    to: getMonthEndStr(),
  })

  return (
    <Main fixed className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as DailyControlTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Tabs 和日期筛选器 */}
          <div className="flex flex-shrink-0 items-center justify-between gap-4">
            <TabsList className="w-fit">
              <TabsTrigger value="promised" className="gap-1.5">
                <UserCheck className="h-4 w-4" />
                诺到
              </TabsTrigger>
              <TabsTrigger value="visited" className="gap-1.5">
                <CalendarCheck className="h-4 w-4" />
                到访
              </TabsTrigger>
              <TabsTrigger value="payment" className="gap-1.5">
                <Wallet className="h-4 w-4" />
                缴费
              </TabsTrigger>
            </TabsList>

            {/* 共享日期范围筛选器 */}
            <DateRangePickerSingle
              value={dateRange}
              onChange={setDateRange}
              placeholder="选择日期范围"
            />
          </div>

          <TabsContent value="promised" className="mt-4 flex-1 overflow-auto">
            <PromisedVisitTab dateFrom={dateRange.from} dateTo={dateRange.to} />
          </TabsContent>

          <TabsContent value="visited" className="mt-4 flex-1 overflow-auto">
            <ActualVisitTab dateFrom={dateRange.from} dateTo={dateRange.to} />
          </TabsContent>

          <TabsContent value="payment" className="mt-4 flex-1 overflow-auto">
            <PaymentTab dateFrom={dateRange.from} dateTo={dateRange.to} />
          </TabsContent>
        </Tabs>
      </div>
    </Main>
  )
}
