/**
 * 日历视图组件 - 优化版
 * 左侧 3/4 展示日历网格
 * 右侧 1/4 展示选中日期的详细线索列表
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { leadsApi } from '@/features/crm/leads/api'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { Badge } from '@/components/ui/badge'

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // 获取待回访线索
  const { data: allPendingLeads, isLoading } = useQuery({
    queryKey: ['workbench-calendar-pending'],
    queryFn: async () => {
      const response = await leadsApi.getPendingFollowupLeads({
        size: 1000,
      })
      return response.data?.items || []
    },
  })

  // 计算日历显示的日期范围
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { locale: zhCN })
    const endDate = endOfWeek(monthEnd, { locale: zhCN })

    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    })
  }, [currentMonth])

  // 将线索按日期分组
  const leadsByDate = useMemo(() => {
    const map = new Map<string, typeof allPendingLeads>()
    if (!allPendingLeads) return map

    allPendingLeads.forEach((lead) => {
      if (lead.next_followup_at) {
        const dateKey = format(parseISO(lead.next_followup_at), 'yyyy-MM-dd')
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, lead])
      }
    })

    // 排序
    map.forEach((leads) => {
      leads.sort((a, b) => {
        const timeA = a.next_followup_at ? new Date(a.next_followup_at).getTime() : 0
        const timeB = b.next_followup_at ? new Date(b.next_followup_at).getTime() : 0
        return timeA - timeB
      })
    })

    return map
  }, [allPendingLeads])

  // 获取选中日期的线索
  const selectedDateLeads = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return leadsByDate.get(dateKey) || []
  }, [selectedDate, leadsByDate])

  const handleLeadClick = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation()
    setSelectedLeadId(leadId)
    setDetailSheetOpen(true)
  }

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {/* 左侧日历区域 (占 3/4) */}
      <div className="col-span-3 flex flex-col gap-4 bg-background p-4 rounded-lg border shadow-sm h-full">
        {/* 头部导航 */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              {format(currentMonth, 'yyyy年 MM月', { locale: zhCN })}
            </h2>
            <div className="flex items-center rounded-md border bg-muted/20 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="h-4 w-[1px] bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              今天
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              加载中...
            </div>
          )}
        </div>

        {/* 日历网格 */}
        <div className="flex-1 flex flex-col min-h-0 border rounded-md overflow-hidden text-sm">
          {/* 星期表头 */}
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0"
              >
                周{day}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-background">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayLeads = leadsByDate.get(dateKey) || []
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isTodayDate = isToday(day)
              const isSelected = isSameDay(day, selectedDate)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex flex-col p-2 transition-all cursor-pointer min-h-[100px]",
                    "border-b border-r hover:bg-accent/5",
                    !isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
                    isSelected && "bg-primary/5 ring-1 ring-inset ring-primary z-10",
                    (index + 1) % 7 === 0 && "border-r-0",
                  )}
                >
                  {/* 日期数字 */}
                  <div className="flex items-center justify-between pointer-events-none mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                        isTodayDate
                          ? "bg-primary text-primary-foreground"
                          : isSelected
                            ? "text-primary font-bold"
                            : "text-foreground/70"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayLeads.length > 0 && (
                      <span className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded-full",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {dayLeads.length}
                      </span>
                    )}
                  </div>

                  {/* 简略线索条 (最多显示3条, 剩下的显示+N) */}
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayLeads.slice(0, 4).map((lead) => {
                      const timeStr = lead.next_followup_at
                        ? format(parseISO(lead.next_followup_at), 'HH:mm')
                        : ''
                      return (
                        <div
                          key={lead.id}
                          className={cn(
                            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] truncate",
                            isSelected
                              ? "bg-primary/20 text-primary-foreground dark:text-primary-foreground"
                              : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                          )}
                        >
                          <span className="font-mono opacity-80 shrink-0">{timeStr}</span>
                          <span className="truncate">{lead.child_name || lead.parent_name}</span>
                        </div>
                      )
                    })}
                    {dayLeads.length > 4 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        还有 {dayLeads.length - 4} 条...
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 右侧详情列表 (占 1/4) */}
      <div className="col-span-1 flex flex-col bg-background rounded-lg border shadow-sm overflow-hidden h-full">
        <div className="p-4 border-b bg-muted/10 flex-shrink-0">
          <h3 className="font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {format(selectedDate, 'MM月dd日', { locale: zhCN })}
            <span className="text-muted-foreground font-normal text-sm">
              周{format(selectedDate, 'EE', { locale: zhCN })}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            共 {selectedDateLeads.length} 个待回访客户
          </p>
        </div>

        <ScrollArea className="flex-1 p-2">
          {selectedDateLeads.length > 0 ? (
            <div className="flex flex-col gap-2">
              {selectedDateLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={(e) => handleLeadClick(e, lead.id)}
                  className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm truncate">
                      {lead.child_name || '未命名'}
                      {lead.grade && <span className="text-xs text-muted-foreground ml-2 font-normal">{lead.grade}</span>}
                    </div>
                    {lead.next_followup_at && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 font-mono shrink-0">
                        {format(parseISO(lead.next_followup_at), 'HH:mm')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{lead.parent_name}</span>
                    <span className="w-px h-3 bg-border mx-1" />
                    <span>{lead.status}</span>
                  </div>

                  {lead.notes && (
                    <div className="text-xs text-muted-foreground/70 bg-muted/30 p-1.5 rounded line-clamp-2">
                      {lead.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
              <Clock className="w-12 h-12 opacity-10 mb-2" />
              <p className="text-sm">今日无待跟进计划</p>
            </div>
          )}
        </ScrollArea>
      </div>

      <LeadDetailSheet
        leadId={selectedLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  )
}
