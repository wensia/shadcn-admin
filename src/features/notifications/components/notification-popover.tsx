/**
 * 通知弹出层组件
 */

import { useNavigate } from '@tanstack/react-router'
import { Button, Divider } from '@douyinfe/semi-ui-19'
import { CheckCheck, Loader2 } from 'lucide-react'
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks'
import { NotificationItem } from './notification-item'
import type { Notification } from '../types'
import { NotificationType } from '../types'

interface NotificationPopoverProps {
  onClose?: () => void
}

export function NotificationPopover({ onClose }: NotificationPopoverProps) {
  const navigate = useNavigate()

  // 获取最近的通知（只显示前10条）
  const { data, isLoading } = useNotifications({ page: 1, size: 10 })
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const notifications = data?.items ?? []
  const unreadCount = data?.unread_count ?? 0

  // 处理通知点击
  const handleNotificationClick = async (notification: Notification) => {
    // 标记为已读
    if (!notification.is_read) {
      markAsRead.mutate(notification.id)
    }

    // 根据实体类型跳转
    if (notification.entity_type && notification.entity_id) {
      switch (notification.entity_type) {
        case 'lead':
          navigate(`/crm/leads/${notification.entity_id}`)
          break
        case 'order':
          navigate(`/crm/orders?highlight=${notification.entity_id}`)
          break
        default:
          break
      }
    }

    onClose?.()
  }

  // 处理全部已读
  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate()
  }

  // 查看全部
  const handleViewAll = () => {
    navigate('/notifications')
    onClose?.()
  }

  return (
    <div className="w-[360px]">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">通知</h4>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            theme="borderless"
            type="tertiary"
            size="small"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            icon={markAllAsRead.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="h-3 w-3" />
            )}
          >
            全部已读
          </Button>
        )}
      </div>

      <Divider style={{ margin: 0 }} />

      {/* 通知列表 */}
      <div className="h-[400px] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--semi-color-text-2)' }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--semi-color-text-2)' }}>
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {notifications.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div className="p-2">
            <Button
              theme="borderless"
              type="tertiary"
              block
              onClick={handleViewAll}
            >
              查看全部通知
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
