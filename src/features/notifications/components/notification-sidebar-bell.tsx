/**
 * 顶部导航栏通知按钮组件
 * 图标 + 红色数字角标，点击弹出通知面板
 */

import { useState } from 'react'
import { Popover, Badge } from '@douyinfe/semi-ui-19'
import { Bell } from 'lucide-react'
import { useUnreadCount } from '../hooks'
import { NotificationPopover } from './notification-popover'

export function NotificationSidebarBell() {
  const [open, setOpen] = useState(false)
  const { data: unreadCount = 0 } = useUnreadCount()
  const badgeCount = unreadCount > 0 ? unreadCount : undefined

  return (
    <Popover
      visible={open}
      onVisibleChange={setOpen}
      content={<NotificationPopover onClose={() => setOpen(false)} />}
      trigger="click"
      position="bottomRight"
      showArrow={false}
      contentClassName="!p-0"
      getPopupContainer={() => document.body}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: 6,
          padding: '6px 4px 4px',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--semi-color-fill-0)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <Badge
          count={badgeCount}
          overflowCount={99}
          type="danger"
        >
          <div
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
          >
            <Bell
              style={{
                width: 16,
                height: 16,
                color: 'var(--semi-color-text-2)',
              }}
            />
          </div>
        </Badge>
      </div>
    </Popover>
  )
}
