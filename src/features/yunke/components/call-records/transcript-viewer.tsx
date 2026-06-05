/**
 * 转写文本查看器组件
 * 使用 Semi Design Table 数据表展示，支持时间同步高亮和点击跳转
 * 列：角色 | 时间 | 时长 | 内容
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Button, Input, Table, Tag, Tooltip } from '@douyinfe/semi-ui-19'
import { IconChevronDown, IconChevronUp, IconSearch } from '@douyinfe/semi-icons'
import type { ReactNode } from 'react'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { TranscriptSegment } from '../../types'
import { getTranscriptRole, getTranscriptRoleShortLabel, type TranscriptRole } from './transcript-role'

interface TranscriptViewerProps {
  transcript: TranscriptSegment[]
  currentTime?: number
  staffName?: string | null
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

/** 表格行数据类型 */
interface RowData {
  key: number
  speaker: string
  role: TranscriptRole
  roleLabel: string
  startTime: number
  duration: number
  text: string
  timingBadge: TimingBadge | null
}

interface TimingBadge {
  label: string
  tooltip: string
  color: 'orange' | 'grey'
}

interface TranscriptMatch {
  rowKey: number
  occurrenceIndex: number
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase()
}

function countMatches(text: string, query: string): number {
  if (!query) return 0
  let count = 0
  let fromIndex = 0
  const normalizedText = text.toLowerCase()
  while (fromIndex <= normalizedText.length) {
    const index = normalizedText.indexOf(query, fromIndex)
    if (index < 0) break
    count += 1
    fromIndex = index + Math.max(query.length, 1)
  }
  return count
}

function highlightText(text: string, query: string, activeOccurrenceIndex: number | null): ReactNode {
  if (!query) return text

  const pieces: ReactNode[] = []
  const normalizedText = text.toLowerCase()
  let cursor = 0
  let occurrenceIndex = 0

  while (cursor < text.length) {
    const index = normalizedText.indexOf(query, cursor)
    if (index < 0) {
      pieces.push(text.slice(cursor))
      break
    }

    if (index > cursor) {
      pieces.push(text.slice(cursor, index))
    }

    const isActive = activeOccurrenceIndex === occurrenceIndex
    pieces.push(
      <mark
        key={`${index}-${occurrenceIndex}`}
        style={{
          padding: '0 2px',
          borderRadius: 3,
          color: isActive ? 'var(--semi-color-warning)' : 'var(--semi-color-text-0)',
          background: isActive
            ? 'var(--semi-color-warning-light-active)'
            : 'var(--semi-color-warning-light-default)',
          boxShadow: isActive ? 'inset 0 0 0 1px var(--semi-color-warning)' : undefined,
        }}
      >
        {text.slice(index, index + query.length)}
      </mark>
    )

    occurrenceIndex += 1
    cursor = index + query.length
  }

  return pieces
}

function getTimingBadge(segment: TranscriptSegment): TimingBadge | null {
  if (segment.timestamp_source === 'channel_vad_estimated_split') {
    return {
      label: 'VAD',
      tooltip: 'VAD 辅助估算：声道语音窗口来自音频，句子边界仍按文本估算。',
      color: 'orange',
    }
  }

  if (segment.timestamp_source === 'estimated_sentence_split' || segment.estimated_timing) {
    return {
      label: '估',
      tooltip: '估算时间：句子边界按文本拆分推算，不是上游 ASR 原生时间戳。',
      color: 'grey',
    }
  }

  return null
}

export function TranscriptViewer({ transcript, currentTime = 0, staffName, onSeek }: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tableHeight, setTableHeight] = useState(400)
  const [searchText, setSearchText] = useState('')
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)
  const searchQuery = normalizeSearchText(searchText)

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
      role: getTranscriptRole(seg),
      roleLabel: getTranscriptRoleShortLabel(seg, staffName),
      startTime: seg.start_time,
      duration: seg.end_time - seg.start_time,
      text: seg.text,
      timingBadge: getTimingBadge(seg),
    })),
    [transcript, staffName]
  )

  const matches = useMemo<TranscriptMatch[]>(() => {
    if (!searchQuery) return []
    const result: TranscriptMatch[] = []
    dataSource.forEach((row) => {
      const count = countMatches(row.text, searchQuery)
      for (let index = 0; index < count; index += 1) {
        result.push({ rowKey: row.key, occurrenceIndex: index })
      }
    })
    return result
  }, [dataSource, searchQuery])

  const matchedRowKeys = useMemo(
    () => new Set(matches.map((match) => match.rowKey)),
    [matches]
  )

  const activeMatch = matches[activeMatchIndex] ?? null

  useEffect(() => {
    setActiveMatchIndex(0)
  }, [searchQuery])

  // 自动滚动到当前搜索命中；无搜索时跟随播放位置
  useEffect(() => {
    const targetRowKey = activeMatch?.rowKey ?? activeIndex
    if (targetRowKey < 0 || !containerRef.current) return
    const activeRow = containerRef.current.querySelector(`[data-row-key="${targetRowKey}"]`)
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex, activeMatch?.rowKey])

  // 行属性：点击跳转 + 高亮样式
  const onRow = useCallback((record: RowData | undefined) => {
    if (!record) return {}
    const isActive = record.key === activeIndex
    const isMatched = matchedRowKeys.has(record.key)
    const isSearchFocused = activeMatch?.rowKey === record.key
    return {
      onClick: () => onSeek?.(record.startTime),
      style: {
        cursor: onSeek ? 'pointer' : 'default',
        backgroundColor: isSearchFocused
          ? 'var(--semi-color-warning-light-default)'
          : isActive
            ? 'var(--semi-color-primary-light-default)'
            : isMatched
              ? 'var(--semi-color-fill-0)'
              : undefined,
        transition: 'background-color 0.2s ease',
      } as React.CSSProperties,
    }
  }, [activeIndex, activeMatch?.rowKey, matchedRowKeys, onSeek])

  const goToPrevMatch = useCallback(() => {
    if (!matches.length) return
    setActiveMatchIndex((index) => (index - 1 + matches.length) % matches.length)
  }, [matches.length])

  const goToNextMatch = useCallback(() => {
    if (!matches.length) return
    setActiveMatchIndex((index) => (index + 1) % matches.length)
  }, [matches.length])

  const columns: ColumnProps<RowData>[] = useMemo(() => [
    {
      title: '角色',
      dataIndex: 'speaker',
      width: 72,
      render: (_: unknown, row: RowData | undefined) => {
        if (!row) return null
        return (
          <Tooltip content={row.roleLabel}>
          <Tag
            size="small"
            color={row.role === 'staff' ? 'orange' : row.role === 'customer' ? 'grey' : 'blue'}
            style={{
              fontSize: 10,
              height: 18,
              padding: '0 4px',
              maxWidth: 64,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.roleLabel}
          </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: '时间',
      dataIndex: 'startTime',
      width: 72,
      render: (val: unknown, row: RowData | undefined) => {
        if (!row) return null
        const content = (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--semi-color-text-2)' }}>
              {fmtTime(val as number)}
            </span>
            {row.timingBadge && (
              <Tooltip content={row.timingBadge.tooltip}>
                <Tag
                  size="small"
                  color={row.timingBadge.color}
                  type="light"
                  style={{ fontSize: 10, height: 16, padding: '0 3px', lineHeight: '16px' }}
                >
                  {row.timingBadge.label}
                </Tag>
              </Tooltip>
            )}
          </span>
        )
        return content
      },
    },
    {
      title: '时长',
      dataIndex: 'duration',
      width: 34,
      render: (val: unknown) => (
        <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--semi-color-text-3)', whiteSpace: 'nowrap' }}>
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
        const activeOccurrenceIndex = activeMatch?.rowKey === row.key ? activeMatch.occurrenceIndex : null
        return (
          <span style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: isActive ? 'var(--semi-color-text-0)' : 'var(--semi-color-text-1)',
            fontWeight: isActive ? 500 : 400,
          }}>
            {highlightText(val as string, searchQuery, activeOccurrenceIndex)}
          </span>
        )
      },
    },
  ], [activeIndex, activeMatch?.occurrenceIndex, activeMatch?.rowKey, searchQuery])

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
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--semi-color-bg-0)',
      }}
    >
      <style>{`
        .transcript-compact .semi-table-thead > tr > th,
        .transcript-compact .semi-table-tbody > tr > td {
          padding: 4px 6px !important;
          line-height: 1.4;
        }
        .transcript-compact .semi-table-thead > tr > th {
          font-size: 11px;
        }
      `}</style>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-0)',
        }}
      >
        <Input
          size="small"
          prefix={<IconSearch />}
          showClear
          value={searchText}
          placeholder="搜索转录文本"
          onChange={(value) => setSearchText(String(value))}
          style={{ flex: 1, minWidth: 0 }}
        />
        <span
          style={{
            minWidth: 54,
            textAlign: 'center',
            fontSize: 12,
            color: matches.length ? 'var(--semi-color-text-1)' : 'var(--semi-color-text-2)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {searchQuery ? `${matches.length ? activeMatchIndex + 1 : 0}/${matches.length}` : '0/0'}
        </span>
        <Tooltip content="上一个命中">
          <Button
            theme="borderless"
            type="tertiary"
            icon={<IconChevronUp />}
            disabled={!matches.length}
            onClick={goToPrevMatch}
            style={{ width: 26, height: 26, padding: 0 }}
          />
        </Tooltip>
        <Tooltip content="下一个命中">
          <Button
            theme="borderless"
            type="tertiary"
            icon={<IconChevronDown />}
            disabled={!matches.length}
            onClick={goToNextMatch}
            style={{ width: 26, height: 26, padding: 0 }}
          />
        </Tooltip>
      </div>
      <Table<RowData>
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        showHeader
        scroll={{ y: Math.max(120, tableHeight - 78) }}
        onRow={onRow}
        empty={searchQuery && !matches.length ? '没有匹配的转录文本' : '暂无转写文本'}
        style={{ flex: 1, minHeight: 0 }}
        className="transcript-compact"
      />
    </div>
  )
}
