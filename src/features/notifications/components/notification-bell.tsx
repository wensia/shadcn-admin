/**
 * 通知铃铛组件（带数字角标）
 */

import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button, Popover } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'
import { useUnreadCount } from '../hooks'
import { NotificationPopover } from './notification-popover'

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const { data: unreadCount = 0 } = useUnreadCount()

  return (
    <Popover
      visible={open}
      onVisibleChange={setOpen}
      content={<NotificationPopover onClose={() => setOpen(false)} />}
      trigger='click'
      position='bottomRight'
      showArrow={false}
      contentClassName='!p-0'
    >
      <Button
        theme="borderless"
        type="tertiary"
        icon={<Bell className="h-5 w-5" />}
        style={{ width: 36, height: 36, position: 'relative' }}
        aria-label="通知"
      >
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex items-center justify-center',
              'min-w-[18px] h-[18px] px-1',
              'text-[10px] font-medium',
              'bg-destructive text-destructive-foreground',
              'rounded-full'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </Popover>
  )
}
