import { apiClient } from '@/lib/api/client'
import { unwrapData, type ApiResponse } from '@/lib/api/types'

// ============================================================================
// 跟进结果统计
// ============================================================================

export interface FollowupResultCount {
  result: string
  result_label: string
  count: number
}

export interface AdvisorFollowupResultStats {
  advisor_id: string
  advisor_name: string
  campus_name?: string | null
  total_followups: number
  result_counts: FollowupResultCount[]
}

export interface AdvisorFollowupResultStatsResponse {
  stats: AdvisorFollowupResultStats[]
  total_advisors: number
}

// ============================================================================
// 回访线索来源渠道统计
// ============================================================================

export interface ChannelCount {
  channel_id?: string | null
  channel_name: string
  channel_category?: string | null
  count: number
}

export interface AdvisorLeadChannelStats {
  advisor_id: string
  advisor_name: string
  campus_name?: string | null
  total_leads: number
  channel_counts: ChannelCount[]
}

export interface AdvisorLeadChannelStatsResponse {
  stats: AdvisorLeadChannelStats[]
  total_advisors: number
}

// ============================================================================
// API 调用
// ============================================================================

interface StatsQueryParams {
  date_from: string
  date_to: string
  campus_id?: string
}

export async function getFollowupResultStats(
  params: StatsQueryParams,
): Promise<AdvisorFollowupResultStatsResponse> {
  const res = await apiClient.get<ApiResponse<AdvisorFollowupResultStatsResponse>>(
    '/advisor-stats/followup-result-stats',
    { params },
  )
  return unwrapData(res)
}

export async function getLeadChannelStats(
  params: StatsQueryParams,
): Promise<AdvisorLeadChannelStatsResponse> {
  const res = await apiClient.get<ApiResponse<AdvisorLeadChannelStatsResponse>>(
    '/advisor-stats/lead-channel-stats',
    { params },
  )
  return unwrapData(res)
}
