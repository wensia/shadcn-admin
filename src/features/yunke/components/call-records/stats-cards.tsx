/**
 * 通话统计卡片组件 - 紧凑单行展示
 */

import { Skeleton } from '@/components/ui/skeleton'
import { PhoneCall, Clock, PhoneIncoming, Percent, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
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

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const items = [
    {
      label: '今日通话',
      value: stats?.today_count ?? 0,
      suffix: '通',
      icon: PhoneCall,
      color: 'text-blue-500',
    },
    {
      label: '今日时长',
      value: stats?.today_duration ?? 0,
      formatter: formatDuration,
      icon: Clock,
      color: 'text-green-500',
    },
    {
      label: '今日接通',
      value: stats?.answered_count ?? 0,
      suffix: '通',
      icon: PhoneIncoming,
      color: 'text-purple-500',
    },
    {
      label: '接通率',
      value: stats?.answer_rate ?? 0,
      suffix: '%',
      icon: Percent,
      color: 'text-amber-500',
    },
    {
      label: '总记录',
      value: stats?.total_count ?? 0,
      suffix: '条',
      icon: Database,
      color: 'text-muted-foreground',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-2.5">
        {items.map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-2.5">
      {items.map((item, index) => {
        const Icon = item.icon
        const displayValue = item.formatter
          ? item.formatter(item.value)
          : `${item.value.toLocaleString()}${item.suffix || ''}`

        return (
          <div key={item.label} className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', item.color)} />
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-semibold">{displayValue}</span>
            {index < items.length - 1 && (
              <span className="ml-4 hidden h-4 w-px bg-border sm:block" />
            )}
          </div>
        )
      })}
    </div>
  )
}
