import type { LeadStatus } from '@/features/crm/leads/types'

export type LeadPaymentException =
  | 'missing_phone'
  | 'paid_without_front_payment'
  | 'missing_advisor'
  | 'missing_channel'

export interface LeadPaymentLedgerSummary {
  total: number
  promised: number
  visited: number
  paid: number
  front_payment_amount: number
}

export interface LeadPaymentLedgerItem {
  id: string
  registered_at: string
  campus_id?: string | null
  campus_name?: string | null
  channel_id?: string | null
  channel_name?: string | null
  parttime_id?: string | null
  parttime_name?: string | null
  advisor_id?: string | null
  advisor_name?: string | null
  customer_name?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  grade?: string | null
  grade_label?: string | null
  status: LeadStatus | string
  status_label: string
  promised: boolean
  promised_at?: string | null
  visited: boolean
  visited_at?: string | null
  paid: boolean
  front_payment_amount: number
  latest_front_payment_at?: string | null
  exception_flags: LeadPaymentException[]
}

export interface LeadPaymentLedgerResponse {
  summary: LeadPaymentLedgerSummary
  items: LeadPaymentLedgerItem[]
  total: number
  page: number
  size: number
}

export interface LeadPaymentDashboardSummary {
  total_leads: number
  valid_leads: number
  promised_leads: number
  visited_leads: number
  paid_leads: number
  front_payment_amount: number
}

export interface LeadPaymentGroupStat {
  id?: string | null
  name: string
  lead_count: number
  valid_lead_count: number
  promised_count: number
  visited_count: number
  paid_lead_count: number
  front_payment_amount: number
}

export interface LeadPaymentMonthlyStat {
  month: string
  payment_count: number
  paid_lead_count: number
  front_payment_amount: number
}

export interface LeadPaymentDashboardResponse {
  summary: LeadPaymentDashboardSummary
  parttime_stats: LeadPaymentGroupStat[]
  advisor_stats: LeadPaymentGroupStat[]
  monthly_front_payments: LeadPaymentMonthlyStat[]
  channel_stats: LeadPaymentGroupStat[]
}

export interface LeadPaymentLedgerParams {
  page?: number
  size?: number
  date_from?: string
  date_to?: string
  owner_campus_id?: string
  advisor_id?: string
  source_channel_id?: string
  parttime_id?: string
  keyword?: string
  promised?: boolean
  visited?: boolean
  paid?: boolean
  exception?: LeadPaymentException | ''
}

export type LeadPaymentDashboardParams = Omit<
  LeadPaymentLedgerParams,
  'page' | 'size' | 'promised' | 'visited' | 'paid' | 'exception'
>

export interface LeadPaymentFilterOption {
  id: string
  name: string
  username?: string | null
  category?: string | null
}

export interface LeadPaymentFilters {
  dateRange: [string, string] | null
  campusId: string
  advisorId: string
  channelId: string
  parttimeId: string
  keyword: string
  promised: '' | 'yes' | 'no'
  visited: '' | 'yes' | 'no'
  paid: '' | 'yes' | 'no'
  exception: LeadPaymentException | ''
}

export const exceptionLabels: Record<LeadPaymentException, string> = {
  missing_phone: '手机号为空',
  paid_without_front_payment: '已缴费无前端缴费',
  missing_advisor: '无咨询师',
  missing_channel: '无渠道',
}

export const yesNoOptions = [
  { value: '', label: '全部' },
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' },
] as const
