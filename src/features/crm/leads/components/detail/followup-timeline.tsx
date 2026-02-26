/**
 * FollowupTimeline 跟进记录时间轴组件
 * 使用时间轴样式展示跟进历史
 */

import * as React from 'react'
import { Phone, MessageSquare, Users, Mail, MessageCircle, Sparkles } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatTime, formatRelativeTime } from '@/lib/utils/time'
import { getFollowupResultStyle } from '@/lib/status-styles'
import { EmptyState } from './empty-state'
import { FollowupResultBadge } from '../status-badges'
import type { LeadFollowup, FollowupMethod, FollowupResult } from '../../types'
import { followupMethodLabels } from '../../types'

interface FollowupTimelineProps {
  followups: LeadFollowup[]
  isLoading?: boolean
  className?: string
}

// 跟进方式对应的图标
const methodIcons: Record<FollowupMethod, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  wechat: <MessageCircle className="h-4 w-4" />,
  face_to_face: <Users className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
}

// 跟进结果对应的节点颜色（基于新的颜色系统）
function getNodeVariant(result?: FollowupResult): 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
  if (!result) return 'muted'

  const style = getFollowupResultStyle(result)
  switch (style.color) {
    case 'green':
    case 'emerald':
      return 'success'
    case 'amber':
      return 'warning'
    case 'red':
      return 'destructive'
    case 'blue':
    case 'cyan':
      return 'info'
    default:
      return 'default'
  }
}

export function FollowupTimeline({
  followups,
  isLoading,
  className,
}: FollowupTimelineProps) {
  const s = useStyleClasses()

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', s.text.xs, 'text-muted-foreground')}>
        加载中...
      </div>
    )
  }

  if (!followups || followups.length === 0) {
    return (
      <EmptyState
        icon={<Phone />}
        title="暂无跟进记录"
        description="点击右上角「新建跟进」添加首次跟进"
      />
    )
  }

  return (
    <Timeline className={className}>
      {followups.map((followup, index) => {
        const isLast = index === followups.length - 1

        return (
          <TimelineItem key={followup.id}>
            <TimelineNode
              variant={getNodeVariant(followup.result)}
              icon={methodIcons[followup.method]}
              showConnector={!isLast}
            />
            <TimelineContent>
              {/* 头部: AI标签 + 方式徽章 + 结果徽章 + 相对时间 */}
              <TimelineHeader>
                {followup.source === 'ai_auto' && (
                  <Badge variant="outline" className={cn(s.text.xs, s.height.badge, 'border-purple-300 text-purple-600 bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:bg-purple-950/30 gap-0.5')}>
                    <Sparkles className="h-2.5 w-2.5" />
                    AI
                  </Badge>
                )}
                <Badge variant="outline" className={cn(s.text.xs, s.height.badge)}>
                  {followupMethodLabels[followup.method]}
                </Badge>
                {followup.result && (
                  <FollowupResultBadge
                    result={followup.result}
                    className={cn(s.text.xs, s.height.badge)}
                  />
                )}
                <span className={cn(s.text.xs, 'text-muted-foreground ml-auto')}>
                  {formatRelativeTime(followup.followup_at)}
                </span>
              </TimelineHeader>

              {/* 跟进人信息 */}
              <div className="flex items-center gap-2 mt-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className={cn(s.text.xs)}>
                    {followup.followup_by_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <TimelineDescription>
                  {followup.followup_by_name} · {formatTime(followup.followup_at)}
                </TimelineDescription>
              </div>

              {/* 跟进内容 */}
              {followup.content && (
                <TimelineBody>
                  {followup.content}
                </TimelineBody>
              )}

              {/* 附加信息 */}
              {(followup.result_remark || followup.next_action || followup.next_followup_at) && (
                <div className={cn('mt-2 space-y-1', s.text.xs, 'text-muted-foreground')}>
                  {followup.result_remark && (
                    <p>
                      <strong>结果备注:</strong> {followup.result_remark}
                    </p>
                  )}
                  {followup.next_action && (
                    <p>
                      <strong>下一步行动:</strong> {followup.next_action}
                    </p>
                  )}
                  {followup.next_followup_at && (
                    <p>
                      <strong>计划下次跟进:</strong> {formatTime(followup.next_followup_at)}
                    </p>
                  )}
                </div>
              )}
            </TimelineContent>
          </TimelineItem>
        )
      })}
    </Timeline>
  )
}
