/**
 * 统计视图组件
 * 展示个人业绩统计
 */

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PhoneCall,
  Users,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="今日跟进"
          value={todayActivity?.total_followup || 0}
          icon={PhoneCall}
          color="primary"
        />
        <StatCard
          title="今日查看"
          value={todayActivity?.total_access || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="我的线索"
          value={leadSummary?.total_leads || 0}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="待回访"
          value={leadSummary?.total_pending || 0}
          icon={Clock}
          color="orange"
          highlight={!!leadSummary?.total_pending}
        />
      </div>

      {/* 待回访渠道分布 */}
      {pendingByChannel && pendingByChannel.channel_totals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">待回访渠道分布</CardTitle>
            <CardDescription>
              各渠道待回访线索数量（共 {pendingByChannel.total_pending} 条）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingByChannel.channel_totals.map((channel) => (
                <div key={channel.channel_id || 'unknown'} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">
                        {channel.channel_name || '未知渠道'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {channel.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${(channel.total / pendingByChannel.total_pending) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 今日活动详情 */}
      {todayActivity && todayActivity.items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">今日团队活动</CardTitle>
            <CardDescription>
              {todayActivity.date} 团队跟进情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayActivity.items.map((item) => (
                <div
                  key={item.advisor_id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm font-medium">{item.advisor_name}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <PhoneCall className="h-3 w-3" />
                      {item.followup_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.access_count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  color?: 'primary' | 'blue' | 'green' | 'orange'
  highlight?: boolean
}

function StatCard({ title, value, icon: Icon, color = 'primary', highlight }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary',
    blue: 'text-blue-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
  }

  return (
    <Card className={cn(highlight && 'border-orange-200 bg-orange-50/50')}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={cn('text-2xl font-bold', colorClasses[color])}>{value}</p>
          </div>
          <Icon className={cn('h-8 w-8 opacity-20', colorClasses[color])} />
        </div>
      </CardContent>
    </Card>
  )
}
