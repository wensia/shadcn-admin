/**
 * EmptyState 空状态组件
 * 用于展示无数据状态
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const s = useStyleClasses()

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {React.cloneElement(icon as React.ReactElement, {
            className: 'h-12 w-12',
          })}
        </div>
      )}
      <h3 className={cn(s.text.sm, 'font-medium text-foreground mb-1')}>
        {title}
      </h3>
      {description && (
        <p className={cn(s.text.xs, 'text-muted-foreground max-w-sm')}>
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className={cn('mt-4', s.height.controlSm, s.text.xs)}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
