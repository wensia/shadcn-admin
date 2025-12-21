/**
 * 公海线索类型定义
 */

import type { IntentionLevel, LeadStatus } from '../leads/types'

/**
 * 公海线索列表项
 */
export interface LeadPoolItem {
  // 线索基本信息
  id: string
  child_name?: string
  child_gender?: string
  child_birthday?: string
  parent_name?: string
  parent_phone: string
  parent_wechat?: string
  age: number
  intention_level?: IntentionLevel
  status: LeadStatus

  // 来源信息
  source_channel_id: string
  source_channel_name?: string
  source_detail?: string

  // 公海信息
  campus_id: string
  campus_name?: string
  pooled_at: string
  pooled_by_id: string
  pooled_by_name?: string
  pool_reason: string
  pool_remark?: string
  previous_advisor_name?: string
  days_in_pool: number
  is_claimable: boolean
  priority_score: number

  // 创建信息
  created_at: string
  created_by_name?: string

  // 跟进信息
  followup_count: number
  last_followup_at?: string

  // 标签和星标
  tag?: string
  is_starred?: boolean
}

/**
 * 公海线索查询参数
 */
export interface LeadPoolListParams {
  page?: number
  size?: number
  search?: string
  intention_level?: IntentionLevel
  is_claimable?: boolean
  days_in_pool_min?: number
  days_in_pool_max?: number
  sort_by?: string
  sort_desc?: boolean
}

/**
 * 从公海领取线索请求
 */
export interface ClaimFromPoolRequest {
  force_cross_campus?: boolean
  allow_reclaim?: boolean
  claim_reason?: string
}

/**
 * 批量从公海领取线索请求
 */
export interface BatchClaimFromPoolRequest {
  lead_ids: string[]
  force_cross_campus?: boolean
  allow_reclaim?: boolean
  claim_reason?: string
}

/**
 * 分页响应
 */
export interface LeadPoolListResponse {
  items: LeadPoolItem[]
  total: number
  page: number
  size: number
  pages: number
}
