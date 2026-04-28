/**
 * Semi Design Badge 组件 - 基于 Tag 的 Badge 封装
 * 保留原有 Badge variant 色值，使用 Semi Tag 实现
 */

import { Tag } from '@douyinfe/semi-ui-19'
import type { TagProps } from '@douyinfe/semi-ui-19/lib/es/tag'
import type { CSSProperties, ReactNode } from 'react'

// 所有支持的 variant
export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'status-orange'
  | 'status-green'
  | 'status-gray'
  | 'status-red'
  | 'status-orange-solid'
  | 'status-green-solid'
  | 'status-gray-solid'
  | 'position-staff'
  | 'position-supervisor'
  | 'position-manager'
  | 'position-director'
  | 'position-executive'

// variant → 样式映射
const variantStyles: Record<BadgeVariant, CSSProperties> = {
  default: {
    backgroundColor: 'var(--semi-color-primary)',
    color: '#fff',
    borderColor: 'transparent',
  },
  secondary: {
    backgroundColor: 'var(--semi-color-fill-0)',
    color: 'var(--semi-color-text-0)',
    borderColor: 'transparent',
  },
  destructive: {
    backgroundColor: 'var(--semi-color-danger)',
    color: '#fff',
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    color: 'var(--semi-color-text-0)',
    borderColor: 'var(--semi-color-border)',
  },
  // 状态色 - 浅色背景
  'status-orange': {
    backgroundColor: 'rgba(249,115,22,0.1)',
    color: '#f97316',
    borderColor: 'rgba(249,115,22,0.3)',
  },
  'status-green': {
    backgroundColor: 'rgba(120,140,93,0.1)',
    color: '#788c5d',
    borderColor: 'rgba(120,140,93,0.3)',
  },
  'status-gray': {
    backgroundColor: 'rgba(176,174,165,0.1)',
    color: '#b0aea5',
    borderColor: 'rgba(176,174,165,0.3)',
  },
  'status-red': {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderColor: '#fca5a5',
  },
  // 状态色 - 实心
  'status-orange-solid': {
    backgroundColor: '#f97316',
    color: '#fff',
    borderColor: 'transparent',
  },
  'status-green-solid': {
    backgroundColor: '#788c5d',
    color: '#fff',
    borderColor: 'transparent',
  },
  'status-gray-solid': {
    backgroundColor: '#b0aea5',
    color: '#fff',
    borderColor: 'transparent',
  },
  // 职位级别
  'position-staff': {
    backgroundColor: 'rgba(232,230,220,0.5)',
    color: '#141413',
    borderColor: 'rgba(176,174,165,0.3)',
  },
  'position-supervisor': {
    backgroundColor: 'rgba(120,140,93,0.1)',
    color: '#788c5d',
    borderColor: 'rgba(120,140,93,0.3)',
  },
  'position-manager': {
    backgroundColor: 'rgba(106,155,204,0.1)',
    color: '#6a9bcc',
    borderColor: 'rgba(106,155,204,0.3)',
  },
  'position-director': {
    backgroundColor: 'rgba(249,115,22,0.1)',
    color: '#f97316',
    borderColor: 'rgba(249,115,22,0.3)',
  },
  'position-executive': {
    backgroundColor: 'rgba(20,20,19,0.1)',
    color: '#141413',
    borderColor: 'rgba(20,20,19,0.3)',
  },
}

// 旧版 variant 别名映射 (保持向后兼容)
const variantAliases: Record<string, BadgeVariant> = {
  'status-emerald': 'status-green',
  'status-slate': 'status-gray',
  'status-blue': 'position-manager',
  'status-purple': 'position-director',
  'status-cyan': 'position-manager',
  'status-amber': 'status-orange',
  success: 'status-green',
  warning: 'status-orange',
  info: 'position-manager',
  purple: 'position-director',
}

export interface SemiBadgeProps {
  variant?: BadgeVariant | string
  children?: ReactNode
  className?: string
  style?: CSSProperties
  size?: TagProps['size']
  onClick?: () => void
}

export function SemiBadge({
  variant = 'default',
  children,
  className,
  style,
  size = 'small',
  onClick,
}: SemiBadgeProps) {
  // 解析 variant (含别名)
  const resolvedVariant = variantAliases[variant] || variant
  const variantStyle = variantStyles[resolvedVariant as BadgeVariant] || variantStyles.default

  return (
    <Tag
      size={size}
      shape="circle"
      className={className}
      style={{
        ...variantStyle,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontWeight: 500,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}
