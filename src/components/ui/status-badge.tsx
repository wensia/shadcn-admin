/**
 * StatusBadge 组件
 * 带圆点指示器的状态标签，使用 Anthropic 品牌色
 *
 * Anthropic 品牌色:
 * - Orange: #d97757 (主要强调)
 * - Blue: #6a9bcc (次要强调)
 * - Green: #788c5d (第三强调)
 * - Mid Gray: #b0aea5 (次要元素)
 */

import { Badge } from './badge'
import { cn } from '@/lib/utils'

// Anthropic 品牌色状态颜色类型
export type StatusColor = 'orange' | 'blue' | 'green' | 'gray' | 'red'

// Anthropic 品牌色 HEX 值
const anthropicColors: Record<StatusColor, string> = {
  orange: '#d97757',
  blue: '#6a9bcc',
  green: '#788c5d',
  gray: '#b0aea5',
  red: '#dc2626',
}

// Badge variant 映射
const variantMap: Record<StatusColor, `status-${StatusColor}`> = {
  orange: 'status-orange',
  blue: 'status-blue',
  green: 'status-green',
  gray: 'status-gray',
  red: 'status-red',
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
 * 采用 Anthropic 品牌色：浅色背景 + 深色文字 + 圆点指示器
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
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: anthropicColors[color] }}
        />
      )}
      {label}
    </Badge>
  )
}

export { StatusBadge as default }
