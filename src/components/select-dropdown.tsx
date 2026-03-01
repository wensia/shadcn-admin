import { Select, Spin } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

type SelectDropdownProps = {
  onValueChange?: (value: string) => void
  defaultValue: string | undefined
  placeholder?: string
  isPending?: boolean
  items: { label: string; value: string }[] | undefined
  disabled?: boolean
  className?: string
  isControlled?: boolean
}

export function SelectDropdown({
  defaultValue,
  onValueChange,
  isPending,
  items,
  placeholder,
  disabled,
  className = '',
  isControlled = false,
}: SelectDropdownProps) {
  const optionList = isPending
    ? [{ value: 'loading', label: 'Loading...', disabled: true }]
    : (items ?? [])

  const valueProps = isControlled
    ? { value: defaultValue }
    : { defaultValue }

  return (
    <Select
      {...valueProps}
      onChange={(val) => onValueChange?.(val as string)}
      placeholder={placeholder ?? 'Select'}
      disabled={disabled}
      className={cn(className)}
      optionList={optionList}
      prefix={isPending ? <Spin size='small' /> : undefined}
    />
  )
}
