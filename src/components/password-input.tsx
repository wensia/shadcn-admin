import * as React from 'react'
import { Input } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> & {
  inputClassName?: string
  ref?: React.Ref<HTMLInputElement>
  onChange?: (value: string) => void
  value?: string
}

export function PasswordInput({
  className,
  inputClassName,
  disabled,
  ref,
  onChange,
  value,
  placeholder,
  ...props
}: PasswordInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Input
        mode='password'
        className={inputClassName}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(v) => onChange?.(v)}
        {...(props as any)}
      />
    </div>
  )
}
