/**
 * 小地推（深互动）API
 * 后端：app/apps/xiaoditui/api/main.py
 */
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'

export interface XiaoditangBindingView {
  bound: boolean
  phone?: string
  has_password?: boolean
  has_token?: boolean
  token_preview?: string | null
  device_token?: string | null
  status?: number
  last_login?: string | null
  last_check_at?: string | null
  last_error?: string | null
}

export interface XiaoditangStatusView extends XiaoditangBindingView {
  valid?: boolean
  message?: string
  auto_relogin?: boolean
  master_account?: unknown
}

export interface XiaoditangBindRequest {
  phone: string
  password: string
  /** 默认 true：保存后立刻调用一次登录，把 token / cookies 落库 */
  login_now?: boolean
}

export const xiaoditangApi = {
  /** 获取当前员工的绑定信息（脱敏） */
  getMyBinding(): Promise<ApiResponse<XiaoditangBindingView>> {
    return apiClient.get('/xiaoditui/me/binding')
  },

  /** 绑定 / 更新账号 */
  bindMyAccount(
    payload: XiaoditangBindRequest,
  ): Promise<ApiResponse<XiaoditangBindingView>> {
    return apiClient.post('/xiaoditui/me/binding', payload)
  },

  /** 解绑 */
  unbindMyAccount(): Promise<ApiResponse<{ bound: false }>> {
    return apiClient.delete('/xiaoditui/me/binding')
  },

  /** 用已保存的账号密码重新登录 */
  reloginMyAccount(): Promise<ApiResponse<XiaoditangBindingView>> {
    return apiClient.post('/xiaoditui/me/login', {})
  },

  /**
   * 校验上次登录保存的状态
   * 页面打开时调用：调用真实小地推 API 探活，必要时自动重登
   */
  checkMyStatus(): Promise<ApiResponse<XiaoditangStatusView>> {
    return apiClient.get('/xiaoditui/me/status')
  },

  /** 当前账号下的活动列表 */
  listActivities(): Promise<ApiResponse<XiaoditangActivityOption[]>> {
    return apiClient.get('/xiaoditui/me/activities')
  },

  /** 数据收集统计（按日期范围） */
  getStats(params: {
    activityId: number
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<XiaoditangStats>> {
    return apiClient.get('/xiaoditui/me/stats', {
      params: {
        activity_id: params.activityId,
        start_date: params.startDate,
        end_date: params.endDate,
      },
    })
  },
}

export interface XiaoditangActivityOption {
  activity_id: number
  name: string
}

export interface XiaoditangMarketGroup {
  market_id: number
  name: string
  mobile: string | null
  avatar: string | null
  count: number
  last_collected_at: string | null
}

export interface XiaoditangSampleItem {
  id: number
  nickname: string | null
  mobile: string | null
  col: string | null
  address: string | null
  channel: string | null
  is_repeat: string | null
  created_at: string | null
  market_name: string | null
}

export interface XiaoditangStats {
  start_date: string
  end_date: string
  activity_id: number
  all_time_total: number
  range_total: number
  by_market: XiaoditangMarketGroup[]
  samples: XiaoditangSampleItem[]
  page_count: number
  truncated: boolean
}
