/**
 * 兑换码管理 - API
 */
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type { PaginatedResponse } from '@/lib/api/types'
import type {
  RedemptionCodeListItem,
  VerifyCodeResponse,
  CreateCodesRequest,
  CodeUsageItem,
  BatchCreateResponse,
} from './types'

// 公开 API（不需要认证）
const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || '') : ''
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1'
const PUBLIC_BASE = `${API_URL}/api/${API_VERSION}`

/**
 * 验证兑换码（公开接口，无需登录）
 */
export async function verifyRedemptionCode(
  code: string,
  toolId: string
): Promise<VerifyCodeResponse> {
  const res = await fetch(`${PUBLIC_BASE}/tools/redemption-codes/public/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, tool_id: toolId }),
  })
  const json = await res.json()
  if (!json.success) {
    const err = new Error(json.message || '验证失败')
    ;(err as Error & { code?: string }).code = json.code
    throw err
  }
  return json.data as VerifyCodeResponse
}

// ============================================================================
// 管理 API（后台使用，需要登录）
// ============================================================================

const ADMIN_BASE = '/tools/redemption-codes'

/** 获取兑换码列表 */
export async function listRedemptionCodes(params: {
  page?: number
  size?: number
  tool_id?: string
  status?: string
  keyword?: string
  batch_id?: string
}): Promise<ApiResponse<PaginatedResponse<RedemptionCodeListItem>>> {
  return apiClient.get(ADMIN_BASE, { params })
}

/** 批量生成兑换码 */
export async function batchCreateCodes(
  data: CreateCodesRequest
): Promise<ApiResponse<BatchCreateResponse>> {
  return apiClient.post(`${ADMIN_BASE}/batch`, data)
}

/** 撤销兑换码 */
export async function revokeCode(
  id: string,
  reason?: string
): Promise<ApiResponse<void>> {
  return apiClient.patch(`${ADMIN_BASE}/${id}/revoke`, { reason })
}

/** 按批次撤销兑换码 */
export async function revokeBatch(
  batchId: string,
  reason?: string
): Promise<ApiResponse<{ revoked: number }>> {
  return apiClient.patch(`${ADMIN_BASE}/batch/${batchId}/revoke`, { reason })
}

/** 获取兑换码使用记录 */
export async function getCodeUsages(
  id: string
): Promise<ApiResponse<CodeUsageItem[]>> {
  return apiClient.get(`${ADMIN_BASE}/${id}/usages`)
}
