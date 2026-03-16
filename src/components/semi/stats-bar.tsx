/**
 * StatsBar - 通用统计指标条
 * 在一行内平均分布显示多个统计指标，指标间用竖线分隔
 */

import { Skeleton } from '@douyinfe/semi-ui-19'
import type { LucideIcon } from 'lucide-react'

export interface StatsBarItem {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: string
}

interface StatsBarProps {
  items: StatsBarItem[]
  isLoading?: boolean
}

const iconStyle = { width: 16, height: 16, flexShrink: 0 } as const

export function StatsBar({ items, isLoading }: StatsBarProps) {
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 16,
        borderRadius: 8,
        border: '1px solid var(--semi-color-border)',
        backgroundColor: 'var(--semi-color-bg-2)',
        padding: '10px 16px',
        width: '100%',
      }}>
        {items.map((_, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      rowGap: 8,
      borderRadius: 8,
      border: '1px solid var(--semi-color-border)',
      backgroundColor: 'var(--semi-color-bg-2)',
      padding: '10px 16px',
      width: '100%',
    }}>
      {items.map((item, index) => {
        const Icon = item.icon
        const displayValue = typeof item.value === 'number'
          ? item.value.toLocaleString()
          : item.value

        return (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            flex: 1, minWidth: 0,
            borderRight: index < items.length - 1 ? '1px solid var(--semi-color-border)' : undefined,
          }}>
            {Icon && <Icon style={{ ...iconStyle, color: item.color }} />}
            <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{displayValue}</span>
          </div>
        )
      })}
    </div>
  )
}
