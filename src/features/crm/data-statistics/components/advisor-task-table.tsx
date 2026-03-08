import { Button, Empty, Table, Tag, Tooltip, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { FileSearch, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'
import { formatDurationShort } from '../utils/advisor-call-stats'
import type { AdvisorTaskCandidateStatus, AdvisorTaskFinalStatus, AdvisorTaskRow } from '../api/advisor-task-api'

const { Text } = Typography

function formatCount(value: number) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatMoney(value: number) {
  return `¥${Number(value || 0).toLocaleString('zh-CN')}`
}

function getFinalStatusMeta(status: AdvisorTaskFinalStatus) {
  switch (status) {
    case 'auto_pass':
      return { label: '自动达标', color: '#15803d', background: '#dcfce7' }
    case 'manual_pass':
      return { label: '人工达标', color: '#1d4ed8', background: '#dbeafe' }
    case 'failed':
      return { label: '未达标', color: '#dc2626', background: '#fee2e2' }
    default:
      return { label: '待主管确认', color: '#d97706', background: '#fef3c7' }
  }
}

function getCandidateStatusMeta(status: AdvisorTaskCandidateStatus) {
  switch (status) {
    case 'approved':
      return { label: '已通过', color: '#15803d', background: '#dcfce7' }
    case 'rejected':
      return { label: '已驳回', color: '#dc2626', background: '#fee2e2' }
    case 'pending_review':
      return { label: '待确认', color: '#d97706', background: '#fff7ed' }
    default:
      return { label: '未生效', color: '#64748b', background: '#f8fafc' }
  }
}

function CandidateSummary({ row }: { row: AdvisorTaskRow }) {
  const visibleCandidates = row.manualCandidates.filter((candidate) => candidate.status !== 'not_available')

  if (!visibleCandidates.length) {
    return <Text type="tertiary">无候选项</Text>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {visibleCandidates.slice(0, 2).map((candidate) => {
        const meta = getCandidateStatusMeta(candidate.status)
        return (
          <Tooltip
            key={candidate.key}
            content={candidate.description || candidate.label}
            position="top"
          >
            <Tag
              size="small"
              style={{
                borderRadius: 999,
                border: '1px solid #dbe3ef',
                background: meta.background,
                color: meta.color,
              }}
            >
              {candidate.label}
            </Tag>
          </Tooltip>
        )
      })}
      {visibleCandidates.length > 2 && (
        <Text type="tertiary" size="small">
          +{visibleCandidates.length - 2}
        </Text>
      )}
    </div>
  )
}

function ReadOnlyReviewButton({
  disabled,
  onClick,
}: {
  disabled: boolean
  onClick: () => void
}) {
  const button = (
    <span style={{ display: 'inline-flex' }}>
      <Button
        size="small"
        type="primary"
        theme="light"
        disabled={disabled}
        icon={<ShieldCheck size={14} />}
        style={{ borderRadius: 10 }}
        onClick={onClick}
      >
        补录 / 审核
      </Button>
    </span>
  )

  if (!disabled) {
    return button
  }

  return (
    <Tooltip content="日期区间汇总场景只支持查看，补录和主管审核需切回单日。" position="top">
      {button}
    </Tooltip>
  )
}

export function AdvisorTaskTable({
  rows,
  loading,
  onViewDetail,
  onOpenReview,
}: {
  rows: AdvisorTaskRow[]
  loading?: boolean
  onViewDetail: (row: AdvisorTaskRow) => void
  onOpenReview: (row: AdvisorTaskRow) => void
}) {
  const columns = useMemo<ColumnProps<AdvisorTaskRow>[]>(() => [
    {
      title: '顾问',
      dataIndex: 'advisorName',
      width: 140,
      fixed: 'left',
      render: (_: unknown, record) => <span style={{ fontWeight: 700, color: '#0f172a' }}>{record.advisorName}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusName',
      width: 150,
      render: (text?: string | null) => <span style={{ color: '#475569' }}>{text || '未分配校区'}</span>,
    },
    {
      title: '呼出',
      dataIndex: 'outboundCallCount',
      width: 88,
      align: 'right',
      render: (value: number) => formatCount(value),
    },
    {
      title: '接通',
      dataIndex: 'connectedCount',
      width: 88,
      align: 'right',
      render: (value: number) => formatCount(value),
    },
    {
      title: '通时',
      dataIndex: 'callDurationSeconds',
      width: 96,
      align: 'right',
      render: (value: number) => formatDurationShort(value),
    },
    {
      title: '40秒以上',
      dataIndex: 'longCall40Count',
      width: 92,
      align: 'right',
      render: (value: number) => formatCount(value),
    },
    {
      title: '60秒以上',
      dataIndex: 'longCall60Count',
      width: 92,
      align: 'right',
      render: (value: number) => formatCount(value),
    },
    {
      title: '诺到',
      dataIndex: 'promisedCount',
      width: 76,
      align: 'right',
      render: (value: number) => formatCount(value),
    },
    {
      title: '到访',
      dataIndex: 'visitedCount',
      width: 76,
      align: 'right',
      render: (value: number) => formatCount(value),
    },
    {
      title: '试听缴费',
      dataIndex: 'trialPaymentCandidateCount',
      width: 96,
      align: 'right',
      render: (value: number) => formatCount(value),
    },
    {
      title: '自动规则',
      dataIndex: 'autoRuleHits',
      width: 180,
      render: (_: unknown, record) => record.autoRuleHits.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {record.autoRuleHits.map((rule) => (
            <Tag
              key={rule.key}
              size="small"
              style={{
                borderRadius: 999,
                background: '#eef2ff',
                color: '#3730a3',
                border: '1px solid #c7d2fe',
              }}
            >
              {rule.label}
            </Tag>
          ))}
        </div>
      ) : (
        <Text type="tertiary">未命中</Text>
      ),
    },
    {
      title: '手工候选项',
      dataIndex: 'manualCandidates',
      width: 220,
      render: (_: unknown, record) => <CandidateSummary row={record} />,
    },
    {
      title: '最终状态',
      dataIndex: 'finalStatus',
      width: 120,
      render: (_: unknown, record) => {
        const meta = getFinalStatusMeta(record.finalStatus)
        return (
          <Tag
            size="small"
            style={{
              borderRadius: 999,
              background: meta.background,
              color: meta.color,
              border: 'none',
              fontWeight: 600,
            }}
          >
            {meta.label}
          </Tag>
        )
      },
    },
    {
      title: '建议乐捐',
      dataIndex: 'suggestedPenaltyAmount',
      width: 112,
      align: 'right',
      render: (value: number) => formatMoney(value),
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 220,
      fixed: 'right',
      render: (_: unknown, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              size="small"
              type="tertiary"
              theme="light"
              icon={<FileSearch size={14} />}
              style={{ borderRadius: 10 }}
              onClick={() => onViewDetail(record)}
            >
              查看明细
            </Button>
            <ReadOnlyReviewButton
              disabled={!record.recordId || !record.editable}
              onClick={() => onOpenReview(record)}
            />
          </div>
          {(!record.recordId || !record.editable) && (
            <Text type="tertiary" size="small">
              区间汇总只读
            </Text>
          )}
        </div>
      ),
    },
  ], [onOpenReview, onViewDetail])

  return (
    <Table
      size="small"
      rowKey={(record) => record.recordId || `${record.advisorId}-${record.rangeStart}-${record.rangeEnd}`}
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={false}
      bordered={false}
      scroll={{ x: 1760 }}
      empty={
        <Empty
          image={<FileSearch size={36} style={{ color: '#94a3b8' }} />}
          title="当前筛选下暂无任务考核数据"
          description="调整校区、日期或云客账号后再试。"
        />
      }
      style={{ background: 'transparent' }}
    />
  )
}
