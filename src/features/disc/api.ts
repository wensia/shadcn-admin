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
  DiscTestLinkItem,
  DiscTestLinkCreateData,
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

/** 验证 DISC 测试链接（支持 ref 和 id 两种模式） */
export async function validateDiscTestRef(ref: string, id?: string) {
  const params: Record<string, string> = {}
  if (id) params.id = id
  else if (ref) params.ref = ref
  const { data } = await publicClient.get('/public/disc-test/validate-ref', { params })
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
  source_channel?: string
} = {}): Promise<ApiResponse<PaginatedResponse<TempDISCRecordListItem>>> {
  return apiClient.get(`${HR_BASE}/temp-disc-records`, { params })
}

/** 获取可见的来源渠道列表 */
export async function getDiscChannels(): Promise<ApiResponse<string[]>> {
  return apiClient.get(`${HR_BASE}/temp-disc-records/channels`)
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

// ============================================================================
// 测试链接管理 API（后台使用，需要登录）
// ============================================================================

/** 获取 DISC 测试链接列表 */
export async function getDiscTestLinks(params: {
  page?: number
  size?: number
  status?: string
  name?: string
} = {}): Promise<ApiResponse<PaginatedResponse<DiscTestLinkItem>>> {
  return apiClient.get(`${HR_BASE}/disc-test-links`, { params })
}

/** 创建 DISC 测试链接 */
export async function createDiscTestLink(data: DiscTestLinkCreateData): Promise<ApiResponse<DiscTestLinkItem>> {
  return apiClient.post(`${HR_BASE}/disc-test-links`, data)
}

/** 删除 DISC 测试链接 */
export async function deleteDiscTestLink(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return apiClient.delete(`${HR_BASE}/disc-test-links/${id}`)
}

// ============================================================================
// 授权访问管理 API
// ============================================================================

export interface DiscAccessGrantItem {
  id: string
  grantor_username: string
  grantee_id: string
  grantee_name: string | null
  grantee_username: string | null
  created_at: string
}

/** 获取当前用户的DISC授权列表 */
export async function getDiscAccessGrants(): Promise<ApiResponse<DiscAccessGrantItem[]>> {
  return apiClient.get(`${HR_BASE}/disc-access-grants`)
}

/** 添加DISC记录授权 */
export async function createDiscAccessGrant(granteeId: string): Promise<ApiResponse<DiscAccessGrantItem>> {
  return apiClient.post(`${HR_BASE}/disc-access-grants`, { grantee_id: granteeId })
}

/** 撤销DISC记录授权 */
export async function deleteDiscAccessGrant(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return apiClient.delete(`${HR_BASE}/disc-access-grants/${id}`)
}

