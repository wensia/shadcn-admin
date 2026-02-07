import { AxiosError } from 'axios'
import type { ApiResponse, PaginatedResponse } from './types'

type AnyRecord = Record<string, any>

export class ApiClientError extends Error {
  status?: number
  code?: string
  isNetworkError?: boolean
  isTimeout?: boolean
  isBusinessError?: boolean
  response?: any
  messageShown?: boolean
  isAuthError?: boolean

  constructor(message: string) {
    super(message)
    this.name = 'ApiClientError'
  }
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null
}

export function isApiResponse<T = any>(value: unknown): value is ApiResponse<T> {
  if (!isRecord(value)) return false
  return typeof value.success === 'boolean'
}

export function isPaginatedResponse<T = any>(value: unknown): value is PaginatedResponse<T> {
  if (!isRecord(value)) return false
  return (
    Array.isArray(value.items) &&
    typeof value.total === 'number' &&
    typeof value.page === 'number' &&
    typeof value.size === 'number' &&
    typeof value.pages === 'number'
  )
}

export function normalizeAxiosError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error
  }

  if (error instanceof AxiosError) {
    const apiResponse = isApiResponse(error.response?.data) ? (error.response?.data as ApiResponse) : undefined
    const message = apiResponse?.message || error.message || '请求失败'

    const normalized = new ApiClientError(message)
    normalized.status = error.response?.status
    normalized.code = apiResponse?.code || error.code
    normalized.response = error.response
    normalized.isTimeout =
      error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')
    normalized.isNetworkError = !error.response
    normalized.isBusinessError = apiResponse ? apiResponse.success === false : false
    return normalized
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message || '请求失败')
  }

  return new ApiClientError('请求失败')
}

export function getErrorMessage(error: unknown, fallback = '请求失败'): string {
  const normalized = normalizeAxiosError(error)

  if (normalized.response && isApiResponse(normalized.response.data)) {
    const apiResponse = normalized.response.data as ApiResponse
    if (apiResponse.message) return apiResponse.message
  }

  if (normalized.isTimeout) {
    return '请求超时，请稍后重试'
  }

  if (normalized.isNetworkError) {
    return '网络连接失败，请检查网络设置'
  }

  if (normalized.status) {
    switch (normalized.status) {
      case 400:
        return '请求参数错误'
      case 401:
        return '未授权，请重新登录'
      case 403:
        return '权限不足'
      case 404:
        return '资源不存在'
      case 422:
        return '请求参数验证失败'
      case 500:
        return '服务器内部错误，请稍后重试'
      case 502:
      case 503:
        return '服务暂不可用'
      default:
        return `请求失败 (${normalized.status})`
    }
  }

  return normalized.message || fallback
}
