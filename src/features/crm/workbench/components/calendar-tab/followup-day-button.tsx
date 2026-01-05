/**
 * 自定义日历日期按钮
 * 显示待跟进线索数量气泡
 */

import * as React from 'react'
import { DayButton, getDefaultClassNames } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { isToday, isPast, startOfDay } from 'date-fns'

interface FollowupDayButtonProps extends React.ComponentProps<typeof DayButton> {
  followupCount: number
}

export function FollowupDayButton({
  className,
  day,
  modifiers,
  followupCount,
  ...props
}: FollowupDayButtonProps) {
  const defaultClassNames = getDefaultClassNames()
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const dateIsToday = isToday(day.date)
  const dateIsPast = isPast(startOfDay(day.date)) && !dateIsToday
  const hasFollowups = followupCount > 0

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'relative flex w-full min-w-10 h-12 flex-col items-center justify-center gap-0.5 leading-none font-normal rounded-lg',
        'group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10',
        'group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50',
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
        'data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground',
        'data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground',
        'data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground',
        dateIsToday && !modifiers.selected && 'bg-accent text-accent-foreground',
        modifiers.outside && 'text-muted-foreground opacity-50',
        modifiers.disabled && 'text-muted-foreground opacity-50',
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      <span className="text-sm">{day.date.getDate()}</span>
      {hasFollowups && (
        <Badge
          variant={dateIsPast ? 'destructive' : 'default'}
          className={cn(
            'h-4 min-w-4 px-1 text-[10px] leading-none',
            modifiers.selected && 'bg-primary-foreground text-primary'
          )}
        >
          {followupCount > 99 ? '99+' : followupCount}
        </Badge>
      )}
    </Button>
  )
}
