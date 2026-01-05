/**
 * 全局状态样式配置
 * 使用 Anthropic 品牌色统一管理线索状态、跟进结果、意向等级的标签样式
 *
 * Anthropic 品牌色:
 * - Orange: #d97757 (主要强调色) - 用于需要关注/行动/进行中的状态
 * - Green: #788c5d (次要强调色) - 用于成功/正向的状态
 * - Gray: #b0aea5 (次要元素) - 用于中性/已完成的状态
 * - Red: 危险色 - 用于无效/负面的状态
 */

import {
  LeadStatus,
  FollowupResult,
  IntentionLevel,
} from '@/features/crm/leads/types'
import type { StatusColor } from '@/components/ui/status-badge'

// 样式配置接口
export interface StatusStyleConfig {
  label: string
  color: StatusColor
}

// ==================== 线索状态样式映射 ====================
export const leadStatusStyles: Record<LeadStatus, StatusStyleConfig> = {
  [LeadStatus.PENDING_ASSIGN]: { label: '待分配', color: 'orange' },
  [LeadStatus.PENDING_FOLLOWUP]: { label: '待回访', color: 'orange' },
  [LeadStatus.FOLLOWING_UP]: { label: '跟进中', color: 'orange' },
  [LeadStatus.FOLLOWED_UP]: { label: '已回访', color: 'gray' },
  [LeadStatus.TRIAL_SCHEDULED]: { label: '已预约试听', color: 'orange' },
  [LeadStatus.VISITED]: { label: '已到访', color: 'green' },
  [LeadStatus.PAID]: { label: '已缴费', color: 'green' },
  [LeadStatus.INVALID]: { label: '无效', color: 'red' },
  [LeadStatus.CLOSED]: { label: '关闭', color: 'gray' }
}

// ==================== 跟进结果样式映射 ====================
export const followupResultStyles: Record<FollowupResult, StatusStyleConfig> = {
  [FollowupResult.NOT_CONNECTED]: { label: '未接通', color: 'orange' },
  [FollowupResult.HUNG_UP]: { label: '秒挂', color: 'red' },
  [FollowupResult.NO_NEED]: { label: '不需要', color: 'red' },
  [FollowupResult.WRONG_NUMBER]: { label: '空错号', color: 'red' },
  [FollowupResult.YUNKE_RISK_CONTROL]: { label: '云客风控', color: 'red' },
  [FollowupResult.NO_CHILD]: { label: '没孩子', color: 'red' },
  [FollowupResult.AGE_MISMATCH]: { label: '年龄不符', color: 'red' },
  [FollowupResult.TEMPORARILY_UNAVAILABLE]: { label: '暂时不便接听', color: 'orange' },
  [FollowupResult.CAN_CONTINUE]: { label: '可持续跟进', color: 'orange' },
  [FollowupResult.APPOINTMENT_SCHEDULED]: { label: '预约到访', color: 'green' },
  [FollowupResult.WECHAT_ADDED]: { label: '添加微信', color: 'green' },
  [FollowupResult.OTHER]: { label: '其他', color: 'gray' }
}

// ==================== 意向等级样式映射 ====================
export const intentionLevelStyles: Record<IntentionLevel, StatusStyleConfig> = {
  [IntentionLevel.HIGH]: { label: '高意向', color: 'green' },
  [IntentionLevel.MEDIUM]: { label: '中等', color: 'orange' },
  [IntentionLevel.LOW]: { label: '低意向', color: 'gray' }
}

// ==================== 工具函数 ====================

/**
 * 获取线索状态样式配置
 */
export function getLeadStatusStyle(status: LeadStatus): StatusStyleConfig {
  return leadStatusStyles[status] || { label: status, color: 'gray' }
}

/**
 * 获取跟进结果样式配置
 */
export function getFollowupResultStyle(result: FollowupResult): StatusStyleConfig {
  return followupResultStyles[result] || { label: result, color: 'gray' }
}

/**
 * 获取意向等级样式配置
 */
export function getIntentionLevelStyle(level: IntentionLevel): StatusStyleConfig {
  return intentionLevelStyles[level] || { label: level, color: 'gray' }
}

/**
 * 获取线索状态的颜色
 */
export function getLeadStatusColor(status: LeadStatus): StatusColor {
  return getLeadStatusStyle(status).color
}

/**
 * 获取跟进结果的颜色
 */
export function getFollowupResultColor(result: FollowupResult): StatusColor {
  return getFollowupResultStyle(result).color
}

/**
 * 获取意向等级的颜色
 */
export function getIntentionLevelColor(level: IntentionLevel): StatusColor {
  return getIntentionLevelStyle(level).color
}
