/**
 * 公海线索 API
 * 从 frontend-vue/src/api/leadPool.ts 迁移
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type {
  LeadPoolItem,
  LeadPoolListParams,
  LeadPoolListResponse,
  BatchClaimFromPoolRequest
} from './types'

/**
 * 公海线索 API 对象
 */
export const leadsPoolApi = {
  /**
   * 获取公海线索列表
   */
  async getPoolLeads(params?: LeadPoolListParams): Promise<ApiResponse<LeadPoolListResponse>> {
    const response = await apiClient.get<ApiResponse<LeadPoolListResponse>>(
      '/lead-pool',
      { params }
    )
    return response
  },

  /**
   * 从公海领取单个线索
   */
  async claimLead(leadId: string, claimReason?: string): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post<ApiResponse<unknown>>('/lead-pool/claim', {
      lead_ids: [leadId],
      claim_reason: claimReason || '从公海领取线索'
    })
    return response
  },

  /**
   * 批量从公海领取线索
   */
  async batchClaimLeads(data: BatchClaimFromPoolRequest): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post<ApiResponse<unknown>>('/lead-pool/claim', data)
    return response
  },

  /**
   * 获取线索公海信息
   */
  async getLeadPoolInfo(leadId: string): Promise<ApiResponse<LeadPoolItem>> {
    const response = await apiClient.get<ApiResponse<LeadPoolItem>>(`/lead-pool/${leadId}`)
    return response
  }
}

export default leadsPoolApi
