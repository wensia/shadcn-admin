/**
 * 快捷外呼 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type {
  ContinuousCallStats,
  ContinuousCallLeadsResponse,
  ContinuousCallLeadsParams,
} from './types'

/**
 * 快捷外呼 API
 */
export const continuousCallApi = {
  /**
   * 获取快捷外呼统计
   */
  async getStats(): Promise<ApiResponse<ContinuousCallStats>> {
    const response = await apiClient.get<ApiResponse<ContinuousCallStats>>(
      '/crm/continuous-call/stats'
    )
    return response
  },

  /**
   * 获取快捷外呼线索列表
   */
  async getLeads(
    params?: ContinuousCallLeadsParams
  ): Promise<ApiResponse<ContinuousCallLeadsResponse>> {
    const response = await apiClient.get<ApiResponse<ContinuousCallLeadsResponse>>(
      '/crm/continuous-call/leads',
      { params }
    )
    return response
  },
}

export default continuousCallApi
