import { useMemo, type ReactNode } from 'react'
import { Tag, Typography } from '@douyinfe/semi-ui-19'
import { SemiSkeletonCell } from '@/lib/table-utils'
import { formatTime } from '@/lib/utils/time'
import { SemiTablePagination } from '@/components/semi/table-pagination'
import { gradeLabels, type LeadListItem } from '../types'
import { getLatestLeadNoteText } from '../utils/notes'
import {
  LeadStatusBadge,
  FollowupResultBadge,
  IntentionLevelBadge,
} from './status-badges'

const { Text } = Typography

interface LongTermFollowupTableProps {
  data: LeadListItem[]
  total: number
  page: number
  pageSize: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRowClick?: (lead: LeadListItem) => void
}

function parseApiTime(time?: string): Date | null {
  if (!time) return null
  return new Date(time.endsWith('Z') || time.includes('+') ? time : `${time}Z`)
}

function getFollowupState(nextFollowupAt?: string) {
  const next = parseApiTime(nextFollowupAt)
  if (!next) return null

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  if (next < todayStart) return { label: '逾期', color: 'red' as const }
  if (next <= todayEnd) return { label: '今日', color: 'amber' as const }
  return { label: '计划', color: 'blue' as const }
}

function FieldText({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <Text
        type='tertiary'
        size='small'
        style={{ display: 'block', marginBottom: 2 }}
      >
        {label}
      </Text>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}

function LeadCell({
  lead,
  onClick,
}: {
  lead: LeadListItem
  onClick?: (lead: LeadListItem) => void
}) {
  const followupState = getFollowupState(lead.next_followup_at)
  const noteText = getLatestLeadNoteText(lead.notes)

  return (
    <div
      onClick={() => onClick?.(lead)}
      style={{
        minWidth: 0,
        padding: '14px 16px',
        borderRight: '1px solid var(--semi-color-border)',
        borderBottom: '1px solid var(--semi-color-border)',
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--semi-color-bg-0)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Text
              strong
              ellipsis={{ showTooltip: true }}
              style={{ display: 'block', fontSize: 14, lineHeight: '20px' }}
            >
              {lead.child_name || '-'}
            </Text>
            <Text
              type='tertiary'
              size='small'
              ellipsis={{ showTooltip: true }}
              style={{ display: 'block', marginTop: 2 }}
            >
              {lead.parent_name || '-'}
              {lead.grade ? ` · ${gradeLabels[lead.grade]}` : ''}
            </Text>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <LeadStatusBadge status={lead.status} />
            {lead.intention_level && (
              <IntentionLevelBadge level={lead.intention_level} />
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px 14px',
          }}
        >
          <FieldText label='下次跟进'>
            {lead.next_followup_at ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 0,
                }}
              >
                {followupState && (
                  <Tag color={followupState.color} shape='circle'>
                    {followupState.label}
                  </Tag>
                )}
                <Text
                  size='small'
                  ellipsis={{ showTooltip: true }}
                  style={{ minWidth: 0 }}
                >
                  {formatTime(lead.next_followup_at)}
                </Text>
              </div>
            ) : (
              <Text type='quaternary' size='small'>
                未设置
              </Text>
            )}
          </FieldText>

          <FieldText label='跟进次数'>
            <Text size='small'>{lead.followup_count || 0}</Text>
          </FieldText>

          <FieldText label='顾问'>
            <Text
              size='small'
              ellipsis={{ showTooltip: true }}
              style={{ display: 'block' }}
            >
              {lead.advisor_name || '未分配'}
            </Text>
          </FieldText>

          <FieldText label='校区'>
            <Text
              size='small'
              ellipsis={{ showTooltip: true }}
              style={{ display: 'block' }}
            >
              {lead.owner_campus_name || '-'}
            </Text>
          </FieldText>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
            }}
          >
            <Text type='tertiary' size='small' style={{ flexShrink: 0 }}>
              最近跟进
            </Text>
            {lead.last_followup_result ? (
              <FollowupResultBadge result={lead.last_followup_result} />
            ) : (
              <Text type='quaternary' size='small'>
                暂无
              </Text>
            )}
            {lead.last_followup_at && (
              <Text
                type='tertiary'
                size='small'
                ellipsis={{ showTooltip: true }}
                style={{ minWidth: 0 }}
              >
                {formatTime(lead.last_followup_at)}
              </Text>
            )}
          </div>
          {lead.last_followup_content && (
            <Text
              type='tertiary'
              size='small'
              ellipsis={{ showTooltip: true }}
              style={{ display: 'block', lineHeight: '18px' }}
            >
              {lead.last_followup_content}
            </Text>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px 14px',
          }}
        >
          <FieldText label='来源'>
            <Text
              size='small'
              ellipsis={{ showTooltip: true }}
              style={{ display: 'block' }}
            >
              {lead.source_channel_name || '-'}
            </Text>
          </FieldText>
          <FieldText label='创建时间'>
            <Text
              size='small'
              ellipsis={{ showTooltip: true }}
              style={{ display: 'block' }}
            >
              {formatTime(lead.created_at)}
            </Text>
          </FieldText>
        </div>

        {noteText && (
          <Text
            type='tertiary'
            size='small'
            ellipsis={{ showTooltip: true }}
            style={{ display: 'block', lineHeight: '18px' }}
          >
            {noteText}
          </Text>
        )}
      </div>
    </div>
  )
}

function SkeletonCell() {
  return (
    <div
      style={{
        minWidth: 0,
        padding: '14px 16px',
        borderRight: '1px solid var(--semi-color-border)',
        borderBottom: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-bg-0)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SemiSkeletonCell width='52%' />
        <SemiSkeletonCell width='72%' />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px 14px',
          }}
        >
          <SemiSkeletonCell width='80%' />
          <SemiSkeletonCell width='44%' />
          <SemiSkeletonCell width='64%' />
          <SemiSkeletonCell width='70%' />
        </div>
        <SemiSkeletonCell width='88%' />
        <SemiSkeletonCell width='60%' />
      </div>
    </div>
  )
}

export function LongTermFollowupTable({
  data,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: LongTermFollowupTableProps) {
  const skeletonItems = useMemo(
    () => Array.from({ length: Math.min(pageSize, 12) }, (_, index) => index),
    [pageSize]
  )
  const showEmpty = !isLoading && data.length === 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: 'var(--semi-color-bg-0)',
          opacity: isLoading ? 0.72 : 1,
          pointerEvents: isLoading ? 'none' : undefined,
          transition: 'opacity 0.2s',
        }}
      >
        {showEmpty ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Text type='tertiary'>暂无长期跟进线索</Text>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              alignItems: 'stretch',
            }}
          >
            {isLoading
              ? skeletonItems.map((item) => <SkeletonCell key={item} />)
              : data.map((lead) => (
                  <LeadCell key={lead.id} lead={lead} onClick={onRowClick} />
                ))}
          </div>
        )}
      </div>

      <SemiTablePagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}
