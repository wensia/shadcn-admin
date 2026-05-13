import axios from 'axios'
import type { LeadNoteTimelineEntry, SourceChannelExtraField } from '@/features/crm/leads/types'

const publicClient = axios.create({ baseURL: '/api/v1' })

export interface SubmitResultItem {
  phone: string
  status: 'created' | 'collision_taken' | 'collision_active' | 'duplicate' | 'invalid' | 'error'
  message: string
}

export interface ChannelSubmitResponse {
  results: SubmitResultItem[]
  summary: {
    total: number
    created: number
    collision_taken: number
    collision_active: number
    duplicate: number
    invalid: number
    error: number
  }
}

export interface ValidateTokenResponse {
  valid: boolean
  channel_name: string
  employee_name?: string
  require_campus_selection?: boolean
  campuses?: { id: string; name: string }[]
  extra_fields?: SourceChannelExtraField[]
}

export async function validateChannelToken(token: string) {
  const { data } = await publicClient.get('/public/leads/channel-validate', { params: { token } })
  // ApiResponse wrapper: { success, data, message }
  if (data.success === false) throw new Error(data.message || '验证失败')
  return data.data as ValidateTokenResponse
}

export async function submitChannelLeads(token: string, phones: string[], campusId?: string) {
  const body: Record<string, unknown> = { token, phones }
  if (campusId) body.campus_id = campusId
  const { data } = await publicClient.post('/public/leads/channel-submit', body)
  if (data.success === false) throw new Error(data.message || '提交失败')
  return data.data as ChannelSubmitResponse
}

/* ─── 单条表单提交 ─── */

export interface SingleLeadRequest {
  token: string
  parent_phone: string
  parent_name?: string
  notes?: string
  campus_id?: string
  advisor_id?: string
  extra_fields?: Record<string, string>
}

export interface SingleLeadResponse {
  phone: string
  status: SubmitResultItem['status']
  message: string
}

export async function submitSingleLead(data: SingleLeadRequest) {
  const { data: res } = await publicClient.post('/public/leads/channel-submit', data)
  if (res.success === false) throw new Error(res.message || '提交失败')
  return res.data as SingleLeadResponse
}

/* ─── 渠道提交统计 ─── */

export interface DailyStatItem {
  date: string
  total: number
  success: number
  created: number
  collision_taken: number
  collision_active: number
  duplicate: number
  invalid: number
  error: number
}

export interface ChannelStatsResponse {
  channel_name: string
  employee_name: string
  today_count: number
  today_success: number
  total_count: number
  total_success: number
  daily_stats: DailyStatItem[]
}

export async function fetchChannelStats(token: string) {
  const { data } = await publicClient.get('/public/leads/channel-stats', { params: { token } })
  if (data.success === false) throw new Error(data.message || '获取统计失败')
  return data.data as ChannelStatsResponse
}

/* ─── 校区员工查询 ─── */

export interface CampusEmployee {
  id: string
  name: string
}

export async function fetchCampusEmployees(campusId: string, token: string) {
  const { data } = await publicClient.get('/public/leads/campus-employees', {
    params: { campus_id: campusId, token },
  })
  if (data.success === false) throw new Error(data.message || '获取员工列表失败')
  return data.data as CampusEmployee[]
}

/* ─── 渠道数据看板 ─── */

export interface PortalLeadItem {
  id: string
  registered_at: string
  name_masked: string
  phone_masked: string
  notes: LeadNoteTimelineEntry[]
  source_extra_info: Record<string, string>
  status: string
  status_label: string
  validity: 'valid' | 'invalid' | 'pending'
  campus_name: string
  advisor_name: string
  owner_name: string
  followup_count: number
  latest_followup_result: string
  latest_followup_at: string
  next_action: string
}

export interface PortalLeadsResponse {
  items: PortalLeadItem[]
  total: number
  page: number
  size: number
  channel_name: string
}

export interface PortalLeadsParams {
  token: string
  page?: number
  size?: number
  date_from?: string
  date_to?: string
  validity?: 'valid' | 'invalid' | 'pending' | ''
}

export async function fetchPortalLeads(params: PortalLeadsParams) {
  const { data } = await publicClient.get('/public/leads/channel-portal', { params })
  if (data.success === false) throw new Error(data.message || '获取线索列表失败')
  return data.data as PortalLeadsResponse
}

export interface PortalStatsOverview {
  total: number
  valid: number
  invalid: number
  pending: number
  followed_up: number
}

export interface PortalOwnerStat {
  owner_name: string
  total: number
  valid: number
  invalid: number
  pending: number
  followed_up: number
}

export interface PortalDailyTrend {
  date: string
  total: number
  valid: number
  invalid: number
  pending: number
}

export interface PortalStatsResponse {
  channel_name: string
  overview: PortalStatsOverview
  by_owner: PortalOwnerStat[]
  daily_trend: PortalDailyTrend[]
}

export async function fetchPortalStats(
  token: string,
  dateFrom?: string,
  dateTo?: string
) {
  const params: Record<string, string> = { token }
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  const { data } = await publicClient.get('/public/leads/channel-portal-stats', { params })
  if (data.success === false) throw new Error(data.message || '获取统计数据失败')
  return data.data as PortalStatsResponse
}
