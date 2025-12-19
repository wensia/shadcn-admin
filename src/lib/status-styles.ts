/**
 * 全局状态样式配置
 * 统一管理线索状态、跟进结果、意向等级的标签样式
 */

import {
  LeadStatus,
  FollowupResult,
  IntentionLevel,
  type BadgeVariant
} from '@/features/crm/leads/types'

// 样式配置接口
export interface StatusStyleConfig {
  label: string
  variant: BadgeVariant
}

// ==================== 线索状态样式映射 ====================
export const leadStatusStyles: Record<LeadStatus, StatusStyleConfig> = {
  [LeadStatus.PENDING_ASSIGN]: { label: '待分配', variant: 'info' },
  [LeadStatus.PENDING_FOLLOWUP]: { label: '待回访', variant: 'warning' },
  [LeadStatus.FOLLOWING_UP]: { label: '跟进中', variant: 'default' },
  [LeadStatus.FOLLOWED_UP]: { label: '已回访', variant: 'secondary' },
  [LeadStatus.TRIAL_SCHEDULED]: { label: '已预约试听', variant: 'purple' },
  [LeadStatus.VISITED]: { label: '已到访', variant: 'success' },
  [LeadStatus.PAID]: { label: '已缴费', variant: 'success' },
  [LeadStatus.INVALID]: { label: '无效', variant: 'destructive' },
  [LeadStatus.CLOSED]: { label: '关闭', variant: 'outline' }
}

// ==================== 跟进结果样式映射 ====================
export const followupResultStyles: Record<FollowupResult, StatusStyleConfig> = {
  [FollowupResult.NOT_CONNECTED]: { label: '未接通', variant: 'warning' },
  [FollowupResult.HUNG_UP]: { label: '秒挂', variant: 'destructive' },
  [FollowupResult.NO_NEED]: { label: '不需要', variant: 'destructive' },
  [FollowupResult.WRONG_NUMBER]: { label: '空错号', variant: 'destructive' },
  [FollowupResult.YUNKE_RISK_CONTROL]: { label: '云客风控', variant: 'destructive' },
  [FollowupResult.NO_CHILD]: { label: '没孩子', variant: 'destructive' },
  [FollowupResult.AGE_MISMATCH]: { label: '年龄不符', variant: 'destructive' },
  [FollowupResult.TEMPORARILY_UNAVAILABLE]: { label: '暂时不便接听', variant: 'warning' },
  [FollowupResult.CAN_CONTINUE]: { label: '可持续跟进', variant: 'default' },
  [FollowupResult.APPOINTMENT_SCHEDULED]: { label: '预约到访', variant: 'success' },
  [FollowupResult.WECHAT_ADDED]: { label: '添加微信', variant: 'default' },
  [FollowupResult.OTHER]: { label: '其他', variant: 'secondary' }
}

// ==================== 意向等级样式映射 ====================
export const intentionLevelStyles: Record<IntentionLevel, StatusStyleConfig> = {
  [IntentionLevel.HIGH]: { label: '高意向', variant: 'success' },
  [IntentionLevel.MEDIUM]: { label: '中等', variant: 'warning' },
  [IntentionLevel.LOW]: { label: '低意向', variant: 'outline' }
}

// ==================== 工具函数 ====================

/**
 * 获取线索状态样式配置
 */
export function getLeadStatusStyle(status: LeadStatus): StatusStyleConfig {
  return leadStatusStyles[status] || { label: status, variant: 'outline' }
}

/**
 * 获取跟进结果样式配置
 */
export function getFollowupResultStyle(result: FollowupResult): StatusStyleConfig {
  return followupResultStyles[result] || { label: result, variant: 'outline' }
}

/**
 * 获取意向等级样式配置
 */
export function getIntentionLevelStyle(level: IntentionLevel): StatusStyleConfig {
  return intentionLevelStyles[level] || { label: level, variant: 'outline' }
}

/**
 * 获取线索状态的 Badge variant
 */
export function getLeadStatusVariant(status: LeadStatus): BadgeVariant {
  return getLeadStatusStyle(status).variant
}

/**
 * 获取跟进结果的 Badge variant
 */
export function getFollowupResultVariant(result: FollowupResult): BadgeVariant {
  return getFollowupResultStyle(result).variant
}

/**
 * 获取意向等级的 Badge variant
 */
export function getIntentionLevelVariant(level: IntentionLevel): BadgeVariant {
  return getIntentionLevelStyle(level).variant
}
