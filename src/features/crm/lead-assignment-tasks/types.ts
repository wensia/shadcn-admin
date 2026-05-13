import type {
  FollowupResult,
  Grade,
  IntentionLevel,
  LeadStatus,
} from '../leads/types'

export type LeadAssignmentTaskStatus = 'active' | 'completed' | 'cancelled'
export type TaskCompletionStatus = 'all' | 'completed' | 'pending' | 'skipped'

export interface TaskPerson {
  id: string
  name: string
}

export interface LeadAssignmentTaskFollowupResultStat {
  result: FollowupResult
  count: number
}

export interface LeadAssignmentTask {
  id: string
  name: string
  status: LeadAssignmentTaskStatus
  total_leads: number
  completed_count: number
  skipped_count: number
  closed_count: number
  pending_count: number
  completion_rate: number
  task_progress_rate: number
  latest_followup_at?: string | null
  completed_at?: string | null
  completed_duration_seconds?: number | null
  followup_result_stats?: LeadAssignmentTaskFollowupResultStat[]
  created_at: string
  advisor: TaskPerson
  created_by: TaskPerson
}

export interface LeadAssignmentTaskSummary extends LeadAssignmentTask {
  remark?: string | null
  updated_at: string
}

export interface LeadAssignmentTaskItem {
  id: string
  lead_id: string
  child_name?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  source_channel_name?: string | null
  status: LeadStatus
  intention_level?: IntentionLevel | null
  grade?: Grade | null
  advisor_name?: string | null
  owner_campus_name?: string | null
  completion_status: Exclude<TaskCompletionStatus, 'all'>
  completed_at?: string | null
  last_followup_result?: FollowupResult | null
  skipped_at?: string | null
  skipped_reason?: string | null
  next_followup_at?: string | null
  created_at: string
}

export interface LeadAssignmentTaskListParams {
  page?: number
  size?: number
  keyword?: string
  advisor_id?: string
  status?: LeadAssignmentTaskStatus
  created_from?: string
  created_to?: string
}

export interface LeadAssignmentTaskCreatePayload {
  name: string
  advisor_id: string
  lead_ids: string[]
  remark?: string
}

export interface LeadAssignmentTaskConflictItem {
  lead_id: string
  child_name?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  task_id: string
  task_name: string
}

export const taskStatusLabels: Record<LeadAssignmentTaskStatus, string> = {
  active: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

export const completionStatusLabels: Record<TaskCompletionStatus, string> = {
  all: '全部',
  completed: '已回访',
  pending: '未回访',
  skipped: '已跳过',
}

export const skippedReasonLabels: Record<string, string> = {
  released_to_pool: '已释放到公海',
  reassigned: '已重新分配',
  lead_deleted: '线索已删除',
  not_current_advisor: '已不属于原负责人',
  historical_repair: '历史数据修复',
}
