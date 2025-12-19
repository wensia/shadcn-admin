/**
 * MiniStatCard 迷你统计卡片组件
 * 用于在线索详情顶部展示关键指标
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

type StatVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface MiniStatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
  variant?: StatVariant
  progress?: number // 0-100
  highlight?: boolean // 高亮显示（如逾期状态）
  className?: string
}

const variantClasses: Record<StatVariant, string> = {
  default: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
}

const progressVariantClasses: Record<StatVariant, string> = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
}

export function MiniStatCard({
  icon,
  label,
  value,
  subtext,
  variant = 'default',
  progress,
  highlight = false,
  className,
}: MiniStatCardProps) {
  const s = useStyleClasses()

  return (
    <div
      className={cn(
        'flex flex-col p-3 bg-background border transition-colors',
        s.rounded,
        highlight && 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
        className
      )}
    >
      {/* 图标和标签 */}
      <div className="flex items-center gap-2 mb-1">
        <span className={cn('text-muted-foreground', s.size.icon)}>
          {icon}
        </span>
        <span className={cn(s.text.xs, 'text-muted-foreground truncate')}>
          {label}
        </span>
      </div>

      {/* 数值 */}
      <div className={cn(s.text.base, 'font-semibold', variantClasses[variant])}>
        {value}
      </div>

      {/* 副文本 */}
      {subtext && (
        <span className={cn(s.text.xs, 'text-muted-foreground mt-0.5 truncate')}>
          {subtext}
        </span>
      )}

      {/* 进度条 */}
      {progress !== undefined && (
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              progressVariantClasses[variant]
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
