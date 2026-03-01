/**
 * StatusBadge 组件
 * 带圆点指示器的状态标签（基于 Semi Design Tag）
 *
 * 状态色:
 * - Orange: #f97316 (警告/待处理)
 * - Green: #788c5d (成功/已完成)
 * - Gray: #b0aea5 (次要元素)
 * - Red: 危险/无效状态
 */

import { Tag } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

// 状态颜色类型
export type StatusColor = 'orange' | 'green' | 'gray' | 'red'

// 状态色 HEX 值
const statusColors: Record<StatusColor, string> = {
  orange: '#f97316',
  green: '#788c5d',
  gray: '#b0aea5',
  red: '#dc2626',
}

// 浅色背景映射
const statusBgColors: Record<StatusColor, string> = {
  orange: 'rgba(249, 115, 22, 0.1)',
  green: 'rgba(120, 140, 93, 0.1)',
  gray: 'rgba(176, 174, 165, 0.1)',
  red: 'rgba(220, 38, 38, 0.1)',
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
 * 浅色背景 + 状态色文字 + 圆点指示器
 */
export function StatusBadge({
  label,
  color,
  showDot = true,
  className
}: StatusBadgeProps) {
  return (
    <Tag
      className={cn('gap-1.5', className)}
      style={{
        backgroundColor: statusBgColors[color],
        color: statusColors[color],
        borderColor: 'transparent',
      }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
          style={{ backgroundColor: statusColors[color] }}
        />
      )}
      {label}
    </Tag>
  )
}

export { StatusBadge as default }
