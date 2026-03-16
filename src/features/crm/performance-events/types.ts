/**
 * 业绩结果事实类型定义
 */

export enum PerformanceEventType {
  SIGNUP = 'signup',
  RENEWAL = 'renewal',
  REFUND = 'refund',
}

export enum PerformanceEventSource {
  SYNC = 'sync',
  MANUAL = 'manual',
}

export const performanceEventTypeLabels: Record<PerformanceEventType, string> = {
  [PerformanceEventType.SIGNUP]: '报名',
  [PerformanceEventType.RENEWAL]: '续费',
  [PerformanceEventType.REFUND]: '退费',
}

export const performanceEventTypeColors: Record<PerformanceEventType, 'green' | 'blue' | 'red'> = {
  [PerformanceEventType.SIGNUP]: 'green',
  [PerformanceEventType.RENEWAL]: 'blue',
  [PerformanceEventType.REFUND]: 'red',
}

export const performanceEventSourceLabels: Record<PerformanceEventSource, string> = {
  [PerformanceEventSource.SYNC]: '系统同步',
  [PerformanceEventSource.MANUAL]: '人工登记',
}

export const performanceEventTypeOptions = Object.entries(performanceEventTypeLabels).map(([value, label]) => ({
  value,
  label,
}))

export interface PerformanceEvent {
  id: string
  lead_id?: string | null
  student_name_snapshot?: string | null
  parent_phone_snapshot?: string | null
  child_name?: string | null
  parent_phone?: string | null
  advisor_id?: string | null
  advisor_name?: string | null
  campus_id?: string | null
  campus_name?: string | null
  owner_campus_id?: string | null
  owner_campus_name?: string | null
  event_type: PerformanceEventType
  event_type_display: string
  amount: number
  signed_amount?: number | null
  event_at: string
  contract_no?: string | null
  remark?: string | null
  external_source_system?: string | null
  external_event_id?: string | null
  created_mode: PerformanceEventSource
  created_mode_display: string
  created_at: string
  updated_at: string
  created_by_id?: string | null
  created_by_name?: string | null
}

export interface PerformanceEventCreate {
  lead_id?: string | null
  student_name_snapshot?: string
  parent_phone_snapshot?: string
  advisor_id?: string | null
  campus_id?: string | null
  event_type: PerformanceEventType
  amount: number
  event_at: string
  contract_no?: string
  remark?: string
}

export interface PerformanceEventUpdate {
  lead_id?: string | null
  student_name_snapshot?: string
  parent_phone_snapshot?: string
  advisor_id?: string | null
  campus_id?: string | null
  event_type?: PerformanceEventType
  amount?: number
  event_at?: string
  contract_no?: string
  remark?: string
}

export interface PerformanceEventUpsert extends PerformanceEventCreate {
  external_source_system: string
  external_event_id: string
  created_mode?: PerformanceEventSource
}

export interface PerformanceEventListParams {
  page?: number
  size?: number
  keyword?: string
  event_type?: PerformanceEventType
  campus_id?: string
  advisor_id?: string
  date_from?: string
  date_to?: string
}

export interface PerformanceEventStats {
  signup_count: number
  signup_amount: number
  renewal_count: number
  renewal_amount: number
  refund_count: number
  refund_amount: number
  net_amount: number
}
