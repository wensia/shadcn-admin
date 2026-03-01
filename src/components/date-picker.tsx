/**
 * DatePicker 日期选择器组件
 * 基于 Semi DatePicker 实现
 * 支持中文日期格式
 */

import * as React from 'react'
import { format } from 'date-fns'
import { DatePicker as SemiDatePicker } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

/** 将字符串日期转换为 Date 对象 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? undefined : date
}

/** 将 Date 对象转换为 YYYY-MM-DD 格式字符串 */
function formatDateString(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return format(date, 'yyyy-MM-dd')
}

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
  // 计算禁用日期的条件
  const disabledDate = React.useCallback(
    (date?: Date) => {
      if (!date) return false
      if (disabledDates?.(date)) return true
      if (minDate && date < minDate) return true
      if (maxDate && date > maxDate) return true
      return false
    },
    [disabledDates, minDate, maxDate]
  )

  return (
    <SemiDatePicker
      type='date'
      value={selected}
      onChange={(date) => onSelect(date as Date | undefined)}
      placeholder={placeholder}
      format={dateFormat}
      disabled={disabled}
      disabledDate={disabledDate}
      className={cn(fullWidth ? 'w-full' : 'w-auto min-w-[140px]', className)}
    />
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
  const startDateObj = parseDate(startDate)
  const endDateObj = parseDate(endDate)

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
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
 * 使用 Semi DatePicker type="dateRange"
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
}: DateRangePickerSingleProps) {
  const fromDate = parseDate(value.from)
  const toDate = parseDate(value.to)

  const currentValue: [Date, Date] | undefined =
    fromDate && toDate ? [fromDate, toDate] : undefined

  return (
    <SemiDatePicker
      type='dateRange'
      value={currentValue}
      onChange={(dates) => {
        if (Array.isArray(dates) && dates.length === 2) {
          onChange({
            from: formatDateString(dates[0] as Date),
            to: formatDateString(dates[1] as Date),
          })
        } else {
          onChange({ from: undefined, to: undefined })
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={cn('min-w-[240px]', className)}
      format='yy-MM-dd'
    />
  )
}

/**
 * 表单用日期选择器
 * 兼容常见表单库，value/onChange 使用字符串格式
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
