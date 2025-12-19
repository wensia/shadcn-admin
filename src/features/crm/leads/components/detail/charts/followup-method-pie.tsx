/**
 * FollowupMethodPie 跟进方式分布饼图
 */

import * as React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

export interface MethodDistributionData {
  name: string
  value: number
  color: string
}

interface FollowupMethodPieProps {
  data: MethodDistributionData[]
  className?: string
}

// 默认颜色配置
const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',  // green
  'hsl(38, 92%, 50%)',   // yellow
  'hsl(262, 83%, 58%)',  // purple
  'hsl(199, 89%, 48%)',  // blue
]

export function FollowupMethodPie({
  data,
  className,
}: FollowupMethodPieProps) {
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
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0].payload as MethodDistributionData
            return (
              <div className={cn(
                'bg-popover border shadow-md p-2',
                s.rounded
              )}>
                <p className={cn(s.text.xs, 'font-medium')}>{item.name}</p>
                <p className={cn(s.text.xs, 'text-muted-foreground')}>
                  次数: {item.value}
                </p>
              </div>
            )
          }}
        />
        <Legend
          formatter={(value) => (
            <span className={cn(s.text.xs)}>{value}</span>
          )}
          wrapperStyle={{ fontSize: '12px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
