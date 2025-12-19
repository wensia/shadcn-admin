/**
 * FollowupFrequencyChart 跟进频率趋势图
 * 展示最近30天的跟进活动
 */

import * as React from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

export interface FollowupFrequencyData {
  date: string
  count: number
}

interface FollowupFrequencyChartProps {
  data: FollowupFrequencyData[]
  className?: string
}

export function FollowupFrequencyChart({
  data,
  className,
}: FollowupFrequencyChartProps) {
  const s = useStyleClasses()

  if (!data || data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-[200px]', s.text.xs, 'text-muted-foreground')}>
        暂无数据
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200} className={className}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="followupGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          className="fill-muted-foreground"
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className={cn(
                'bg-popover border shadow-md p-2',
                s.rounded
              )}>
                <p className={cn(s.text.xs, 'font-medium')}>{label}</p>
                <p className={cn(s.text.xs, 'text-muted-foreground')}>
                  跟进次数: {payload[0].value}
                </p>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--primary))"
          fill="url(#followupGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
