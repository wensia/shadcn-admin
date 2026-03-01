/**
 * 通话统计卡片组件 - 紧凑单行展示 (Semi Design)
 */

import { Skeleton } from '@douyinfe/semi-ui-19'
import { PhoneCall, Clock, PhoneIncoming, Percent, Database } from 'lucide-react'
import type { CallRecordStats } from '../../types'

interface StatsCardsProps {
  stats: CallRecordStats | null
  isLoading?: boolean
}

/**
 * 格式化时长（秒 -> 时:分:秒）
 */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0分'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}时${minutes}分`
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`
  } else {
    return `${secs}秒`
  }
}

const iconStyle = { width: 16, height: 16, flexShrink: 0 } as const

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const items = [
    {
      label: '今日通话',
      value: stats?.today_count ?? 0,
      suffix: '通',
      icon: PhoneCall,
      color: 'var(--semi-color-primary)',
    },
    {
      label: '今日时长',
      value: stats?.today_duration ?? 0,
      formatter: formatDuration,
      icon: Clock,
      color: 'var(--semi-color-success)',
    },
    {
      label: '今日接通',
      value: stats?.answered_count ?? 0,
      suffix: '通',
      icon: PhoneIncoming,
      color: '#722ed1',
    },
    {
      label: '接通率',
      value: stats?.answer_rate ?? 0,
      suffix: '%',
      icon: Percent,
      color: 'var(--semi-color-warning)',
    },
    {
      label: '总记录',
      value: stats?.total_count ?? 0,
      suffix: '条',
      icon: Database,
      color: 'var(--semi-color-text-2)',
    },
  ]

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
      }}>
        {items.map((_, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
      columnGap: 24,
      rowGap: 8,
      borderRadius: 8,
      border: '1px solid var(--semi-color-border)',
      backgroundColor: 'var(--semi-color-bg-2)',
      padding: '10px 16px',
    }}>
      {items.map((item, index) => {
        const Icon = item.icon
        const displayValue = item.formatter
          ? item.formatter(item.value)
          : `${item.value.toLocaleString()}${item.suffix || ''}`

        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon style={{ ...iconStyle, color: item.color }} />
            <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{displayValue}</span>
            {index < items.length - 1 && (
              <span style={{
                marginLeft: 16,
                height: 16,
                width: 1,
                backgroundColor: 'var(--semi-color-border)',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
