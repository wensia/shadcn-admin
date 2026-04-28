/**
 * 线索状态和跟进结果标签组件
 * Semi Design 版本 - 使用 Tag 替代 StatusBadge
 */

import { Tag } from '@douyinfe/semi-ui-19'
import type { SemiTagColor } from '@/lib/semi-types'
import {
  leadStatusLabels,
  intentionLevelLabels,
  followupResultLabels,
  type LeadStatus,
  type FollowupResult,
  type IntentionLevel,
} from '../types'

/* ── 状态颜色映射 ── */
const statusColorMap: Record<string, SemiTagColor> = {
  pending_assign: 'orange',
  pending_followup: 'amber',
  following_up: 'blue',
  followed_up: 'cyan',
  trial_scheduled: 'violet',
  visited: 'green',
  paid: 'green',
  invalid: 'red',
  closed: 'grey',
}

const intentionColorMap: Record<string, SemiTagColor> = {
  high: 'red',
  medium: 'orange',
  low: 'grey',
}

const followupResultColorMap: Record<string, SemiTagColor> = {
  not_connected: 'grey',
  hung_up: 'red',
  no_need: 'red',
  wrong_number: 'red',
  yunke_risk_control: 'orange',
  no_child: 'grey',
  age_mismatch: 'grey',
  temporarily_unavailable: 'amber',
  can_continue: 'blue',
  appointment_scheduled: 'green',
  wechat_added: 'cyan',
  other: 'grey',
}

interface LeadStatusBadgeProps {
  status: LeadStatus
  className?: string
  showDot?: boolean
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <Tag
      color={statusColorMap[status] || 'grey'}
      shape="circle"
      className={className}
    >
      {leadStatusLabels[status] || status}
    </Tag>
  )
}

interface FollowupResultBadgeProps {
  result: FollowupResult
  className?: string
}

export function FollowupResultBadge({ result, className }: FollowupResultBadgeProps) {
  return (
    <Tag
      color={followupResultColorMap[result] || 'grey'}
      shape="circle"
      className={className}
    >
      {followupResultLabels[result] || result}
    </Tag>
  )
}

interface IntentionLevelBadgeProps {
  level: IntentionLevel
  className?: string
  showDot?: boolean
}

export function IntentionLevelBadge({ level, className }: IntentionLevelBadgeProps) {
  return (
    <Tag
      color={intentionColorMap[level] || 'grey'}
      shape="circle"
      className={className}
    >
      {intentionLevelLabels[level] || level}
    </Tag>
  )
}
