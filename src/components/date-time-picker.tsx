/**
 * DateTimePicker 日期时间选择器组件
 * 基于 Semi DatePicker type="dateTime" 实现
 * 支持日期和时间选择，以及快捷时间按钮
 */

import * as React from 'react'
import { format, addDays, nextMonday, setHours, setMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { X } from 'lucide-react'
import { DatePicker as SemiDatePicker, Button } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

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

export function DateTimePicker({
  value,
  onChange,
  placeholder = '选择日期时间',
  disabled = false,
  minDate,
  className,
  showQuickButtons = true,
}: DateTimePickerProps) {
  // 解析 ISO 字符串为 Date 对象
  const parseValue = (val: string | undefined): Date | undefined => {
    if (!val) return undefined
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date
  }

  const selectedDate = parseValue(value)

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

  // 禁用日期
  const disabledDate = React.useCallback(
    (date?: Date) => {
      if (!date) return false
      if (minDate) return date < minDate
      return date < new Date(new Date().setHours(0, 0, 0, 0))
    },
    [minDate]
  )

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SemiDatePicker
        type='dateTime'
        value={selectedDate}
        onChange={(date) => {
          if (date instanceof Date) {
            onChange(date.toISOString())
          } else {
            onChange(undefined)
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        disabledDate={disabledDate}
        format='MM/dd HH:mm'
        className='min-w-[120px]'
        suffix={
          selectedDate ? (
            <X
              className='h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer'
              onClick={handleClear}
            />
          ) : undefined
        }
      />

      {/* 快捷按钮 */}
      {showQuickButtons && (
        <div className='flex gap-1'>
          {quickOptions.map((option) => (
            <Button
              key={option.label}
              theme='borderless'
              size='small'
              disabled={disabled}
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
