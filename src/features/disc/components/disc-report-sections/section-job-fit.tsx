/**
 * 岗位适配排名 Section
 *
 * 8行排名表，适配度列用语义色 Tag。
 */

import { useMemo } from 'react'
import { Typography, Table, Tag } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { DatatableData } from './report-types'
import { InlineMarkup } from './inline-markup'

const { Title } = Typography

interface SectionJobFitProps {
  jobFitTable: DatatableData | null
}

// 适配度 → Tag 颜色映射
const LEVEL_COLOR: Record<string, 'blue' | 'green' | 'grey' | 'orange'> = {
  '优秀': 'blue',
  '良好': 'green',
  '一般': 'grey',
  '偏低': 'orange',
}

export function SectionJobFit({ jobFitTable }: SectionJobFitProps) {
  if (!jobFitTable) return null

  const columns: ColumnProps[] = useMemo(() => {
    return jobFitTable.columns.map((col) => ({
      title: col.label,
      dataIndex: col.key,
      width: col.key === 'rank' ? 60 : col.key === 'level' ? 80 : col.key === 'score' ? 80 : undefined,
      align: (col.type === 'number' ? 'center' : col.key === 'level' ? 'center' : 'left') as 'center' | 'left',
      render: (text: unknown) => {
        // badge 类型：适配度列
        if (col.type === 'badge') {
          const level = String(text ?? '')
          const color = LEVEL_COLOR[level] ?? 'grey'
          return (
            <Tag size="small" type="light" color={color}>
              {level}
            </Tag>
          )
        }
        // number 类型：排名和分数
        if (col.type === 'number') {
          return (
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {text != null ? String(text) : '—'}
            </span>
          )
        }
        // text 类型：关键说明（可能含内联标记）
        if (col.key === 'note') {
          return <InlineMarkup text={String(text ?? '')} />
        }
        return String(text ?? '')
      },
    }))
  }, [jobFitTable.columns])

  const dataSource = useMemo(
    () => jobFitTable.rows.map((row, i) => ({ ...row, _key: String(i) })),
    [jobFitTable.rows],
  )

  return (
    <div style={{ marginBottom: 28 }}>
      <Title heading={5} style={{ marginBottom: 16, fontSize: 15 }}>
        岗位适配度排名
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
    </div>
  )
}
