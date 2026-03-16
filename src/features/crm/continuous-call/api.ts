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

export const continuousCallApi = {
  /** 获取快捷外呼统计 */
  getStats(params?: { task_id?: string }): Promise<ApiResponse<ContinuousCallStats>> {
    return apiClient.get('/crm/continuous-call/stats', { params })
  },

  /** 获取快捷外呼线索列表 */
  getLeads(params?: ContinuousCallLeadsParams): Promise<ApiResponse<ContinuousCallLeadsResponse>> {
    return apiClient.get('/crm/continuous-call/leads', { params })
  },
}

export default continuousCallApi
