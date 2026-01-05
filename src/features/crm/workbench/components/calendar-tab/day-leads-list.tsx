/**
 * 日期线索列表
 * 展示选中日期的待跟进线索
 */

import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LeadStatusBadge, IntentionLevelBadge } from '@/features/crm/leads/components/status-badges'
import type { LeadListItem } from '@/features/crm/leads/types'

interface DayLeadsListProps {
  date: Date | undefined
  leads: LeadListItem[]
  onLeadClick: (leadId: string) => void
}

export function DayLeadsList({ date, leads, onLeadClick }: DayLeadsListProps) {
  const dateStr = date ? format(date, 'M月d日 EEEE', { locale: zhCN }) : '请选择日期'

  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {dateStr}
        </CardTitle>
        <CardDescription>
          {leads.length > 0 ? `${leads.length} 条待跟进线索` : '暂无待跟进线索'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">该日期暂无待跟进线索</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-2">
              {leads.map((lead) => (
                <LeadItem
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </>
  )
}

interface LeadItemProps {
  lead: LeadListItem
  onClick: () => void
}

function LeadItem({ lead, onClick }: LeadItemProps) {
  const followupTime = lead.next_followup_at
    ? format(parseISO(lead.next_followup_at), 'HH:mm')
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-3 text-left transition-colors',
        'hover:bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate text-sm">
              {lead.child_name || lead.parent_name || '未知'}
            </span>
            {lead.intention_level && (
              <IntentionLevelBadge level={lead.intention_level} />
            )}
          </div>
          {lead.source_channel_name && (
            <div className="mt-1 text-xs text-muted-foreground">
              {lead.source_channel_name}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {followupTime && (
            <span className="text-xs font-medium text-primary">
              {followupTime}
            </span>
          )}
          <LeadStatusBadge status={lead.status} />
        </div>
      </div>
    </button>
  )
}
