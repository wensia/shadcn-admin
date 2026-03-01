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
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="followupGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--semi-color-primary)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--semi-color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--semi-color-border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--semi-color-text-2)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--semi-color-text-2)' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div style={{
                background: 'var(--semi-color-bg-3)',
                border: '1px solid var(--semi-color-border)',
                boxShadow: 'var(--semi-shadow-elevated)',
                padding: 8,
                borderRadius: 'var(--semi-border-radius-medium)',
              }}>
                <p style={{ fontSize: 12, fontWeight: 500 }}>{label}</p>
                <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  跟进次数: {payload[0].value}
                </p>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--semi-color-primary)"
          fill="url(#followupGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
