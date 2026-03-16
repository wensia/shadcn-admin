/**
 * 业绩结果事实 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type {
  PerformanceEvent,
  PerformanceEventCreate,
  PerformanceEventListParams,
  PerformanceEventStats,
  PerformanceEventUpsert,
  PerformanceEventUpdate,
} from './types'

export const performanceEventApi = {
  getPerformanceEvents(
    params?: PerformanceEventListParams,
  ): Promise<ApiResponse<PaginatedResponse<PerformanceEvent>>> {
    return apiClient.get('/performance-events', { params })
  },

  getPerformanceEvent(id: string): Promise<ApiResponse<PerformanceEvent>> {
    return apiClient.get(`/performance-events/${id}`)
  },

  createPerformanceEvent(data: PerformanceEventCreate): Promise<ApiResponse<PerformanceEvent>> {
    return apiClient.post('/performance-events', data)
  },

  updatePerformanceEvent(
    id: string,
    data: PerformanceEventUpdate,
  ): Promise<ApiResponse<PerformanceEvent>> {
    return apiClient.put(`/performance-events/${id}`, data)
  },

  deletePerformanceEvent(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/performance-events/${id}`)
  },

  upsertPerformanceEvent(data: PerformanceEventUpsert): Promise<ApiResponse<PerformanceEvent>> {
    return apiClient.post('/performance-events/upsert', data)
  },

  batchUpsertPerformanceEvents(data: PerformanceEventUpsert[]): Promise<ApiResponse<PerformanceEvent[]>> {
    return apiClient.post('/performance-events/batch-upsert', data)
  },

  getPerformanceEventStats(params?: Omit<PerformanceEventListParams, 'page' | 'size' | 'keyword'>): Promise<ApiResponse<PerformanceEventStats>> {
    return apiClient.get('/performance-events/stats', { params })
  },
}
