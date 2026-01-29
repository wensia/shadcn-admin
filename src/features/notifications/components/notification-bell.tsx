/**
 * 通知铃铛组件（带数字角标）
 */

import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useUnreadCount } from '../hooks'
import { NotificationPopover } from './notification-popover'

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const { data: unreadCount = 0 } = useUnreadCount()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="通知"
        >
          <Bell className="h-5 w-5" />
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
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="end"
        sideOffset={8}
      >
        <NotificationPopover onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
