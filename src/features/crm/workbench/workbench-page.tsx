/**
 * 咨询工作台主页面
 * 包含日历、今日待办、统计三个 Tab
 */

import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Tabs, TabPane } from '@douyinfe/semi-ui-19'
import { IconCalendar, IconList, IconHistogram } from '@douyinfe/semi-icons'
import { CalendarView } from './components/calendar-tab/calendar-view'
import { TodayLeadsView } from './components/today-tab/today-leads-view'
import { StatisticsView } from './components/statistics-tab/statistics-view'
import type { WorkbenchTab } from './types'

export function WorkbenchPage() {
  useDocumentTitle('咨询工作台')
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('calendar')

  return (
    <Main fixed style={{ minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Tabs
          type="line"
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as WorkbenchTab)}
          tabPaneMotion={false}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          tabBarStyle={{ flexShrink: 0 }}
          contentStyle={{ flex: 1, minHeight: 0, overflow: 'hidden', paddingTop: 16, display: 'flex', flexDirection: 'column' }}
        >
          <TabPane
            tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconCalendar size="small" />日历</span>}
            itemKey="calendar"
          >
            <CalendarView />
          </TabPane>
          <TabPane
            tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconList size="small" />今日待办</span>}
            itemKey="today"
          >
            <TodayLeadsView />
          </TabPane>
          <TabPane
            tab={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconHistogram size="small" />统计</span>}
            itemKey="statistics"
          >
            <StatisticsView />
          </TabPane>
        </Tabs>
      </div>
    </Main>
  )
}
