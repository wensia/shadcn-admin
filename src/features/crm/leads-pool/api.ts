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
  },

  /**
   * 导出公海线索
   * 返回可能是文件流（同步导出）或任务信息（异步导出）
   */
  async exportPoolLeads(params?: LeadPoolListParams): Promise<ApiResponse<ExportResult> | Blob> {
    const response = await apiClient.post('/lead-pool/export', null, {
      params,
      responseType: 'blob',
      validateStatus: () => true  // 允许所有状态码
    })

    // 检查是否是 JSON 响应（异步导出或错误）
    if (response instanceof Blob && response.type.includes('application/json')) {
      const text = await response.text()
      return JSON.parse(text) as ApiResponse<ExportResult>
    }

    // 是文件流（同步导出成功）
    return response as Blob
  },

  /**
   * 获取导出任务状态
   */
  async getExportStatus(taskId: string): Promise<ApiResponse<ExportStatusResult>> {
    const response = await apiClient.get<ApiResponse<ExportStatusResult>>(
      `/lead-pool/export/status/${taskId}`
    )
    return response
  },

  /**
   * 下载导出文件
   */
  async downloadExportFile(taskId: string): Promise<Blob> {
    const response = await apiClient.get(`/lead-pool/export/download/${taskId}`, {
      responseType: 'blob'
    })
    return response as unknown as Blob
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

export default leadsPoolApi
