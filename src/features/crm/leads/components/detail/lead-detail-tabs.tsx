/**
 * 线索详情 Tabs 组件
 * 可复用于 LeadDetailSheet 和 ContinuousCallPage
 * 包含：概览、跟进记录、统计图表、变更历史 四个 Tab
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { formatTime } from '@/lib/utils/time'

import { leadsApi } from '../../api'
import type { Lead, LeadFollowup } from '../../types'
import { followupMethodLabels } from '../../types'
import { useLeadStatistics } from '../../hooks/use-lead-statistics'
import { FollowupResultBadge } from '../status-badges'

// 详情组件
import { LeadInfoDisplay } from './lead-info-display'
import { ChangeHistoryTimeline } from './change-history-timeline'

// 图表组件
import { FollowupFrequencyChart } from './charts/followup-frequency-chart'
import { FollowupMethodPie } from './charts/followup-method-pie'
import { FollowupResultPie } from './charts/followup-result-pie'

interface LeadDetailTabsProps {
  /** 线索ID */
  leadId: string
  /** 线索数据（如果外部已有数据可直接传入，避免重复请求） */
  lead?: Lead | null
  /** 是否正在加载线索数据 */
  isLoading?: boolean
  /** 默认激活的 Tab */
  defaultTab?: 'overview' | 'followups' | 'statistics' | 'history'
  /** 自定义类名 */
  className?: string
  /** 是否使用 ScrollArea（在 Sheet 中需要，在 Card 中可能不需要） */
  useScrollArea?: boolean
  /** 固定高度（用于 ScrollArea） */
  height?: string
}

/**
 * 线索详情 Tabs 组件
 * 统一展示线索的概览、跟进记录、统计图表、变更历史
 */
export function LeadDetailTabs({
  leadId,
  lead: externalLead,
  isLoading: externalLoading,
  defaultTab = 'overview',
  className,
  useScrollArea = true,
  height = 'h-full',
}: LeadDetailTabsProps) {
  const s = useStyleClasses()
  const [activeTab, setActiveTab] = useState(defaultTab)

  // 如果外部没有传入 lead 数据，则内部获取
  const { data: internalLead, isLoading: internalLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const response = await leadsApi.getLead(leadId, true)
      return response.data
    },
    enabled: !!leadId && !externalLead,
  })

  const lead = externalLead ?? internalLead
  const isLoading = externalLoading ?? internalLoading

  // 获取跟进记录 - 统计图表和跟进记录 Tab 都需要
  const { data: followupsResponse, isLoading: isFollowupsLoading } = useQuery({
    queryKey: ['lead-followups', leadId],
    queryFn: async () => {
      const response = await leadsApi.getLeadFollowups(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && (activeTab === 'followups' || activeTab === 'statistics'),
  })

  // 获取信息变更记录
  const { data: infoChangeLogs, isLoading: isInfoChangeLoading } = useQuery({
    queryKey: ['lead-info-changes', leadId],
    queryFn: async () => {
      const response = await leadsApi.getLeadInfoChangeLogs(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && activeTab === 'history',
  })

  // 获取归属变更记录
  const { data: ownershipChangeLogs, isLoading: isOwnershipChangeLoading } = useQuery({
    queryKey: ['lead-ownership-changes', leadId],
    queryFn: async () => {
      const response = await leadsApi.getLeadOwnershipChangeLogs(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && activeTab === 'history',
  })

  // 计算统计数据
  const statistics = useLeadStatistics(lead || null, followupsResponse?.data)

  // 内容包装器 - 根据 useScrollArea 决定是否使用 ScrollArea
  const ContentWrapper = useScrollArea
    ? ({ children }: { children: React.ReactNode }) => (
        <ScrollArea className={height}>{children}</ScrollArea>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className={cn(height, 'overflow-auto')}>{children}</div>
      )

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      className={cn('flex flex-col flex-1 min-h-0', className)}
    >
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-auto shrink-0">
        <TabsTrigger
          value="overview"
          className={cn(
            s.text.xs,
            'relative rounded-none border-none bg-transparent px-4 py-2 shadow-none',
            'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
            'data-[state=active]:text-foreground data-[state=active]:font-semibold',
            'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
            'after:bg-transparent data-[state=active]:after:bg-primary'
          )}
        >
          概览
        </TabsTrigger>
        <TabsTrigger
          value="followups"
          className={cn(
            s.text.xs,
            'relative rounded-none border-none bg-transparent px-4 py-2 shadow-none',
            'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
            'data-[state=active]:text-foreground data-[state=active]:font-semibold',
            'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
            'after:bg-transparent data-[state=active]:after:bg-primary'
          )}
        >
          跟进记录
          <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
            {lead?.followup_count || 0}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="statistics"
          className={cn(
            s.text.xs,
            'relative rounded-none border-none bg-transparent px-4 py-2 shadow-none',
            'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
            'data-[state=active]:text-foreground data-[state=active]:font-semibold',
            'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
            'after:bg-transparent data-[state=active]:after:bg-primary'
          )}
        >
          统计图表
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className={cn(
            s.text.xs,
            'relative rounded-none border-none bg-transparent px-4 py-2 shadow-none',
            'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
            'data-[state=active]:text-foreground data-[state=active]:font-semibold',
            'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
            'after:bg-transparent data-[state=active]:after:bg-primary'
          )}
        >
          变更历史
        </TabsTrigger>
      </TabsList>

      {/* ==================== 概览 Tab ==================== */}
      <TabsContent value="overview" className="flex-1 m-0 overflow-hidden">
        <ContentWrapper>
          <div className="p-4">
            {isLoading ? (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                加载中...
              </div>
            ) : lead ? (
              <LeadInfoDisplay lead={lead} isOverdue={statistics.isOverdue} />
            ) : (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                暂无数据
              </div>
            )}
          </div>
        </ContentWrapper>
      </TabsContent>

      {/* ==================== 跟进记录 Tab ==================== */}
      <TabsContent value="followups" className="flex-1 m-0 overflow-hidden">
        <ContentWrapper>
          <div className="p-4">
            {isFollowupsLoading ? (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                加载中...
              </div>
            ) : !followupsResponse?.data?.length ? (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                暂无跟进记录
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(s.text.xs, 'w-[140px]')}>跟进时间</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[80px]')}>跟进方式</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[90px]')}>跟进结果</TableHead>
                    <TableHead className={cn(s.text.xs)}>跟进内容</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[80px]')}>跟进人</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followupsResponse.data.map((followup: LeadFollowup) => (
                    <TableRow key={followup.id}>
                      <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                        {formatTime(followup.followup_at)}
                      </TableCell>
                      <TableCell className={s.text.xs}>
                        {followupMethodLabels[followup.method] || followup.method}
                      </TableCell>
                      <TableCell className={s.text.xs}>
                        {followup.result ? (
                          <FollowupResultBadge
                            result={followup.result}
                            className={cn(s.text.xs, s.rounded, s.height.badge)}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(s.text.xs, 'max-w-[200px] truncate')}
                        title={followup.content}
                      >
                        {followup.content || '-'}
                      </TableCell>
                      <TableCell className={s.text.xs}>
                        {followup.followup_by_name || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </ContentWrapper>
      </TabsContent>

      {/* ==================== 统计图表 Tab ==================== */}
      <TabsContent value="statistics" className="flex-1 m-0 overflow-hidden">
        <ContentWrapper>
          <div className="p-4 space-y-4">
            {/* 跟进频率趋势 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className={s.text.sm}>跟进频率趋势</CardTitle>
                <CardDescription className={s.text.xs}>最近30天的跟进活动</CardDescription>
              </CardHeader>
              <CardContent>
                <FollowupFrequencyChart data={statistics.followupFrequencyData} />
              </CardContent>
            </Card>

            {/* 跟进方式分布 + 跟进结果分布 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={s.text.sm}>跟进方式分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <FollowupMethodPie data={statistics.methodDistribution} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={s.text.sm}>跟进结果分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <FollowupResultPie data={statistics.resultDistribution} />
                </CardContent>
              </Card>
            </div>
          </div>
        </ContentWrapper>
      </TabsContent>

      {/* ==================== 变更历史 Tab ==================== */}
      <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
        <ContentWrapper>
          <div className="p-4">
            <ChangeHistoryTimeline
              infoChanges={infoChangeLogs?.data || []}
              ownershipChanges={ownershipChangeLogs?.data || []}
              isLoading={isInfoChangeLoading || isOwnershipChangeLoading}
            />
          </div>
        </ContentWrapper>
      </TabsContent>
    </Tabs>
  )
}

export default LeadDetailTabs
