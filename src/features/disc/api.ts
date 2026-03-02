/**
 * DISC 测试 API
 */
import axios from 'axios'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type {
  DISCTestSubmitData,
  TempDISCRecordListItem,
  TempDISCRecordDetail,
  PaginatedResponse,
} from './types'

// 公开 API 客户端（不需要认证）
const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || '') : ''
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1'

const publicClient = axios.create({
  baseURL: `${API_URL}/api/${API_VERSION}`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ============================================================================
// 公开 API（测试页面使用，不需要登录）
// ============================================================================

/** 验证 DISC 测试链接推荐人 */
export async function validateDiscTestRef(ref: string) {
  const { data } = await publicClient.get('/public/disc-test/validate-ref', { params: { ref } })
  return data
}

/** 验证 DISC 测试编码 */
export async function verifyDiscTest(testCode: string) {
  const { data } = await publicClient.post<{ valid: boolean; candidate_name?: string }>(
    '/public/disc-test/verify',
    { test_code: testCode }
  )
  return data
}

/** 提交 DISC 测试答案 */
export async function submitDiscTest(submitData: DISCTestSubmitData) {
  const { data } = await publicClient.post('/public/disc-test/temp-submit', submitData)
  return data
}

// ============================================================================
// 管理 API（后台使用，需要登录）
// ============================================================================

const HR_BASE = '/hr/psychological-test'

/** 获取临时 DISC 记录列表 */
export async function getTempDiscRecords(params: {
  page?: number
  size?: number
  name?: string
  phone?: string
  is_migrated?: boolean
  confidence_level?: 'high' | 'medium' | 'low'
  has_mixed_type?: boolean
} = {}): Promise<ApiResponse<PaginatedResponse<TempDISCRecordListItem>>> {
  return apiClient.get(`${HR_BASE}/temp-disc-records`, { params })
}

/** 获取临时 DISC 记录详情 */
export async function getTempDiscRecordDetail(id: string): Promise<ApiResponse<TempDISCRecordDetail>> {
  return apiClient.get(`${HR_BASE}/temp-disc-records/${id}`)
}

/** 更新临时 DISC 记录（姓名/手机号） */
export async function updateTempDiscRecord(id: string, data: { name?: string; phone?: string }): Promise<ApiResponse<TempDISCRecordDetail>> {
  return apiClient.patch(`${HR_BASE}/temp-disc-records/${id}`, data)
}

/** 触发 DISC AI 分析（异步模式，返回 status） */
export async function triggerDiscAIAnalysis(id: string, force = false): Promise<ApiResponse<{
  status: string
  aiAnalysis?: import('./types').DISCAIAnalysis
}>> {
  return apiClient.post(`${HR_BASE}/temp-disc-records/${id}/ai-analyze`, null, {
    params: { force },
  })
}

