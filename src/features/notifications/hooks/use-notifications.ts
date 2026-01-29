/**
 * 通知列表 Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '../api'
import { UNREAD_COUNT_QUERY_KEY } from './use-unread-count'
import type { NotificationListParams } from '../types'

// 查询 Key
export const NOTIFICATIONS_QUERY_KEY = ['notifications', 'list']

export function useNotifications(params?: NotificationListParams, enabled = true) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, params],
    queryFn: async () => {
      const response = await notificationApi.getNotifications(params)
      return response.data
    },
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      // 刷新通知列表和未读数量
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      // 刷新通知列表和未读数量
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationApi.deleteNotification(id),
    onSuccess: () => {
      // 刷新通知列表和未读数量
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY })
    },
  })
}
