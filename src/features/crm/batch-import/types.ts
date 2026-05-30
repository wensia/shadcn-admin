/**
 * 批量导入模块类型定义
 */

// 批次状态
export type BatchStatus = 'processing' | 'completed' | 'failed'

// 导入方式
export type ImportMethod = 'excel' | 'csv' | 'manual' | 'api' | 'xiaoditui'

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
  // 重复线索的额外信息
  duplicate_count_in_batch?: number
  existing_lead_created_at?: string
  existing_lead_last_import_time?: string
  existing_lead_activated_at?: string
  existing_lead_last_followup_at?: string
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

// 失败记录列表响应（包含类型统计）
export interface FailureListResponse {
  items: ImportFailureItem[]
  total: number
  page: number
  size: number
  pages: number
  type_counts: Record<string, number>
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
  campusId?: string // 兼容旧调用；新版导入以 Excel 归属校区为准
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
  xiaoditui: '小地推',
}

// 上传响应类型（区分同步/异步模式）
export interface UploadResponse {
  batch_id: string
  mode: 'sync' | 'async'
  total_count: number
  success_count?: number
  failed_count?: number
  activated_count?: number
  batch_name: string
  status: BatchStatus
}

// 进度查询响应类型
export interface BatchProgress {
  batch_id: string
  batch_name: string
  status: BatchStatus
  total_count: number
  success_count: number
  activated_count?: number
  failed_count: number
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  progress: {
    status?: string
    message?: string
    success_count?: number
    created_count?: number
    activated_count?: number
    failed_count?: number
    total_count?: number
    updated_at?: string
  }
}
