/**
 * 行为模式分析 Section
 *
 * 三图数据用 Semi Table（4行4列）；洞察卡片用维度色条 + Tag + 正文。
 */

import { useMemo } from 'react'
import { Typography, Table, Tag } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { DISC_TYPE_CONFIG } from '../../types'
import type { DatatableData, InsightData, InsightItem } from './report-types'
import { InlineMarkup } from './inline-markup'

const { Title, Paragraph } = Typography

interface SectionBehaviorProps {
  behaviorTable: DatatableData | null
  behaviorInsight: InsightData | null
}

export function SectionBehavior({ behaviorTable, behaviorInsight }: SectionBehaviorProps) {
  if (!behaviorTable && !behaviorInsight) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <Title heading={5} style={{ marginBottom: 16, fontSize: 15 }}>
        行为模式分析
      </Title>

      {/* 三图数据表 */}
      {behaviorTable && <BehaviorTable data={behaviorTable} />}

      {/* 洞察卡片 */}
      {behaviorInsight && (
        <div style={{ marginTop: behaviorTable ? 16 : 0 }}>
          <InsightCards data={behaviorInsight} />
        </div>
      )}
    </div>
  )
}

// ── 三图数据表 ───────────────────────────────────────────────────────────────

function BehaviorTable({ data }: { data: DatatableData }) {
  const columns: ColumnProps[] = useMemo(() => {
    return data.columns.map((col) => ({
      title: col.label,
      dataIndex: col.key,
      align: (col.type === 'number' ? 'center' : 'left') as 'center' | 'left',
      width: col.key === 'dim' ? 100 : undefined,
      render: (text: unknown) => {
        if (col.type === 'number' && typeof text === 'number') {
          return <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{text}</span>
        }
        return String(text ?? '')
      },
    }))
  }, [data.columns])

  const dataSource = useMemo(
    () => data.rows.map((row, i) => ({ ...row, _key: String(i) })),
    [data.rows],
  )

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="_key"
      pagination={false}
      size="small"
      bordered
      style={{ borderRadius: 8, overflow: 'hidden' }}
    />
  )
}

// ── 洞察卡片 ─────────────────────────────────────────────────────────────────

const DISC_COLORS: Record<string, { color: string; bgColor: string }> = {
  D: { color: '#dc2626', bgColor: '#fff1f0' },
  I: { color: '#ea580c', bgColor: '#fff7e6' },
  S: { color: '#16a34a', bgColor: '#e6fffb' },
  C: { color: '#2563eb', bgColor: '#e6f7ff' },
}

function InsightCards({ data }: { data: InsightData }) {
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {data.items.map((item, i) => (
        <InsightCard key={`${item.dim}-${i}`} item={item} />
      ))}

      {/* 总结 */}
      {data.summary && (
        <div
          style={{
            marginTop: 4,
            padding: '10px 14px',
            borderRadius: 6,
            background: 'var(--semi-color-fill-0)',
            borderLeft: '3px solid var(--semi-color-border)',
            lineHeight: 1.7,
            fontSize: 13,
            color: 'var(--semi-color-text-2)',
          }}
        >
          <InlineMarkup text={data.summary} />
        </div>
      )}
    </div>
  )
}

function InsightCard({ item }: { item: InsightItem }) {
  const colors = DISC_COLORS[item.dim] ?? DISC_COLORS['D']
  const config = DISC_TYPE_CONFIG[item.dim as keyof typeof DISC_TYPE_CONFIG]

  return (
    <div
      className="flex"
      style={{
        borderRadius: 6,
        overflow: 'hidden',
        border: `1px solid ${colors.color}22`,
        background: colors.bgColor,
      }}
    >
      {/* 左侧色条 */}
      <div style={{ width: 3, flexShrink: 0, background: colors.color }} />

      {/* 内容 */}
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
          <Tag
            size="small"
            style={{
              backgroundColor: `${colors.color}18`,
              color: colors.color,
              borderColor: 'transparent',
              fontWeight: 600,
            }}
          >
            {item.dim} {config?.label ?? item.label}
          </Tag>
          {item.tag && (
            <Tag
              size="small"
              style={{
                backgroundColor: `${colors.color}10`,
                color: colors.color,
                borderColor: 'transparent',
              }}
            >
              {item.tag}
            </Tag>
          )}
        </div>
        <Paragraph
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            margin: 0,
            color: 'var(--semi-color-text-1)',
          }}
        >
          <InlineMarkup text={item.insight} />
        </Paragraph>
      </div>
    </div>
  )
}
