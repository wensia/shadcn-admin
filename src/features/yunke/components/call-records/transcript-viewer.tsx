/**
 * 转写文本查看器组件
 * 使用 Semi Design Table 数据表展示，支持时间同步高亮和点击跳转
 * 列：角色 | 时间 | 时长 | 内容
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Table, Tag } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { TranscriptSegment } from '../../types'

interface TranscriptViewerProps {
  transcript: TranscriptSegment[]
  currentTime?: number
  onSeek?: (time: number) => void
}

/** 格式化秒数为 MM:SS */
function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** 格式化时长（秒） */
function fmtDuration(sec: number): string {
  const s = Math.round(sec)
  if (s < 1) return '<1s'
  return `${s}s`
}

/** 判断是否为员工 */
function isStaff(speaker: string): boolean {
  const s = speaker.toLowerCase()
  return s.includes('agent') || s.includes('员工') || s.includes('staff') || s === '0'
}

/** 表格行数据类型 */
interface RowData {
  key: number
  speaker: string
  isStaff: boolean
  startTime: number
  duration: number
  text: string
}

export function TranscriptViewer({ transcript, currentTime = 0, onSeek }: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tableHeight, setTableHeight] = useState(400)

  // 监听容器高度变化
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setTableHeight(Math.floor(entry.contentRect.height))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 当前播放位置对应的行索引
  const activeIndex = useMemo(
    () => transcript.findIndex((seg) => currentTime >= seg.start_time && currentTime < seg.end_time),
    [transcript, currentTime]
  )

  // 转换为表格数据
  const dataSource: RowData[] = useMemo(
    () => transcript.map((seg, i) => ({
      key: i,
      speaker: seg.speaker,
      isStaff: isStaff(seg.speaker),
      startTime: seg.start_time,
      duration: seg.end_time - seg.start_time,
      text: seg.text,
    })),
    [transcript]
  )

  // 自动滚动到高亮行
  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return
    const activeRow = containerRef.current.querySelector(`[data-row-key="${activeIndex}"]`)
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex])

  // 行属性：点击跳转 + 高亮样式
  const onRow = useCallback((record: RowData | undefined) => {
    if (!record) return {}
    const isActive = record.key === activeIndex
    return {
      onClick: () => onSeek?.(record.startTime),
      style: {
        cursor: onSeek ? 'pointer' : 'default',
        backgroundColor: isActive ? 'var(--semi-color-primary-light-default)' : undefined,
        transition: 'background-color 0.2s ease',
      } as React.CSSProperties,
    }
  }, [activeIndex, onSeek])

  const columns: ColumnProps<RowData>[] = useMemo(() => [
    {
      title: '角色',
      dataIndex: 'speaker',
      width: 52,
      render: (_: unknown, row: RowData | undefined) => {
        if (!row) return null
        return (
          <Tag
            size="small"
            color={row.isStaff ? 'orange' : 'grey'}
            style={{ fontSize: 10, height: 18, padding: '0 4px' }}
          >
            {row.isStaff ? '员工' : '客户'}
          </Tag>
        )
      },
    },
    {
      title: '时间',
      dataIndex: 'startTime',
      width: 52,
      render: (val: unknown) => (
        <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--semi-color-text-2)' }}>
          {fmtTime(val as number)}
        </span>
      ),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      width: 40,
      render: (val: unknown) => (
        <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--semi-color-text-3)' }}>
          {fmtDuration(val as number)}
        </span>
      ),
    },
    {
      title: '内容',
      dataIndex: 'text',
      render: (val: unknown, row: RowData | undefined) => {
        if (!row) return null
        const isActive = row.key === activeIndex
        return (
          <span style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: isActive ? 'var(--semi-color-text-0)' : 'var(--semi-color-text-1)',
            fontWeight: isActive ? 500 : 400,
          }}>
            {val as string}
          </span>
        )
      },
    },
  ], [activeIndex])

  // 空状态
  if (!transcript || transcript.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--semi-color-text-2)', fontSize: 14,
      }}>
        暂无转写文本
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Table<RowData>
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        showHeader
        scroll={{ y: tableHeight - 38 }}
        onRow={onRow as any}
        empty="暂无转写文本"
        style={{ height: '100%' }}
      />
    </div>
  )
}
