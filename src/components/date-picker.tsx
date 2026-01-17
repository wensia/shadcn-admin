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
 * 日期范围选择器组件（双输入框版本）
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
 * 真正的日期范围选择器（单按钮触发，日历可选范围）
 * 使用 react-day-picker 的 range 模式
 */
interface DateRangePickerSingleProps {
  /** 日期范围 { from, to } */
  value: { from: string | undefined; to: string | undefined }
  /** 日期范围变更回调 */
  onChange: (range: { from: string | undefined; to: string | undefined }) => void
  /** 占位文本 */
  placeholder?: string
  /** 自定义类名 */
  className?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 显示几个月 */
  numberOfMonths?: number
}

export function DateRangePickerSingle({
  value,
  onChange,
  placeholder = '选择日期范围',
  className,
  disabled = false,
  numberOfMonths = 2,
}: DateRangePickerSingleProps) {
  const s = useStyleClasses()
  const [open, setOpen] = React.useState(false)

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

  const fromDate = parseDate(value.from)
  const toDate = parseDate(value.to)

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    onChange({
      from: formatDateString(range?.from),
      to: formatDateString(range?.to),
    })
    // 不自动关闭弹窗，让用户可以继续调整日期范围
    // 用户点击外部或按 ESC 键关闭
  }

  // 格式化日期
  const fromText = fromDate ? format(fromDate, 'yy-MM-dd') : ''
  const toText = toDate ? format(toDate, 'yy-MM-dd') : ''
  const hasSelection = fromDate || toDate

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!hasSelection}
          className={cn(
            'justify-between font-normal data-[empty=true]:text-muted-foreground',
            s.height.control,
            s.text.xs,
            s.rounded,
            'min-w-[240px]',
            className
          )}
        >
          {hasSelection ? (
            <div className="flex w-full items-center">
              <span className="flex-1 text-left">{fromText || '...'}</span>
              <span className="mx-2 text-muted-foreground">-</span>
              <span className="flex-1 text-right">{toText || '...'}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-auto p-0', s.rounded)} align="end">
        <Calendar
          mode="range"
          selected={{ from: fromDate, to: toDate }}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          locale={zhCN}
        />
      </PopoverContent>
    </Popover>
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
