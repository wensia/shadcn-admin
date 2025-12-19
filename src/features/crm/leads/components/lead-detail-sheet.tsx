/**
 * 线索详情Sheet组件
 * 全新布局：Header + KPI卡片 + Tabs (概览/跟进记录/统计图表/变更历史)
 * 支持 Mira/Lyra/Maia 三种风格
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Phone,
  Edit,
  Plus,
  X,
  Star,
  PhoneCall,
  TrendingUp,
  Target,
  Clock,
  Baby,
  Users,
  MapPin,
  Tag,
  UserPlus,
} from 'lucide-react'
import { leadsApi } from '../api'
import type { Lead, LeadFollowup, LeadInfoChangeLog, LeadOwnershipChangeLog } from '../types'
import { gradeLabels } from '../types'
import { formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { getLeadStatusStyle, getIntentionLevelStyle } from '@/lib/status-styles'
import { useLeadStatistics } from '../hooks/use-lead-statistics'

// 详情组件
import { MiniStatCard } from './detail/mini-stat-card'
import { InfoCard } from './detail/info-card'
import { InfoGrid } from './detail/info-grid'
import { InfoItem } from './detail/info-item'
import { FollowupTimeline } from './detail/followup-timeline'
import { ChangeHistoryTimeline } from './detail/change-history-timeline'

// 图表组件
import { FollowupFrequencyChart } from './detail/charts/followup-frequency-chart'
import { FollowupMethodPie } from './detail/charts/followup-method-pie'
import { FollowupResultPie } from './detail/charts/followup-result-pie'

interface LeadDetailSheetProps {
  leadId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (lead: Lead) => void
  onCreateFollowup?: (leadId: string) => void
}

export function LeadDetailSheet({
  leadId,
  open,
  onOpenChange,
  onEdit,
  onCreateFollowup
}: LeadDetailSheetProps) {
  const s = useStyleClasses()
  const [activeTab, setActiveTab] = useState('overview')

  // 获取线索详情
  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) return null
      const response = await leadsApi.getLead(leadId, true)
      return response.data
    },
    enabled: !!leadId && open
  })

  // 获取跟进记录 - 统计图表和跟进记录 Tab 都需要
  const { data: followupsResponse, isLoading: isFollowupsLoading } = useQuery({
    queryKey: ['lead-followups', leadId],
    queryFn: async () => {
      if (!leadId) return { data: [] }
      const response = await leadsApi.getLeadFollowups(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && open && (activeTab === 'followups' || activeTab === 'statistics')
  })

  // 获取信息变更记录
  const { data: infoChangeLogs, isLoading: isInfoChangeLoading } = useQuery({
    queryKey: ['lead-info-changes', leadId],
    queryFn: async () => {
      if (!leadId) return { data: [] }
      const response = await leadsApi.getLeadInfoChangeLogs(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && open && activeTab === 'history'
  })

  // 获取归属变更记录
  const { data: ownershipChangeLogs, isLoading: isOwnershipChangeLoading } = useQuery({
    queryKey: ['lead-ownership-changes', leadId],
    queryFn: async () => {
      if (!leadId) return { data: [] }
      const response = await leadsApi.getLeadOwnershipChangeLogs(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && open && activeTab === 'history'
  })

  // 计算统计数据
  const statistics = useLeadStatistics(lead || null, followupsResponse?.data)

  // 状态和意向样式
  const statusStyle = lead ? getLeadStatusStyle(lead.status) : null
  const intentionStyle = lead?.intention_level ? getIntentionLevelStyle(lead.intention_level) : null

  if (!lead && !isLoading) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl md:max-w-[70%] lg:max-w-3xl xl:max-w-4xl p-0 flex flex-col [&>button]:hidden">
        {/* ==================== Header 区域 ==================== */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          {/* 第一行：Avatar + 名称/电话 + 关闭按钮 */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className={cn(s.text.sm, 'font-semibold')}>
                {lead?.child_name?.[0] || '线'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className={cn(s.text.base, 'truncate')}>
                {lead?.child_name || '线索详情'}
              </SheetTitle>
              <SheetDescription className={cn(s.text.xs, 'mt-0.5')}>
                {lead?.parent_phone || ''}
              </SheetDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 第二行：状态标签 + 快速操作按钮 */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              {statusStyle && (
                <Badge variant={statusStyle.variant} className={cn(s.text.xs, s.height.badge, s.rounded)}>
                  {statusStyle.label}
                </Badge>
              )}
              {intentionStyle && (
                <Badge variant={intentionStyle.variant} className={cn(s.text.xs, s.height.badge, s.rounded)}>
                  {intentionStyle.label}
                </Badge>
              )}
              {lead?.is_starred && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <div className={cn('flex items-center', s.gap.buttons)}>
              {lead && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit?.(lead)}
                    className={cn(s.height.controlSm, s.text.xs)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info('外呼功能')}
                    className={cn(s.height.controlSm, s.text.xs)}
                  >
                    <Phone className="mr-1 h-3 w-3" />
                    外呼
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onCreateFollowup?.(lead.id)}
                    className={cn(s.height.controlSm, s.text.xs)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    新建跟进
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* ==================== KPI 卡片区域 ==================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 py-3 border-b bg-muted/30 shrink-0">
          <MiniStatCard
            icon={<PhoneCall className={s.size.icon} />}
            label="跟进次数"
            value={lead?.followup_count || 0}
            subtext={statistics.lastFollowupDaysAgo !== null ? `${statistics.lastFollowupDaysAgo}天前` : '暂无'}
          />
          <MiniStatCard
            icon={<TrendingUp className={s.size.icon} />}
            label="意向等级"
            value={intentionStyle?.label || '未评级'}
            variant={
              intentionStyle?.variant === 'success' ? 'success' :
              intentionStyle?.variant === 'warning' ? 'warning' : 'default'
            }
          />
          <MiniStatCard
            icon={<Target className={s.size.icon} />}
            label="销售阶段"
            value={statistics.statusStage}
            progress={statistics.statusProgress}
          />
          <MiniStatCard
            icon={<Clock className={s.size.icon} />}
            label="下次跟进"
            value={
              statistics.daysUntilNextFollowup === null
                ? '未设置'
                : statistics.daysUntilNextFollowup === 0
                ? '今天'
                : statistics.daysUntilNextFollowup > 0
                ? `${statistics.daysUntilNextFollowup}天后`
                : `逾期${Math.abs(statistics.daysUntilNextFollowup)}天`
            }
            variant={statistics.isOverdue ? 'danger' : 'default'}
            highlight={statistics.isOverdue}
          />
        </div>

        {/* ==================== Tabs 区域 ==================== */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className={cn(
            'w-full justify-start rounded-none border-b bg-transparent px-4 shrink-0',
            s.height.control
          )}>
            <TabsTrigger
              value="overview"
              className={cn(s.text.xs, s.height.controlSm, 'data-[state=active]:shadow-none')}
            >
              概览
            </TabsTrigger>
            <TabsTrigger
              value="followups"
              className={cn(s.text.xs, s.height.controlSm, 'data-[state=active]:shadow-none')}
            >
              跟进记录
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {lead?.followup_count || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className={cn(s.text.xs, s.height.controlSm, 'data-[state=active]:shadow-none')}
            >
              统计图表
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={cn(s.text.xs, s.height.controlSm, 'data-[state=active]:shadow-none')}
            >
              变更历史
            </TabsTrigger>
          </TabsList>

          {/* ==================== 概览 Tab ==================== */}
          <TabsContent value="overview" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {isLoading ? (
                  <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                    加载中...
                  </div>
                ) : lead ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 儿童信息 */}
                    <InfoCard title="儿童信息" icon={<Baby className={s.size.icon} />}>
                      <InfoGrid>
                        <InfoItem label="姓名" value={lead.child_name} />
                        <InfoItem
                          label="性别"
                          value={lead.child_gender === 'male' ? '男' : lead.child_gender === 'female' ? '女' : undefined}
                        />
                        <InfoItem label="年龄" value={lead.age?.toString()} />
                        <InfoItem label="生日" value={lead.child_birthday} />
                        <InfoItem label="年级" value={lead.grade ? gradeLabels[lead.grade] : undefined} />
                        <InfoItem label="学校" value={lead.school_name} />
                        <InfoItem
                          label="课程兴趣"
                          value={lead.course_interests?.join('、')}
                          span={2}
                        />
                      </InfoGrid>
                    </InfoCard>

                    {/* 家长信息 */}
                    <InfoCard title="家长信息" icon={<Users className={s.size.icon} />}>
                      <InfoGrid>
                        <InfoItem label="家长姓名" value={lead.parent_name} />
                        <InfoItem label="关系" value={lead.parent_relation} />
                        <InfoItem label="手机号" value={lead.parent_phone} copyable />
                        <InfoItem label="微信号" value={lead.parent_wechat} copyable />
                        <InfoItem label="邮箱" value={lead.parent_email} span={2} />
                      </InfoGrid>
                    </InfoCard>

                    {/* 地址信息 */}
                    <InfoCard title="地址信息" icon={<MapPin className={s.size.icon} />}>
                      <InfoGrid>
                        <InfoItem
                          label="省市区"
                          value={[lead.province, lead.city, lead.district].filter(Boolean).join(' ') || undefined}
                          span={2}
                        />
                        <InfoItem label="详细地址" value={lead.address_detail} span={2} />
                      </InfoGrid>
                    </InfoCard>

                    {/* 线索属性 */}
                    <InfoCard title="线索属性" icon={<Tag className={s.size.icon} />}>
                      <InfoGrid>
                        <InfoItem label="来源渠道" value={lead.source_channel_name} />
                        <InfoItem label="来源详情" value={lead.source_detail} />
                        <InfoItem label="负责顾问" value={lead.advisor_name} />
                        <InfoItem label="归属校区" value={lead.owner_campus_name} />
                        <InfoItem label="创建人" value={lead.created_by_name} />
                        <InfoItem label="创建时间" value={formatTime(lead.created_at)} />
                        <InfoItem
                          label="下次跟进"
                          value={lead.next_followup_at ? formatTime(lead.next_followup_at) : undefined}
                          highlight={statistics.isOverdue}
                        />
                        <InfoItem
                          label="最后跟进"
                          value={lead.last_followup_at ? formatTime(lead.last_followup_at) : undefined}
                        />
                        {lead.notes && (
                          <InfoItem label="备注" value={lead.notes} span={2} />
                        )}
                      </InfoGrid>
                    </InfoCard>

                    {/* 备用联系人 */}
                    {(lead.backup_contact_name || lead.backup_contact_phone) && (
                      <InfoCard
                        title="备用联系人"
                        icon={<UserPlus className={s.size.icon} />}
                        compact
                        className="lg:col-span-2"
                      >
                        <InfoGrid cols={3}>
                          <InfoItem label="姓名" value={lead.backup_contact_name} />
                          <InfoItem label="电话" value={lead.backup_contact_phone} copyable />
                          <InfoItem label="关系" value={lead.backup_contact_relation} />
                        </InfoGrid>
                      </InfoCard>
                    )}
                  </div>
                ) : (
                  <div className={cn(s.text.xs, 'text-muted-foreground text-center py-8')}>
                    暂无数据
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== 跟进记录 Tab ==================== */}
          <TabsContent value="followups" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <FollowupTimeline
                  followups={followupsResponse?.data || []}
                  isLoading={isFollowupsLoading}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== 统计图表 Tab ==================== */}
          <TabsContent value="statistics" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* 跟进频率趋势 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className={s.text.sm}>跟进频率趋势</CardTitle>
                    <CardDescription className={s.text.xs}>最近30天的跟进活动</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FollowupFrequencyChart data={statistics.followupFrequencyData} />
                  </CardContent>
                </Card>

                {/* 跟进方式分布 + 跟进结果分布 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className={s.text.sm}>跟进方式分布</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FollowupMethodPie data={statistics.methodDistribution} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className={s.text.sm}>跟进结果分布</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FollowupResultPie data={statistics.resultDistribution} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ==================== 变更历史 Tab ==================== */}
          <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <ChangeHistoryTimeline
                  infoChanges={infoChangeLogs?.data || []}
                  ownershipChanges={ownershipChangeLogs?.data || []}
                  isLoading={isInfoChangeLoading || isOwnershipChangeLoading}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
