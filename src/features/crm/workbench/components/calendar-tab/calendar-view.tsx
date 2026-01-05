/**
 * 日历视图组件
 * 展示月历，日期上显示待跟进线索数量
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, parseISO, isSameDay, isWithinInterval } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { leadsApi } from '@/features/crm/leads/api'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { FollowupDayButton } from './followup-day-button'
import { DayLeadsList } from './day-leads-list'

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // 获取待回访线索（包含 next_followup_at）
  const { data: allPendingLeads, isLoading } = useQuery({
    queryKey: ['workbench-calendar-pending'],
    queryFn: async () => {
      const response = await leadsApi.getPendingFollowupLeads({
        size: 500,
      })
      return response.data?.items || []
    },
  })

  // 按日期分组统计（只统计当月的）
  const dateCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (allPendingLeads) {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      allPendingLeads.forEach((lead) => {
        if (lead.next_followup_at) {
          const followupDate = parseISO(lead.next_followup_at)
          if (isWithinInterval(followupDate, { start: monthStart, end: monthEnd })) {
            const dateKey = format(followupDate, 'yyyy-MM-dd')
            map[dateKey] = (map[dateKey] || 0) + 1
          }
        }
      })
    }
    return map
  }, [allPendingLeads, currentMonth])

  // 获取选中日期的线索
  const selectedDateLeads = useMemo(() => {
    if (!selectedDate || !allPendingLeads) return []
    return allPendingLeads.filter((lead) => {
      if (!lead.next_followup_at) return false
      return isSameDay(parseISO(lead.next_followup_at), selectedDate)
    })
  }, [selectedDate, allPendingLeads])

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId)
    setDetailSheetOpen(true)
  }

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 日历 */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[350px]">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              onMonthChange={handleMonthChange}
              locale={zhCN}
              className="w-full"
              classNames={{
                months: 'flex flex-col',
                month: 'w-full',
                table: 'w-full border-collapse',
                head_row: 'flex w-full',
                head_cell: 'flex-1 text-muted-foreground text-center text-sm font-normal py-2',
                row: 'flex w-full',
                cell: 'flex-1 text-center relative p-0.5',
                day: 'w-full h-12 p-0',
              }}
              components={{
                DayButton: (props) => (
                  <FollowupDayButton
                    {...props}
                    followupCount={dateCountMap[format(props.day.date, 'yyyy-MM-dd')] || 0}
                  />
                ),
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* 选中日期的线索列表 */}
      <Card>
        <DayLeadsList
          date={selectedDate}
          leads={selectedDateLeads}
          onLeadClick={handleLeadClick}
        />
      </Card>

      {/* 线索详情抽屉 */}
      <LeadDetailSheet
        leadId={selectedLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  )
}
