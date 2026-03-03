/**
 * 四维深度解读 Section
 *
 * 每个维度：左侧 3px 维度色条 + Progress 分数条 + 能力标签行 + 正文。
 * 全部展开不折叠。
 */

import { Typography, Progress, Tag } from '@douyinfe/semi-ui-19'
import { DISC_TYPE_CONFIG, type DISCDimension } from '../../types'
import type { ParsedDimension } from './report-types'
import { InlineMarkupParagraphs } from './inline-markup'

const { Title } = Typography

interface SectionDimensionsProps {
  dimensions: ParsedDimension[]
  /** 后端计算的真实分数，优先于 AI 解析的分数 */
  scores?: Record<DISCDimension, number>
}

export function SectionDimensions({ dimensions, scores }: SectionDimensionsProps) {
  if (dimensions.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <Title heading={5} style={{ marginBottom: 16, fontSize: 15 }}>
        四维深度解读
      </Title>

      <div className="flex flex-col" style={{ gap: 20 }}>
        {dimensions.map((dim) => (
          <DimensionCard
            key={dim.dim}
            dimension={dim}
            actualScore={scores?.[dim.dim]}
          />
        ))}
      </div>
    </div>
  )
}

function DimensionCard({ dimension, actualScore }: { dimension: ParsedDimension; actualScore?: number }) {
  const config = DISC_TYPE_CONFIG[dimension.dim]
  const color = config?.color ?? '#666'
  // 优先使用后端真实分数，fallback 到 AI 解析的分数
  const score = actualScore != null ? Math.round(actualScore) : dimension.score

  return (
    <div
      className="flex"
      style={{
        borderLeft: `3px solid ${color}`,
        paddingLeft: 16,
      }}
    >
      <div className="flex-1" style={{ minWidth: 0 }}>
        {/* 标题行 + 分数 */}
        <div className="flex items-center" style={{ gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color }}>
            {dimension.dim}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
            {dimension.label}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color, marginLeft: 'auto', flexShrink: 0 }}>
            {score}%
          </span>
        </div>

        {/* Progress 进度条 */}
        <Progress
          percent={score}
          showInfo={false}
          stroke={color}
          style={{ marginBottom: 10 }}
          size="default"
        />

        {/* 能力标签 */}
        {dimension.tags.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 10 }}>
            {dimension.tags.map((tag) => (
              <Tag
                key={tag}
                size="small"
                type="light"
                style={{
                  backgroundColor: `${color}10`,
                  color,
                  borderColor: `${color}30`,
                }}
              >
                {tag}
              </Tag>
            ))}
          </div>
        )}

        {/* 解读正文 */}
        {dimension.body && (
          <InlineMarkupParagraphs text={dimension.body} />
        )}
      </div>
    </div>
  )
}
