import { useMemo } from 'react'
import { Button, Empty, Skeleton, Table, Tag, Tooltip, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { FileSearch, ShieldCheck, TrendingUp } from 'lucide-react'
import { formatDurationShort } from '../utils/advisor-call-stats'
import type { AdvisorTaskCandidateStatus, AdvisorTaskFinalStatus, AdvisorTaskRow } from '../api/advisor-task-api'

const { Text } = Typography

export interface AdvisorTaskMatrixProps {
  rows: AdvisorTaskRow[]
  loading?: boolean
  onViewDetail: (row: AdvisorTaskRow) => void
  onOpenReview: (row: AdvisorTaskRow) => void
}

interface ManualRuleDefinition {
  key: string
  label: string
  shortLabel: string
}

interface AutoRuleDefinition {
  key: string
  label: string
  shortLabel: string
  isMet: (row: AdvisorTaskRow) => boolean
  detail: (row: AdvisorTaskRow) => string
}

const AUTO_RULES: AutoRuleDefinition[] = [
  {
    key: 'rule_a',
    shortLabel: 'A',
    label: '接通 >= 130 且通时 >= 40 分钟',
    isMet: (row) => row.connectedCount >= 130 && row.callDurationSeconds >= 2400,
    detail: (row) => `接通 ${formatCount(row.connectedCount)} / 130，通时 ${formatDurationShort(row.callDurationSeconds)} / 40:00`,
  },
  {
    key: 'rule_b',
    shortLabel: 'B',
    label: '接通 >= 80 且通时 >= 70 分钟',
    isMet: (row) => row.connectedCount >= 80 && row.callDurationSeconds >= 4200,
    detail: (row) => `接通 ${formatCount(row.connectedCount)} / 80，通时 ${formatDurationShort(row.callDurationSeconds)} / 70:00`,
  },
  {
    key: 'rule_c',
    shortLabel: 'C',
    label: '接通 >= 50 且 60 秒以上 >= 20 且通时 >= 90 分钟',
    isMet: (row) => row.connectedCount >= 50 && row.longCall60Count >= 20 && row.callDurationSeconds >= 5400,
    detail: (row) =>
      `接通 ${formatCount(row.connectedCount)} / 50，60秒以上 ${formatCount(row.longCall60Count)} / 20，通时 ${formatDurationShort(row.callDurationSeconds)} / 90:00`,
  },
  {
    key: 'rule_d',
    shortLabel: 'D',
    label: '呼出 >= 320 且 40 秒以上 >= 20',
    isMet: (row) => row.outboundCallCount >= 320 && row.longCall40Count >= 20,
    detail: (row) => `呼出 ${formatCount(row.outboundCallCount)} / 320，40秒以上 ${formatCount(row.longCall40Count)} / 20`,
  },
]

const MANUAL_RULES: ManualRuleDefinition[] = [
  { key: 'promise_rule_e', label: 'E. 诺到>=3（需截图）', shortLabel: 'E' },
  { key: 'visit_reception_deduction', label: '到访接待减免', shortLabel: '接' },
  { key: 'wechat_deduction', label: '微信折抵', shortLabel: '微' },
  { key: 'trial_payment_exemption', label: '两个试听费用豁免', shortLabel: '试' },
  { key: 'weekly_promised_exemption', label: '当周诺到豁免', shortLabel: '周' },
  { key: 'moments_requirement', label: '朋友圈完成情况', shortLabel: '圈' },
  { key: 'wechat_added_requirement', label: '每日新增微信', shortLabel: '新' },
]

function formatCount(value: number) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatMoney(value: number) {
  return `¥${Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function getFinalStatusMeta(status: AdvisorTaskFinalStatus) {
  switch (status) {
    case 'auto_pass':
      return {
        label: '自动达标',
        background: '#ecfdf3',
        border: '#b7ebc6',
        color: '#166534',
      }
    case 'manual_pass':
      return {
        label: '人工达标',
        background: '#eff6ff',
        border: '#bfdbfe',
        color: '#1d4ed8',
      }
    case 'failed':
      return {
        label: '未达标',
        background: '#fff1f2',
        border: '#fecdd3',
        color: '#be123c',
      }
    default:
      return {
        label: '待主管确认',
        background: '#fff7ed',
        border: '#fed7aa',
        color: '#c2410c',
      }
  }
}

function getRowSurface(status: AdvisorTaskFinalStatus) {
  switch (status) {
    case 'pending_review':
      return {
        background: '#fffdf8',
        hoverBackground: '#fff7ed',
      }
    case 'failed':
      return {
        background: '#fffafb',
        hoverBackground: '#fff1f2',
      }
    default:
      return {
        background: '#ffffff',
        hoverBackground: '#f8fafc',
      }
  }
}

function getFixedCellStyle(row: AdvisorTaskRow) {
  const surface = getRowSurface(row.finalStatus)

  return {
    background: surface.background,
    backgroundClip: 'padding-box' as const,
  }
}

function getManualStatusMeta(status: AdvisorTaskCandidateStatus | 'missing') {
  switch (status) {
    case 'approved':
      return { background: '#dbeafe', border: '#bfdbfe', color: '#1d4ed8', text: '通过', shortText: '通' }
    case 'pending_review':
      return { background: '#fff7ed', border: '#fed7aa', color: '#c2410c', text: '待审', shortText: '审' }
    case 'rejected':
      return { background: '#fff1f2', border: '#fecdd3', color: '#be123c', text: '驳回', shortText: '驳' }
    case 'not_available':
    case 'missing':
    default:
      return { background: '#f8fafc', border: '#e2e8f0', color: '#94a3b8', text: '未提', shortText: '--' }
  }
}

function getGapHint(row: AdvisorTaskRow) {
  if (row.finalStatus === 'auto_pass') return '电话任务已自动达标，可聚焦到访与缴费转化。'
  if (row.finalStatus === 'manual_pass') return '人工审核项已通过，今日任务已完成。'
  if (row.finalStatus === 'pending_review') return '存在人工候选项待主管确认，审核通过后即可转为达标。'

  const ruleGaps = [
    {
      key: 'A',
      score: Math.max(130 - row.connectedCount, 0) + Math.max(2400 - row.callDurationSeconds, 0) / 60,
      text: `距 A 还差 ${Math.max(130 - row.connectedCount, 0)} 个接通，${Math.ceil(Math.max(2400 - row.callDurationSeconds, 0) / 60)} 分钟通时`,
    },
    {
      key: 'B',
      score: Math.max(80 - row.connectedCount, 0) + Math.max(4200 - row.callDurationSeconds, 0) / 60,
      text: `距 B 还差 ${Math.max(80 - row.connectedCount, 0)} 个接通，${Math.ceil(Math.max(4200 - row.callDurationSeconds, 0) / 60)} 分钟通时`,
    },
    {
      key: 'C',
      score: Math.max(50 - row.connectedCount, 0) + Math.max(20 - row.longCall60Count, 0) * 2 + Math.max(5400 - row.callDurationSeconds, 0) / 60,
      text: `距 C 还差 ${Math.max(50 - row.connectedCount, 0)} 个接通、${Math.max(20 - row.longCall60Count, 0)} 个60秒以上、${Math.ceil(Math.max(5400 - row.callDurationSeconds, 0) / 60)} 分钟通时`,
    },
    {
      key: 'D',
      score: Math.max(320 - row.outboundCallCount, 0) + Math.max(20 - row.longCall40Count, 0) * 3,
      text: `距 D 还差 ${Math.max(320 - row.outboundCallCount, 0)} 个呼出、${Math.max(20 - row.longCall40Count, 0)} 个40秒以上`,
    },
  ]

  const bestRule = [...ruleGaps].sort((a, b) => a.score - b.score)[0]
  return bestRule?.text || '今日暂未形成有效达标路径，建议主管介入确认。'
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

  if (!disabled) return button

  return (
    <Tooltip content="日期区间汇总场景只支持查看，补录和主管审核需切回单日。" position="top">
      {button}
    </Tooltip>
  )
}

function HeatStateCell({
  text,
  background,
  border,
  color,
}: {
  text: string
  background: string
  border: string
  color: string
}) {
  return (
    <div
      style={{
        minWidth: 30,
        height: 24,
        borderRadius: 8,
        background,
        border: `1px solid ${border}`,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingInline: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      {text}
    </div>
  )
}

function AutoRuleStateCell({
  row,
  rule,
}: {
  row: AdvisorTaskRow
  rule: AutoRuleDefinition
}) {
  const met = rule.isMet(row)
  return (
    <Tooltip
      content={
        <div style={{ maxWidth: 240 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{rule.shortLabel}. {rule.label}</div>
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>{rule.detail(row)}</div>
        </div>
      }
      position="top"
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <HeatStateCell
          text={met ? '达' : '--'}
          background={met ? '#ecfdf3' : '#f8fafc'}
          border={met ? '#b7ebc6' : '#e2e8f0'}
          color={met ? '#166534' : '#94a3b8'}
        />
      </div>
    </Tooltip>
  )
}

function ManualRuleStateCell({
  row,
  rule,
}: {
  row: AdvisorTaskRow
  rule: ManualRuleDefinition
}) {
  const candidate = row.manualCandidates.find((item) => item.key === rule.key)
  const meta = getManualStatusMeta(candidate?.status ?? 'missing')
  const valueText = candidate?.value !== undefined && candidate?.value !== null && `${candidate.value}` !== ''
    ? `${candidate.value}`.slice(0, 3)
    : meta.shortText

  return (
    <Tooltip
      content={
        <div style={{ maxWidth: 240 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{rule.label}</div>
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            {candidate?.description || '当前未提交该项人工候选。'}
          </div>
        </div>
      }
      position="top"
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <HeatStateCell
          text={valueText}
          background={meta.background}
          border={meta.border}
          color={meta.color}
        />
      </div>
    </Tooltip>
  )
}

function LoadingTable() {
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-bg-0)',
        padding: 16,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <Skeleton.Title style={{ width: '16%', marginBottom: 14 }} />
      <Skeleton.Paragraph rows={4} style={{ width: '100%' }} />
    </div>
  )
}

function ExpandedTaskRow({ row }: { row: AdvisorTaskRow }) {
  const pendingManual = row.manualCandidates.filter((candidate) => candidate.status === 'pending_review')
  const reviewNote = row.reviewNote || '暂无主管备注'
  const evidence = row.evidenceUrl || '未附截图链接'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)',
        gap: 12,
        padding: '6px 8px',
      }}
    >
      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-fill-0)',
          padding: '12px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d4ed8',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={14} />
          </div>
          <Text strong style={{ color: 'var(--semi-color-text-0)' }}>最短达标路径</Text>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.7, color: '#0f172a', fontWeight: 600 }}>
          {getGapHint(row)}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
          统计区间：{row.rangeStart === row.rangeEnd ? row.rangeStart : `${row.rangeStart} ~ ${row.rangeEnd}`}
        </div>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-0)',
          padding: '12px 14px',
        }}
      >
        <Text strong style={{ display: 'block', color: 'var(--semi-color-text-0)', marginBottom: 8 }}>审核信息</Text>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginBottom: 6 }}>
          备注：{reviewNote}
        </div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, wordBreak: 'break-all' }}>
          证据：{evidence}
        </div>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-0)',
          padding: '12px 14px',
        }}
      >
        <Text strong style={{ display: 'block', color: 'var(--semi-color-text-0)', marginBottom: 8 }}>待确认人工项</Text>
        {pendingManual.length ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pendingManual.map((candidate) => (
              <Tooltip key={candidate.key} content={candidate.description || candidate.label} position="top">
                <Tag
                  size="small"
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    color: '#c2410c',
                    fontWeight: 600,
                  }}
                >
                  {candidate.label}
                </Tag>
              </Tooltip>
            ))}
          </div>
        ) : (
          <Text type="tertiary" size="small">当前没有待主管确认的人工项。</Text>
        )}
      </div>
    </div>
  )
}

export function AdvisorTaskMatrix({
  rows,
  loading,
  onViewDetail,
  onOpenReview,
}: AdvisorTaskMatrixProps) {
  const columns = useMemo<ColumnProps<AdvisorTaskRow>[]>(() => {
    const leftFixedCell = (row?: AdvisorTaskRow) => ({
      style: row ? getFixedCellStyle(row) : {},
    })

    const rightFixedCell = (row?: AdvisorTaskRow) => ({
      style: row ? getFixedCellStyle(row) : {},
    })

    const baseColumns: ColumnProps<AdvisorTaskRow>[] = [
      {
        title: '顾问信息',
        fixed: 'left' as const,
        children: [
          {
            title: '顾问',
            dataIndex: 'advisorName',
            key: 'advisorName',
            width: 180,
            fixed: 'left' as const,
            onCell: leftFixedCell,
            render: (_: unknown, row: AdvisorTaskRow) => (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{row.advisorName}</div>
                <Text type="tertiary" size="small">{row.rangeStart === row.rangeEnd ? row.rangeStart : `${row.rangeStart} ~ ${row.rangeEnd}`}</Text>
              </div>
            ),
          },
          {
            title: '校区',
            dataIndex: 'campusName',
            key: 'campusName',
            width: 112,
            onCell: leftFixedCell,
            render: (value: string) => (
              <Text size="small" style={{ color: '#475569' }}>{value || '未分配校区'}</Text>
            ),
          },
          {
            title: '状态',
            dataIndex: 'finalStatus',
            key: 'finalStatus',
            width: 124,
            onCell: leftFixedCell,
            render: (_: unknown, row: AdvisorTaskRow) => {
              const statusMeta = getFinalStatusMeta(row.finalStatus)
              return (
                <Tag
                  size="small"
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    border: `1px solid ${statusMeta.border}`,
                    background: statusMeta.background,
                    color: statusMeta.color,
                    fontWeight: 700,
                  }}
                >
                  {statusMeta.label}
                </Tag>
              )
            },
          },
        ],
      },
      {
        title: '今日指标',
        children: [
          { title: '呼出', dataIndex: 'outboundCallCount', key: 'outboundCallCount', width: 84, align: 'right', render: formatCount },
          { title: '接通', dataIndex: 'connectedCount', key: 'connectedCount', width: 84, align: 'right', render: formatCount },
          { title: '通时', dataIndex: 'callDurationSeconds', key: 'callDurationSeconds', width: 92, align: 'right', render: formatDurationShort },
          { title: '40秒+', dataIndex: 'longCall40Count', key: 'longCall40Count', width: 86, align: 'right', render: formatCount },
          { title: '60秒+', dataIndex: 'longCall60Count', key: 'longCall60Count', width: 86, align: 'right', render: formatCount },
          { title: '诺到', dataIndex: 'promisedCount', key: 'promisedCount', width: 78, align: 'right', render: formatCount },
          { title: '到访', dataIndex: 'visitedCount', key: 'visitedCount', width: 78, align: 'right', render: formatCount },
          { title: '试听', dataIndex: 'trialPaymentCandidateCount', key: 'trialPaymentCandidateCount', width: 78, align: 'right', render: formatCount },
        ],
      },
      {
        title: '自动规则',
        children: AUTO_RULES.map((rule) => ({
          title: rule.shortLabel,
          key: rule.key,
          width: 62,
          align: 'center',
          render: (_: unknown, row: AdvisorTaskRow) => <AutoRuleStateCell row={row} rule={rule} />,
        })),
      },
      {
        title: '人工项',
        children: MANUAL_RULES.map((rule) => ({
          title: rule.shortLabel,
          key: rule.key,
          width: 62,
          align: 'center',
          render: (_: unknown, row: AdvisorTaskRow) => <ManualRuleStateCell row={row} rule={rule} />,
        })),
      },
      {
        title: '结果',
        children: [
          {
            title: '建议乐捐',
            dataIndex: 'suggestedPenaltyAmount',
            key: 'suggestedPenaltyAmount',
            width: 110,
            align: 'right',
            render: (value: number) => (
              <Text
                style={{
                  fontWeight: 700,
                  color: value > 0 ? '#be123c' : '#0f172a',
                }}
              >
                {formatMoney(value)}
              </Text>
            ),
          },
          {
            title: '最短路径',
            dataIndex: 'gapHint',
            key: 'gapHint',
            width: 250,
            ellipsis: { showTitle: false },
            render: (_: unknown, row: AdvisorTaskRow) => {
              const hint = getGapHint(row)
              return (
                <Tooltip content={hint} position="top">
                  <Text
                    ellipsis={{ showTooltip: false }}
                    style={{
                      maxWidth: 220,
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {hint}
                  </Text>
                </Tooltip>
              )
            },
          },
        ],
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right' as const,
        width: 170,
        onCell: rightFixedCell,
        render: (_: unknown, row: AdvisorTaskRow) => {
          const readOnly = !row.recordId || !row.editable
          return (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button
                size="small"
                type="tertiary"
                theme="light"
                icon={<FileSearch size={14} />}
                style={{ borderRadius: 10 }}
                onClick={() => onViewDetail(row)}
              >
                查看
              </Button>
              <ReadOnlyReviewButton disabled={readOnly} onClick={() => onOpenReview(row)} />
            </div>
          )
        },
      },
    ]

    return baseColumns
  }, [onOpenReview, onViewDetail])

  if (loading) {
    return <LoadingTable />
  }

  if (!rows.length) {
    return (
      <Empty
        image={<FileSearch size={36} style={{ color: '#94a3b8' }} />}
        title="当前筛选下暂无任务考核数据"
        description="调整校区、日期或云客账号后再试。"
      />
    )
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-bg-0)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}
    >
      <Table<AdvisorTaskRow>
        className="advisor-task-table"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rows}
        rowKey={(row) => row ? (row.recordId || `${row.advisorId}-${row.rangeStart}-${row.rangeEnd}`) : ''}
        expandedRowRender={(row) => row ? <ExpandedTaskRow row={row} /> : null}
        hideExpandedColumn
        scroll={{ x: 2320 }}
        onRow={(row) => {
          if (!row) return {}
          const meta = getFinalStatusMeta(row.finalStatus)
          const surface = getRowSurface(row.finalStatus)
          return {
            style: {
              background: surface.background,
              boxShadow: `inset 3px 0 0 ${meta.border}`,
              ['--advisor-task-row-bg' as string]: surface.background,
              ['--advisor-task-row-hover-bg' as string]: surface.hoverBackground,
            },
          }
        }}
      />
    </div>
  )
}
