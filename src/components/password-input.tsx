import * as React from 'react'
import { Input } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'mode' | 'onChange'
> & {
  inputClassName?: string
  onChange?: (value: string) => void
}

export function PasswordInput({
  className,
  inputClassName,
  onChange,
  ...props
}: PasswordInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Input
        mode='password'
        className={inputClassName}
        onChange={(v) => onChange?.(v)}
        {...props}
      />
    </div>
  )
}
