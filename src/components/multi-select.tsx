/**
 * 多选下拉组件
 * 使用 Semi Select multiple 模式
 */

import * as React from 'react'
import { Select } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = '请选择...',
  className,
  disabled = false,
}: MultiSelectProps) {
  const optionList = React.useMemo(
    () => options.map((opt) => ({ value: opt.value, label: opt.label })),
    [options]
  )

  return (
    <Select
      multiple
      filter
      optionList={optionList}
      value={value}
      onChange={(val) => onValueChange(val as string[])}
      placeholder={placeholder}
      className={cn('w-full', className)}
      disabled={disabled}
    />
  )
}
