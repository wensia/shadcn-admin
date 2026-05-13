import type { SemiTagColor } from '@/lib/semi-types'

export type DirectVisitLeadStatus =
  | 'pending_assign'
  | 'assigned'
  | 'activation_failed'
  | 'duplicate'
  | 'invalid'
  | 'error'

export type DirectVisitReceptionStatus = 'not_received' | 'received'

export type DirectVisitReceptionResult =
  | 'high_intent'
  | 'medium_intent'
  | 'low_intent'
  | 'no_intent'
  | 'invalid'
  | 'converted'

export interface DirectVisitExistingLeadInfo {
  id: string
  child_name?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  status?: string | null
  owner_campus_id?: string | null
  owner_campus_name?: string | null
  advisor_id?: string | null
  advisor_name?: string | null
  created_at?: string | null
  activated_at?: string | null
}

export interface DirectVisitReceptionInfo {
  id: string
  direct_visit_lead_id: string
  visitor_name?: string | null
  visitor_relation?: string | null
  has_child_present: boolean
  visited_at?: string | null
  receptionist_id?: string | null
  receptionist_name?: string | null
  reception_status: DirectVisitReceptionStatus
  reception_result?: DirectVisitReceptionResult | null
  concern_tags: string[]
  questions: string[]
  reception_notes?: string | null
  next_action?: string | null
  next_followup_at?: string | null
  created_at: string
  updated_at: string
}

export interface DirectVisitReceptionRequest {
  visitor_name?: string | null
  visitor_relation?: string | null
  has_child_present: boolean
  visited_at?: string | null
  receptionist_id?: string | null
  reception_status: DirectVisitReceptionStatus
  reception_result?: DirectVisitReceptionResult | null
  concern_tags: string[]
  questions: string[]
  reception_notes?: string | null
  next_action?: string | null
  next_followup_at?: string | null
}

export interface DirectVisitReceptionUpsertResult {
  reception: DirectVisitReceptionInfo
  synced_to_lead: boolean
}

export interface DirectVisitReceptionistItem {
  id: string
  name: string
  username: string
  phone?: string | null
  campus_name?: string | null
  department_name?: string | null
  position_name?: string | null
}

export interface DirectVisitLeadItem {
  id: string
  created_at: string
  campus_id: string
  campus_name: string
  source_channel_id: string
  source_channel_name: string
  lead_id?: string | null
  existing_lead_id?: string | null
  submit_status: string
  status: DirectVisitLeadStatus
  parent_phone?: string | null
  phone_masked: string
  parent_name?: string | null
  child_name?: string | null
  grade?: string | null
  school_name?: string | null
  message?: string | null
  failure_reason?: string | null
  lead_status?: string | null
  advisor_id?: string | null
  advisor_name?: string | null
  owner_campus_name?: string | null
  assigned_at?: string | null
  reception_status?: DirectVisitReceptionStatus | null
  reception_result?: DirectVisitReceptionResult | null
  receptionist_name?: string | null
  visited_at?: string | null
}

export interface DirectVisitLeadDetail extends DirectVisitLeadItem {
  notes?: string | null
  submitter_name?: string | null
  existing_lead?: DirectVisitExistingLeadInfo | null
  reception?: DirectVisitReceptionInfo | null
}

export interface DirectVisitLeadAccess {
  can_access: boolean
}

export interface DirectVisitCampusTokenItem {
  campus_id: string
  campus_name: string
  is_active: boolean
  operation_assistant_id?: string | null
  operation_assistant_name?: string | null
  token?: string | null
  updated_at?: string | null
}

export interface DirectVisitCampusTokensResponse {
  channel_id: string
  channel_name: string
  items: DirectVisitCampusTokenItem[]
}

export interface DirectVisitLeadParams {
  page?: number
  size?: number
  campus_id?: string
  status?: DirectVisitLeadStatus
  search?: string
  date_from?: string
  date_to?: string
}

export const directVisitStatusConfig: Record<
  DirectVisitLeadStatus,
  { label: string; color: SemiTagColor }
> = {
  pending_assign: { label: '待分配', color: 'orange' },
  assigned: { label: '已分配', color: 'green' },
  activation_failed: { label: '激活失败', color: 'red' },
  duplicate: { label: '重复提交', color: 'grey' },
  invalid: { label: '无效', color: 'red' },
  error: { label: '错误', color: 'red' },
}

export const directVisitStatusOptions = Object.entries(directVisitStatusConfig).map(
  ([value, config]) => ({
    value,
    label: config.label,
  }),
)

export const directVisitReceptionStatusConfig: Record<
  DirectVisitReceptionStatus,
  { label: string; color: SemiTagColor }
> = {
  received: { label: '已接待', color: 'green' },
  not_received: { label: '未接待离开', color: 'grey' },
}

export const directVisitReceptionResultConfig: Record<
  DirectVisitReceptionResult,
  { label: string; color: SemiTagColor }
> = {
  high_intent: { label: '高意向', color: 'red' },
  medium_intent: { label: '中意向', color: 'orange' },
  low_intent: { label: '低意向', color: 'yellow' },
  no_intent: { label: '无意向', color: 'grey' },
  invalid: { label: '无效', color: 'grey' },
  converted: { label: '已转化', color: 'green' },
}

export const directVisitConcernOptions = [
  '价格',
  '距离',
  '时间',
  '效果',
  '师资',
  '班型',
  '孩子配合度',
  '竞品对比',
  '其他',
].map((label) => ({ label, value: label }))
