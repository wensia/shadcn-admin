/**
 * 日控表日历视图组件 - Semi Design 版
 * 简洁商务风格 - 基于 Semi Design 官方配色
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Toast, Button, Spin, RadioGroup, Radio } from '@douyinfe/semi-ui-19'
import { IconChevronLeft, IconChevronRight, IconCalendar, IconUser } from '@douyinfe/semi-icons'
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
import { getVisitSchedules, getPayments, type VisitScheduleItem, type PaymentItem } from '../api'
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

// 类型配置
const typeConfig = {
  promised: { label: '诺到', color: brandColors.orange },
  visited: { label: '到访', color: brandColors.blue },
  payment: { label: '缴费', color: brandColors.green },
}

export function CalendarTab({ dateFrom, dateTo: _dateTo, creatorCampusId }: CalendarTabProps) {
  const initialMonth = useMemo(() => {
    if (dateFrom) return parseISO(dateFrom)
    return new Date()
  }, [dateFrom])

  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week')

  const [showPromised, setShowPromised] = useState(true)
  const [showVisited, setShowVisited] = useState(true)
  const [showPayment, setShowPayment] = useState(true)

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  const monthRange = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') }
  }, [currentMonth])

  const { data: promisedData, isLoading: isLoadingPromised, error: promisedError } = useQuery({
    queryKey: ['calendar-promised', monthRange.from, monthRange.to, creatorCampusId],
    queryFn: async () => {
      const response = await getVisitSchedules({
        page: 1, size: 100, status: 'scheduled',
        visit_date_from: monthRange.from, visit_date_to: monthRange.to,
        creator_campus_id: creatorCampusId,
      })
      if (response && response.success === false) throw new Error(response.message || '获取诺到数据失败')
      return response.data?.items ?? []
    },
    enabled: showPromised,
  })

  const { data: visitedData, isLoading: isLoadingVisited, error: visitedError } = useQuery({
    queryKey: ['calendar-visited', monthRange.from, monthRange.to, creatorCampusId],
    queryFn: async () => {
      const response = await getVisitSchedules({
        page: 1, size: 100, status: 'visited',
        visit_date_from: monthRange.from, visit_date_to: monthRange.to,
        creator_campus_id: creatorCampusId,
      })
      if (response && response.success === false) throw new Error(response.message || '获取到访数据失败')
      return response.data?.items ?? []
    },
    enabled: showVisited,
  })

  const { data: paymentData, isLoading: isLoadingPayment, error: paymentError } = useQuery({
    queryKey: ['calendar-payment', monthRange.from, monthRange.to, creatorCampusId],
    queryFn: async () => {
      const response = await getPayments({
        page: 1, size: 100, date_from: monthRange.from, date_to: monthRange.to,
        status: 'confirmed', creator_campus_id: creatorCampusId,
      })
      if (response && response.success === false) throw new Error(response.message || '获取缴费数据失败')
      return response.data?.items ?? []
    },
    enabled: showPayment,
  })

  const isLoading = isLoadingPromised || isLoadingVisited || isLoadingPayment

  useEffect(() => { if (promisedError) Toast.error((promisedError as Error).message) }, [promisedError])
  useEffect(() => { if (visitedError) Toast.error((visitedError as Error).message) }, [visitedError])
  useEffect(() => { if (paymentError) Toast.error((paymentError as Error).message) }, [paymentError])

  // 合并数据
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()

    if (showPromised && promisedData) {
      promisedData.forEach((item) => {
        const dateKey = item.visit_date
        const calendarItem: CalendarItem = {
          id: item.id, type: 'promised', date: dateKey,
          time: item.visit_time?.slice(0, 5),
          name: item.student_name || item.child_name || '未知',
          courseName: item.course_names?.join(', '),
          advisorName: item.advisor_name,
          gradeDisplay: item.grade_display,
          sourceChannel: item.source_channel_name,
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
          id: item.id, type: 'visited', date: dateKey,
          time: item.visit_time?.slice(0, 5),
          name: item.student_name || item.child_name || '未知',
          courseName: item.course_names?.join(', '),
          advisorName: item.advisor_name,
          gradeDisplay: item.grade_display,
          raw: item,
        }
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, calendarItem])
      })
    }

    if (showPayment && paymentData) {
      paymentData.forEach((item) => {
        const dateKey = item.payment_at.split('T')[0]
        const timeStr = item.payment_at.includes('T') ? item.payment_at.split('T')[1]?.slice(0, 5) : undefined
        const calendarItem: CalendarItem = {
          id: item.id, type: 'payment', date: dateKey,
          time: timeStr, name: item.child_name || '未知',
          amount: item.amount, courseName: item.course_name,
          advisorName: item.advisor_name,
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
      const weekStart = startOfWeek(selectedDate, { locale: zhCN })
      const weekEnd = endOfWeek(selectedDate, { locale: zhCN })
      return eachDayOfInterval({ start: weekStart, end: weekEnd })
    }
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
  const goToToday = () => { const today = new Date(); setCurrentMonth(today); setSelectedDate(today) }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  const filters = [
    { key: 'promised' as const, show: showPromised, setShow: setShowPromised },
    { key: 'visited' as const, show: showVisited, setShow: setShowVisited },
    { key: 'payment' as const, show: showPayment, setShow: setShowPayment },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* 顶部筛选栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        {/* 左侧筛选器 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid #e8e6dc' }}>
            {filters.map(({ key, show, setShow }) => {
              const config = typeConfig[key]
              return (
                <Button
                  key={key}
                  theme="borderless"
                  onClick={() => setShow(!show)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', fontSize: 14, fontWeight: 500,
                    borderBottom: `2px solid ${show ? 'var(--semi-color-text-0)' : 'transparent'}`,
                    marginBottom: -1,
                    color: show ? 'var(--semi-color-text-0)' : 'var(--semi-color-text-2)',
                    borderRadius: 0,
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: show ? config.color : '#e8e6dc',
                  }} />
                  <span>{config.label}</span>
                </Button>
              )
            })}
          </div>

        {/* 右侧导航 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isLoading && <Spin size="small" />}

          {/* 视图切换 */}
          <RadioGroup
            type="button"
            buttonSize="small"
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value as 'month' | 'week')}
          >
            <Radio value="week">周</Radio>
            <Radio value="month">月</Radio>
          </RadioGroup>

          <Button theme="solid" size="small" onClick={goToToday} style={{ background: 'var(--semi-color-text-0)' }}>今天</Button>

          <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, border: '1px solid #e8e6dc', background: '#faf9f5' }}>
            <Button
              theme="borderless"
              icon={<IconChevronLeft style={{ color: '#86909c' }} />}
              onClick={viewMode === 'week' ? prevWeek : prevMonth}
              style={{ padding: 8, borderRadius: '8px 0 0 8px' }}
            />
            <span style={{
              padding: '6px 12px', width: 180, textAlign: 'center',
              borderLeft: '1px solid #e8e6dc', borderRight: '1px solid #e8e6dc',
              fontSize: 14, fontWeight: 500, color: 'var(--semi-color-text-0)',
            }}>
              {viewMode === 'week'
                ? `${format(startOfWeek(selectedDate, { locale: zhCN }), 'yy-MM-dd')} ~ ${format(endOfWeek(selectedDate, { locale: zhCN }), 'yy-MM-dd')}`
                : format(currentMonth, 'yy-MM', { locale: zhCN })
              }
            </span>
            <Button
              theme="borderless"
              icon={<IconChevronRight style={{ color: '#86909c' }} />}
              onClick={viewMode === 'week' ? nextWeek : nextMonth}
              style={{ padding: 8, borderRadius: '0 8px 8px 0' }}
            />
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* 左侧日历区域 */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          borderRadius: 12, border: '1px solid #e8e6dc',
          background: '#faf9f5', height: '100%', overflow: 'hidden',
        }}>
          {/* 星期表头 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e8e6dc', flexShrink: 0 }}>
            {weekDays.map((day, index) => (
              <div
                key={day}
                style={{
                  padding: '12px 0', textAlign: 'center', fontSize: 12, fontWeight: 500,
                  color: (index === 5 || index === 6) ? 'rgba(255, 125, 0, 0.7)' : '#86909c',
                }}
              >
                周{day}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div style={{
            flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            gridAutoRows: viewMode === 'week' ? '1fr' : undefined,
            overflow: 'auto',
          }}>
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

              const maxItems = viewMode === 'week' ? 10 : 2

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  style={{
                    position: 'relative', display: 'flex', flexDirection: 'column',
                    padding: 8, cursor: 'pointer', overflow: 'hidden',
                    borderBottom: '1px solid rgba(134, 144, 156, 0.1)',
                    borderRight: (index + 1) % 7 === 0 ? 'none' : '1px solid rgba(134, 144, 156, 0.1)',
                    minHeight: viewMode === 'month' ? 90 : undefined,
                    background: !isCurrentMonth ? 'rgba(134, 144, 156, 0.04)'
                      : isSelected ? 'rgba(20, 20, 19, 0.05)'
                        : isWeekend ? '#faf9f5'
                          : '#fff',
                    outline: isSelected ? '1px solid rgba(20, 20, 19, 0.2)' : 'none',
                    outlineOffset: -1,
                    zIndex: isSelected ? 1 : 0,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* 日期数字 + 统计胶囊 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
                    <span style={{
                      width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 4, fontSize: 14, fontWeight: 500,
                      ...(isTodayDate
                        ? { background: '#ff7d00', color: '#fff' }
                        : isSelected
                          ? { color: 'var(--semi-color-text-0)', fontWeight: 600 }
                          : { color: !isCurrentMonth ? 'rgba(134, 144, 156, 0.5)' : 'rgba(20, 20, 19, 0.7)' }
                      ),
                    }}>
                      {format(day, 'd')}
                    </span>

                    {dayItems.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {promisedCount > 0 && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 20, height: 20, padding: '0 6px',
                            borderRadius: 10, background: 'rgba(255, 125, 0, 0.15)',
                            color: '#ff7d00', fontSize: 12, fontWeight: 500,
                          }}>{promisedCount}</span>
                        )}
                        {visitedCount > 0 && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 20, height: 20, padding: '0 6px',
                            borderRadius: 10, background: 'rgba(106, 155, 204, 0.15)',
                            color: '#6a9bcc', fontSize: 12, fontWeight: 500,
                          }}>{visitedCount}</span>
                        )}
                        {paymentCount > 0 && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 20, height: 20, padding: '0 6px',
                            borderRadius: 10, background: 'rgba(0, 180, 42, 0.15)',
                            color: '#00b42a', fontSize: 12, fontWeight: 500,
                          }}>{paymentCount}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 记录列表 */}
                  {dayItems.length > 0 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 2,
                      flex: 1, minHeight: 0,
                      overflow: viewMode === 'week' ? 'auto' : 'hidden',
                    }}>
                      {dayItems.slice(0, maxItems).map((item) => {
                        const config = typeConfig[item.type]
                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '2px 6px', borderRadius: 4,
                              fontSize: 10, flexShrink: 0,
                              background: `${config.color}08`,
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, maxWidth: '50%', color: config.color }}>
                              {item.name}
                            </span>
                            {item.advisorName && (
                              <span style={{ color: 'var(--semi-color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', flexShrink: 0, maxWidth: '45%' }}>
                                {item.advisorName}
                              </span>
                            )}
                          </div>
                        )
                      })}
                      {dayItems.length > maxItems && (
                        <span style={{ fontSize: 10, color: 'var(--semi-color-text-2)', paddingLeft: 4, flexShrink: 0 }}>
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
        <div style={{
          display: 'flex', flexDirection: 'column',
          borderRadius: 12, border: '1px solid #e8e6dc',
          background: '#faf9f5', overflow: 'hidden', height: '100%',
        }}>
          {/* 头部 */}
          <div style={{ padding: 16, borderBottom: '1px solid #e8e6dc', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
                {format(selectedDate, 'd')}
              </span>
              <span style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>
                {format(selectedDate, 'MM月', { locale: zhCN })}
              </span>
              <span style={{
                fontSize: 12, padding: '2px 8px', borderRadius: 4,
                background: 'rgba(134, 144, 156, 0.1)', color: 'var(--semi-color-text-2)', fontWeight: 500,
              }}>
                周{format(selectedDate, 'EEEE', { locale: zhCN }).replace('星期', '')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              {stats.promised > 0 && <span style={{ fontSize: 12, color: '#ff7d00' }}>诺到 {stats.promised}</span>}
              {stats.visited > 0 && <span style={{ fontSize: 12, color: '#6a9bcc' }}>到访 {stats.visited}</span>}
              {stats.payment > 0 && <span style={{ fontSize: 12, color: '#00b42a' }}>缴费 {stats.payment}</span>}
              {stats.total === 0 && <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>暂无记录</span>}
            </div>
          </div>

          {/* 卡片列表 */}
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {selectedDateItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedDateItems.map((item) => {
                  const config = typeConfig[item.type]
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => {
                        setSelectedLeadId(item.raw.lead_id)
                        setDetailSheetOpen(true)
                      }}
                      style={{
                        display: 'flex', overflow: 'hidden', borderRadius: 8,
                        cursor: 'pointer', background: '#fff',
                        border: '1px solid #e8e6dc',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#86909c' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e6dc' }}
                    >
                      {/* 左侧色条 */}
                      <div style={{ width: 4, flexShrink: 0, backgroundColor: config.color }} />

                      {/* 内容 */}
                      <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <div style={{
                              flexShrink: 0, width: 24, height: 24, borderRadius: 4,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              backgroundColor: `${config.color}15`,
                            }}>
                              <IconUser size="extra-small" style={{ color: config.color }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ fontWeight: 500, fontSize: 14, color: 'var(--semi-color-text-0)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.name}
                              </h4>
                              <span style={{ fontSize: 10, color: 'var(--semi-color-text-2)' }}>{config.label}</span>
                            </div>
                          </div>
                          {item.time && (
                            <span style={{
                              flexShrink: 0, fontSize: 12, fontFamily: 'monospace',
                              color: 'var(--semi-color-text-2)', background: 'rgba(134, 144, 156, 0.1)',
                              padding: '2px 6px', borderRadius: 4,
                            }}>
                              {item.time}
                            </span>
                          )}
                        </div>

                        {item.type === 'payment' && item.amount !== undefined && (
                          <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#00b42a' }}>
                            ¥{item.amount.toLocaleString()}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                          {item.advisorName && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, color: 'var(--semi-color-text-2)', background: 'rgba(134, 144, 156, 0.08)',
                              padding: '2px 6px', borderRadius: 4,
                            }}>
                              {item.advisorName}
                            </span>
                          )}
                          {item.gradeDisplay && (
                            <span style={{
                              fontSize: 10, color: 'var(--semi-color-text-2)', background: 'rgba(134, 144, 156, 0.08)',
                              padding: '2px 6px', borderRadius: 4,
                            }}>
                              {item.gradeDisplay}
                            </span>
                          )}
                          {item.sourceChannel && (
                            <span style={{
                              fontSize: 10, color: 'var(--semi-color-text-2)', background: 'rgba(134, 144, 156, 0.08)',
                              padding: '2px 6px', borderRadius: 4,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100,
                            }}>
                              {item.sourceChannel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center' }}>
                <IconCalendar size="extra-large" style={{ color: '#e8e6dc', marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>当日暂无记录</p>
                <p style={{ fontSize: 12, color: 'rgba(134, 144, 156, 0.7)', marginTop: 4 }}>选择其他日期查看</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <LeadDetailSheet
        leadId={selectedLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  )
}
