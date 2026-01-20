/**
 * 通话统计卡片组件
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PhoneCall, Clock, PhoneIncoming, Percent } from 'lucide-react'
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
  const cards = [
    {
      title: '今日通话',
      value: stats?.today_count ?? 0,
      suffix: '通',
      icon: PhoneCall,
      iconClassName: 'text-blue-500',
      bgClassName: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: '今日时长',
      value: stats?.today_duration ?? 0,
      formatter: formatDuration,
      icon: Clock,
      iconClassName: 'text-green-500',
      bgClassName: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: '今日接通',
      value: stats?.answered_count ?? 0,
      suffix: '通',
      icon: PhoneIncoming,
      iconClassName: 'text-purple-500',
      bgClassName: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: '接通率',
      value: stats?.answer_rate ?? 0,
      suffix: '%',
      icon: Percent,
      iconClassName: 'text-amber-500',
      bgClassName: 'bg-amber-50 dark:bg-amber-950',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        const displayValue = card.formatter
          ? card.formatter(card.value)
          : `${card.value.toLocaleString()}${card.suffix || ''}`

        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn('rounded-full p-2', card.bgClassName)}>
                <Icon className={cn('h-4 w-4', card.iconClassName)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayValue}</div>
              <p className="text-xs text-muted-foreground">
                总记录: {(stats?.total_count ?? 0).toLocaleString()} 条
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
