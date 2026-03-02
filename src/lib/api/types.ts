/**
 * 通用API类型定义
 */

// 标准API响应格式
export interface ApiResponse<T = unknown> {
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
  detail?: unknown
}

/**
 * 从 ApiResponse 中安全提取 data 字段
 * 替代 response.data! 非空断言，提供运行时检查
 */
export function unwrapData<T>(response: ApiResponse<T>): T {
  if (response.data === undefined || response.data === null) {
    throw new Error(response.message || 'API 返回数据为空')
  }
  return response.data
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
  cached?: boolean
  query_time?: number
}
