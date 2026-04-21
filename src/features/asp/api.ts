/**
 * ASP 测评记录管理 API
 */
import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type { AspRecordListItem, AspRecordDetail } from './types'

const BASE = '/hr/asp-records'

/** 获取 ASP 测评记录列表 */
export async function getAspRecords(params: {
  page?: number
  size?: number
  name?: string
  phone?: string
  stage?: string
  referred_by?: string
  source_channel?: string
} = {}): Promise<ApiResponse<PaginatedResponse<AspRecordListItem>>> {
  return apiClient.get(BASE, { params })
}

/** 获取 ASP 测评记录详情 */
export async function getAspRecordDetail(id: string): Promise<ApiResponse<AspRecordDetail>> {
  return apiClient.get(`${BASE}/${id}`)
}
