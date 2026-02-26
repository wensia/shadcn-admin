import axios from 'axios'
import type { SourceChannelExtraField } from '@/features/crm/leads/types'

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
  count: number
}

export interface ChannelStatsResponse {
  channel_name: string
  employee_name: string
  today_count: number
  total_count: number
  daily_stats: DailyStatItem[]
}

export async function fetchChannelStats(token: string) {
  const { data } = await publicClient.get('/public/leads/channel-stats', { params: { token } })
  if (data.success === false) throw new Error(data.message || '获取统计失败')
  return data.data as ChannelStatsResponse
}
