/**
 * 日控表日历视图组件
 * 简洁商务风格 - 基于 Anthropic 品牌色彩系统
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  addWeeks,
  subWeeks,
  parseISO,
  isToday,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  User,
  Wallet,
  GraduationCap,
  MapPin,
  ChevronRight as ArrowRight,
  UserCheck,
  CalendarCheck,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { getVisitSchedules, getPayments } from '../api'
import type { VisitScheduleItem, PaymentItem } from '../api'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { brandColors } from '../theme'

interface CalendarTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

// 日历项类型
interface CalendarItem {
  id: string
  type: 'promised' | 'visited' | 'payment'
  date: string
  time?: string
  name: string
  amount?: number
  courseName?: string
  advisorName?: string
  gradeDisplay?: string
  sourceChannel?: string
  sourceExtra?: string
  raw: VisitScheduleItem | PaymentItem
}

// 简洁的类型配置 - 使用品牌色
const typeConfig = {
  promised: {
    label: '诺到',
    icon: UserCheck,
    color: brandColors.orange,
    dot: 'bg-[#d97757]',
    text: 'text-[#d97757]',
    bgSubtle: 'bg-[#d97757]/5',
    bgLight: 'bg-[#d97757]/10',
    border: 'border-[#d97757]/20',
  },
  visited: {
    label: '到访',
    icon: CalendarCheck,
    color: brandColors.blue,
    dot: 'bg-[#6a9bcc]',
    text: 'text-[#6a9bcc]',
    bgSubtle: 'bg-[#6a9bcc]/5',
    bgLight: 'bg-[#6a9bcc]/10',
    border: 'border-[#6a9bcc]/20',
  },
  payment: {
    label: '缴费',
    icon: Wallet,
    color: brandColors.green,
    dot: 'bg-[#788c5d]',
    text: 'text-[#788c5d]',
    bgSubtle: 'bg-[#788c5d]/5',
    bgLight: 'bg-[#788c5d]/10',
    border: 'border-[#788c5d]/20',
  },
}

export function CalendarTab({ dateFrom, dateTo, creatorCampusId }: CalendarTabProps) {
  const initialMonth = useMemo(() => {
    if (dateFrom) {
      return parseISO(dateFrom)
    }
    return new Date()
  }, [dateFrom])

  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week') // 默认周视图

  // 筛选器状态
  const [showPromised, setShowPromised] = useState(true)
  const [showVisited, setShowVisited] = useState(true)
  const [showPayment, setShowPayment] = useState(true)

  // 线索详情抽屉状态
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // 计算当前月份的日期范围
  const monthRange = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
    }
  }, [currentMonth])

  // 获取数据
  const { data: promisedData, isLoading: isLoadingPromised, error: promisedError } = useQuery({
    queryKey: ['calendar-promised', monthRange.from, monthRange.to, creatorCampusId],
    queryFn: async () => {
      const response = await getVisitSchedules({
        page: 1,
        size: 100,
        status: 'scheduled',
        visit_date_from: monthRange.from,
        visit_date_to: monthRange.to,
        creator_campus_id: creatorCampusId,
      }) as any
      if (response && response.success === false) {
        throw new Error(response.message || '获取诺到数据失败')
      }
      return response?.items || []
    },
    enabled: showPromised,
  })

  const { data: visitedData, isLoading: isLoadingVisited, error: visitedError } = useQuery({
    queryKey: ['calendar-visited', monthRange.from, monthRange.to, creatorCampusId],
    queryFn: async () => {
      const response = await getVisitSchedules({
        page: 1,
        size: 100,
        status: 'visited',
        visit_date_from: monthRange.from,
        visit_date_to: monthRange.to,
        creator_campus_id: creatorCampusId,
      }) as any
      if (response && response.success === false) {
        throw new Error(response.message || '获取到访数据失败')
      }
      return response?.items || []
    },
    enabled: showVisited,
  })

  const { data: paymentData, isLoading: isLoadingPayment, error: paymentError } = useQuery({
    queryKey: ['calendar-payment', monthRange.from, monthRange.to, creatorCampusId],
    queryFn: async () => {
      const response = await getPayments({
        page: 1,
        size: 100,
        date_from: monthRange.from,
        date_to: monthRange.to,
        status: 'confirmed',
        creator_campus_id: creatorCampusId,
      }) as any
      if (response && response.success === false) {
        throw new Error(response.message || '获取缴费数据失败')
      }
      return response?.items || []
    },
    enabled: showPayment,
  })

  const isLoading = isLoadingPromised || isLoadingVisited || isLoadingPayment

  // 错误处理
  useEffect(() => {
    if (promisedError) toast.error((promisedError as Error).message)
  }, [promisedError])

  useEffect(() => {
    if (visitedError) toast.error((visitedError as Error).message)
  }, [visitedError])

  useEffect(() => {
    if (paymentError) toast.error((paymentError as Error).message)
  }, [paymentError])

  // 合并数据
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()

    if (showPromised && promisedData) {
      promisedData.forEach((item) => {
        const dateKey = item.visit_date
        const calendarItem: CalendarItem = {
          id: item.id,
          type: 'promised',
          date: dateKey,
          time: item.visit_time?.slice(0, 5),
          name: item.student_name || item.child_name || '未知',
          courseName: item.course_names?.join(', '),
          advisorName: item.advisor_name,
          gradeDisplay: item.grade_display,
          sourceChannel: item.source_channel_name,
          sourceExtra: item.source_extra,
          raw: item,
        }
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, calendarItem])
      })
    }

    if (showVisited && visitedData) {
      visitedData.forEach((item) => {
        const dateKey = item.visit_date
        const calendarItem: CalendarItem = {
          id: item.id,
          type: 'visited',
          date: dateKey,
          time: item.visit_time?.slice(0, 5),
          name: item.student_name || item.child_name || '未知',
          courseName: item.course_names?.join(', '),
          advisorName: item.advisor_name,
          gradeDisplay: item.grade_display,
          sourceChannel: item.source_channel_name,
          sourceExtra: item.source_extra,
          raw: item,
        }
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, calendarItem])
      })
    }

    if (showPayment && paymentData) {
      paymentData.forEach((item) => {
        const dateKey = item.payment_at.split('T')[0]
        const timeStr = item.payment_at.includes('T')
          ? item.payment_at.split('T')[1]?.slice(0, 5)
          : undefined
        const calendarItem: CalendarItem = {
          id: item.id,
          type: 'payment',
          date: dateKey,
          time: timeStr,
          name: item.child_name || '未知',
          amount: item.amount,
          courseName: item.course_name,
          advisorName: item.advisor_name,
          gradeDisplay: item.grade_display,
          sourceChannel: item.source_channel_name,
          sourceExtra: item.source_extra,
          raw: item,
        }
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, calendarItem])
      })
    }

    map.forEach((items) => {
      items.sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0))
    })

    return map
  }, [promisedData, visitedData, paymentData, showPromised, showVisited, showPayment])

  const calendarDays = useMemo(() => {
    if (viewMode === 'week') {
      // 周视图：只显示选中日期所在的那一周
      const weekStart = startOfWeek(selectedDate, { locale: zhCN })
      const weekEnd = endOfWeek(selectedDate, { locale: zhCN })
      return eachDayOfInterval({ start: weekStart, end: weekEnd })
    }
    // 月视图
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { locale: zhCN })
    const endDate = endOfWeek(monthEnd, { locale: zhCN })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth, selectedDate, viewMode])

  const selectedDateItems = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return itemsByDate.get(dateKey) || []
  }, [selectedDate, itemsByDate])

  const stats = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const items = itemsByDate.get(dateKey) || []
    return {
      promised: items.filter((i) => i.type === 'promised').length,
      visited: items.filter((i) => i.type === 'visited').length,
      payment: items.filter((i) => i.type === 'payment').length,
      total: items.length,
    }
  }, [selectedDate, itemsByDate])

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevWeek = () => setSelectedDate(subWeeks(selectedDate, 1))
  const nextWeek = () => setSelectedDate(addWeeks(selectedDate, 1))
  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }

  // 获取当前周的日期范围显示
  const weekRangeDisplay = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { locale: zhCN })
    const weekEnd = endOfWeek(selectedDate, { locale: zhCN })
    return `${format(weekStart, 'MM/dd', { locale: zhCN })} - ${format(weekEnd, 'MM/dd', { locale: zhCN })}`
  }, [selectedDate])

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  const filters = [
    { key: 'promised' as const, show: showPromised, setShow: setShowPromised },
    { key: 'visited' as const, show: showVisited, setShow: setShowVisited },
    { key: 'payment' as const, show: showPayment, setShow: setShowPayment },
  ]

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 顶部筛选栏 - 简洁风格 */}
      <div className="flex items-center justify-between flex-shrink-0">
        {/* 左侧筛选器 */}
        <div className="flex items-center gap-1 border-b border-[#e8e6dc] dark:border-slate-800">
          {filters.map(({ key, show, setShow }) => {
            const config = typeConfig[key]
            return (
              <button
                key={key}
                onClick={() => setShow(!show)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
                  'border-b-2 -mb-[1px]',
                  show ? [
                    'border-[#141413] dark:border-slate-100',
                    'text-[#141413] dark:text-slate-100',
                  ] : [
                    'border-transparent',
                    'text-[#b0aea5] dark:text-slate-500',
                    'hover:text-[#141413] dark:hover:text-slate-300',
                  ]
                )}
              >
                <span
                  className={cn('w-2 h-2 rounded-full', show ? config.dot : 'bg-[#e8e6dc]')}
                />
                <span>{config.label}</span>
              </button>
            )
          })}
        </div>

        {/* 右侧导航 */}
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-[#b0aea5]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">加载中</span>
            </div>
          )}

          {/* 视图切换 */}
          <div className="flex items-center rounded-lg border border-[#e8e6dc] dark:border-slate-800 bg-[#faf9f5] dark:bg-slate-900 p-0.5">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                viewMode === 'week'
                  ? 'bg-[#d97757] text-white'
                  : 'text-[#b0aea5] hover:text-[#141413]'
              )}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              周
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                viewMode === 'month'
                  ? 'bg-[#d97757] text-white'
                  : 'text-[#b0aea5] hover:text-[#141413]'
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              月
            </button>
          </div>

          <button
            onClick={goToToday}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              'bg-[#141413] text-white dark:bg-slate-100 dark:text-slate-900',
              'hover:bg-[#141413]/90 dark:hover:bg-slate-200'
            )}
          >
            今天
          </button>

          <div className="flex items-center rounded-lg border border-[#e8e6dc] dark:border-slate-800 bg-[#faf9f5] dark:bg-slate-900">
            <button
              onClick={viewMode === 'week' ? prevWeek : prevMonth}
              className="p-2 hover:bg-[#e8e6dc]/50 dark:hover:bg-slate-800 transition-colors rounded-l-lg"
            >
              <ChevronLeft className="h-4 w-4 text-[#b0aea5]" />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-1.5 w-[180px] border-x border-[#e8e6dc] dark:border-slate-800 hover:bg-[#e8e6dc]/30 dark:hover:bg-slate-800/30 transition-colors">
                  {viewMode === 'week' ? (
                    <div className="flex items-center justify-between text-sm font-medium text-[#141413] dark:text-slate-200">
                      <span>{format(startOfWeek(selectedDate, { locale: zhCN }), 'yy-MM-dd')}</span>
                      <span className="text-[#b0aea5] mx-1">~</span>
                      <span>{format(endOfWeek(selectedDate, { locale: zhCN }), 'yy-MM-dd')}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-[#141413] dark:text-slate-200">
                      {format(currentMonth, 'yy-MM', { locale: zhCN })}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <div className="p-2 border-b border-[#e8e6dc] dark:border-slate-800">
                  <button
                    onClick={() => {
                      const today = new Date()
                      setSelectedDate(today)
                      setCurrentMonth(today)
                    }}
                    className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-[#d97757] text-white hover:bg-[#d97757]/90 transition-colors"
                  >
                    今天
                  </button>
                </div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      setCurrentMonth(date)
                    }
                  }}
                  locale={zhCN}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={viewMode === 'week' ? nextWeek : nextMonth}
              className="p-2 hover:bg-[#e8e6dc]/50 dark:hover:bg-slate-800 transition-colors rounded-r-lg"
            >
              <ChevronRight className="h-4 w-4 text-[#b0aea5]" />
            </button>
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="grid grid-cols-4 gap-4 flex-1 min-h-0">
        {/* 左侧日历区域 */}
        <div className="col-span-3 flex flex-col rounded-xl border border-[#e8e6dc] dark:border-slate-800 bg-[#faf9f5] dark:bg-slate-900 h-full overflow-hidden">
          {/* 星期表头 */}
          <div className="grid grid-cols-7 border-b border-[#e8e6dc] dark:border-slate-800 flex-shrink-0">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={cn(
                  'py-3 text-center text-xs font-medium',
                  index === 5 || index === 6
                    ? 'text-[#d97757]/70'
                    : 'text-[#b0aea5]'
                )}
              >
                周{day}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className={cn(
            'flex-1 grid grid-cols-7 overflow-auto',
            viewMode === 'week' ? 'auto-rows-[1fr]' : 'auto-rows-fr'
          )}>
            {calendarDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayItems = itemsByDate.get(dateKey) || []
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isTodayDate = isToday(day)
              const isSelected = isSameDay(day, selectedDate)
              const isWeekend = index % 7 === 5 || index % 7 === 6

              const promisedCount = dayItems.filter((i) => i.type === 'promised').length
              const visitedCount = dayItems.filter((i) => i.type === 'visited').length
              const paymentCount = dayItems.filter((i) => i.type === 'payment').length
              const hasData = dayItems.length > 0

              // 周视图显示更多记录，月视图只显示2条
              const maxItems = viewMode === 'week' ? 10 : 2

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'relative flex flex-col p-2 transition-colors cursor-pointer',
                    'border-b border-r border-[#e8e6dc]/50 dark:border-slate-800/50',
                    viewMode === 'month' && 'min-h-[90px]',
                    viewMode === 'week' && !isCurrentMonth && 'bg-white dark:bg-slate-900',
                    viewMode === 'month' && !isCurrentMonth && 'bg-[#e8e6dc]/20 dark:bg-slate-950/30',
                    isCurrentMonth && 'bg-white dark:bg-slate-900',
                    isWeekend && isCurrentMonth && 'bg-[#faf9f5] dark:bg-slate-900/50',
                    isSelected && 'bg-[#141413]/5 dark:bg-slate-100/5 ring-1 ring-inset ring-[#141413]/20 dark:ring-slate-100/20',
                    !isSelected && 'hover:bg-[#e8e6dc]/30 dark:hover:bg-slate-800/30',
                    (index + 1) % 7 === 0 && 'border-r-0'
                  )}
                >
                  {/* 日期数字 + 统计胶囊 */}
                  <div className="flex items-center justify-between mb-1 flex-shrink-0">
                    <span className={cn(
                      'w-6 h-6 flex items-center justify-center rounded text-sm font-medium shrink-0',
                      isTodayDate && 'bg-[#d97757] text-white',
                      !isTodayDate && isSelected && 'text-[#141413] dark:text-slate-100 font-semibold',
                      !isTodayDate && !isSelected && isCurrentMonth && 'text-[#141413]/70 dark:text-slate-300',
                      !isTodayDate && !isSelected && !isCurrentMonth && 'text-[#b0aea5]/50 dark:text-slate-600'
                    )}>
                      {format(day, 'd')}
                    </span>

                    {hasData && (
                      <div className="flex items-center gap-1">
                        {promisedCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#d97757]/15 text-[#d97757] text-xs font-medium">
                            {promisedCount}
                          </span>
                        )}
                        {visitedCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#6a9bcc]/15 text-[#6a9bcc] text-xs font-medium">
                            {visitedCount}
                          </span>
                        )}
                        {paymentCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#788c5d]/15 text-[#788c5d] text-xs font-medium">
                            {paymentCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 记录列表 */}
                  {dayItems.length > 0 && (
                    <div className={cn(
                      'flex flex-col gap-0.5 flex-1 min-h-0',
                      viewMode === 'week' ? 'overflow-auto' : 'overflow-hidden'
                    )}>
                      {dayItems.slice(0, maxItems).map((item) => {
                        const config = typeConfig[item.type]
                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            className={cn(
                              'flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] shrink-0',
                              config.bgSubtle
                            )}
                          >
                            <span className={cn('truncate font-medium max-w-[50%]', config.text)}>
                              {item.name}
                            </span>
                            {item.advisorName && (
                              <span className="text-[#b0aea5] truncate text-right shrink-0 max-w-[45%]">
                                {item.advisorName}
                              </span>
                            )}
                          </div>
                        )
                      })}
                      {dayItems.length > maxItems && (
                        <span className="text-[10px] text-[#b0aea5] pl-1 shrink-0">
                          +{dayItems.length - maxItems}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 右侧详情列表 */}
        <div className="col-span-1 flex flex-col rounded-xl border border-[#e8e6dc] dark:border-slate-800 bg-[#faf9f5] dark:bg-slate-900 overflow-hidden h-full">
          {/* 头部 */}
          <div className="p-4 border-b border-[#e8e6dc] dark:border-slate-800 flex-shrink-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-[#141413] dark:text-slate-100">
                {format(selectedDate, 'd')}
              </span>
              <span className="text-sm text-[#b0aea5]">
                {format(selectedDate, 'MM月', { locale: zhCN })}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#e8e6dc]/50 dark:bg-slate-800 text-[#b0aea5] font-medium">
                周{format(selectedDate, 'EEEE', { locale: zhCN }).replace('星期', '')}
              </span>
            </div>

            {/* 统计 */}
            <div className="flex items-center gap-2 mt-2">
              {stats.promised > 0 && (
                <span className="text-xs text-[#d97757]">诺到 {stats.promised}</span>
              )}
              {stats.visited > 0 && (
                <span className="text-xs text-[#6a9bcc]">到访 {stats.visited}</span>
              )}
              {stats.payment > 0 && (
                <span className="text-xs text-[#788c5d]">缴费 {stats.payment}</span>
              )}
              {stats.total === 0 && (
                <span className="text-xs text-[#b0aea5]">暂无记录</span>
              )}
            </div>
          </div>

          {/* 卡片列表 */}
          <ScrollArea className="flex-1">
            <div className="p-3">
              {selectedDateItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedDateItems.map((item) => {
                    const config = typeConfig[item.type]
                    const Icon = config.icon

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => {
                          setSelectedLeadId(item.raw.lead_id)
                          setDetailSheetOpen(true)
                        }}
                        className={cn(
                          'group flex overflow-hidden rounded-lg cursor-pointer',
                          'bg-white dark:bg-slate-900/80 border border-[#e8e6dc] dark:border-slate-800',
                          'hover:border-[#b0aea5] dark:hover:border-slate-700 transition-colors'
                        )}
                      >
                        {/* 左侧色条 */}
                        <div
                          className="w-1 shrink-0"
                          style={{ backgroundColor: config.color }}
                        />

                        {/* 内容 */}
                        <div className="flex-1 p-3 min-w-0">
                          {/* 顶部 */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="shrink-0 w-6 h-6 rounded flex items-center justify-center"
                                style={{ backgroundColor: `${config.color}15` }}
                              >
                                <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-sm text-[#141413] dark:text-slate-100 truncate">
                                  {item.name}
                                </h4>
                                <span className="text-[10px] text-[#b0aea5]">
                                  {config.label}
                                </span>
                              </div>
                            </div>
                            {item.time && (
                              <span className="shrink-0 text-xs font-mono text-[#b0aea5] bg-[#e8e6dc]/50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {item.time}
                              </span>
                            )}
                          </div>

                          {/* 缴费金额 */}
                          {item.type === 'payment' && item.amount !== undefined && (
                            <div className="mb-1.5 text-sm font-semibold text-[#788c5d]">
                              ¥{item.amount.toLocaleString()}
                            </div>
                          )}

                          {/* 标签 */}
                          <div className="flex flex-wrap items-center gap-1">
                            {item.advisorName && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#b0aea5] bg-[#e8e6dc]/30 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                <User className="w-2.5 h-2.5" />
                                {item.advisorName}
                              </span>
                            )}
                            {item.gradeDisplay && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#b0aea5] bg-[#e8e6dc]/30 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                <GraduationCap className="w-2.5 h-2.5" />
                                {item.gradeDisplay}
                              </span>
                            )}
                            {item.sourceChannel && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#b0aea5] bg-[#e8e6dc]/30 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                {item.sourceChannel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 箭头 */}
                        <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-[#b0aea5]" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarIcon className="w-10 h-10 text-[#e8e6dc] dark:text-slate-700 mb-3" />
                  <p className="text-sm text-[#b0aea5]">当日暂无记录</p>
                  <p className="text-xs text-[#b0aea5]/70 mt-1">选择其他日期查看</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* 线索详情抽屉 */}
      <LeadDetailSheet
        leadId={selectedLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  )
}
