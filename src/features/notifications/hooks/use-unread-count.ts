/**
 * 未读通知数量 Hook
 * 支持 30 秒轮询更新
 */

import { useQuery } from '@tanstack/react-query'
import { notificationApi } from '../api'

// 查询 Key
export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count']

// 轮询间隔（毫秒）
const POLLING_INTERVAL = 30 * 1000

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const response = await notificationApi.getUnreadCount()
      return response.data?.count ?? 0
    },
    enabled,
    refetchInterval: POLLING_INTERVAL,
    staleTime: POLLING_INTERVAL / 2,
    // 在窗口重新获得焦点时刷新
    refetchOnWindowFocus: true,
  })
}
