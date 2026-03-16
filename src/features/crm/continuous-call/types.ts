/**
 * 快捷外呼类型定义
 */

import type { IntentionLevel, Grade } from '../leads/types'

/**
 * 渠道统计信息
 */
export interface ChannelStats {
  channel_id: string
  channel_name: string
  lead_count: number
}

/**
 * 分配任务简要信息
 */
export interface TaskBriefItem {
  id: string
  name: string
  lead_count: number
}

/**
 * 快捷外呼统计响应
 */
export interface ContinuousCallStats {
  total_leads: number
  channels: ChannelStats[]
  tasks: TaskBriefItem[]
  advisor_id: string
  advisor_name: string
}

/**
 * 快捷外呼线索信息
 */
export interface ContinuousCallLead {
  id: string
  child_name?: string
  parent_phone: string
  phone?: string // 兼容字段
  age?: number
  grade?: string
  child_gender?: string
  school_name?: string
  province?: string
  city?: string
  district?: string
  address_detail?: string
  source_channel_id?: string
  source_channel_name?: string
  note?: string
  last_followup_time?: string
  next_followup_time?: string
  intention_level?: IntentionLevel
  status?: string  // 线索状态
  advisor_id?: string  // 顾问ID
  created_at: string
}

/**
 * 快捷外呼线索列表响应
 */
export interface ContinuousCallLeadsResponse {
  items: ContinuousCallLead[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * 快捷外呼查询参数
 */
export interface ContinuousCallLeadsParams {
  channel_id?: string
  task_id?: string
  page?: number
  page_size?: number
}

/**
 * 跟进表单数据
 */
export interface FollowupFormData {
  lead_id: string
  followup_method: string
  followup_result: string
  followup_content: string
  next_followup_time?: string
  intention_level?: IntentionLevel
  wechat_added?: boolean
  appointment_time?: number | null
}

/**
 * 跟进详情表单数据
 */
export interface FollowupDetailsFormData {
  age: number | null
  grade: Grade | null
  gender: '' | 'male' | 'female'
  school_name: string
  study_status: string
  region: {
    province?: string
    city?: string
    area?: string
  }
  address_detail: string
  remark: string
}

/**
 * 跟进结果分组
 */
export interface FollowupResultOption {
  label: string
  value: string
}

export interface FollowupResultGroups {
  continuing: FollowupResultOption[]
  releaseToPool: FollowupResultOption[]
  statusOnly: FollowupResultOption[]
}
