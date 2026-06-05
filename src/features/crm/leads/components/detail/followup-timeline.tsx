/**
 * FollowupTimeline 跟进记录时间轴组件 - Semi Design 版本
 */

import * as React from 'react'
import { Timeline, Tag, Avatar } from '@douyinfe/semi-ui-19'
import { IconMail } from '@douyinfe/semi-icons'
import { Phone, MessageSquare, Users, MessageCircle, Sparkles } from 'lucide-react'
import { formatTime, formatRelativeTime } from '@/lib/utils/time'
import { DialogBodySkeleton } from '@/components/semi/dialog-body-skeleton'
import { EmptyState } from './empty-state'
import { FollowupResultBadge } from '../status-badges'
import { followupMethodLabels, type LeadFollowup, type FollowupMethod, type FollowupResult } from '../../types'

interface FollowupTimelineProps {
  followups: LeadFollowup[]
  isLoading?: boolean
  className?: string
}

// 跟进方式对应的图标
const methodIcons: Record<FollowupMethod, React.ReactNode> = {
  phone: <Phone style={{ width: 14, height: 14 }} />,
  wechat: <MessageCircle style={{ width: 14, height: 14 }} />,
  face_to_face: <Users style={{ width: 14, height: 14 }} />,
  sms: <MessageSquare style={{ width: 14, height: 14 }} />,
  email: <IconMail style={{ fontSize: 14 }} />,
}

// 跟进结果 → Timeline dot color
function getDotColor(result?: FollowupResult): string {
  if (!result) return 'var(--semi-color-text-2)'
  const colorMap: Record<string, string> = {
    interested: '#00b42a',
    callback: '#00b42a',
    visited: '#00b42a',
    need_followup: '#ff7d00',
    not_interested: '#f53f3f',
    no_answer: '#86909c',
    wrong_number: '#86909c',
    will_consider: '#0077fa',
  }
  return colorMap[result] || 'var(--semi-color-text-2)'
}

// 将跟进记录按父子关系分组：父记录 + 子记录（AI补充）
function groupFollowups(followups: LeadFollowup[]): { parent: LeadFollowup; children: LeadFollowup[] }[] {
  const childMap = new Map<string, LeadFollowup[]>()
  const parents: LeadFollowup[] = []

  // 先收集所有 AI 补充记录
  for (const f of followups) {
    if (f.source === 'ai_supplement' && f.parent_followup_id) {
      const list = childMap.get(f.parent_followup_id) || []
      list.push(f)
      childMap.set(f.parent_followup_id, list)
    } else {
      parents.push(f)
    }
  }

  return parents.map((p) => ({
    parent: p,
    children: childMap.get(p.id) || [],
  }))
}

// 渲染单条跟进记录
function FollowupItem({ followup, isChild }: { followup: LeadFollowup; isChild?: boolean }) {
  return (
    <div style={isChild ? { marginLeft: 20, paddingLeft: 12, borderLeft: '2px solid var(--semi-color-primary-light-default)', marginTop: 8 } : undefined}>
      {/* 头部: AI标签 + 方式徽章 + 结果徽章 + 相对时间 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {followup.source === 'ai_auto' && (
          <Tag size="small" style={{ borderColor: '#c084fc', color: '#9333ea', background: '#faf5ff', gap: 2 }}>
            <Sparkles style={{ width: 10, height: 10 }} />
            AI
          </Tag>
        )}
        {followup.source === 'ai_supplement' && (
          <Tag size="small" style={{ borderColor: '#60a5fa', color: '#2563eb', background: '#eff6ff', gap: 2 }}>
            <Sparkles style={{ width: 10, height: 10 }} />
            AI 补充
          </Tag>
        )}
        <Tag size="small">{followupMethodLabels[followup.method]}</Tag>
        {followup.result && (
          <FollowupResultBadge result={followup.result} />
        )}
        <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginLeft: 'auto' }}>
          {formatRelativeTime(followup.followup_at)}
        </span>
      </div>

      {/* 跟进人信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <Avatar size="extra-extra-small" style={{ fontSize: 10 }}>
          {followup.followup_by_name?.[0] || '?'}
        </Avatar>
        <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
          {followup.followup_by_name} · {formatTime(followup.followup_at)}
        </span>
      </div>

      {/* 跟进内容 */}
      {followup.content && (
        <div style={{
          marginTop: 8,
          padding: '8px 12px',
          background: isChild ? 'var(--semi-color-primary-light-hover)' : 'var(--semi-color-fill-0)',
          borderRadius: 6,
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {followup.content}
        </div>
      )}

      {/* 附加信息 */}
      {(followup.result_remark || followup.next_action || followup.next_followup_at) && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--semi-color-text-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {followup.result_remark && (
            <p style={{ margin: 0 }}>
              <strong>结果备注:</strong> {followup.result_remark}
            </p>
          )}
          {followup.next_action && (
            <p style={{ margin: 0 }}>
              <strong>下一步行动:</strong> {followup.next_action}
            </p>
          )}
          {followup.next_followup_at && (
            <p style={{ margin: 0 }}>
              <strong>计划下次跟进:</strong> {formatTime(followup.next_followup_at)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function FollowupTimeline({
  followups,
  isLoading,
  className,
}: FollowupTimelineProps) {
  if (isLoading) {
    return (
      <div style={{ padding: '8px 0' }}>
        <DialogBodySkeleton variant="list" rows={4} compact />
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

  const grouped = React.useMemo(() => groupFollowups(followups), [followups])

  return (
    <Timeline className={className}>
      {grouped.map(({ parent, children }) => (
        <Timeline.Item
          key={parent.id}
          dot={
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: getDotColor(parent.result) + '20',
                color: getDotColor(parent.result),
              }}
            >
              {methodIcons[parent.method]}
            </div>
          }
        >
          <FollowupItem followup={parent} />
          {children.map((child) => (
            <FollowupItem key={child.id} followup={child} isChild />
          ))}
        </Timeline.Item>
      ))}
    </Timeline>
  )
}
