/**
 * ChangeHistoryTimeline 变更历史时间轴组件
 * 合并展示信息变更和归属变更记录
 */

import * as React from 'react'
import { FileEdit, UserCog, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import {
  Timeline,
  TimelineItem,
  TimelineNode,
  TimelineContent,
  TimelineHeader,
  TimelineBody,
  TimelineDescription,
} from '@/components/ui/timeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatTime, formatRelativeTime } from '@/lib/utils/time'
import { EmptyState } from './empty-state'
import type { LeadInfoChangeLog, LeadOwnershipChangeLog } from '../../types'
import { infoChangeTypeLabels, ownershipChangeTypeLabels } from '../../types'

type ChangeFilter = 'all' | 'info' | 'ownership'

interface ChangeHistoryTimelineProps {
  infoChanges: LeadInfoChangeLog[]
  ownershipChanges: LeadOwnershipChangeLog[]
  isLoading?: boolean
  className?: string
}

// 合并后的变更记录类型
interface MergedChangeLog {
  id: string
  type: 'info' | 'ownership'
  changed_at: string
  changed_by_name: string
  change_summary: string
  change_type: string
  // 信息变更特有
  changes?: Array<{
    field_name: string
    old_value: string | null
    new_value: string | null
  }>
  // 归属变更特有
  previous_advisor_name?: string
  current_advisor_name?: string
  previous_campus_name?: string
  current_campus_name?: string
}

export function ChangeHistoryTimeline({
  infoChanges,
  ownershipChanges,
  isLoading,
  className,
}: ChangeHistoryTimelineProps) {
  const s = useStyleClasses()
  const [filter, setFilter] = React.useState<ChangeFilter>('all')

  // 合并并排序变更记录
  const mergedChanges = React.useMemo<MergedChangeLog[]>(() => {
    const infoItems: MergedChangeLog[] = (infoChanges || []).map((log) => ({
      id: log.id,
      type: 'info' as const,
      changed_at: log.changed_at,
      changed_by_name: log.changed_by_name,
      change_summary: log.change_summary,
      change_type: log.change_type,
      changes: log.changes,
    }))

    const ownershipItems: MergedChangeLog[] = (ownershipChanges || []).map((log) => ({
      id: log.id,
      type: 'ownership' as const,
      changed_at: log.changed_at,
      changed_by_name: log.changed_by_name,
      change_summary: log.change_summary,
      change_type: log.change_type,
      previous_advisor_name: log.previous_advisor_name,
      current_advisor_name: log.current_advisor_name,
      previous_campus_name: log.previous_campus_name,
      current_campus_name: log.current_campus_name,
    }))

    // 合并并按时间倒序排序
    return [...infoItems, ...ownershipItems].sort(
      (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
    )
  }, [infoChanges, ownershipChanges])

  // 根据筛选条件过滤
  const filteredChanges = React.useMemo(() => {
    if (filter === 'all') return mergedChanges
    return mergedChanges.filter((log) => log.type === filter)
  }, [mergedChanges, filter])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', s.text.xs, 'text-muted-foreground')}>
        加载中...
      </div>
    )
  }

  return (
    <div className={className}>
      {/* 筛选按钮 */}
      <div className={cn('flex gap-2 mb-4', s.gap.tight)}>
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={cn(s.height.controlSm, s.text.xs)}
        >
          全部 ({mergedChanges.length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'info' ? 'default' : 'outline'}
          onClick={() => setFilter('info')}
          className={cn(s.height.controlSm, s.text.xs)}
        >
          信息变更 ({infoChanges?.length || 0})
        </Button>
        <Button
          size="sm"
          variant={filter === 'ownership' ? 'default' : 'outline'}
          onClick={() => setFilter('ownership')}
          className={cn(s.height.controlSm, s.text.xs)}
        >
          归属变更 ({ownershipChanges?.length || 0})
        </Button>
      </div>

      {/* 时间轴 */}
      {filteredChanges.length === 0 ? (
        <EmptyState
          icon={<FileEdit />}
          title="暂无变更记录"
          description="线索的信息和归属变更将在这里展示"
        />
      ) : (
        <Timeline>
          {filteredChanges.map((log, index) => {
            const isLast = index === filteredChanges.length - 1
            const isInfo = log.type === 'info'

            return (
              <TimelineItem key={`${log.type}-${log.id}`}>
                <TimelineNode
                  variant={isInfo ? 'info' : 'warning'}
                  icon={isInfo ? <FileEdit className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
                  showConnector={!isLast}
                />
                <TimelineContent>
                  {/* 头部: 变更类型徽章 + 相对时间 */}
                  <TimelineHeader>
                    <Badge
                      variant={isInfo ? 'info' : 'warning'}
                      className={cn(s.text.xs, s.height.badge)}
                    >
                      {isInfo
                        ? infoChangeTypeLabels[log.change_type as keyof typeof infoChangeTypeLabels]
                        : ownershipChangeTypeLabels[log.change_type as keyof typeof ownershipChangeTypeLabels]}
                    </Badge>
                    <span className={cn(s.text.xs, 'text-muted-foreground ml-auto')}>
                      {formatRelativeTime(log.changed_at)}
                    </span>
                  </TimelineHeader>

                  {/* 操作人信息 */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className={cn(s.text.xs)}>
                        {log.changed_by_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <TimelineDescription>
                      {log.changed_by_name} · {formatTime(log.changed_at)}
                    </TimelineDescription>
                  </div>

                  {/* 变更摘要 */}
                  <TimelineBody>
                    {log.change_summary}
                  </TimelineBody>

                  {/* 信息变更详情 */}
                  {isInfo && log.changes && log.changes.length > 0 && (
                    <div className={cn('mt-2 space-y-1', s.text.xs, 'text-muted-foreground')}>
                      {log.changes.map((change, idx) => (
                        <div key={idx} className="flex items-center gap-1 flex-wrap">
                          <span className="font-medium">{change.field_name}:</span>
                          <span className="text-red-500 line-through">
                            {change.old_value || '-'}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-green-600">
                            {change.new_value || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 归属变更详情 */}
                  {!isInfo && (log.previous_advisor_name || log.current_advisor_name || log.previous_campus_name || log.current_campus_name) && (
                    <div className={cn('mt-2 grid grid-cols-2 gap-x-4 gap-y-1', s.text.xs, 'text-muted-foreground')}>
                      {(log.previous_advisor_name || log.current_advisor_name) && (
                        <>
                          <div>原顾问: {log.previous_advisor_name || '-'}</div>
                          <div>现顾问: {log.current_advisor_name || '-'}</div>
                        </>
                      )}
                      {(log.previous_campus_name || log.current_campus_name) && (
                        <>
                          <div>原校区: {log.previous_campus_name || '-'}</div>
                          <div>现校区: {log.current_campus_name || '-'}</div>
                        </>
                      )}
                    </div>
                  )}
                </TimelineContent>
              </TimelineItem>
            )
          })}
        </Timeline>
      )}
    </div>
  )
}
