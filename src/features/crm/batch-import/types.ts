/**
 * 批量导入模块类型定义
 */

// 批次状态
export type BatchStatus = 'processing' | 'completed' | 'failed'

// 导入方式
export type ImportMethod = 'excel' | 'csv' | 'manual' | 'api'

// 失败类型
export type FailureType =
  | 'duplicate'
  | 'duplicate_in_file'
  | 'validation_error'
  | 'system_error'
  | 'database_error'
  | 'format_error'
  | 'permission_error'
  | 'other'
  | 'unknown'

// 批量导入记录
export interface BatchImportItem {
  id: string
  batch_name: string
  batch_description?: string
  import_method: ImportMethod
  import_source_file?: string
  total_count: number
  success_count: number
  failed_count: number
  activated_count: number
  status: BatchStatus
  created_by_name: string
  started_at: string
  completed_at?: string
  processing_duration?: number
}

// 失败记录
export interface ImportFailureItem {
  id: string
  row_number: number
  child_name?: string
  parent_phone?: string
  failure_type: FailureType
  failure_reason: string
  duplicate_count_in_batch?: number
  existing_lead_created_at?: string
  existing_lead_last_import_time?: string
}

// 激活线索
export interface ActivatedLeadItem {
  id: string
  row_number: number
  child_name?: string
  parent_name?: string
  parent_phone: string
  grade?: string
  intended_course?: string
  advisor_name?: string
  campus_name?: string
  activated_at: string
  status_change?: string
  campus_change?: string
  advisor_change?: string
}

// 查询参数
export interface BatchImportQueryParams {
  page?: number
  page_size?: number
  search?: string
  status?: BatchStatus
  import_method?: ImportMethod
  start_date?: string
  end_date?: string
}

// 上传选项
export interface UploadOptions {
  batchDescription?: string
  startRow?: number
  importCount?: number
  onProgress?: (percent: number) => void
}

// 失败类型标签映射
export const failureTypeLabels: Record<FailureType, string> = {
  duplicate: '重复数据',
  duplicate_in_file: '文件内重复',
  validation_error: '验证错误',
  system_error: '系统错误',
  database_error: '数据库错误',
  format_error: '格式错误',
  permission_error: '权限错误',
  other: '其他错误',
  unknown: '未知错误',
}

// 批次状态标签映射
export const batchStatusLabels: Record<BatchStatus, string> = {
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
}

// 导入方式标签映射
export const importMethodLabels: Record<ImportMethod, string> = {
  excel: 'Excel',
  csv: 'CSV',
  manual: '手动',
  api: 'API',
}
