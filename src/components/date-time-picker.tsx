/**
 * DateTimePicker 日期时间选择器组件
 * 支持日期和时间选择，以及快捷时间按钮
 */

import * as React from 'react'
import { format, addDays, nextMonday, setHours, setMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

interface DateTimePickerProps {
  /** 选中的日期时间（ISO 格式字符串） */
  value: string | undefined
  /** 日期时间选择回调 */
  onChange: (value: string | undefined) => void
  /** 占位文本 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 最小日期 */
  minDate?: Date
  /** 自定义类名 */
  className?: string
  /** 是否显示快捷按钮 */
  showQuickButtons?: boolean
}

// 生成小时选项（6-22点）
const hourOptions = Array.from({ length: 17 }, (_, i) => i + 6)

// 生成分钟选项（0, 30）
const minuteOptions = [0, 30]

export function DateTimePicker({
  value,
  onChange,
  placeholder = '选择日期时间',
  disabled = false,
  minDate,
  className,
  showQuickButtons = true,
}: DateTimePickerProps) {
  const s = useStyleClasses()
  const [open, setOpen] = React.useState(false)

  // 解析 ISO 字符串为 Date 对象
  const parseValue = (val: string | undefined): Date | undefined => {
    if (!val) return undefined
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date
  }

  const selectedDate = parseValue(value)
  const selectedHour = selectedDate?.getHours() ?? 10
  const selectedMinute = selectedDate?.getMinutes() ?? 0

  // 处理日期选择
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined)
      return
    }
    // 保持当前时间，只更新日期
    const newDate = setMinutes(setHours(date, selectedHour), selectedMinute)
    onChange(newDate.toISOString())
  }

  // 处理小时选择
  const handleHourChange = (hour: string) => {
    if (!selectedDate) {
      // 如果没有选择日期，默认使用今天
      const today = setMinutes(setHours(new Date(), parseInt(hour)), selectedMinute)
      onChange(today.toISOString())
    } else {
      const newDate = setHours(selectedDate, parseInt(hour))
      onChange(newDate.toISOString())
    }
  }

  // 处理分钟选择
  const handleMinuteChange = (minute: string) => {
    if (!selectedDate) {
      const today = setMinutes(setHours(new Date(), selectedHour), parseInt(minute))
      onChange(today.toISOString())
    } else {
      const newDate = setMinutes(selectedDate, parseInt(minute))
      onChange(newDate.toISOString())
    }
  }

  // 快捷选项
  const quickOptions = [
    {
      label: '今天',
      getValue: () => setMinutes(setHours(new Date(), 18), 0),
    },
    {
      label: '明天',
      getValue: () => setMinutes(setHours(addDays(new Date(), 1), 10), 0),
    },
    {
      label: '后天',
      getValue: () => setMinutes(setHours(addDays(new Date(), 2), 10), 0),
    },
    {
      label: '下周',
      getValue: () => setMinutes(setHours(nextMonday(new Date()), 10), 0),
    },
  ]

  // 处理快捷选项
  const handleQuickSelect = (getValue: () => Date) => {
    const date = getValue()
    onChange(date.toISOString())
    setOpen(false)
  }

  // 清除选择
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  // 格式化显示
  const displayValue = selectedDate
    ? format(selectedDate, 'MM/dd HH:mm', { locale: zhCN })
    : null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            data-empty={!selectedDate}
            className={cn(
              'justify-start text-start font-normal data-[empty=true]:text-muted-foreground',
              s.height.control,
              s.text.xs,
              s.rounded,
              'min-w-[120px]'
            )}
          >
            {displayValue ?? <span>{placeholder}</span>}
            {selectedDate ? (
              <X
                className="ms-auto h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            ) : (
              <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-auto p-0', s.rounded)} align="start">
          <div className="flex">
            {/* 日历 */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => minDate ? date < minDate : date < new Date(new Date().setHours(0, 0, 0, 0))}
              locale={zhCN}
            />
            {/* 时间选择 */}
            <div className="flex flex-col border-l p-3 gap-2">
              <div className="text-xs text-muted-foreground mb-1">时间</div>
              <div className="flex gap-1">
                <Select value={String(selectedHour)} onValueChange={handleHourChange}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour} value={String(hour)}>
                        {String(hour).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center">:</span>
                <Select value={String(selectedMinute)} onValueChange={handleMinuteChange}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map((minute) => (
                      <SelectItem key={minute} value={String(minute)}>
                        {String(minute).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 快捷按钮 */}
      {showQuickButtons && (
        <div className="flex gap-1">
          {quickOptions.map((option) => (
            <Button
              key={option.label}
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn(s.height.control, 'px-2', s.text.xs)}
              onClick={() => handleQuickSelect(option.getValue)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
