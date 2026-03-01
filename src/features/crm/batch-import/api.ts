/**
 * 批量导入 API
 * 从旧版前端批量导入 API 迁移
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type {
  BatchImportItem,
  ActivatedLeadItem,
  BatchImportQueryParams,
  UploadOptions,
  FailureListResponse,
  UploadResponse,
  BatchProgress,
} from './types'

/**
 * 批量导入 API 对象
 */
export const batchImportApi = {
  /**
   * 获取批量导入记录列表
   */
  async getList(
    params: BatchImportQueryParams
  ): Promise<ApiResponse<PaginatedResponse<BatchImportItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<BatchImportItem>>>(
      '/lead-import-batches',
      { params }
    )
  },

  /**
   * 获取批次详情
   */
  async getDetail(id: string): Promise<ApiResponse<BatchImportItem>> {
    return apiClient.get<ApiResponse<BatchImportItem>>(
      `/lead-import-batches/${id}`
    )
  },

  /**
   * 删除批次
   */
  async deleteBatch(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/lead-import-batches/${id}`)
  },

  /**
   * 批量删除处理中的批次
   */
  async deleteProcessingBatches(ids: string[]): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>(
      '/lead-import-batches/batch-delete',
      { ids }
    )
  },

  /**
   * 更新批次信息
   */
  async updateBatch(
    id: string,
    data: { batch_name?: string; batch_description?: string }
  ): Promise<ApiResponse<BatchImportItem>> {
    return apiClient.put<ApiResponse<BatchImportItem>>(
      `/lead-import-batches/${id}`,
      data
    )
  },

  /**
   * 下载导入模板
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      '/lead-batch-import/template/download',
      { responseType: 'blob' }
    )
    return response as unknown as Blob
  },

  /**
   * 上传文件（使用智能处理接口）
   * - ≤100条：同步处理，直接返回结果
   * - >100条：异步处理，需要轮询进度
   */
  async uploadFile(
    file: File,
    campusId: string,
    options: UploadOptions = {}
  ): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('campus_id', campusId)

    if (options.batchDescription) {
      formData.append('batch_description', options.batchDescription)
    }
    if (options.startRow !== undefined) {
      formData.append('start_row', String(options.startRow))
    }
    if (options.importCount !== undefined) {
      formData.append('import_count', String(options.importCount))
    }

    return apiClient.post<ApiResponse<UploadResponse>>(
      '/lead-batch-import/upload-async',  // 使用智能处理接口
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 同步模式可能需要较长时间，设置3分钟超时
        onUploadProgress: (e) => {
          if (options.onProgress && e.total) {
            options.onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      }
    )
  },

  /**
   * 查询批量导入进度
   */
  async getProgress(batchId: string): Promise<ApiResponse<BatchProgress>> {
    return apiClient.get<ApiResponse<BatchProgress>>(
      `/lead-batch-import/progress/${batchId}`
    )
  },

  /**
   * 获取失败记录列表（包含类型统计 type_counts）
   */
  async getFailureList(
    batchId: string,
    params: { page?: number; page_size?: number }
  ): Promise<ApiResponse<FailureListResponse>> {
    return apiClient.get<ApiResponse<FailureListResponse>>(
      `/lead-batch-import/failures/${batchId}`,
      { params }
    )
  },

  /**
   * 下载失败记录
   */
  async downloadFailures(batchId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/lead-batch-import/failures/${batchId}/download`,
      { responseType: 'blob' }
    )
    return response as unknown as Blob
  },

  /**
   * 获取激活线索列表
   */
  async getActivatedLeads(
    batchId: string,
    params: { page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<ActivatedLeadItem>>> {
    return apiClient.get<ApiResponse<PaginatedResponse<ActivatedLeadItem>>>(
      `/lead-batch-import/activated-leads/${batchId}`,
      { params }
    )
  },

  /**
   * 下载激活线索
   */
  async downloadActivatedLeads(batchId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/lead-batch-import/activated-leads/${batchId}/download`,
      { responseType: 'blob' }
    )
    return response as unknown as Blob
  },
}
