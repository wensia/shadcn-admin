/**
 * 今日待办视图
 * 展示今日需要跟进的线索列表
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfDay, endOfDay, parseISO, isBefore, isWithinInterval } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, User, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { leadsApi } from '@/features/crm/leads/api'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { LeadStatusBadge, IntentionLevelBadge } from '@/features/crm/leads/components/status-badges'
import type { LeadListItem } from '@/features/crm/leads/types'

export function TodayLeadsView() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // 获取待回访线索列表
  const { data, isLoading } = useQuery({
    queryKey: ['workbench-pending-followup'],
    queryFn: async () => {
      const response = await leadsApi.getPendingFollowupLeads({
        size: 200,
      })
      return response.data?.items || []
    },
  })

  // 在前端按日期分组
  const { todayLeads, overdueLeads } = useMemo(() => {
    if (!data) return { todayLeads: [], overdueLeads: [] }

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    const today: LeadListItem[] = []
    const overdue: LeadListItem[] = []

    data.forEach((lead) => {
      if (!lead.next_followup_at) return
      const followupDate = parseISO(lead.next_followup_at)

      if (isWithinInterval(followupDate, { start: todayStart, end: todayEnd })) {
        today.push(lead)
      } else if (isBefore(followupDate, todayStart)) {
        overdue.push(lead)
      }
    })

    return { todayLeads: today, overdueLeads: overdue }
  }, [data])

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId)
    setDetailSheetOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* 逾期线索 */}
      {overdueLeads.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base text-destructive">逾期待跟进</CardTitle>
            </div>
            <CardDescription>
              共 {overdueLeads.length} 条线索已逾期
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueLeads.slice(0, 5).map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  isOverdue
                  onClick={() => handleLeadClick(lead.id)}
                />
              ))}
              {overdueLeads.length > 5 && (
                <Button variant="ghost" className="w-full text-muted-foreground">
                  查看全部 {overdueLeads.length} 条逾期线索
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 今日待跟进 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">今日待跟进</CardTitle>
          <CardDescription>
            共 {todayLeads.length} 条待处理线索
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : todayLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">今日暂无待跟进线索</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => handleLeadClick(lead.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
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

interface LeadCardProps {
  lead: LeadListItem
  isOverdue?: boolean
  onClick: () => void
}

function LeadCard({ lead, isOverdue, onClick }: LeadCardProps) {
  const followupTime = lead.next_followup_at
    ? format(parseISO(lead.next_followup_at), 'HH:mm', { locale: zhCN })
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-3 text-left transition-colors',
        'hover:bg-muted/50',
        isOverdue && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {lead.child_name || lead.parent_name || '未知'}
            </span>
            {lead.intention_level && (
              <IntentionLevelBadge level={lead.intention_level} />
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            {lead.advisor_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {lead.advisor_name}
              </span>
            )}
            {lead.owner_campus_name && (
              <span>{lead.owner_campus_name}</span>
            )}
          </div>
          {lead.source_channel_name && (
            <div className="mt-1 text-xs text-muted-foreground">
              来源：{lead.source_channel_name}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <LeadStatusBadge status={lead.status} />
          {followupTime && (
            <span className={cn(
              'text-xs',
              isOverdue ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {isOverdue ? '逾期' : followupTime}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
