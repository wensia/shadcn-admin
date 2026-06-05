import { useMemo } from 'react'
import { Table, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { AdvisorTaskDashboardSummary } from '../api/advisor-task-api'

const { Text } = Typography

interface OverviewStatRow {
  key: string
  metric: string
  value: string
}

function formatCount(value: number) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatMoney(value: number) {
  return `¥${Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function buildOverviewRows(summary: AdvisorTaskDashboardSummary): OverviewStatRow[] {
  return [
    { key: 'qualified', metric: '达标人数', value: formatCount(summary.qualifiedCount) },
    { key: 'pending-review', metric: '待确认人数', value: formatCount(summary.pendingReviewCount) },
    { key: 'failed', metric: '未达标人数', value: formatCount(summary.failedCount) },
    { key: 'penalty', metric: '建议乐捐金额', value: formatMoney(summary.suggestedPenaltyAmount) },
    { key: 'weekly-visited', metric: '本周实到达标', value: formatCount(summary.weeklyVisitedQualifiedCount) },
  ]
}

export function AdvisorTaskOverviewTable({
  summary,
  loading,
}: {
  summary: AdvisorTaskDashboardSummary
  loading?: boolean
}) {
  const rows = useMemo(() => buildOverviewRows(summary), [summary])

  const columns = useMemo<ColumnProps<OverviewStatRow>[]>(() => [
    {
      title: '指标',
      dataIndex: 'metric',
      width: 180,
      render: (text: string) => (
        <Text strong style={{ color: 'var(--semi-color-text-0)' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '数值',
      dataIndex: 'value',
      align: 'right' as const,
      render: (text: string) => (
        <span style={{ fontWeight: 700, color: 'var(--semi-color-text-0)' }}>
          {text}
        </span>
      ),
    },
  ], [])

  return (
    <div
      style={{
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--semi-color-bg-0)',
      }}
    >
      <Table<OverviewStatRow>
        columns={columns}
        dataSource={rows}
        rowKey="key"
        pagination={false}
        loading={loading}
        empty="暂无统计数据"
      />
    </div>
  )
}
