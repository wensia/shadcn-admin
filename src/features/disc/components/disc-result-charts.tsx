/**
 * DISC 三图折线图组件
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import type { DISCResult, DISCDimension } from '../types'

interface DiscResultChartsProps {
  result: DISCResult
}

interface ChartDataPoint {
  name: string
  value: number
}

const DIMENSIONS: DISCDimension[] = ['D', 'I', 'S', 'C']

function buildChartData(values: Record<DISCDimension, number>): ChartDataPoint[] {
  return DIMENSIONS.map((dim) => ({
    name: dim,
    value: Math.round(values[dim]),
  }))
}

function SingleChart({
  title,
  data,
  color,
}: {
  title: string
  data: ChartDataPoint[]
  color: string
}) {
  return (
    <div className="flex flex-col items-center">
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={30} />
          <ReferenceLine y={50} stroke="#999" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color.replace('#', '')})`}
            dot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          >
            <LabelList
              dataKey="value"
              position="top"
              style={{ fontSize: 11, fontWeight: 600, fill: color }}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DiscResultCharts({ result }: DiscResultChartsProps) {
  const { graphs, rawData, scores } = result

  // 图1: 现实中的我 (外在行为)
  const externalData = graphs?.external
    ? buildChartData({
        D: graphs.external.D,
        I: graphs.external.I,
        S: graphs.external.S,
        C: graphs.external.C,
      })
    : rawData?.mostCounts
      ? buildChartData({
          D: (rawData.mostCounts.D / 20) * 100,
          I: (rawData.mostCounts.I / 20) * 100,
          S: (rawData.mostCounts.S / 20) * 100,
          C: (rawData.mostCounts.C / 20) * 100,
        })
      : null

  // 图2: 本我 (内在核心)
  const internalData = graphs?.internal
    ? buildChartData({
        D: graphs.internal.D,
        I: graphs.internal.I,
        S: graphs.internal.S,
        C: graphs.internal.C,
      })
    : rawData?.leastCounts
      ? buildChartData({
          D: ((20 - rawData.leastCounts.D) / 20) * 100,
          I: ((20 - rawData.leastCounts.I) / 20) * 100,
          S: ((20 - rawData.leastCounts.S) / 20) * 100,
          C: ((20 - rawData.leastCounts.C) / 20) * 100,
        })
      : null

  // 图3: 自我形象 (综合认知)
  const selfImageData = graphs?.selfImage
    ? buildChartData({
        D: graphs.selfImage.D,
        I: graphs.selfImage.I,
        S: graphs.selfImage.S,
        C: graphs.selfImage.C,
      })
    : scores
      ? buildChartData({
          D: scores.D,
          I: scores.I,
          S: scores.S,
          C: scores.C,
        })
      : null

  if (!externalData && !internalData && !selfImageData) {
    return <p className="text-sm text-muted-foreground">暂无图表数据</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {externalData && (
        <SingleChart title="现实中的我" data={externalData} color="#18a058" />
      )}
      {internalData && (
        <SingleChart title="本我" data={internalData} color="#2080f0" />
      )}
      {selfImageData && (
        <SingleChart title="自我形象" data={selfImageData} color="#f0a020" />
      )}
    </div>
  )
}
