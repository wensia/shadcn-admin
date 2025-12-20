/**
 * StatusBadge 组件
 * 带圆点指示器的状态标签，用于显示线索状态、跟进结果等
 */

import { Badge } from './badge'
import { cn } from '@/lib/utils'

// 状态颜色类型
export type StatusColor = 'blue' | 'amber' | 'cyan' | 'gray' | 'purple' | 'green' | 'emerald' | 'red' | 'slate'

// 圆点颜色映射
const dotColors: Record<StatusColor, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  cyan: 'bg-cyan-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  slate: 'bg-slate-500',
}

// Badge variant 映射
const variantMap: Record<StatusColor, `status-${StatusColor}`> = {
  blue: 'status-blue',
  amber: 'status-amber',
  cyan: 'status-cyan',
  gray: 'status-gray',
  purple: 'status-purple',
  green: 'status-green',
  emerald: 'status-emerald',
  red: 'status-red',
  slate: 'status-slate',
}

interface StatusBadgeProps {
  /** 显示的文本 */
  label: string
  /** 颜色 */
  color: StatusColor
  /** 是否显示圆点 */
  showDot?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 状态标签组件
 * 采用轻量色背景 + 深色文字 + 圆点指示器的现代风格
 */
export function StatusBadge({
  label,
  color,
  showDot = true,
  className
}: StatusBadgeProps) {
  return (
    <Badge variant={variantMap[color]} className={cn('gap-1.5', className)}>
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[color])} />
      )}
      {label}
    </Badge>
  )
}

export { StatusBadge as default }
