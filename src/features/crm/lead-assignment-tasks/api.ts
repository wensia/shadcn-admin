import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type {
  LeadAssignmentTask,
  LeadAssignmentTaskCreatePayload,
  LeadAssignmentTaskItem,
  LeadAssignmentTaskListParams,
  LeadAssignmentTaskSummary,
} from './types'

export const leadAssignmentTasksApi = {
  createTask(
    data: LeadAssignmentTaskCreatePayload
  ): Promise<ApiResponse<{ id: string }>> {
    return apiClient.post('/lead-assignment-tasks', data)
  },

  getTasks(
    params?: LeadAssignmentTaskListParams
  ): Promise<ApiResponse<PaginatedResponse<LeadAssignmentTask>>> {
    return apiClient.get('/lead-assignment-tasks', { params })
  },

  getTask(id: string): Promise<ApiResponse<LeadAssignmentTaskSummary>> {
    return apiClient.get(`/lead-assignment-tasks/${id}`)
  },

  getTaskItems(
    id: string,
    params?: {
      page?: number
      size?: number
      completion_status?: 'completed' | 'pending'
    }
  ): Promise<ApiResponse<PaginatedResponse<LeadAssignmentTaskItem>>> {
    return apiClient.get(`/lead-assignment-tasks/${id}/items`, { params })
  },

  cancelTask(
    id: string,
    remark?: string
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    return apiClient.post(`/lead-assignment-tasks/${id}/cancel`, { remark })
  },
}

export default leadAssignmentTasksApi
