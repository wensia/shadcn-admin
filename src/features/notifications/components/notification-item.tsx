/**
 * 通知项组件
 */

import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Bell, FileText, Users, Info } from 'lucide-react'
import type { Notification } from '../types'
import { NotificationType } from '../types'

interface NotificationItemProps {
  notification: Notification
  onClick?: (notification: Notification) => void
}

// 获取通知图标
function getNotificationIcon(type: string) {
  switch (type) {
    case NotificationType.LEAD_ASSIGNED:
      return <Users className="h-4 w-4" />
    case NotificationType.ORDER_APPROVAL_PENDING:
    case NotificationType.ORDER_APPROVAL_RESULT:
      return <FileText className="h-4 w-4" />
    case NotificationType.SYSTEM:
      return <Info className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

// 获取通知图标背景色
function getNotificationIconBg(type: string) {
  switch (type) {
    case NotificationType.LEAD_ASSIGNED:
      return 'bg-blue-100 text-blue-600'
    case NotificationType.ORDER_APPROVAL_PENDING:
      return 'bg-amber-100 text-amber-600'
    case NotificationType.ORDER_APPROVAL_RESULT:
      return 'bg-green-100 text-green-600'
    case NotificationType.SYSTEM:
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const handleClick = () => {
    onClick?.(notification)
  }

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: zhCN,
  })

  return (
    <div
      className={cn(
        'flex gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-muted/30'
      )}
      onClick={handleClick}
    >
      {/* 图标 */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          getNotificationIconBg(notification.notification_type)
        )}
      >
        {getNotificationIcon(notification.notification_type)}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium truncate',
              !notification.is_read && 'text-foreground',
              notification.is_read && 'text-muted-foreground'
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
          {notification.content}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </div>
  )
}
