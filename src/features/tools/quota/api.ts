/**
 * 工具配额管理 - API
 */
import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type { ToolUserQuotaListItem, SetQuotaRequest, UserOption } from './types'

const BASE = '/tools/quotas'

/** 获取配额列表 */
export async function listQuotas(params: {
  page?: number
  size?: number
  tool_id?: string
  keyword?: string
}): Promise<ApiResponse<PaginatedResponse<ToolUserQuotaListItem>>> {
  return apiClient.get(BASE, { params })
}

/** 设置配额（创建/更新） */
export async function setQuota(
  data: SetQuotaRequest
): Promise<ApiResponse<{ id: string }>> {
  return apiClient.post(BASE, data)
}

/** 删除配额 */
export async function deleteQuota(
  id: string
): Promise<ApiResponse<void>> {
  return apiClient.delete(`${BASE}/${id}`)
}

/** 搜索员工 */
export async function searchUsers(
  keyword: string
): Promise<ApiResponse<UserOption[]>> {
  return apiClient.get(`${BASE}/users`, { params: { keyword } })
}
