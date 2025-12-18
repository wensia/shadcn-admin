/**
 * 通用API类型定义
 */

// 标准API响应格式
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  timestamp?: string
  code?: string
}

// API错误接口
export interface ApiError {
  message: string
  code?: string
  detail?: any
}

// 分页参数
export interface PaginationParams {
  page?: number
  size?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
  cached?: any
  query_time?: any
}
