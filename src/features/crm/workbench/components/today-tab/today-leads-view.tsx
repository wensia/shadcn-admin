/**
 * 今日待办视图 - Semi Design 版
 * 展示今日需要跟进的线索列表
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfDay, endOfDay, parseISO, isBefore, isWithinInterval } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, Button, Skeleton } from '@douyinfe/semi-ui-19'
import { IconClock, IconUser, IconAlertCircle, IconChevronRight } from '@douyinfe/semi-icons'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 逾期线索 */}
      {overdueLeads.length > 0 && (
        <Card
          style={{ border: '1px solid var(--semi-color-danger)' }}
          header={
            <Card.Meta
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconAlertCircle style={{ color: 'var(--semi-color-danger)' }} />
                  <span style={{ fontSize: 16, color: 'var(--semi-color-danger)' }}>逾期待跟进</span>
                </div>
              }
              description={`共 ${overdueLeads.length} 条线索已逾期`}
            />
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overdueLeads.slice(0, 5).map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isOverdue
                onClick={() => handleLeadClick(lead.id)}
              />
            ))}
            {overdueLeads.length > 5 && (
              <Button
                theme="borderless"
                block
                style={{ color: 'var(--semi-color-text-2)' }}
                icon={<IconChevronRight />}
                iconPosition="right"
              >
                查看全部 {overdueLeads.length} 条逾期线索
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* 今日待跟进 */}
      <Card
        header={
          <Card.Meta
            title={<span style={{ fontSize: 16 }}>今日待跟进</span>}
            description={`共 ${todayLeads.length} 条待处理线索`}
          />
        }
      >
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton.Paragraph key={i} rows={2} style={{ width: '100%' }} />
            ))}
          </div>
        ) : todayLeads.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
            <IconClock size="extra-large" style={{ color: 'var(--semi-color-text-2)', marginBottom: 8 }} />
            <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>今日暂无待跟进线索</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => handleLeadClick(lead.id)}
              />
            ))}
          </div>
        )}
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
    <Button
      theme="borderless"
      onClick={onClick}
      className={cn(
        '!h-auto !w-full !justify-start !rounded-lg !p-3 !text-left',
        isOverdue
          ? 'hover:!bg-[var(--semi-color-danger-light-hover)]'
          : 'hover:!bg-[var(--semi-color-fill-0)]'
      )}
      style={{
        width: '100%', borderRadius: 8,
        border: `1px solid ${isOverdue ? 'var(--semi-color-danger-light-default)' : 'var(--semi-color-border)'}`,
        padding: 12, textAlign: 'left',
        background: isOverdue ? 'var(--semi-color-danger-light-default)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.child_name || lead.parent_name || '未知'}
            </span>
            {lead.intention_level && (
              <IntentionLevelBadge level={lead.intention_level} />
            )}
          </div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            {lead.advisor_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconUser size="extra-small" />
                {lead.advisor_name}
              </span>
            )}
            {lead.owner_campus_name && (
              <span>{lead.owner_campus_name}</span>
            )}
          </div>
          {lead.source_channel_name && (
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              来源：{lead.source_channel_name}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <LeadStatusBadge status={lead.status} />
          {followupTime && (
            <span style={{
              fontSize: 12,
              color: isOverdue ? 'var(--semi-color-danger)' : 'var(--semi-color-text-2)',
            }}>
              {isOverdue ? '逾期' : followupTime}
            </span>
          )}
        </div>
      </div>
    </Button>
  )
}
