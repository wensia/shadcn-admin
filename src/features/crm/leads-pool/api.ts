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

export const leadsPoolApi = {
  /** 获取公海线索列表 */
  getPoolLeads(params?: LeadPoolListParams): Promise<ApiResponse<LeadPoolListResponse>> {
    return apiClient.get('/lead-pool', { params })
  },

  /** 从公海领取单个线索 */
  claimLead(leadId: string, claimReason?: string): Promise<ApiResponse<unknown>> {
    return apiClient.post('/lead-pool/claim', {
      lead_ids: [leadId],
      claim_reason: claimReason || '从公海领取线索'
    })
  },

  /** 批量从公海领取线索 */
  batchClaimLeads(data: BatchClaimFromPoolRequest): Promise<ApiResponse<unknown>> {
    return apiClient.post('/lead-pool/claim', data)
  },

  /** 获取线索公海信息 */
  getLeadPoolInfo(leadId: string): Promise<ApiResponse<LeadPoolItem>> {
    return apiClient.get(`/lead-pool/${leadId}`)
  },

  /** 导出公海线索（返回文件流或任务信息） */
  async exportPoolLeads(params?: LeadPoolListParams): Promise<ApiResponse<ExportResult> | Blob> {
    const response = await apiClient.post('/lead-pool/export', null, {
      params,
      responseType: 'blob',
      validateStatus: () => true
    })

    // 检查是否是 JSON 响应（异步导出或错误）
    if (response instanceof Blob && response.type.includes('application/json')) {
      const text = await response.text()
      return JSON.parse(text) as ApiResponse<ExportResult>
    }

    return response as Blob
  },

  /** 获取导出任务状态 */
  getExportStatus(taskId: string): Promise<ApiResponse<ExportStatusResult>> {
    return apiClient.get(`/lead-pool/export/status/${taskId}`)
  },

  /** 下载导出文件 */
  downloadExportFile(taskId: string): Promise<Blob> {
    return apiClient.get(`/lead-pool/export/download/${taskId}`, {
      responseType: 'blob'
    }) as unknown as Promise<Blob>
  }
}

// 导出结果类型
export interface ExportResult {
  task_id?: string
  total?: number
  message?: string
}

export interface ExportStatusResult {
  task_id: string
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE'
  ready: boolean
  success?: boolean
  message?: string
  total?: number
  file_path?: string
  file_name?: string
}

