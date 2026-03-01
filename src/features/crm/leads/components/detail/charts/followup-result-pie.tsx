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
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 84%, 60%)',
  default: 'var(--semi-color-primary)',
  muted: 'var(--semi-color-text-2)',
}

export function FollowupResultPie({
  data,
  className,
}: FollowupResultPieProps) {
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
              fill={entry.color || RESULT_COLORS.muted}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0].payload as ResultDistributionData
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
