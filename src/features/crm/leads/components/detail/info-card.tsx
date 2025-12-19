/**
 * InfoCard 信息分组卡片组件
 * 用于在概览 Tab 中展示分组信息
 */

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface InfoCardProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  compact?: boolean
  className?: string
}

export function InfoCard({
  title,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true,
  compact = false,
  className,
}: InfoCardProps) {
  const s = useStyleClasses()
  const [isOpen, setIsOpen] = React.useState(defaultExpanded)

  const headerContent = (
    <div className={cn('flex items-center gap-2', collapsible && 'cursor-pointer')}>
      {icon && (
        <span className={cn('text-muted-foreground', s.size.icon)}>
          {icon}
        </span>
      )}
      <h3 className={cn(s.text.sm, 'font-semibold')}>{title}</h3>
      {collapsible && (
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      )}
    </div>
  )

  const content = (
    <div className={cn(compact ? 'mt-2' : 'mt-3')}>
      {children}
    </div>
  )

  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'border bg-card p-4',
            s.rounded,
            className
          )}
        >
          <CollapsibleTrigger asChild>
            {headerContent}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {content}
          </CollapsibleContent>
        </div>
      </Collapsible>
    )
  }

  return (
    <div
      className={cn(
        'border bg-card p-4',
        s.rounded,
        className
      )}
    >
      {headerContent}
      {content}
    </div>
  )
}
