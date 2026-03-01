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
  'var(--semi-color-primary)',
  'hsl(142, 76%, 36%)',  // green
  'hsl(38, 92%, 50%)',   // yellow
  'hsl(262, 83%, 58%)',  // purple
  'hsl(199, 89%, 48%)',  // blue
]

export function FollowupMethodPie({
  data,
  className,
}: FollowupMethodPieProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 200, fontSize: 12, color: 'var(--semi-color-text-2)',
      }}>
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
              <div style={{
                background: 'var(--semi-color-bg-3)',
                border: '1px solid var(--semi-color-border)',
                boxShadow: 'var(--semi-shadow-elevated)',
                padding: 8,
                borderRadius: 'var(--semi-border-radius-medium)',
              }}>
                <p style={{ fontSize: 12, fontWeight: 500 }}>{item.name}</p>
                <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  次数: {item.value}
                </p>
              </div>
            )
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: 12 }}>{value}</span>
          )}
          wrapperStyle={{ fontSize: '12px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
