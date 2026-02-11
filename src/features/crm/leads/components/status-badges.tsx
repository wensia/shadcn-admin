/**
 * 线索状态和跟进结果标签组件
 * 封装 StatusBadge，提供便捷的使用方式
 */

import { StatusBadge } from '@/components/ui/status-badge'
import {
  getLeadStatusStyle,
  getFollowupResultStyle,
  getIntentionLevelStyle
} from '@/lib/status-styles'
import { LeadStatus, FollowupResult, IntentionLevel } from '../types'

interface LeadStatusBadgeProps {
  status: LeadStatus
  showDot?: boolean
  className?: string
}

/**
 * 线索状态标签
 * 直接传入状态值即可渲染对应样式的标签
 */
export function LeadStatusBadge({ status, showDot = true, className }: LeadStatusBadgeProps) {
  const config = getLeadStatusStyle(status)
  return (
    <StatusBadge
      label={config.label}
      color={config.color}
      showDot={showDot}
      className={className}
    />
  )
}

interface FollowupResultBadgeProps {
  result: FollowupResult
  showDot?: boolean
  className?: string
}

/**
 * 跟进结果标签
 * 直接传入结果值即可渲染对应样式的标签
 */
export function FollowupResultBadge({ result, showDot = true, className }: FollowupResultBadgeProps) {
  const config = getFollowupResultStyle(result)
  return (
    <StatusBadge
      label={config.label}
      color={config.color}
      showDot={showDot}
      className={className}
    />
  )
}

interface IntentionLevelBadgeProps {
  level: IntentionLevel
  showDot?: boolean
  className?: string
}

/**
 * 意向等级标签
 * 直接传入等级值即可渲染对应样式的标签
 */
export function IntentionLevelBadge({ level, showDot = true, className }: IntentionLevelBadgeProps) {
  const config = getIntentionLevelStyle(level)
  return (
    <StatusBadge
      label={config.label}
      color={config.color}
      showDot={showDot}
      className={className}
    />
  )
}
