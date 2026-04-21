/**
 * 中考志愿填报 - API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/client'
import type { PaginatedResponse } from '@/lib/api/types'

const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || '') : ''
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1'
const API_BASE = `${API_URL}/api/${API_VERSION}`

export interface SchoolWithDistrict {
  name: string
  district: string
  score: number
  rank: number
  is_my_district: boolean
}

export interface Recommendations {
  sprint: SchoolWithDistrict[]
  stable: SchoolWithDistrict[]
  safe: SchoolWithDistrict[]
}

export interface AnalysisResult {
  score: number
  districtRank: number
  targetScore: number
  cityRank: number
  recommendations: Recommendations
}

export async function analyzeScore(
  score: number,
  district: string,
  localOnly: boolean,
  accessTicket?: string
): Promise<AnalysisResult> {
  const body: Record<string, unknown> = {
    score,
    district,
    local_only: localOnly,
  }
  if (accessTicket) {
    body.access_ticket = accessTicket
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // 已登录用户带上 Bearer token 让后端识别身份
  if (!accessTicket) {
    const token = localStorage.getItem('access_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(`${API_BASE}/tools/zhongkao/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.success) {
    const err = new Error(json.message || '分析失败')
    ;(err as Error & { code?: string }).code = json.code
    throw err
  }
  const d = json.data
  return {
    score: d.score,
    districtRank: d.district_rank,
    targetScore: d.target_score,
    cityRank: d.city_rank,
    recommendations: d.recommendations,
  }
}

// ─── 管理端 API ──────────────────────────────────────────────────────────

const ADMIN_BASE = '/tools/zhongkao/admin'

export interface AnalysisRecordItem {
  id: string
  score: number
  district: string
  local_only: boolean
  district_rank: number
  target_score: number
  city_rank: number
  auth_type: string
  user_name: string | null
  redemption_code: string | null
  client_ip: string | null
  created_at: string
}

export async function listAnalysisRecords(params?: {
  page?: number
  size?: number
  auth_type?: string
  district?: string
}): Promise<ApiResponse<PaginatedResponse<AnalysisRecordItem>>> {
  return apiClient.get(ADMIN_BASE + '/records', { params })
}
