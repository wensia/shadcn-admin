/**
 * 线索详情Sheet组件
 * Mira风格: 紧凑间距、小字号、密集布局
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
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Phone, Edit, Plus, X } from 'lucide-react'
import { leadsApi } from '../api'
import type { Lead, LeadFollowup, LeadInfoChangeLog, LeadOwnershipChangeLog } from '../types'
import {
  leadStatusLabels,
  intentionLevelLabels,
  gradeLabels,
  followupMethodLabels,
  followupResultLabels,
  infoChangeTypeLabels,
  ownershipChangeTypeLabels
} from '../types'
import { formatTime } from '@/lib/utils/time'

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
  const [activeTab, setActiveTab] = useState('basic')

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

  // 获取跟进记录
  const { data: followups } = useQuery({
    queryKey: ['lead-followups', leadId],
    queryFn: async () => {
      if (!leadId) return { data: [] }
      const response = await leadsApi.getLeadFollowups(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && open && activeTab === 'followups'
  })

  // 获取信息变更记录
  const { data: infoChangeLogs } = useQuery({
    queryKey: ['lead-info-changes', leadId],
    queryFn: async () => {
      if (!leadId) return { data: [] }
      const response = await leadsApi.getLeadInfoChangeLogs(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && open && activeTab === 'info-changes'
  })

  // 获取归属变更记录
  const { data: ownershipChangeLogs } = useQuery({
    queryKey: ['lead-ownership-changes', leadId],
    queryFn: async () => {
      if (!leadId) return { data: [] }
      const response = await leadsApi.getLeadOwnershipChangeLogs(leadId, { page: 1, size: 50 })
      return response
    },
    enabled: !!leadId && open && activeTab === 'ownership-changes'
  })

  if (!lead && !isLoading) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0">
        {/* Mira风格: 紧凑的Sheet Header */}
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle className="text-base">
                {lead?.child_name || '线索详情'}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {lead?.parent_phone || ''}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-1.5">
              {lead && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit?.(lead)}
                    className="h-7 text-xs"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info('外呼功能')}
                    className="h-7 text-xs"
                  >
                    <Phone className="mr-1 h-3 w-3" />
                    外呼
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onCreateFollowup?.(lead.id)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    新建跟进
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Mira风格: 紧凑的Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-73px)]">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-9 p-0 px-4">
            <TabsTrigger value="basic" className="text-xs h-8 data-[state=active]:shadow-none">
              基本信息
            </TabsTrigger>
            <TabsTrigger value="followups" className="text-xs h-8 data-[state=active]:shadow-none">
              跟进记录 ({lead?.followup_count || 0})
            </TabsTrigger>
            <TabsTrigger value="info-changes" className="text-xs h-8 data-[state=active]:shadow-none">
              信息变更
            </TabsTrigger>
            <TabsTrigger value="ownership-changes" className="text-xs h-8 data-[state=active]:shadow-none">
              归属变更
            </TabsTrigger>
          </TabsList>

          {/* 基本信息Tab */}
          <TabsContent value="basic" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {isLoading ? (
                  <div className="text-xs text-muted-foreground text-center py-8">加载中...</div>
                ) : lead ? (
                  <>
                    {/* 儿童信息 - Mira风格: 紧凑间距 */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">儿童信息</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <InfoItem label="姓名" value={lead.child_name} />
                        <InfoItem label="性别" value={lead.child_gender === 'male' ? '男' : lead.child_gender === 'female' ? '女' : undefined} />
                        <InfoItem label="年龄" value={lead.age?.toString()} />
                        <InfoItem label="生日" value={lead.child_birthday} />
                        <InfoItem label="年级" value={lead.grade ? gradeLabels[lead.grade] : undefined} />
                        <InfoItem label="学校" value={lead.school_name} />
                        <InfoItem label="课程兴趣" value={lead.course_interests?.join('、')} className="col-span-2" />
                      </div>
                    </div>

                    <Separator />

                    {/* 家长信息 */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">家长信息</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <InfoItem label="家长姓名" value={lead.parent_name} />
                        <InfoItem label="手机号" value={lead.parent_phone} />
                        <InfoItem label="微信号" value={lead.parent_wechat} />
                        <InfoItem label="邮箱" value={lead.parent_email} />
                        <InfoItem label="关系" value={lead.parent_relation} />
                      </div>
                    </div>

                    {/* 备用联系人 */}
                    {(lead.backup_contact_name || lead.backup_contact_phone) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold">备用联系人</h3>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <InfoItem label="姓名" value={lead.backup_contact_name} />
                            <InfoItem label="电话" value={lead.backup_contact_phone} />
                            <InfoItem label="关系" value={lead.backup_contact_relation} />
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* 地址信息 */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">地址信息</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <InfoItem label="省份" value={lead.province} />
                        <InfoItem label="城市" value={lead.city} />
                        <InfoItem label="区县" value={lead.district} />
                        <InfoItem label="详细地址" value={lead.address_detail} className="col-span-2" />
                      </div>
                    </div>

                    <Separator />

                    {/* 线索属性 */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">线索属性</h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <InfoItem label="来源渠道" value={lead.source_channel_name} />
                        <InfoItem label="来源详情" value={lead.source_detail} />
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">状态:</span>
                          <Badge variant="outline" className="text-xs h-5">
                            {leadStatusLabels[lead.status]}
                          </Badge>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">意向等级:</span>
                          {lead.intention_level ? (
                            <Badge variant="secondary" className="text-xs h-5">
                              {intentionLevelLabels[lead.intention_level]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                        <InfoItem label="负责顾问" value={lead.advisor_name} />
                        <InfoItem label="归属校区" value={lead.owner_campus_name} />
                        <InfoItem label="创建人" value={lead.created_by_name} />
                        <InfoItem label="创建时间" value={formatTime(lead.created_at)} />
                        <InfoItem label="下次跟进" value={lead.next_followup_at ? formatTime(lead.next_followup_at) : undefined} />
                        <InfoItem label="最后跟进" value={lead.last_followup_at ? formatTime(lead.last_followup_at) : undefined} />
                        {lead.notes && (
                          <InfoItem label="备注" value={lead.notes} className="col-span-2" />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-8">暂无数据</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 跟进记录Tab */}
          <TabsContent value="followups" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {followups?.data && followups.data.length > 0 ? (
                  followups.data.map((followup: LeadFollowup) => (
                    <div key={followup.id} className="border rounded-sm p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs h-5">
                              {followupMethodLabels[followup.method]}
                            </Badge>
                            {followup.result && (
                              <Badge variant="secondary" className="text-xs h-5">
                                {followupResultLabels[followup.result]}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {followup.followup_by_name} · {formatTime(followup.followup_at)}
                          </p>
                        </div>
                      </div>
                      {followup.content && (
                        <p className="text-xs">{followup.content}</p>
                      )}
                      {followup.result_remark && (
                        <p className="text-xs text-muted-foreground">结果备注: {followup.result_remark}</p>
                      )}
                      {followup.next_action && (
                        <p className="text-xs text-muted-foreground">下一步行动: {followup.next_action}</p>
                      )}
                      {followup.next_followup_at && (
                        <p className="text-xs text-muted-foreground">
                          下次跟进: {formatTime(followup.next_followup_at)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-8">暂无跟进记录</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 信息变更记录Tab */}
          <TabsContent value="info-changes" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {infoChangeLogs?.data && infoChangeLogs.data.length > 0 ? (
                  infoChangeLogs.data.map((log: LeadInfoChangeLog) => (
                    <div key={log.id} className="border rounded-sm p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs h-5">
                          {infoChangeTypeLabels[log.change_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.changed_by_name} · {formatTime(log.changed_at)}
                        </span>
                      </div>
                      <p className="text-xs">{log.change_summary}</p>
                      {log.changes && log.changes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {log.changes.map((change, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              {change.field_name}: {change.old_value || '-'} → {change.new_value || '-'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-8">暂无变更记录</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 归属变更记录Tab */}
          <TabsContent value="ownership-changes" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {ownershipChangeLogs?.data && ownershipChangeLogs.data.length > 0 ? (
                  ownershipChangeLogs.data.map((log: LeadOwnershipChangeLog) => (
                    <div key={log.id} className="border rounded-sm p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs h-5">
                          {ownershipChangeTypeLabels[log.change_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.changed_by_name} · {formatTime(log.changed_at)}
                        </span>
                      </div>
                      <p className="text-xs">{log.change_summary}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {log.previous_advisor_name && (
                          <div>原顾问: {log.previous_advisor_name}</div>
                        )}
                        {log.current_advisor_name && (
                          <div>现顾问: {log.current_advisor_name}</div>
                        )}
                        {log.previous_campus_name && (
                          <div>原校区: {log.previous_campus_name}</div>
                        )}
                        {log.current_campus_name && (
                          <div>现校区: {log.current_campus_name}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-8">暂无归属变更记录</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// 信息项组件 - Mira风格
function InfoItem({
  label,
  value,
  className
}: {
  label: string
  value?: string
  className?: string
}) {
  return (
    <div className={`flex items-start gap-2 ${className || ''}`}>
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="flex-1">{value || '-'}</span>
    </div>
  )
}
