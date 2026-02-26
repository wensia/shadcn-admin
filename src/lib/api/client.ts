/**
 * API客户端
 * 基于Axios,提供统一的请求/响应处理
 * 从frontend-vue/src/api/client.ts迁移
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse
} from 'axios'
import qs from 'qs'
import { toast } from 'sonner'
import type { ApiResponse, ApiError } from './types'
import { ApiClientError, getErrorMessage, isApiResponse, normalizeAxiosError } from './response-handler'

// 在开发环境可用 VITE_API_URL，生产环境强制走相对路径（由 Nginx 代理）
const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || '') : ''
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1'

/**
 * 扩展的请求配置,支持静默模式
 */
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _silentBusinessError?: boolean
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/${API_VERSION}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // 数组参数序列化：使用 repeat 格式 (status=new&status=following)
      paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
    })

    this.setupInterceptors()
  }

  /**
   * 获取认证token
   * 注意: 这里会在运行时导入authStore以避免循环依赖
   */
  private getAuthToken(): string {
    // 直接从localStorage读取,避免循环依赖
    return localStorage.getItem('access_token') || ''
  }

  /**
   * 清除认证状态
   */
  private clearAuthState(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    // 同步清除 zustand 持久化的认证状态，避免刷新后仍认为已登录
    localStorage.removeItem('auth-storage')
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAuthToken()

        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // 处理FormData - 自动删除Content-Type让axios设置正确的boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type']
        }

        return config
      },
      (error: AxiosError) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // 检查是否需要静默处理业务错误
        const silentBusinessError = (response.config as ExtendedAxiosRequestConfig)._silentBusinessError

        // 检查统一响应格式中的success字段
        if (isApiResponse(response.data)) {
          // 先检查云客登录失效（无论是否静默模式）
          if (response.data.code === 'YUNKE_AUTH_EXPIRED') {
            // 触发云客登录弹窗
            window.dispatchEvent(new CustomEvent('yunke-auth-expired'))
            // 显示错误消息
            toast.error('云客登录已失效，请重新登录')

            // 静默模式下也返回响应，让调用方知道失败了
            if (silentBusinessError) {
              return response.data
            }
            // 非静默模式抛出错误
            const error = new ApiClientError(response.data.message || '请求失败')
            error.isBusinessError = true
            error.status = response.status
            error.code = response.data.code
            error.messageShown = true
            ;(error as any).response = {
              data: response.data,
              status: response.status,
              statusText: response.statusText
            }
            throw error
          }

          // 静默模式：返回完整响应供业务代码处理
          if (silentBusinessError) {
            return response.data
          }

          // 普通模式：success: false 时抛出异常，让 TanStack Query 的 onError 能正确处理
          // 这样业务代码可以统一在 onError 中处理错误消息
          if (!response.data.success) {
            const error = new ApiClientError(response.data.message || '请求失败')
            error.isBusinessError = true
            error.status = response.status
            error.code = response.data.code
            ;(error as any).response = {
              data: response.data,
              status: response.status,
              statusText: response.statusText
            }
            throw error
          }

          // 普通模式：返回完整的API响应格式
          return response.data
        }

        // 对于非标准格式的响应，直接返回
        return response.data
      },
      (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as ExtendedAxiosRequestConfig
        const normalizedError = normalizeAxiosError(error)
        if ((normalizedError as any).messageShown) {
          return Promise.reject(normalizedError)
        }

        // 处理401未授权错误
        if (error.response?.status === 401) {
          // 登录接口的401：检查是否有标准API响应格式
          if (originalRequest?.url?.includes('/auth/login')) {
            const errorMsg = getErrorMessage(error, '登录失败')
            toast.error(errorMsg)
            normalizedError.message = errorMsg
            normalizedError.messageShown = true
            return Promise.reject(normalizedError)
          }

          // 如果当前在登录页面，也不自动处理401
          if (typeof window !== 'undefined' &&
            window.location.pathname.startsWith('/sign-in')
          ) {
            return Promise.reject(normalizedError)
          }

          // 其他401：清除认证状态并跳转登录页
          this.clearAuthState()

          // 显示认证失败消息
          toast.warning('登录已过期，正在跳转到登录页面')
          normalizedError.messageShown = true

          // 跳转到登录页，携带当前路径以便登录后返回
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname + window.location.search
            if (!currentPath.startsWith('/sign-in')) {
              window.location.href = `/sign-in?redirect=${encodeURIComponent(currentPath)}`
            }
          }

          normalizedError.message = '认证失败，已跳转到登录页面'
          normalizedError.isAuthError = true
          return Promise.reject(normalizedError)
        }

        const errorMessage = getErrorMessage(error)
        toast.error(errorMessage)
        normalizedError.message = errorMessage
        normalizedError.messageShown = true

        return Promise.reject(normalizedError)
      }
    )
  }

  // ==================== 标准请求方法 ====================

  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config)
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config)
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config)
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config)
  }

  public patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.patch(url, data, config)
  }

  // ==================== 静默请求方法 ====================
  // 不会因为业务错误抛出异常，适用于需要自行处理错误的场景

  public postSilent<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, {
      ...config,
      _silentBusinessError: true
    } as any)
  }

  public getSilent<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, {
      ...config,
      _silentBusinessError: true
    } as any)
  }

  public putSilent<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, {
      ...config,
      _silentBusinessError: true
    } as any)
  }

  public deleteSilent<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, {
      ...config,
      _silentBusinessError: true
    } as any)
  }
}

// 导出单例
export const apiClient = new ApiClient()
export default apiClient

// 重新导出类型供其他模块使用
export type { AxiosRequestConfig, AxiosProgressEvent } from 'axios'
export type { ApiResponse, ApiError } from './types'
