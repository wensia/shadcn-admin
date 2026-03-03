/**
 * DISC 测评数据 Tab 内容（从 disc-detail-drawer.tsx 提取）
 *
 * 使用 Semi Progress / Table / Tag 组件化展示：
 * - 测评结果判定
 * - 四维百分位图谱（Semi Progress）
 * - 原始计分明细（Semi Table）
 * - 校验与信度
 */

import { useMemo } from 'react'
import { Progress, Table, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { Flame } from 'lucide-react'
import {
  DISC_TYPE_CONFIG,
  type DISCDimension,
  type DISCResult,
} from '../types'

const { Title, Text, Paragraph } = Typography
const DIMENSIONS: DISCDimension[] = ['D', 'I', 'S', 'C']

interface DiscRawDataSectionProps {
  result: DISCResult
}

export function DiscRawDataSection({ result }: DiscRawDataSectionProps) {
  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      {/* 判别结果 */}
      {result.primaryType && (
        <TypeResultSection result={result} />
      )}

      {/* 四维百分位 */}
      <DimensionProgressSection result={result} />

      {/* 原始计分 */}
      {result.rawData && (
        <RawScoreTable result={result} />
      )}

      {/* 置信度 */}
      {result.confidence && (
        <ConfidenceSection confidence={result.confidence} />
      )}
    </div>
  )
}

// ── 测评结果判定 ─────────────────────────────────────────────────────────────

function TypeResultSection({ result }: { result: DISCResult }) {
  return (
    <section>
      <Title heading={6} className="flex items-center" style={{ gap: 8, fontSize: 14, marginBottom: 16 }}>
        <Flame className="w-4 h-4" style={{ color: '#f97316' }} />
        测评结果判定
      </Title>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
        {result.primaryType && (
          <TypeCard label="首要特性 (Primary)" type={result.primaryType} />
        )}
        {result.secondaryType && (
          <TypeCard label="次要特性 (Secondary)" type={result.secondaryType} />
        )}
      </div>
    </section>
  )
}

function TypeCard({ label, type }: { label: string; type: DISCResult['primaryType'] }) {
  const config = DISC_TYPE_CONFIG[type.code]
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-fill-0)',
        padding: 16,
      }}
    >
      <Text
        type="tertiary"
        style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}
      >
        {label}
      </Text>
      <div className="flex items-center" style={{ gap: 12 }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: config?.color }}>
          {type.code}
        </span>
        <Text strong style={{ fontSize: 14, color: 'var(--semi-color-text-0)' }}>
          {config?.label}
        </Text>
      </div>
    </div>
  )
}

// ── 四维百分位图谱 ───────────────────────────────────────────────────────────

function DimensionProgressSection({ result }: { result: DISCResult }) {
  return (
    <section>
      <Title heading={6} style={{ fontSize: 14, marginBottom: 16, borderLeft: '2px solid var(--semi-color-border)', paddingLeft: 8 }}>
        四维百分位图谱
      </Title>
      <div className="flex flex-col" style={{ gap: 16 }}>
        {DIMENSIONS.map((dim) => {
          const score = Math.round(result.scores?.[dim] ?? 0)
          const config = DISC_TYPE_CONFIG[dim]
          return (
            <div key={dim} className="flex items-center" style={{ gap: 12 }}>
              <div className="flex items-center" style={{ gap: 8, width: 80, flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: config.color }} />
                <Text strong style={{ color: config.color }}>{dim}</Text>
                <Text type="tertiary" style={{ fontSize: 12 }}>{config.label}</Text>
              </div>
              <div style={{ flex: 1 }}>
                <Progress
                  percent={score}
                  showInfo={false}
                  stroke={config.color}
                  size="default"
                />
              </div>
              <Text
                strong
                style={{
                  width: 44,
                  textAlign: 'right',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--semi-color-text-0)',
                }}
              >
                {score}%
              </Text>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── 原始计分明细 ─────────────────────────────────────────────────────────────

function RawScoreTable({ result }: { result: DISCResult }) {
  const columns: ColumnProps[] = useMemo(() => [
    {
      title: '指标',
      dataIndex: 'dim',
      width: 80,
      render: (_: unknown, record: Record<string, unknown>) => {
        const dim = record.dim as DISCDimension
        const config = DISC_TYPE_CONFIG[dim]
        return (
          <div className="flex items-center" style={{ gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: config?.color }} />
            <Text strong>{dim}</Text>
          </div>
        )
      },
    },
    {
      title: '最多项 (M)',
      dataIndex: 'most',
      align: 'center' as const,
      render: (text: unknown) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{text != null ? String(text) : '—'}</Text>
      ),
    },
    {
      title: '最少项 (L)',
      dataIndex: 'least',
      align: 'center' as const,
      render: (text: unknown) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{text != null ? String(text) : '—'}</Text>
      ),
    },
    {
      title: '差值 (M-L)',
      dataIndex: 'raw',
      align: 'center' as const,
      render: (text: unknown, record: Record<string, unknown>) => {
        const dim = record.dim as DISCDimension
        const config = DISC_TYPE_CONFIG[dim]
        return (
          <Text strong style={{ fontVariantNumeric: 'tabular-nums', color: config?.color }}>
            {text != null ? String(text) : '—'}
          </Text>
        )
      },
    },
    {
      title: '转换档位',
      dataIndex: 'percent',
      align: 'center' as const,
      render: (text: unknown) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{text != null ? `${text}%` : '—'}</Text>
      ),
    },
  ], [])

  const dataSource = useMemo(() => {
    return DIMENSIONS.map((dim) => ({
      dim,
      most: result.rawData?.mostCounts?.[dim] ?? null,
      least: result.rawData?.leastCounts?.[dim] ?? null,
      raw: result.rawData?.rawScores?.[dim] ?? null,
      percent: result.scores?.[dim] ?? null,
      _key: dim,
    }))
  }, [result])

  const totalSelections = Object.values(result.rawData?.mostCounts || {}).reduce(
    (a, b) => a + b,
    0,
  )

  return (
    <section>
      <Title heading={6} style={{ fontSize: 14, marginBottom: 16, borderLeft: '2px solid var(--semi-color-border)', paddingLeft: 8 }}>
        原始计分明细
      </Title>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="_key"
        pagination={false}
        size="small"
        bordered
        style={{ borderRadius: 8, overflow: 'hidden' }}
      />
      <Paragraph
        type="tertiary"
        style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}
      >
        * 记录者一共做出了 {totalSelections} 项 "最符合" 或 "最不符合" 的选择
      </Paragraph>
    </section>
  )
}

// ── 校验与信度 ───────────────────────────────────────────────────────────────

function ConfidenceSection({ confidence }: { confidence: NonNullable<DISCResult['confidence']> }) {
  const levelText =
    confidence.level === 'high' ? '高置信 (High)'
      : confidence.level === 'medium' ? '中置信 (Medium)'
        : '低置信 (Low)'

  const tagColor =
    confidence.level === 'high' ? 'green'
      : confidence.level === 'medium' ? 'blue'
        : 'grey'

  return (
    <section>
      <Title heading={6} style={{ fontSize: 14, marginBottom: 16, borderLeft: '2px solid var(--semi-color-border)', paddingLeft: 8 }}>
        校验与信度
      </Title>
      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--semi-color-border)',
          padding: 20,
          background: 'var(--semi-color-fill-0)',
        }}
      >
        <div className="flex items-center" style={{ gap: 12, marginBottom: 12 }}>
          <Tag size="large" color={tagColor} type="light" style={{ fontWeight: 500 }}>
            {levelText}
          </Tag>
          <div className="flex items-center" style={{ gap: 6 }}>
            <Text type="tertiary">总得分：</Text>
            <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{confidence.score}</Text>
            <Text type="tertiary" style={{ fontSize: 12 }}>/100</Text>
          </div>
        </div>
        <Paragraph style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          {confidence.reason}
        </Paragraph>
        <div
          className="flex items-center justify-between"
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--semi-color-border)',
            fontSize: 12,
          }}
        >
          <Text type="tertiary">
            主次特征分数差距：<Text strong>{confidence.gap}</Text>
          </Text>
          <Text type="tertiary" style={{ fontStyle: 'italic', opacity: 0.7 }}>
            算法核心判定依据
          </Text>
        </div>
      </div>
    </section>
  )
}
