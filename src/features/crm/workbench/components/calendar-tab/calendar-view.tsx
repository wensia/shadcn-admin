/**
 * 日历视图组件 - Semi Design 版
 * 支持月视图和周视图切换
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
  addWeeks,
  subWeeks,
  parseISO,
  isToday,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Button, Tag, Spin, RadioGroup, Radio } from '@douyinfe/semi-ui-19'
import { IconChevronLeft, IconChevronRight, IconCalendar, IconClock, IconUser, IconRefresh } from '@douyinfe/semi-icons'
import { leadsApi } from '@/features/crm/leads/api'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { LeadStatusBadge } from '@/features/crm/leads/components/status-badges'

type ViewMode = 'month' | 'week'

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // 获取待回访线索
  const { data: allPendingLeads, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['workbench-calendar-pending'],
    queryFn: async () => {
      const response = await leadsApi.getPendingFollowupLeads({
        size: 1000,
        compact: true,
      })
      return response.data?.items || []
    },
  })

  // 计算日历显示的日期范围
  const calendarDays = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { locale: zhCN })
      const weekEnd = endOfWeek(currentDate, { locale: zhCN })
      return eachDayOfInterval({ start: weekStart, end: weekEnd })
    }
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { locale: zhCN })
    const endDate = endOfWeek(monthEnd, { locale: zhCN })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentDate, viewMode])

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

  // 导航：根据视图模式切换月/周
  const goPrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }
  const goNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }
  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  // 头部标题
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'yyyy年 MM月', { locale: zhCN })
    }
    const weekStart = startOfWeek(currentDate, { locale: zhCN })
    const weekEnd = endOfWeek(currentDate, { locale: zhCN })
    const startMonth = format(weekStart, 'M月', { locale: zhCN })
    const endMonth = format(weekEnd, 'M月', { locale: zhCN })
    if (startMonth === endMonth) {
      return `${format(weekStart, 'yyyy年 M月d日', { locale: zhCN })} - ${format(weekEnd, 'd日', { locale: zhCN })}`
    }
    return `${format(weekStart, 'yyyy年 M月d日', { locale: zhCN })} - ${format(weekEnd, 'M月d日', { locale: zhCN })}`
  }, [currentDate, viewMode])

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  // 周视图中每天最多显示的线索条数（空间更大）
  const maxLeadsPerCell = viewMode === 'week' ? 10 : 4

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* 左侧日历区域 (占 3/4) */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        background: 'var(--semi-color-bg-0)', padding: 16,
        borderRadius: 8, border: '1px solid var(--semi-color-border)',
        minHeight: 0, overflow: 'hidden',
      }}>
        {/* 头部导航 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--semi-color-text-0)', margin: 0 }}>
              {headerTitle}
            </h2>
            <div style={{
              display: 'flex', alignItems: 'center',
              borderRadius: 6, border: '1px solid var(--semi-color-border)',
              padding: 2,
            }}>
              <Button
                theme="borderless"
                icon={<IconChevronLeft />}
                size="small"
                onClick={goPrev}
              />
              <div style={{ width: 1, height: 16, background: 'var(--semi-color-border)', margin: '0 4px' }} />
              <Button
                theme="borderless"
                icon={<IconChevronRight />}
                size="small"
                onClick={goNext}
              />
            </div>
            <Button size="small" onClick={goToToday}>今天</Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--semi-color-text-2)' }}>
                <Spin size="small" />
                加载中...
              </div>
            )}
            <Button
              theme="borderless"
              icon={<IconRefresh spin={isFetching && !isLoading} />}
              size="small"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="刷新日历数据"
            />
            <RadioGroup
              type="button"
              buttonSize="small"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
            >
              <Radio value="month">月</Radio>
              <Radio value="week">周</Radio>
            </RadioGroup>
          </div>
        </div>

        {/* 日历网格 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--semi-color-border)', borderRadius: 6, overflow: 'hidden', fontSize: 14 }}>
          {/* 星期表头 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)', flexShrink: 0 }}>
            {viewMode === 'week' ? (
              // 周视图：表头显示具体日期
              calendarDays.map((day, i) => (
                <div
                  key={day.toISOString()}
                  style={{
                    padding: '8px 0', textAlign: 'center', fontSize: 12,
                    fontWeight: 500, color: isToday(day) ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)',
                    borderRight: i < 6 ? '1px solid var(--semi-color-border)' : 'none',
                  }}
                >
                  <div>周{weekDays[i]}</div>
                  <div style={{
                    fontSize: 16, fontWeight: 600, marginTop: 2,
                    color: isToday(day) ? 'var(--semi-color-primary)' : 'var(--semi-color-text-0)',
                  }}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))
            ) : (
              // 月视图：普通星期表头
              weekDays.map((day) => (
                <div
                  key={day}
                  style={{
                    padding: '8px 0', textAlign: 'center', fontSize: 12,
                    fontWeight: 500, color: 'var(--semi-color-text-2)',
                    borderRight: '1px solid var(--semi-color-border)',
                  }}
                >
                  周{day}
                </div>
              ))
            )}
          </div>

          {/* 日期格子 */}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridAutoRows: 'minmax(0, 1fr)',
            background: 'var(--semi-color-bg-0)',
          }}>
            {calendarDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayLeads = leadsByDate.get(dateKey) || []
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isTodayDate = isToday(day)
              const isSelected = isSameDay(day, selectedDate)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  style={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column',
                    padding: 8, cursor: 'pointer', overflow: 'hidden',
                    borderBottom: viewMode === 'month' ? '1px solid var(--semi-color-border)' : 'none',
                    borderRight: (index + 1) % 7 === 0 ? 'none' : '1px solid var(--semi-color-border)',
                    background: viewMode === 'month' && !isCurrentMonth
                      ? 'var(--semi-color-fill-0)'
                      : isSelected
                        ? 'var(--semi-color-primary-light-default)'
                        : 'transparent',
                    outline: isSelected ? '1px solid var(--semi-color-primary)' : 'none',
                    outlineOffset: -1,
                    zIndex: isSelected ? 1 : 0,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--semi-color-fill-0)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        viewMode === 'month' && !isCurrentMonth ? 'var(--semi-color-fill-0)' : 'transparent'
                    }
                  }}
                >
                  {/* 月视图才显示日期数字（周视图日期在表头） */}
                  {viewMode === 'month' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 14, fontWeight: 500,
                          width: 28, height: 28,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%',
                          ...(isTodayDate
                            ? { background: 'var(--semi-color-primary)', color: '#fff' }
                            : isSelected
                              ? { color: 'var(--semi-color-primary)', fontWeight: 700 }
                              : { color: !isCurrentMonth ? 'var(--semi-color-text-3)' : 'var(--semi-color-text-1)' }
                          ),
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayLeads.length > 0 && (
                        <span style={{
                          fontSize: 12, fontWeight: 500, padding: '2px 6px',
                          borderRadius: 10,
                          background: isSelected ? 'var(--semi-color-primary)' : 'var(--semi-color-fill-1)',
                          color: isSelected ? '#fff' : 'var(--semi-color-text-2)',
                        }}>
                          {dayLeads.length}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 周视图顶部显示数量 badge */}
                  {viewMode === 'week' && dayLeads.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 500, padding: '2px 6px',
                        borderRadius: 10,
                        background: isSelected ? 'var(--semi-color-primary)' : 'var(--semi-color-fill-1)',
                        color: isSelected ? '#fff' : 'var(--semi-color-text-2)',
                      }}>
                        {dayLeads.length}
                      </span>
                    </div>
                  )}

                  {/* 线索条 */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 4,
                    overflow: viewMode === 'week' ? 'auto' : 'hidden',
                    flex: viewMode === 'week' ? 1 : undefined,
                  }}>
                    {dayLeads.slice(0, maxLeadsPerCell).map((lead) => {
                      const timeStr = lead.next_followup_at
                        ? format(parseISO(lead.next_followup_at), 'HH:mm')
                        : ''

                      if (viewMode === 'week') {
                        // 周视图：更详细的线索卡片
                        return (
                          <div
                            key={lead.id}
                            onClick={(e) => handleLeadClick(e, lead.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              borderRadius: 4, padding: '4px 8px',
                              fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              background: isSelected ? 'rgba(var(--semi-color-primary-rgb, 0,100,250), 0.15)' : 'var(--semi-color-fill-0)',
                              color: isSelected ? 'var(--semi-color-primary)' : 'var(--semi-color-text-1)',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                          >
                            <span style={{ fontFamily: 'monospace', opacity: 0.7, flexShrink: 0, fontSize: 11 }}>{timeStr}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                              {lead.child_name || lead.parent_name}
                            </span>
                          </div>
                        )
                      }

                      // 月视图：紧凑线索条
                      return (
                        <div
                          key={lead.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            borderRadius: 4, padding: '2px 6px',
                            fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            background: isSelected ? 'rgba(var(--semi-color-primary-rgb, 0,100,250), 0.15)' : 'var(--semi-color-fill-0)',
                            color: isSelected ? 'var(--semi-color-primary)' : 'var(--semi-color-text-2)',
                          }}
                        >
                          <span style={{ fontFamily: 'monospace', opacity: 0.8, flexShrink: 0 }}>{timeStr}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.child_name || lead.parent_name}</span>
                        </div>
                      )
                    })}
                    {dayLeads.length > maxLeadsPerCell && (
                      <div style={{ fontSize: viewMode === 'week' ? 11 : 10, color: 'var(--semi-color-text-2)', paddingLeft: 4 }}>
                        还有 {dayLeads.length - maxLeadsPerCell} 条...
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
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: 'var(--semi-color-bg-0)',
        borderRadius: 8, border: '1px solid var(--semi-color-border)',
        overflow: 'hidden', minHeight: 0,
      }}>
        <div style={{
          padding: 16, borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-fill-0)', flexShrink: 0,
        }}>
          <h3 style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <IconCalendar style={{ color: 'var(--semi-color-primary)' }} size="small" />
            {format(selectedDate, 'MM月dd日', { locale: zhCN })}
            <span style={{ color: 'var(--semi-color-text-2)', fontWeight: 400, fontSize: 14 }}>
              周{format(selectedDate, 'EE', { locale: zhCN })}
            </span>
          </h3>
          <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', margin: '4px 0 0' }}>
            共 {selectedDateLeads.length} 个待回访客户
          </p>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {selectedDateLeads.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDateLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={(e) => handleLeadClick(e, lead.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 8,
                    padding: 12, borderRadius: 8,
                    border: '1px solid var(--semi-color-border)',
                    background: 'var(--semi-color-bg-0)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--semi-color-fill-0)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--semi-color-bg-0)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.child_name || '未命名'}
                      {lead.grade && <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginLeft: 8, fontWeight: 400 }}>{lead.grade}</span>}
                    </div>
                    {lead.next_followup_at && (
                      <Tag size="small" style={{ fontFamily: 'monospace', flexShrink: 0 }}>
                        {format(parseISO(lead.next_followup_at), 'HH:mm')}
                      </Tag>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                    <IconUser size="extra-small" />
                    <span>{lead.advisor?.name || '未分配'}</span>
                    <span style={{ width: 1, height: 12, background: 'var(--semi-color-border)', margin: '0 4px' }} />
                    <LeadStatusBadge status={lead.status} showDot={false} className="text-[10px] py-0 h-4" />
                  </div>

                  {lead.notes && (
                    <div style={{
                      fontSize: 12, color: 'var(--semi-color-text-3)',
                      background: 'var(--semi-color-fill-0)',
                      padding: 6, borderRadius: 4,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {lead.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 32,
              textAlign: 'center', color: 'var(--semi-color-text-2)',
              height: '100%',
            }}>
              <IconClock size="extra-large" style={{ opacity: 0.1, marginBottom: 8 }} />
              <p style={{ fontSize: 14, margin: 0 }}>今日无待跟进计划</p>
            </div>
          )}
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
