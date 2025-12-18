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
import { toast } from 'sonner'
import type { ApiResponse, ApiError } from './types'

// 在开发环境使用代理路径，生产环境使用完整URL
const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:9876')
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
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
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
            const error = new Error(response.data.message)
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

          // 普通模式：success: false 时不再抛出异常，而是返回数据让业务层处理
          // 注意：只有HTTP状态码错误（如401、500等）才应该抛出异常
          if (!response.data.success) {
            // 业务错误不自动显示消息，由调用方根据需要处理
            // 保持返回完整的响应数据，让业务层能够访问错误详情
            return response.data
          }

          // 普通模式：返回完整的API响应格式
          return response.data
        }

        // 对于非标准格式的响应，直接返回
        return response.data
      },
      (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as ExtendedAxiosRequestConfig

        // 处理401未授权错误
        if (error.response?.status === 401) {
          // 登录接口的401：检查是否有标准API响应格式
          if (originalRequest?.url?.includes('/auth/login')) {
            // 如果有标准响应格式（success + message），显示消息
            if (error.response?.data && typeof error.response.data === 'object' && 'success' in error.response.data) {
              const apiResponse = error.response.data as any
              const errorMsg = apiResponse.message || '登录失败'

              toast.error(errorMsg)

              // 标记错误已经显示过消息，避免业务代码重复显示
              ;(error as any).messageShown = true
            }
            return Promise.reject(error)
          }

          // 如果当前在登录页面，也不自动处理401
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/login')) {
            return Promise.reject(error)
          }

          // 其他401：清除认证状态并跳转登录页
          this.clearAuthState()

          // 显示认证失败消息
          toast.warning('登录已过期，正在跳转到登录页面')

          // 跳转到登录页
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname + window.location.search
            if (!currentPath.startsWith('/login')) {
              window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
            }
          }

          const authError = new Error('认证失败，已跳转到登录页面')
          ;(authError as any).isAuthError = true
          return Promise.reject(authError)
        }

        // 首先检查是否有后端返回的标准API响应格式
        if (error.response?.data && typeof error.response.data === 'object' && 'success' in error.response.data) {
          const apiResponse = error.response.data as any
          const errorMsg = apiResponse.message || '请求失败'

          // 优先显示后端返回的具体错误消息
          toast.error(errorMsg)

          const customError = new Error(errorMsg)
          ;(customError as any).response = {
            data: apiResponse,
            status: error.response.status,
            statusText: error.response.statusText
          }
          return Promise.reject(customError)
        }

        // 如果没有标准API响应格式，则显示通用HTTP错误消息
        if (error.response?.status) {
          let errorMessage = '请求失败'

          switch (error.response.status) {
            case 403:
              errorMessage = '权限不足，无法访问该资源'
              break
            case 404:
              errorMessage = '请求的资源不存在'
              break
            case 422:
              errorMessage = '请求参数验证失败'
              break
            case 500:
              errorMessage = '服务器内部错误'
              break
            case 502:
              errorMessage = '网关错误'
              break
            case 503:
              errorMessage = '服务暂不可用'
              break
            default:
              errorMessage = `请求失败 (${error.response.status})`
          }

          toast.error(errorMessage)
        }

        // 处理网络错误等其他错误
        if (!error.response) {
          if (error.code === 'ECONNABORTED') {
            toast.error('请求超时，请检查网络连接')
          } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
            toast.error('网络连接失败，请检查网络设置')
          } else if (error.message?.includes('timeout')) {
            toast.error('请求超时，请稍后重试')
          }
        }

        return Promise.reject(error)
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
