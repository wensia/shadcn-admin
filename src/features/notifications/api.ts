/**
 * 通知 API
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationListParams,
  MarkReadRequest,
} from './types'

export const notificationApi = {
  /**
   * 获取未读通知数量
   */
  async getUnreadCount(): Promise<ApiResponse<UnreadCountResponse>> {
    return apiClient.get<ApiResponse<UnreadCountResponse>>('/notifications/unread-count')
  },

  /**
   * 获取通知列表
   */
  async getNotifications(params?: NotificationListParams): Promise<ApiResponse<NotificationListResponse>> {
    return apiClient.get<ApiResponse<NotificationListResponse>>('/notifications', { params })
  },

  /**
   * 获取单个通知详情
   */
  async getNotification(id: string): Promise<ApiResponse<Notification>> {
    return apiClient.get<ApiResponse<Notification>>(`/notifications/${id}`)
  },

  /**
   * 标记单条通知为已读
   */
  async markAsRead(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.put<ApiResponse<boolean>>(`/notifications/${id}/read`)
  },

  /**
   * 批量标记通知为已读
   */
  async markMultipleAsRead(data: MarkReadRequest): Promise<ApiResponse<number>> {
    return apiClient.put<ApiResponse<number>>('/notifications/batch/read', data)
  },

  /**
   * 全部标记为已读
   */
  async markAllAsRead(): Promise<ApiResponse<number>> {
    return apiClient.put<ApiResponse<number>>('/notifications/read-all')
  },

  /**
   * 删除通知
   */
  async deleteNotification(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete<ApiResponse<boolean>>(`/notifications/${id}`)
  },
}

export default notificationApi
