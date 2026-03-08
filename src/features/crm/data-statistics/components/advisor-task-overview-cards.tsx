import { Card, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import { BadgeCheck, CalendarRange, CircleDashed, WalletCards, XCircle, type LucideIcon } from 'lucide-react'
import type { AdvisorTaskDashboardSummary } from '../api/advisor-task-api'

const { Text } = Typography

function formatCount(value: number) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatMoney(value: number) {
  return `¥${Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function OverviewStatCard({
  title,
  value,
  accent,
  icon: Icon,
  loading,
}: {
  title: string
  value: string
  accent: string
  icon: LucideIcon
  loading?: boolean
}) {
  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid #dbe3ef',
        background: '#ffffff',
        boxShadow: '0 10px 18px rgba(15, 23, 42, 0.04)',
      }}
      bodyStyle={{ padding: 18 }}
    >
      {loading ? (
        <>
          <Skeleton.Title style={{ width: '40%', marginBottom: 12 }} />
          <Skeleton.Paragraph rows={1} style={{ width: '60%' }} />
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text
              strong
              style={{
                color: '#475569',
                fontSize: 12,
                letterSpacing: '0.04em',
              }}
            >
              {title}
            </Text>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: accent,
                color: '#0f172a',
              }}
            >
              <Icon size={16} strokeWidth={2.1} />
            </div>
          </div>

          <div
            style={{
              fontSize: 28,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: '#0f172a',
            }}
          >
            {value}
          </div>
        </div>
      )}
    </Card>
  )
}

export function AdvisorTaskOverviewCards({
  summary,
  loading,
}: {
  summary: AdvisorTaskDashboardSummary
  loading?: boolean
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
      <OverviewStatCard title="今日达标人数" value={formatCount(summary.qualifiedCount)} accent="#dcfce7" icon={BadgeCheck} loading={loading} />
      <OverviewStatCard title="今日待确认人数" value={formatCount(summary.pendingReviewCount)} accent="#e0f2fe" icon={CircleDashed} loading={loading} />
      <OverviewStatCard title="今日未达标人数" value={formatCount(summary.failedCount)} accent="#fee2e2" icon={XCircle} loading={loading} />
      <OverviewStatCard title="今日建议乐捐金额" value={formatMoney(summary.suggestedPenaltyAmount)} accent="#fef3c7" icon={WalletCards} loading={loading} />
      <OverviewStatCard title="本周实到达标人数" value={formatCount(summary.weeklyVisitedQualifiedCount)} accent="#ede9fe" icon={CalendarRange} loading={loading} />
    </div>
  )
}
