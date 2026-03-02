/**
 * 通话记录表格列定义 - Semi Design
 */

import { Skeleton, Tag, Button, Tooltip } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { TagColor } from '@douyinfe/semi-ui-19/lib/es/tag/interface'
import { Play, FileText, UserRound } from 'lucide-react'
import { isSkeletonRow } from '@/lib/table-utils'
import { formatTime } from '@/lib/utils/time'
import type { CallRecord } from '../../types'

/**
 * 格式化通话时长
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '-'

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

/**
 * 获取通话类型标签
 */
function getCallTypeLabel(type: string | null): { label: string; color: TagColor } {
  switch (type) {
    case 's':
    case 'outbound':
      return { label: '外呼', color: 'blue' }
    case 'i':
    case 'inbound':
      return { label: '呼入', color: 'cyan' }
    default:
      return { label: type || '-', color: 'grey' }
  }
}

/**
 * 获取通话结果样式
 */
function getCallResultStyle(result: string | null, duration: number | null): {
  label: string
  color: TagColor
} {
  // 如果有通话时长，说明接通了
  if (duration && duration > 0) {
    return { label: '已接通', color: 'green' }
  }

  // 根据结果判断
  switch (result?.toLowerCase()) {
    case 'answered':
    case '接通':
      return { label: '已接通', color: 'green' }
    case 'noanswer':
    case '未接听':
    case '0':
    case '':
    case null:
    case undefined:
      return { label: '未接通', color: 'grey' }
    case 'busy':
    case '占线':
      return { label: '占线', color: 'orange' }
    case 'rejected':
    case '拒接':
      return { label: '拒接', color: 'red' }
    default:
      return { label: '未接通', color: 'grey' }
  }
}

interface CreateColumnsOptions {
  onPlayRecord?: (record: CallRecord) => void
  onViewLead?: (leadId: string) => void
}

type IntentTagConfig = {
  label: string
  tagColor: TagColor
}

export function createCallRecordsColumns(options: CreateColumnsOptions = {}): ColumnProps<CallRecord>[] {
  const { onPlayRecord, onViewLead } = options

  return [
    {
      title: '客户号码',
      dataIndex: 'callee',
      width: 130,
      fixed: 'left' as const,
      render: (_text: string, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        return (
          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
            {record.callee || record.caller || '-'}
          </span>
        )
      },
    },
    {
      title: '通话时间',
      dataIndex: 'call_time',
      width: 150,
      render: (_text: string, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 120 }} />
        return (
          <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            {formatTime(record.call_time)}
          </span>
        )
      },
    },
    {
      title: '员工',
      dataIndex: 'staff_name',
      width: 100,
      render: (text: string, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return (
          <span style={{ fontWeight: 500 }}>
            {text || '-'}
          </span>
        )
      },
    },
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      width: 100,
      render: (text: string, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
        return text || '-'
      },
    },
    {
      title: '类型',
      dataIndex: 'call_type',
      width: 80,
      render: (text: string, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 48 }} />
        const { label, color } = getCallTypeLabel(text)
        return <Tag color={color} type="light">{label}</Tag>
      },
    },
    {
      title: '时长',
      dataIndex: 'duration',
      width: 90,
      render: (duration: number | null, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
        const hasAnswer = duration && duration > 0

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: hasAnswer ? 'var(--semi-color-success)' : 'var(--semi-color-text-3)',
              flexShrink: 0,
            }} />
            <span style={{ color: hasAnswer ? 'var(--semi-color-success)' : 'var(--semi-color-text-2)' }}>
              {formatDuration(duration)}
            </span>
          </div>
        )
      },
    },
    {
      title: '结果',
      dataIndex: 'call_result',
      width: 90,
      render: (_text: string, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 56 }} />
        const { label, color } = getCallResultStyle(record.call_result, record.duration)
        return <Tag color={color} type="light">{label}</Tag>
      },
    },
    {
      title: '部门',
      dataIndex: 'department',
      width: 100,
      render: (text: string, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
        return (
          <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>
            {text || '-'}
          </span>
        )
      },
    },
    {
      title: 'AI 评分',
      dataIndex: 'ai_quality_score',
      width: 90,
      render: (_score: number | null, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 56 }} />
        const score = record.ai_quality_score
        if (score == null) {
          return <span style={{ fontSize: 12, color: 'var(--semi-color-text-3)' }}>-</span>
        }
        const color =
          score >= 80 ? 'var(--semi-color-success)' : score >= 60 ? 'var(--semi-color-warning)' : score >= 40 ? 'orange' : 'var(--semi-color-danger)'
        const intentMap: Record<string, IntentTagConfig> = {
          high: { label: '高', tagColor: 'green' },
          medium: { label: '中', tagColor: 'yellow' },
          low: { label: '低', tagColor: 'orange' },
          none: { label: '无', tagColor: 'grey' },
        }
        const intent = intentMap[record.ai_customer_intent || 'none'] || intentMap.none
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color }}>
              {Math.round(score)}
            </span>
            <Tag size="small" color={intent.tagColor} type="light">{intent.label}</Tag>
          </div>
        )
      },
    },
    {
      title: '关联线索',
      dataIndex: 'lead_child_name',
      width: 110,
      render: (_text: string, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
        const leadRecord = record as CallRecord & {
          lead_id?: string | null
          lead_child_name?: string | null
          lead_status?: string | null
        }
        if (leadRecord.lead_child_name) {
          return (
            <Tooltip content={`查看线索: ${leadRecord.lead_child_name}`}>
              <span>
                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13,
                    color: 'var(--semi-color-primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onViewLead && leadRecord.lead_id) {
                      onViewLead(leadRecord.lead_id)
                    }
                  }}
                >
                  <UserRound style={{ width: 14, height: 14 }} />
                  {leadRecord.lead_child_name}
                </button>
              </span>
            </Tooltip>
          )
        }
        return <span style={{ fontSize: 12, color: 'var(--semi-color-text-3)' }}>-</span>
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 60,
      fixed: 'right' as const,
      render: (_: unknown, record: CallRecord) => {
        if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 32 }} />

        if (!record.has_recording || !onPlayRecord) {
          return <span style={{ fontSize: 12, color: 'var(--semi-color-text-3)' }}>-</span>
        }

        const hasTranscript = record.has_transcript
        return (
          <Tooltip content={hasTranscript ? '录音与转写' : '播放录音'}>
            <span>
              <Button
                theme="borderless"
                icon={hasTranscript
                  ? <FileText style={{ width: 16, height: 16 }} />
                  : <Play style={{ width: 16, height: 16 }} />
                }
                size="small"
                onClick={() => onPlayRecord(record)}
              />
            </span>
          </Tooltip>
        )
      },
    },
  ]
}
