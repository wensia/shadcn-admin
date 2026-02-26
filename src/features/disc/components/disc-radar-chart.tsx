/**
 * DISC 四维雷达图组件
 */

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import type { DISCResult, DISCDimension } from '../types'

interface DiscRadarChartProps {
  scores: Record<DISCDimension, number>
  graphs?: DISCResult['graphs']
  /** 是否显示三图叠加，默认仅显示综合分数 */
  showGraphs?: boolean
  /** 图表高度，默认 280 */
  height?: number
  className?: string
}

const AXIS_LABELS: Record<DISCDimension, string> = {
  D: 'D 支配型',
  I: 'I 影响型',
  S: 'S 稳健型',
  C: 'C 谨慎型',
}

const DIMENSIONS: DISCDimension[] = ['D', 'I', 'S', 'C']

interface RadarDataPoint {
  axis: string
  scores?: number
  external?: number
  internal?: number
  selfImage?: number
}

function buildRadarData(
  scores: Record<DISCDimension, number>,
  graphs?: DISCResult['graphs'],
  showGraphs?: boolean,
): RadarDataPoint[] {
  return DIMENSIONS.map((dim) => {
    const point: RadarDataPoint = {
      axis: AXIS_LABELS[dim],
    }
    if (showGraphs && graphs) {
      point.external = Math.round(graphs.external[dim])
      point.internal = Math.round(graphs.internal[dim])
      point.selfImage = Math.round(graphs.selfImage[dim])
    } else {
      point.scores = Math.round(scores[dim])
    }
    return point
  })
}

export function DiscRadarChart({
  scores,
  graphs,
  showGraphs = false,
  height = 280,
  className,
}: DiscRadarChartProps) {
  const useGraphs = showGraphs && !!graphs
  const data = buildRadarData(scores, graphs, useGraphs)

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 12, fill: '#374151' }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickCount={6}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
            }}
          />
          {useGraphs ? (
            <>
              <Radar
                name="外在行为"
                dataKey="external"
                stroke="#18a058"
                fill="#18a058"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ r: 4, fill: '#18a058', stroke: '#fff', strokeWidth: 1 }}
              />
              <Radar
                name="压力下的行为"
                dataKey="internal"
                stroke="#2080f0"
                fill="#2080f0"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ r: 4, fill: '#2080f0', stroke: '#fff', strokeWidth: 1 }}
              />
              <Radar
                name="自我形象"
                dataKey="selfImage"
                stroke="#f0a020"
                fill="#f0a020"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ r: 4, fill: '#f0a020', stroke: '#fff', strokeWidth: 1 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
              />
            </>
          ) : (
            <Radar
              name="综合分数"
              dataKey="scores"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.25}
              strokeWidth={2}
              dot={{ r: 4, fill: '#7c3aed', stroke: '#fff', strokeWidth: 1 }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
