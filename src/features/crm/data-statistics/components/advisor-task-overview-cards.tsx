import { Card, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import { BadgeCheck, CalendarRange, CircleDashed, WalletCards, XCircle, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
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
  iconColor,
  icon: Icon,
  loading,
  index,
}: {
  title: string
  value: string
  accent: string
  iconColor: string
  icon: LucideIcon
  loading?: boolean
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
    >
      <Card
        style={{
          borderRadius: 14,
          border: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-0)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        }}
        bodyStyle={{ padding: 16 }}
      >
        {loading ? (
          <>
            <Skeleton.Title style={{ width: '40%', marginBottom: 12 }} />
            <Skeleton.Paragraph rows={1} style={{ width: '60%' }} />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text
                strong
                style={{
                  color: 'var(--semi-color-text-2)',
                  fontSize: 12,
                  letterSpacing: '0.03em',
                }}
              >
                {title}
              </Text>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: accent,
                  color: iconColor,
                  flexShrink: 0,
                }}
              >
                <Icon size={15} strokeWidth={2.2} />
              </div>
            </div>

            <div
              style={{
                fontSize: 26,
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--semi-color-text-0)',
              }}
            >
              {value}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
      <OverviewStatCard title="达标人数" value={formatCount(summary.qualifiedCount)} accent="#dcfce7" iconColor="#16a34a" icon={BadgeCheck} loading={loading} index={0} />
      <OverviewStatCard title="待确认人数" value={formatCount(summary.pendingReviewCount)} accent="#e0f2fe" iconColor="#0284c7" icon={CircleDashed} loading={loading} index={1} />
      <OverviewStatCard title="未达标人数" value={formatCount(summary.failedCount)} accent="#fee2e2" iconColor="#dc2626" icon={XCircle} loading={loading} index={2} />
      <OverviewStatCard title="建议乐捐金额" value={formatMoney(summary.suggestedPenaltyAmount)} accent="#fef3c7" iconColor="#d97706" icon={WalletCards} loading={loading} index={3} />
      <OverviewStatCard title="本周实到达标" value={formatCount(summary.weeklyVisitedQualifiedCount)} accent="#ede9fe" iconColor="#7c3aed" icon={CalendarRange} loading={loading} index={4} />
    </div>
  )
}
