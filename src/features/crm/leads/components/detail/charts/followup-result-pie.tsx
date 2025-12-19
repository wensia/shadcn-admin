/**
 * FollowupResultPie 跟进结果分布饼图
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

export interface ResultDistributionData {
  name: string
  value: number
  color: string
}

interface FollowupResultPieProps {
  data: ResultDistributionData[]
  className?: string
}

// 结果对应的颜色
const RESULT_COLORS = {
  success: 'hsl(142, 76%, 36%)',    // green - 成功类
  warning: 'hsl(38, 92%, 50%)',     // yellow - 待定类
  destructive: 'hsl(0, 84%, 60%)',  // red - 失败类
  default: 'hsl(var(--primary))',   // primary - 进行中
  muted: 'hsl(var(--muted-foreground))', // muted - 其他
}

export function FollowupResultPie({
  data,
  className,
}: FollowupResultPieProps) {
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
              fill={entry.color || RESULT_COLORS.muted}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0].payload as ResultDistributionData
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
