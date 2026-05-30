/**
 * 通知弹出层组件
 * 包含三个标签页：全部、未读、待办
 */

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button, Divider, Tabs, TabPane, Empty } from '@douyinfe/semi-ui-19'
import { CheckCheck, Loader2 } from 'lucide-react'
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks'
import { NotificationItem } from './notification-item'
import type { Notification, NotificationCategory } from '../types'

interface NotificationPopoverProps {
  onClose?: () => void
}

type TabKey = 'all' | 'unread' | 'todo'

// 标签页与查询参数的映射
function getQueryParams(tab: TabKey) {
  switch (tab) {
    case 'unread':
      return { page: 1, size: 10, is_read: false }
    case 'todo':
      return { page: 1, size: 10, category: 'todo' as NotificationCategory }
    default:
      return { page: 1, size: 10 }
  }
}

export function NotificationPopover({ onClose }: NotificationPopoverProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  // 根据当前标签页查询
  const params = getQueryParams(activeTab)
  const { data, isLoading } = useNotifications(params)
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const notifications = data?.items ?? []
  const unreadCount = data?.unread_count ?? 0

  // 处理通知点击
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id)
    }

    if (notification.entity_type) {
      switch (notification.entity_type) {
        case 'lead':
          navigate({ to: '/crm/leads' })
          break
        case 'order':
          navigate({ to: '/crm/performance-events' })
          break
        case 'task':
          navigate({ to: '/crm/leads/assignment-tasks' })
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

  // 查看全部 - 切换到未读标签
  const handleViewAll = () => {
    setActiveTab('all')
  }

  // 通知列表内容
  const renderList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--semi-color-text-2)' }} />
        </div>
      )
    }

    if (notifications.length === 0) {
      return (
        <Empty
          title={activeTab === 'todo' ? '暂无待办' : activeTab === 'unread' ? '全部已读' : '暂无通知'}
          description=""
          style={{ padding: '32px 0' }}
        />
      )
    }

    return (
      <div className="divide-y">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={handleNotificationClick}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="w-[380px]">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-base">通知中心</h4>
          {unreadCount > 0 && (
            <span
              className="px-1.5 py-0.5 text-xs font-medium rounded-full"
              style={{
                backgroundColor: 'var(--semi-color-danger)',
                color: '#fff',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            theme="borderless"
            type="tertiary"
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

      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        size="small"
        style={{ marginTop: -4 }}
        tabBarStyle={{ paddingLeft: 16, paddingRight: 16 }}
      >
        <TabPane tab="全部" itemKey="all" />
        <TabPane tab="未读" itemKey="unread" />
        <TabPane tab="待办" itemKey="todo" />
      </Tabs>

      {/* 通知列表 */}
      <div className="max-h-[360px] overflow-auto">
        {renderList()}
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
