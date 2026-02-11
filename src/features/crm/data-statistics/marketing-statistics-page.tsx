/**
 * 市场部数据统计页面
 * 展示市场专员的录入数量和渠道分布统计
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  FileUp,
  Users,
  Tag,
  Loader2,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { brandColors } from '@/features/crm/daily-control/theme'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import leadsApi from '@/features/crm/leads/api'
import { adminApi } from '@/features/admin/api'
import type { MarketStaffStatItem, ChannelTotalItem } from '@/features/crm/leads/types'

// 获取时间范围辅助函数
function getDateRange(period: string): { date_from: string; date_to: string } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  switch (period) {
    case 'today': {
      return { date_from: today, date_to: today }
    }
    case 'week': {
      const dayOfWeek = now.getDay() || 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - dayOfWeek + 1)
      return { date_from: monday.toISOString().slice(0, 10), date_to: today }
    }
    case 'month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      return { date_from: firstDay.toISOString().slice(0, 10), date_to: today }
    }
    default:
      return { date_from: '', date_to: '' }
  }
}

// 渠道分类颜色映射
const categoryConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
  ONLINE: { label: '线上', variant: 'default', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  OFFLINE: { label: '线下', variant: 'secondary', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REFERRAL: { label: '转介绍', variant: 'outline', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  OTHER: { label: '其他', variant: 'outline', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

// 时间周期选项
const periodOptions = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
]

export function MarketingStatisticsPage() {
  useDocumentTitle('市场数据统计')

  const [period, setPeriod] = useState('month')
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set())

  // 获取校区列表
  const { data: campusesData } = useQuery({
    queryKey: ['campuses-simple'],
    queryFn: () => adminApi.getCampusesSimple(),
    staleTime: 5 * 60 * 1000,
  })

  const campusList = useMemo(() => {
    const items = campusesData?.data || []
    return items as Array<{ id: string; name: string }>
  }, [campusesData])

  // 获取统计数据
  const dateRange = useMemo(() => getDateRange(period), [period])

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['marketing-statistics', period, selectedCampusId],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (dateRange.date_from) params.date_from = dateRange.date_from
      if (dateRange.date_to) params.date_to = dateRange.date_to
      if (selectedCampusId !== 'all') params.campus_id = selectedCampusId
      return leadsApi.getMarketStatistics(params)
    },
    staleTime: 60 * 1000,
  })

  const statistics = data?.data
  const staffList: MarketStaffStatItem[] = statistics?.staff_statistics || []
  const channelTotals: ChannelTotalItem[] = statistics?.channel_totals || []

  // 计算指标
  const totalLeads = statistics?.total_leads || 0
  const totalStaff = statistics?.total_staff || 0
  const uniqueChannels = useMemo(() => {
    const names = new Set<string>()
    staffList.forEach(s => s.channels.forEach(c => names.add(c.channel_name)))
    return names.size
  }, [staffList])

  // 最大录入量（用于 Progress）
  const maxCount = useMemo(() => {
    return Math.max(...staffList.map(s => s.total_count), 1)
  }, [staffList])

  // 切换展开/收起
  const toggleExpand = (staffId: string) => {
    setExpandedStaff(prev => {
      const next = new Set(prev)
      if (next.has(staffId)) next.delete(staffId)
      else next.add(staffId)
      return next
    })
  }

  const handleRefresh = () => {
    refetch()
    toast.success('已刷新')
  }

  return (
    <Main fixed className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* 顶部指标 */}
        <div className="flex flex-shrink-0 items-center gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex items-baseline gap-1.5">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${brandColors.blue}15` }}
                >
                  <FileUp className="h-4 w-4" style={{ color: brandColors.blue }} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-[#141413] dark:text-slate-100">
                    {totalLeads.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#b0aea5] dark:text-slate-400">
                    总录入量
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${brandColors.green}15` }}
                >
                  <Users className="h-4 w-4" style={{ color: brandColors.green }} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-[#141413] dark:text-slate-100">
                    {totalStaff}
                  </span>
                  <span className="text-xs text-[#b0aea5] dark:text-slate-400">
                    市场专员数
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${brandColors.orange}15` }}
                >
                  <Tag className="h-4 w-4" style={{ color: brandColors.orange }} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-[#141413] dark:text-slate-100">
                    {uniqueChannels}
                  </span>
                  <span className="text-xs text-[#b0aea5] dark:text-slate-400">
                    来源渠道数
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 工具栏 */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="时间周期" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
            <SelectTrigger className="w-36">
              <Building2 className="mr-1.5 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="选择校区" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部校区</SelectItem>
              {campusList.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            刷新
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          {/* 主表格 */}
          <Card className="flex min-h-0 flex-[3] flex-col overflow-hidden">
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/50">
                    <TableRow>
                      <TableHead className="w-16 text-center">排名</TableHead>
                      <TableHead className="w-28">专员姓名</TableHead>
                      <TableHead className="w-28">所在校区</TableHead>
                      <TableHead className="w-24 text-right">总录入量</TableHead>
                      <TableHead className="min-w-[180px]">录入分布</TableHead>
                      <TableHead className="min-w-[200px]">渠道明细</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : staffList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffList.map((staff, index) => {
                        const isExpanded = expandedStaff.has(staff.staff_id)
                        return (
                          <TableRow key={staff.staff_id}>
                            <TableCell className="text-center">
                              <span className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                                index === 0 && 'bg-yellow-100 text-yellow-700',
                                index === 1 && 'bg-gray-100 text-gray-700',
                                index === 2 && 'bg-orange-100 text-orange-700',
                                index > 2 && 'text-muted-foreground'
                              )}>
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{staff.staff_name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {staff.campus_name || '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {staff.total_count.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={(staff.total_count / maxCount) * 100}
                                  className="h-2"
                                />
                                <span className="w-12 text-xs text-muted-foreground">
                                  {totalLeads > 0 ? ((staff.total_count / totalLeads) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {staff.channels.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {/* 始终显示前2个渠道 */}
                                  {staff.channels.slice(0, isExpanded ? undefined : 2).map(ch => (
                                    <div key={ch.channel_id} className="flex items-center gap-1.5 text-xs">
                                      <span className={cn(
                                        'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
                                        categoryConfig[ch.category || 'OTHER']?.color || categoryConfig.OTHER.color
                                      )}>
                                        {categoryConfig[ch.category || 'OTHER']?.label || '其他'}
                                      </span>
                                      <span className="text-muted-foreground">{ch.channel_name}</span>
                                      <span className="font-mono font-medium">{ch.lead_count}</span>
                                    </div>
                                  ))}
                                  {/* 展开/收起按钮 */}
                                  {staff.channels.length > 2 && (
                                    <button
                                      onClick={() => toggleExpand(staff.staff_id)}
                                      className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronDown className="h-3 w-3" />
                                          收起
                                        </>
                                      ) : (
                                        <>
                                          <ChevronRight className="h-3 w-3" />
                                          还有 {staff.channels.length - 2} 个渠道
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 右侧渠道汇总 */}
          <Card className="hidden min-h-0 w-72 flex-shrink-0 flex-col overflow-hidden lg:flex">
            <CardHeader className="flex-shrink-0 pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">渠道汇总</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto px-4 pb-4 pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : channelTotals.length === 0 ? (
                <ChannelTotalsFromStaff staffList={staffList} totalLeads={totalLeads} />
              ) : (
                <ChannelTotalsList channels={channelTotals} totalLeads={totalLeads} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Main>
  )
}

// 渠道汇总列表组件（使用 channel_totals 字段）
function ChannelTotalsList({ channels, totalLeads }: { channels: ChannelTotalItem[]; totalLeads: number }) {
  const maxTotal = Math.max(...channels.map(c => c.total), 1)

  return (
    <div className="space-y-2.5">
      {channels.map(ch => (
        <div key={ch.channel_name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
                categoryConfig[ch.category || 'OTHER']?.color || categoryConfig.OTHER.color
              )}>
                {categoryConfig[ch.category || 'OTHER']?.label || '其他'}
              </span>
              <span className="text-foreground">{ch.channel_name}</span>
            </div>
            <span className="font-mono font-medium">{ch.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(ch.total / maxTotal) * 100} className="h-1.5" />
            <span className="w-10 text-right text-[10px] text-muted-foreground">
              {totalLeads > 0 ? ((ch.total / totalLeads) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// 备用：从 staffList 中聚合渠道汇总
function ChannelTotalsFromStaff({ staffList, totalLeads }: { staffList: MarketStaffStatItem[]; totalLeads: number }) {
  const aggregated = useMemo(() => {
    const map = new Map<string, { name: string; category: string; total: number }>()
    staffList.forEach(s => {
      s.channels.forEach(ch => {
        const existing = map.get(ch.channel_name)
        if (existing) {
          existing.total += ch.lead_count
        } else {
          map.set(ch.channel_name, {
            name: ch.channel_name,
            category: ch.category || 'OTHER',
            total: ch.lead_count,
          })
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [staffList])

  const maxTotal = Math.max(...aggregated.map(c => c.total), 1)

  return (
    <div className="space-y-2.5">
      {aggregated.map(ch => (
        <div key={ch.name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
                categoryConfig[ch.category]?.color || categoryConfig.OTHER.color
              )}>
                {categoryConfig[ch.category]?.label || '其他'}
              </span>
              <span className="text-foreground">{ch.name}</span>
            </div>
            <span className="font-mono font-medium">{ch.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(ch.total / maxTotal) * 100} className="h-1.5" />
            <span className="w-10 text-right text-[10px] text-muted-foreground">
              {totalLeads > 0 ? ((ch.total / totalLeads) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      ))}
      {aggregated.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">暂无数据</p>
      )}
    </div>
  )
}

export default MarketingStatisticsPage
