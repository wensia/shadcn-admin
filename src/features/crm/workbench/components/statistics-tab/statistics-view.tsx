/**
 * 统计视图组件 - Semi Design 版
 * 展示个人业绩统计
 */

import { useQuery } from '@tanstack/react-query'
import { Card, Skeleton } from '@douyinfe/semi-ui-19'
import { IconPhone, IconUserGroup, IconTick, IconClock } from '@douyinfe/semi-icons'
import { leadsApi } from '@/features/crm/leads/api'

export function StatisticsView() {
  // 获取今日活动统计
  const { data: todayActivity, isLoading: loadingToday } = useQuery({
    queryKey: ['workbench-today-activity'],
    queryFn: async () => {
      const response = await leadsApi.getAdvisorTodayActivity()
      return response.data
    },
  })

  // 获取线索汇总
  const { data: leadSummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['workbench-lead-summary'],
    queryFn: async () => {
      const response = await leadsApi.getAdvisorLeadSummary()
      return response.data
    },
  })

  // 获取待回访按渠道分组
  const { data: pendingByChannel, isLoading: loadingChannel } = useQuery({
    queryKey: ['workbench-pending-by-channel'],
    queryFn: async () => {
      const response = await leadsApi.getAdvisorPendingByChannel()
      return response.data
    },
  })

  const isLoading = loadingToday || loadingSummary || loadingChannel

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton.Paragraph key={i} rows={2} style={{ height: 96 }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 概览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          title="今日跟进"
          value={todayActivity?.total_followup || 0}
          icon={IconPhone}
          color="var(--semi-color-primary)"
        />
        <StatCard
          title="今日查看"
          value={todayActivity?.total_access || 0}
          icon={IconUserGroup}
          color="var(--semi-color-info)"
        />
        <StatCard
          title="我的线索"
          value={leadSummary?.total_leads || 0}
          icon={IconTick}
          color="var(--semi-color-success)"
        />
        <StatCard
          title="待回访"
          value={leadSummary?.total_pending || 0}
          icon={IconClock}
          color="var(--semi-color-warning)"
          highlight={!!leadSummary?.total_pending}
        />
      </div>

      {/* 待回访渠道分布 */}
      {pendingByChannel && pendingByChannel.channel_totals.length > 0 && (
        <Card
          header={
            <Card.Meta
              title={<span style={{ fontSize: 16 }}>待回访渠道分布</span>}
              description={`各渠道待回访线索数量（共 ${pendingByChannel.total_pending} 条）`}
            />
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingByChannel.channel_totals.map((channel) => (
              <div key={channel.channel_id || 'unknown'} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {channel.channel_name || '未知渠道'}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>
                      {channel.total}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--semi-color-fill-1)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%', borderRadius: 4,
                        background: 'var(--semi-color-primary)',
                        transition: 'width 0.3s',
                        width: `${(channel.total / pendingByChannel.total_pending) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 今日活动详情 */}
      {todayActivity && todayActivity.items.length > 0 && (
        <Card
          header={
            <Card.Meta
              title={<span style={{ fontSize: 16 }}>今日团队活动</span>}
              description={`${todayActivity.date} 团队跟进情况`}
            />
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayActivity.items.map((item) => (
              <div
                key={item.advisor_id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--semi-color-border)',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>{item.advisor_name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14, color: 'var(--semi-color-text-2)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconPhone size="extra-small" />
                    {item.followup_count}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconUserGroup size="extra-small" />
                    {item.access_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  color: string
  highlight?: boolean
}

function StatCard({ title, value, icon: Icon, color, highlight }: StatCardProps) {
  return (
    <Card style={highlight ? { border: '1px solid var(--semi-color-warning)', background: 'var(--semi-color-warning-light-default)' } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color, margin: '4px 0 0' }}>{value}</p>
        </div>
        <Icon size="extra-large" style={{ opacity: 0.2, color }} />
      </div>
    </Card>
  )
}
