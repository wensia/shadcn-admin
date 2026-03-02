/**
 * 线索通话记录组件（本地数据库版本，含 AI 分析数据）- Semi Design 版本
 * 复用通话记录页的 RecordDetailModal 全屏详情抽屉
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Button, Tooltip } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconChevronDown } from '@douyinfe/semi-icons'
import {
  PhoneOutgoing,
  PhoneIncoming,
  Phone,
  Play,
  ChevronLeft,
  ChevronRight,
  Brain,
} from 'lucide-react'
import { getLeadCallRecords, type LeadCallRecord } from '../../api'
import { RecordDetailModal } from '@/features/yunke/components/call-records/record-detail-modal'
import type { CallRecord } from '@/features/yunke/types'

interface LeadCallRecordsProps {
  leadId: string
  className?: string
  showHeader?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) return `${minutes}分${secs}秒`
  return `${secs}秒`
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '-'
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return timeStr }
}

/** AI 意向等级 badge */
function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent || intent === 'none') return null
  const config: Record<string, { label: string; color: string; bg: string }> = {
    high: { label: '高意向', color: '#fff', bg: '#ef4444' },
    medium: { label: '中意向', color: '#fff', bg: '#f97316' },
    low: { label: '低意向', color: '#fff', bg: '#9ca3af' },
  }
  const c = config[intent]
  if (!c) return null
  return <Tag size="small" style={{ background: c.bg, color: c.color, fontSize: 10, height: 18, padding: '0 4px' }}>{c.label}</Tag>
}

/** AI 评分 badge */
function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null
  let bg = '#9ca3af'
  if (score >= 80) bg = '#00b42a'
  else if (score >= 60) bg = '#0077fa'
  else if (score >= 40) bg = '#f97316'
  else bg = '#ef4444'
  return <Tag size="small" style={{ background: bg, color: '#fff', fontSize: 10, height: 18, padding: '0 4px' }}>{score}分</Tag>
}

/** 将 LeadCallRecord 转为 RecordDetailModal 所需的 CallRecord 最小字段 */
function toCallRecord(item: LeadCallRecord): CallRecord {
  // 从 recording_url 提取 record_id（voiceId）
  const voiceMatch = item.recording_url?.match(/voiceId=([^&]+)/)
  return {
    id: item.id,
    source: 'yunke',
    record_id: voiceMatch?.[1] || '',
    caller: item.caller,
    callee: item.callee,
    call_time: item.call_time,
    duration: item.duration,
    call_type: item.call_type,
    call_result: item.call_result,
    customer_name: null,
    staff_name: item.staff_name,
    department: null,
    has_recording: item.has_recording,
    transcript_status: item.transcript_status,
    ai_analysis_status: item.ai_analysis_status,
    ai_analyzed_at: null,
    created_at: item.call_time || '',
    has_transcript: item.transcript_status === 'completed',
    ai_quality_score: item.ai_quality_score,
    ai_customer_intent: item.ai_customer_intent,
    ai_label_primary: item.ai_label_primary,
  }
}

export function LeadCallRecords({
  leadId,
  className,
  showHeader = true,
  collapsible = false,
  defaultCollapsed = false,
}: LeadCallRecordsProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [detailRecord, setDetailRecord] = useState<CallRecord | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['lead-call-records', leadId, page, pageSize],
    queryFn: async () => {
      const response = await getLeadCallRecords(leadId, { page, size: pageSize })
      return response.data
    },
    enabled: !!leadId && isOpen,
  })

  const records = data?.items || []
  const total = data?.total || 0
  const totalPages = data?.pages || Math.ceil(total / pageSize)

  const columns: ColumnProps<LeadCallRecord>[] = [
    {
      title: '通话时间', dataIndex: 'call_time', width: 110,
      render: (text) => <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>{formatTime(text as string)}</span>,
    },
    {
      title: '类型', dataIndex: 'call_type', width: 50,
      render: (text) => {
        const Icon = text === '外呼' ? PhoneOutgoing : text === '呼入' ? PhoneIncoming : Phone
        const color = text === '外呼' ? '#0077fa' : '#00b42a'
        return <Icon style={{ width: 14, height: 14, color }} />
      },
    },
    {
      title: '时长', dataIndex: 'duration', width: 60,
      render: (text) => <span style={{ fontSize: 13 }}>{formatDuration(text as number)}</span>,
    },
    {
      title: '结果', dataIndex: 'duration', key: 'result', width: 60,
      render: (_text, record) => {
        if (!record) return null
        const connected = (record.duration || 0) > 0
        return (
          <Tag size="small" color={connected ? 'green' : undefined}>
            {connected ? '已接通' : '未接通'}
          </Tag>
        )
      },
    },
    {
      title: '员工', dataIndex: 'staff_name', width: 70,
      render: (text) => <span style={{ fontSize: 13 }}>{(text as string) || '-'}</span>,
    },
    {
      title: 'AI分析', dataIndex: 'ai_analysis',
      render: (_text, record) => {
        if (!record) return null
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <IntentBadge intent={record.ai_customer_intent} />
            <ScoreBadge score={record.ai_quality_score} />
            {record.ai_summary && (
              <Tooltip
                content={
                  <div>
                    <p style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{record.ai_summary}</p>
                    {record.ai_label_primary && (
                      <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 4 }}>
                        标签: {record.ai_label_primary}
                        {record.ai_label_secondary ? ` / ${record.ai_label_secondary}` : ''}
                      </p>
                    )}
                  </div>
                }
              >
                <span style={{ display: 'inline-flex', cursor: 'help' }}>
                  <Brain style={{ width: 14, height: 14, color: '#a855f7' }} />
                </span>
              </Tooltip>
            )}
          </div>
        )
      },
    },
    {
      title: '', dataIndex: 'actions', width: 60,
      render: (_text, record) => {
        if (!record) return null
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {record.has_recording && (
              <Tooltip content="通话详情">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" size="small" icon={<Play style={{ width: 12, height: 12 }} />} onClick={() => setDetailRecord(toCallRecord(record))} />
                </span>
              </Tooltip>
            )}
          </div>
        )
      },
    },
  ]

  const content = (
    <div className={className} style={{ display: 'flex', flexDirection: 'column' }}>
      {isLoading ? (
        <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>加载中...</div>
      ) : records.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>暂无通话记录</div>
      ) : (
        <>
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            pagination={false}
            size="small"
          />
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid var(--semi-color-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>共 {total} 条</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Button size="small" theme="light" disabled={page <= 1} onClick={() => setPage(page - 1)} icon={<ChevronLeft style={{ width: 12, height: 12 }} />} />
                <span style={{ fontSize: 12, padding: '0 8px' }}>{page} / {totalPages}</span>
                <Button size="small" theme="light" disabled={page >= totalPages} onClick={() => setPage(page + 1)} icon={<ChevronRight style={{ width: 12, height: 12 }} />} />
              </div>
            </div>
          )}
        </>
      )}
      <RecordDetailModal record={detailRecord} open={!!detailRecord} onOpenChange={(v) => { if (!v) setDetailRecord(null) }} />
    </div>
  )

  if (!showHeader) return content

  if (collapsible) {
    return (
      <>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', cursor: 'pointer', borderBottom: '1px solid var(--semi-color-border)',
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone style={{ width: 14, height: 14, color: 'var(--semi-color-text-2)' }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>通话记录</span>
            {total > 0 && <Tag size="small">{total}</Tag>}
          </div>
          <IconChevronDown style={{ fontSize: 16, color: 'var(--semi-color-text-2)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </div>
        {isOpen && content}
      </>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Phone style={{ width: 14, height: 14, color: 'var(--semi-color-text-2)' }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>通话记录</span>
        </div>
        {total > 0 && <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>共 {total} 条</span>}
      </div>
      {content}
    </div>
  )
}

export default LeadCallRecords
