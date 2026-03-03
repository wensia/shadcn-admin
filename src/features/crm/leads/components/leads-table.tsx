/**
 * 线索数据表格 - 使用 SemiDataTable 通用组件
 */

import { useMemo, useState } from 'react'
import { Tag, Typography } from '@douyinfe/semi-ui-19'
import { IconCopy, IconTick } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { formatTime } from '@/lib/utils/time'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import {
  leadStatusLabels,
  intentionLevelLabels,
  gradeLabels,
  followupResultLabels,
  type LeadListItem,
  type LeadStatus,
  type IntentionLevel,
  type FollowupResult,
} from '../types'

const { Text } = Typography

/* ── 手机号脱敏 ── */
function maskPhone(phone?: string): string {
  if (!phone) return '-'
  if (phone.length === 11) {
    return phone.slice(0, 3) + '****' + phone.slice(7)
  }
  if (phone.length > 5) {
    return phone.slice(0, 3) + '****' + phone.slice(-2)
  }
  return phone
}

/* ── 状态颜色映射 ── */
const statusColorMap: Record<string, string> = {
  pending_assign: 'orange',
  pending_followup: 'amber',
  following_up: 'blue',
  followed_up: 'cyan',
  trial_scheduled: 'violet',
  visited: 'green',
  paid: 'green',
  invalid: 'red',
  closed: 'grey',
}

const intentionColorMap: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'grey',
}

const followupResultColorMap: Record<string, string> = {
  not_connected: 'grey',
  hung_up: 'red',
  no_need: 'red',
  wrong_number: 'red',
  yunke_risk_control: 'orange',
  no_child: 'grey',
  age_mismatch: 'grey',
  temporarily_unavailable: 'amber',
  can_continue: 'blue',
  appointment_scheduled: 'green',
  wechat_added: 'cyan',
  other: 'grey',
}

/* ── Props ── */
interface LeadsTableProps {
  data: LeadListItem[]
  total: number
  page: number
  pageSize: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRowClick?: (lead: LeadListItem) => void
  onSelectionChange?: (selectedRows: LeadListItem[]) => void
}

export function LeadsTable({
  data,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
}: LeadsTableProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])

  const columns: ColumnProps<LeadListItem>[] = useMemo(
    () => [
      {
        title: '儿童姓名',
        dataIndex: 'child_name',
        width: 120,
        fixed: 'left' as const,
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width="80%" />
          return (
            <Text strong style={{ fontSize: 13 }}>
              {record.child_name || '-'}
            </Text>
          )
        },
      },
      {
        title: '手机号',
        dataIndex: 'parent_phone',
        width: 120,
        fixed: 'left' as const,
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return (
            <Text
              copyable={{
                content: record.parent_phone || '',
                render: (copied: boolean, doCopy: (e: React.MouseEvent) => void) => (
                  <span
                    onClick={doCopy}
                    style={{ cursor: 'pointer', marginLeft: 4, opacity: 0.6 }}
                  >
                    {copied ? <IconTick size="small" style={{ color: 'var(--semi-color-success)' }} /> : <IconCopy size="small" />}
                  </span>
                ),
              }}
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: 'var(--semi-color-text-2)',
              }}
            >
              {maskPhone(record.parent_phone)}
            </Text>
          )
        },
      },
      {
        title: '年龄',
        dataIndex: 'age',
        width: 60,
        align: 'center' as const,
        render: (_text: number, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
          return <Text style={{ fontSize: 13 }}>{record.age || '-'}</Text>
        },
      },
      {
        title: '家长姓名',
        dataIndex: 'parent_name',
        width: 100,
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return <Text style={{ fontSize: 13 }}>{record.parent_name || '-'}</Text>
        },
      },
      {
        title: '年级',
        dataIndex: 'grade',
        width: 100,
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Text style={{ fontSize: 13 }}>
              {record.grade ? gradeLabels[record.grade] : '-'}
            </Text>
          )
        },
      },
      {
        title: '来源渠道',
        dataIndex: 'source_channel_name',
        width: 130,
        ellipsis: { showTooltip: false },
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return (
            <Text style={{ fontSize: 13 }}>
              {record.source_channel_name || '-'}
            </Text>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        render: (status: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Tag color={statusColorMap[status] || 'grey'} shape="circle">
              {leadStatusLabels[status as LeadStatus] || status}
            </Tag>
          )
        },
      },
      {
        title: '意向',
        dataIndex: 'intention_level',
        width: 80,
        render: (level: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
          if (!level)
            return (
              <Text type="quaternary" style={{ fontSize: 13 }}>
                -
              </Text>
            )
          return (
            <Tag color={intentionColorMap[level] || 'grey'} shape="circle">
              {intentionLevelLabels[level as IntentionLevel] || level}
            </Tag>
          )
        },
      },
      {
        title: '最后回访',
        dataIndex: 'last_followup_result',
        width: 110,
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          const result = record.last_followup_result
          const content = record.last_followup_content
          if (!result && !content) {
            return (
              <Text type="quaternary" style={{ fontSize: 13 }}>
                -
              </Text>
            )
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {result && (
                <Tag color={followupResultColorMap[result] || 'grey'} shape="circle">
                  {followupResultLabels[result as FollowupResult] || result}
                </Tag>
              )}
              {content && (
                <span
                  title={content}
                  style={{
                    fontSize: 11,
                    maxWidth: 100,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    color: 'var(--semi-color-text-3)',
                  }}
                >
                  {content}
                </span>
              )}
            </div>
          )
        },
      },
      {
        title: '顾问',
        dataIndex: 'advisor_name',
        width: 90,
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
          return record.advisor_name ? (
            <Text style={{ fontSize: 13 }}>{record.advisor_name}</Text>
          ) : (
            <Text type="quaternary" style={{ fontSize: 13 }}>
              未分配
            </Text>
          )
        },
      },
      {
        title: '校区',
        dataIndex: 'owner_campus_name',
        width: 110,
        ellipsis: { showTooltip: false },
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          return (
            <Text style={{ fontSize: 13 }}>
              {record.owner_campus_name || '-'}
            </Text>
          )
        },
      },
      {
        title: '创建人',
        dataIndex: 'created_by_name',
        width: 90,
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
          return (
            <Text style={{ fontSize: 13 }}>
              {record.created_by_name || '-'}
            </Text>
          )
        },
      },
      {
        title: '备注',
        dataIndex: 'notes',
        width: 160,
        ellipsis: { showTooltip: false },
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return record.notes ? (
            <span
              title={record.notes}
              style={{
                fontSize: 13,
                maxWidth: 150,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {record.notes}
            </span>
          ) : (
            <Text type="quaternary" style={{ fontSize: 13 }}>
              -
            </Text>
          )
        },
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 160,
        sorter: (a?: LeadListItem, b?: LeadListItem) =>
          new Date(a?.created_at ?? 0).getTime() -
          new Date(b?.created_at ?? 0).getTime(),
        render: (_text: string, record: LeadListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          return (
            <Text style={{ fontSize: 12 }}>{formatTime(record.created_at)}</Text>
          )
        },
      },
    ],
    []
  )

  return (
    <SemiDataTable<LeadListItem>
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={pageSize}
      isLoading={isLoading}
      scrollX={1640}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={onRowClick}
      rowSelection={{
        selectedRowKeys,
        onChange: (keys, rows) => {
          setSelectedRowKeys(keys)
          onSelectionChange?.(rows)
        },
        fixed: 'left',
        width: 48,
      }}
      emptyText="暂无线索数据"
    />
  )
}
