/**
 * InfoGrid 信息网格布局组件
 * 用于在 InfoCard 内部展示信息项
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

interface InfoGridProps {
  cols?: 1 | 2 | 3
  children: React.ReactNode
  className?: string
}

const colsClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}

export function InfoGrid({
  cols = 2,
  children,
  className,
}: InfoGridProps) {
  const s = useStyleClasses()

  return (
    <div
      className={cn(
        'grid gap-x-4 gap-y-2',
        colsClasses[cols],
        s.text.xs,
        className
      )}
    >
      {children}
    </div>
  )
}
