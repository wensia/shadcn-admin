/**
 * DatePicker 日期选择器组件
 * 支持 Mira/Lyra/Maia 三种 UI 风格
 * 支持中文日期格式
 */

import * as React from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

interface DatePickerProps {
  /** 选中的日期 */
  selected: Date | undefined
  /** 日期选择回调 */
  onSelect: (date: Date | undefined) => void
  /** 占位文本 */
  placeholder?: string
  /** 日期格式 */
  dateFormat?: string
  /** 自定义类名 */
  className?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 禁用日期的条件 */
  disabledDates?: (date: Date) => boolean
  /** 最小日期 */
  minDate?: Date
  /** 最大日期 */
  maxDate?: Date
  /** 是否全宽 */
  fullWidth?: boolean
}

export function DatePicker({
  selected,
  onSelect,
  placeholder = '选择日期',
  dateFormat = 'yyyy/MM/dd',
  className,
  disabled = false,
  disabledDates,
  minDate = new Date('1900-01-01'),
  maxDate,
  fullWidth = false,
}: DatePickerProps) {
  const s = useStyleClasses()
  const [open, setOpen] = React.useState(false)

  // 计算禁用日期的条件
  const isDisabled = React.useCallback(
    (date: Date) => {
      if (disabledDates?.(date)) return true
      if (minDate && date < minDate) return true
      if (maxDate && date > maxDate) return true
      return false
    },
    [disabledDates, minDate, maxDate]
  )

  // 处理日期选择
  const handleSelect = (date: Date | undefined) => {
    onSelect(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!selected}
          className={cn(
            'justify-start text-start font-normal data-[empty=true]:text-muted-foreground',
            s.height.control,
            s.text.xs,
            s.rounded,
            fullWidth ? 'w-full' : 'w-auto min-w-[140px]',
            className
          )}
        >
          {selected ? (
            format(selected, dateFormat, { locale: zhCN })
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-auto p-0', s.rounded)} align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={handleSelect}
          disabled={isDisabled}
          locale={zhCN}
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * 日期范围选择器组件
 * 用于筛选场景的日期区间选择
 */
interface DateRangePickerProps {
  /** 开始日期 */
  startDate: string | undefined
  /** 结束日期 */
  endDate: string | undefined
  /** 开始日期变更回调 */
  onStartDateChange: (date: string | undefined) => void
  /** 结束日期变更回调 */
  onEndDateChange: (date: string | undefined) => void
  /** 开始日期占位符 */
  startPlaceholder?: string
  /** 结束日期占位符 */
  endPlaceholder?: string
  /** 自定义类名 */
  className?: string
  /** 是否禁用 */
  disabled?: boolean
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = '开始日期',
  endPlaceholder = '结束日期',
  className,
  disabled = false,
}: DateRangePickerProps) {
  const s = useStyleClasses()

  // 将字符串日期转换为 Date 对象
  const parseDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? undefined : date
  }

  // 将 Date 对象转换为 YYYY-MM-DD 格式字符串
  const formatDateString = (date: Date | undefined): string | undefined => {
    if (!date) return undefined
    return format(date, 'yyyy-MM-dd')
  }

  const startDateObj = parseDate(startDate)
  const endDateObj = parseDate(endDate)

  return (
    <div className={cn('grid grid-cols-2', s.gap.tight, className)}>
      <DatePicker
        selected={startDateObj}
        onSelect={(date) => onStartDateChange(formatDateString(date))}
        placeholder={startPlaceholder}
        disabled={disabled}
        maxDate={endDateObj}
        fullWidth
      />
      <DatePicker
        selected={endDateObj}
        onSelect={(date) => onEndDateChange(formatDateString(date))}
        placeholder={endPlaceholder}
        disabled={disabled}
        minDate={startDateObj}
        fullWidth
      />
    </div>
  )
}

/**
 * 表单用日期选择器
 * 兼容 react-hook-form，value/onChange 使用字符串格式
 */
interface FormDatePickerProps {
  /** 字符串格式的日期值 (YYYY-MM-DD) */
  value: string | undefined
  /** 日期变更回调 */
  onChange: (value: string | undefined) => void
  /** 占位文本 */
  placeholder?: string
  /** 自定义类名 */
  className?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 最小日期 */
  minDate?: Date
  /** 最大日期 */
  maxDate?: Date
}

export function FormDatePicker({
  value,
  onChange,
  placeholder = '选择日期',
  className,
  disabled = false,
  minDate,
  maxDate,
}: FormDatePickerProps) {
  // 将字符串日期转换为 Date 对象
  const parseDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? undefined : date
  }

  // 将 Date 对象转换为 YYYY-MM-DD 格式字符串
  const formatDateString = (date: Date | undefined): string | undefined => {
    if (!date) return undefined
    return format(date, 'yyyy-MM-dd')
  }

  const dateObj = parseDate(value)

  return (
    <DatePicker
      selected={dateObj}
      onSelect={(date) => onChange(formatDateString(date))}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      fullWidth
    />
  )
}
