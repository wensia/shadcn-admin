/**
 * CRM 每日通知用户端 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type { DailyNoticeActive } from '@/features/admin/types'

/** 获取当前生效的每日通知 */
export async function getActiveDailyNotice(): Promise<ApiResponse<DailyNoticeActive | null>> {
  return apiClient.get<ApiResponse<DailyNoticeActive | null>>('/crm/daily-notice/active')
}
