/**
 * 线索详情 Tabs 组件
 * 可复用于 LeadDetailSheet 和 ContinuousCallPage
 * 包含：概览、跟进记录、订单记录、统计图表、变更历史 五个 Tab
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, copyToClipboard } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { formatTime } from '@/lib/utils/time'
import { Receipt, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react'

import { leadsApi } from '../../api'
import type { Lead, LeadFollowup } from '../../types'
import { followupMethodLabels } from '../../types'
import { useLeadStatistics } from '../../hooks/use-lead-statistics'
import { FollowupResultBadge } from '../status-badges'

// 订单相关
import { orderApi } from '@/features/crm/orders/api'
import type { Order } from '@/features/crm/orders/types'

// 详情组件
import { LeadInfoDisplay } from './lead-info-display'
import { ChangeHistoryTimeline } from './change-history-timeline'
import { LeadCallRecords } from './lead-call-records'

// 图表组件
import { FollowupFrequencyChart } from './charts/followup-frequency-chart'
import { FollowupMethodPie } from './charts/followup-method-pie'
import { FollowupResultPie } from './charts/followup-result-pie'

/**
 * 跟进内容单元格组件 - 支持悬浮展示完整内容和复制
 */
function FollowupContentCell({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const success = await copyToClipboard(content)
    if (success) {
      setCopied(true)
      toast.success('已复制')
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('复制失败')
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="truncate block cursor-pointer">{content}</span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[300px]">
        <div className="flex items-start gap-2">
          <p className="text-xs whitespace-pre-wrap break-words flex-1">{content}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 -mr-1 -mt-0.5"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

interface LeadDetailTabsProps {
  /** 线索ID */
  leadId: string
  /** 线索数据（如果外部已有数据可直接传入，避免重复请求） */
  lead?: Lead | null
  /** 是否正在加载线索数据 */
  isLoading?: boolean
  /** 默认激活的 Tab */
  defaultTab?: 'overview' | 'followups' | 'orders' | 'statistics' | 'history'
  /** 自定义类名 */
  className?: string
  /** 是否使用 ScrollArea（在 Sheet 中需要，在 Card 中可能不需要） */
  useScrollArea?: boolean
  /** 固定高度（用于 ScrollArea） */
  height?: string
  /** 字段更新回调 */
  onFieldUpdate?: (field: string, value: string) => Promise<void>
  /** 是否精简模式（隐藏邮箱、微信号、课程兴趣等不常用字段） */
  compact?: boolean
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
  onFieldUpdate,
  compact = false,
}: LeadDetailTabsProps) {
  const s = useStyleClasses()
  const [activeTab, setActiveTab] = useState(defaultTab)

  // 跟进记录分页状态
  const [followupPage, setFollowupPage] = useState(1)
  const [followupPageSize, setFollowupPageSize] = useState(5)

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
      const response = await leadsApi.getLeadFollowups(leadId, { page: 1, size: 100 })
      return response
    },
    enabled: !!leadId && (activeTab === 'followups' || activeTab === 'statistics'),
  })

  // 跟进记录分页计算
  const followupsPaginated = useMemo(() => {
    const allFollowups = followupsResponse?.data || []
    const total = allFollowups.length
    const totalPages = Math.ceil(total / followupPageSize)
    const startIndex = (followupPage - 1) * followupPageSize
    const items = allFollowups.slice(startIndex, startIndex + followupPageSize)
    return { items, total, totalPages }
  }, [followupsResponse?.data, followupPage, followupPageSize])

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

  // 获取订单记录
  const { data: ordersResponse, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['lead-orders', leadId],
    queryFn: async () => {
      const response = await orderApi.getLeadOrders(leadId)
      return response
    },
    enabled: !!leadId && activeTab === 'orders',
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
          value="orders"
          className={cn(
            s.text.xs,
            'relative rounded-none border-none bg-transparent px-4 py-2 shadow-none',
            'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
            'data-[state=active]:text-foreground data-[state=active]:font-semibold',
            'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
            'after:bg-transparent data-[state=active]:after:bg-primary'
          )}
        >
          订单记录
          {ordersResponse?.data && ordersResponse.data.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
              {ordersResponse.data.length}
            </Badge>
          )}
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
      <TabsContent value="overview" className="flex-1 m-0 min-h-0 overflow-hidden">
        <ContentWrapper>
          <div className="p-4">
            {isLoading ? (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                加载中...
              </div>
            ) : lead ? (
              <LeadInfoDisplay lead={lead} isOverdue={statistics.isOverdue} onFieldUpdate={onFieldUpdate} compact={compact} />
            ) : (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                暂无数据
              </div>
            )}
          </div>
        </ContentWrapper>
      </TabsContent>

      {/* ==================== 跟进记录 Tab ==================== */}
      <TabsContent value="followups" className="flex-1 m-0 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* 跟进记录区域 - 占50%高度 */}
          <div className="flex-1 min-h-0 flex flex-col border-b">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <h4 className={cn(s.text.sm, 'font-medium')}>跟进记录</h4>
              {followupsPaginated.total > 0 && (
                <span className={cn(s.text.xs, 'text-muted-foreground')}>
                  共 {followupsPaginated.total} 条
                </span>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                {isFollowupsLoading ? (
                  <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4')}>
                    加载中...
                  </div>
                ) : !followupsPaginated.items.length ? (
                  <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4')}>
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
                      {followupsPaginated.items.map((followup: LeadFollowup) => (
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
                                className={cn(s.text.xs, s.roundedBadge, s.height.badge)}
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className={cn(s.text.xs, 'max-w-[200px]')}>
                            {followup.content ? (
                              <FollowupContentCell content={followup.content} />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className={s.text.xs}>
                            <span className="flex items-center gap-1">
                              {followup.followup_by_name || '-'}
                              {followup.source === 'ai_auto' && (
                                <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400" title="AI 通话分析自动生成">AI</span>
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </ScrollArea>
            {/* 跟进记录分页器 */}
            {followupsPaginated.total > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
                <div className={cn('flex items-center gap-2', s.text.xs)}>
                  <span className="text-muted-foreground">每页</span>
                  <Select
                    value={`${followupPageSize}`}
                    onValueChange={(value) => {
                      setFollowupPageSize(Number(value))
                      setFollowupPage(1)
                    }}
                  >
                    <SelectTrigger className="h-7 w-[60px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20].map((size) => (
                        <SelectItem key={size} value={`${size}`} className="text-xs">
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">条</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setFollowupPage(followupPage - 1)}
                    disabled={followupPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className={cn(s.text.xs, 'px-2')}>
                    {followupPage} / {followupsPaginated.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setFollowupPage(followupPage + 1)}
                    disabled={followupPage >= followupsPaginated.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 通话记录区域（本地数据，含AI分析）- 可折叠，默认折叠 */}
          {leadId && (
            <div className="flex-shrink-0 flex flex-col border-t">
              <LeadCallRecords leadId={leadId} showHeader collapsible defaultCollapsed />
            </div>
          )}
        </div>
      </TabsContent>

      {/* ==================== 订单记录 Tab ==================== */}
      <TabsContent value="orders" className="flex-1 m-0 min-h-0 overflow-hidden">
        <ContentWrapper>
          <div className="p-4">
            {isOrdersLoading ? (
              <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                加载中...
              </div>
            ) : !ordersResponse?.data?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className={cn(s.text.sm, 'text-muted-foreground')}>暂无订单记录</p>
                <p className={cn(s.text.xs, 'text-muted-foreground/60 mt-1')}>该线索还没有关联的缴费订单</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(s.text.xs, 'w-[120px]')}>订单编号</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[80px] text-right')}>实付金额</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[80px]')}>支付状态</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[140px]')}>支付时间</TableHead>
                    <TableHead className={cn(s.text.xs, 'w-[140px]')}>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersResponse.data.map((order: Order) => (
                    <TableRow key={order.id}>
                      <TableCell className={cn(s.text.xs, 'font-medium')}>
                        {order.order_no}
                      </TableCell>
                      <TableCell className={cn(s.text.xs, 'text-right font-medium text-orange-600')}>
                        ¥{Number(order.actual_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className={s.text.xs}>
                        <Badge
                          variant={order.payment_status === 'paid' ? 'default' : 'secondary'}
                          className={cn(
                            s.text.xs, s.roundedBadge, s.height.badge,
                            order.payment_status === 'paid' && 'bg-green-500 hover:bg-green-500/80'
                          )}
                        >
                          {order.payment_status_display}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                        {order.payment_at ? formatTime(order.payment_at) : '-'}
                      </TableCell>
                      <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                        {formatTime(order.created_at)}
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
      <TabsContent value="statistics" className="flex-1 m-0 min-h-0 overflow-hidden">
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
      <TabsContent value="history" className="flex-1 m-0 min-h-0 overflow-hidden">
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
