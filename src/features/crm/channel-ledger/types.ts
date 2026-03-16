import type {
  Grade,
  LeadStatus,
  SourceChannelExtraField,
} from '@/features/crm/leads/types'

export type ChannelLedgerValidity = 'valid' | 'invalid' | 'pending'

export interface ChannelLedgerSummary {
  total: number
  pending: number
  followed_up: number
  promised: number
  visited: number
  paid: number
}

export interface ChannelLedgerFollowupSnapshot {
  index: number
  followup_at?: string | null
  result?: string | null
  result_label?: string | null
  content?: string | null
  next_action?: string | null
}

export interface ChannelLedgerItem {
  id: string
  registered_at: string
  campus_name?: string | null
  channel_id?: string | null
  channel_name?: string | null
  customer_name?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  advisor_name?: string | null
  owner_name?: string | null
  grade?: Grade | null
  grade_label?: string | null
  status: LeadStatus | string
  status_label?: string | null
  validity?: ChannelLedgerValidity | null
  validity_label?: string | null
  notes?: string | null
  recent_followups?: ChannelLedgerFollowupSnapshot[] | null
  followup_snapshots?: ChannelLedgerFollowupSnapshot[] | null
  promised?: boolean | null
  promised_at?: string | null
  visited?: boolean | null
  visited_at?: string | null
  trial_mode?: string | null
  subject_count?: number | null
  deposit?: number | null
  dynamic_values?: Record<string, unknown> | null
  source_extra_info?: Record<string, unknown> | null
}

export interface ChannelLedgerResponse {
  summary: ChannelLedgerSummary
  dynamic_columns: SourceChannelExtraField[]
  items: ChannelLedgerItem[]
  total: number
  page: number
  size: number
}

export interface ChannelLedgerParams {
  page?: number
  size?: number
  date_from?: string
  date_to?: string
  owner_campus_id?: string
  advisor_id?: string
  source_channel_id?: string
  keyword?: string
  validity?: ChannelLedgerValidity | ''
  status?: LeadStatus | ''
  has_followup?: boolean
  promised?: boolean
  visited?: boolean
  paid?: boolean
}

export interface PersistedLedgerFilters {
  dateRange: [string, string] | null
  campusId: string
  advisorId: string
  channelId: string
  keyword: string
  validity: ChannelLedgerValidity | ''
  status: LeadStatus | ''
  hasFollowup: '' | 'yes' | 'no'
  promised: '' | 'yes' | 'no'
  visited: '' | 'yes' | 'no'
  paid: '' | 'yes' | 'no'
}

export const channelLedgerValidityLabels: Record<ChannelLedgerValidity, string> = {
  valid: '有效',
  invalid: '无效',
  pending: '待处理',
}

export const yesNoFilterOptions = [
  { value: '', label: '全部' },
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' },
] as const
