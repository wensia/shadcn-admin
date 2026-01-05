/**
 * 咨询工作台主页面
 * 包含日历、今日待办、统计三个 Tab
 */

import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, ClipboardList, BarChart3 } from 'lucide-react'
import { CalendarView } from './components/calendar-tab/calendar-view'
import { TodayLeadsView } from './components/today-tab/today-leads-view'
import { StatisticsView } from './components/statistics-tab/statistics-view'
import type { WorkbenchTab } from './types'

export function WorkbenchPage() {
  useDocumentTitle('咨询工作台')
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('calendar')

  return (
    <Main fixed className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* 页面标题 */}
        <div className="flex flex-shrink-0 items-end justify-between">
          <div>
            <h1 className="text-lg font-bold">咨询工作台</h1>
            <p className="text-xs text-muted-foreground">管理您的日常跟进任务</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as WorkbenchTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="w-fit">
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              日历
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              今日待办
            </TabsTrigger>
            <TabsTrigger value="statistics" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              统计
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4 flex-1 overflow-auto">
            <CalendarView />
          </TabsContent>

          <TabsContent value="today" className="mt-4 flex-1 overflow-auto">
            <TodayLeadsView />
          </TabsContent>

          <TabsContent value="statistics" className="mt-4 flex-1 overflow-auto">
            <StatisticsView />
          </TabsContent>
        </Tabs>
      </div>
    </Main>
  )
}
