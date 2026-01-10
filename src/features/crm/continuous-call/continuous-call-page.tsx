/**
 * 快捷外呼页面
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Phone, X, RotateCcw, Loader2, Send,
  TrendingUp, CalendarCheck, PhoneOff, UserX,
  Clock, Ban, PhoneMissed, GraduationCap, ChevronDown, CheckIcon,
  type LucideIcon
} from 'lucide-react'
import { toast } from 'sonner'

import { Header } from '@/components/layout/header'
import { DateTimePicker } from '@/components/date-time-picker'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { continuousCallApi } from './api'
import { leadsApi, yunkeApi } from '../leads/api'
import {
  IntentionLevel,
  FollowupMethod,
  FollowupResult,
  LeadStatus,
} from '../leads/types'
import type { ContinuousCallLead, ContinuousCallStats } from './types'
import type { LeadFollowupCreate } from '../leads/types'
import { LeadDetailTabs } from '../leads/components/detail/lead-detail-tabs'
import { IntentionLevelBadge } from '../leads/components/status-badges'
import { CallTimer } from './components/call-timer'


// 跟进结果分组配置
type FollowupResultGroup = 'continuing' | 'releaseToPool' | 'statusOnly'

interface FollowupResultGroupConfig {
  key: FollowupResultGroup
  title: string
  description: string
  colorClass: string
}

interface FollowupResultOption {
  value: string
  label: string
  icon: LucideIcon
  colorClass: string
  group: FollowupResultGroup
}

const followupResultGroupConfig: FollowupResultGroupConfig[] = [
  {
    key: 'continuing',
    title: '📗 继续跟进',
    description: '状态改为跟进中',
    colorClass: 'text-green-600',
  },
  {
    key: 'releaseToPool',
    title: '📙 释放公海',
    description: '状态改为已回访并释放',
    colorClass: 'text-orange-500',
  },
  {
    key: 'statusOnly',
    title: '📘 仅改状态',
    description: '状态改为已回访',
    colorClass: 'text-blue-500',
  },
]

const followupResultOptions: FollowupResultOption[] = [
  // 继续跟进组
  { value: 'can_continue', label: '可持续跟进', icon: TrendingUp, colorClass: 'text-green-600', group: 'continuing' },
  { value: 'appointment_scheduled', label: '已预约到访', icon: CalendarCheck, colorClass: 'text-green-600', group: 'continuing' },
  // 释放公海组
  { value: 'wrong_number', label: '空错号', icon: PhoneOff, colorClass: 'text-orange-500', group: 'releaseToPool' },
  { value: 'no_child', label: '没孩子', icon: UserX, colorClass: 'text-orange-500', group: 'releaseToPool' },
  { value: 'age_mismatch', label: '年龄不符', icon: Clock, colorClass: 'text-orange-500', group: 'releaseToPool' },
  { value: 'no_need', label: '不需要', icon: Ban, colorClass: 'text-orange-500', group: 'releaseToPool' },
  { value: 'hung_up', label: '秒挂', icon: PhoneMissed, colorClass: 'text-orange-500', group: 'releaseToPool' },
  { value: 'student', label: '学员', icon: GraduationCap, colorClass: 'text-orange-500', group: 'releaseToPool' },
  // 仅改状态组
  { value: 'not_connected', label: '未接通', icon: PhoneMissed, colorClass: 'text-blue-500', group: 'statusOnly' },
]

// 保留旧结构兼容 saveAndNext 逻辑
const followupResultGroups = {
  continuing: followupResultOptions.filter(o => o.group === 'continuing'),
  releaseToPool: followupResultOptions.filter(o => o.group === 'releaseToPool'),
  statusOnly: followupResultOptions.filter(o => o.group === 'statusOnly'),
}

// 跟进结果选择器组件
interface FollowupResultSelectProps {
  value: string
  onChange: (value: string) => void
}

function FollowupResultSelect({ value, onChange }: FollowupResultSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedOption = followupResultOptions.find(o => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <selectedOption.icon className={cn("h-4 w-4", selectedOption.colorClass)} />
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">选择跟进结果...</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandList>
            {followupResultGroupConfig.map((group, groupIndex) => (
              <div key={group.key}>
                {groupIndex > 0 && <CommandSeparator />}
                <CommandGroup
                  heading={
                    <span className={cn("flex items-center gap-1", group.colorClass)}>
                      {group.title}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({group.description})
                      </span>
                    </span>
                  }
                >
                  {followupResultOptions
                    .filter(o => o.group === group.key)
                    .map(option => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => {
                          onChange(option.value)
                          setOpen(false)
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <option.icon className={cn("h-4 w-4", option.colorClass)} />
                        <span>{option.label}</span>
                        {value === option.value && (
                          <CheckIcon className="ml-auto h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// 意向等级选项
const intentionLevelOptions = [
  { label: '高意向', value: IntentionLevel.HIGH },
  { label: '中意向', value: IntentionLevel.MEDIUM },
  { label: '低意向', value: IntentionLevel.LOW },
]

// 跟进结果到API枚举的映射
const resultMapping: Record<string, FollowupResult> = {
  can_continue: FollowupResult.CAN_CONTINUE,
  not_connected: FollowupResult.NOT_CONNECTED,
  busy: FollowupResult.TEMPORARILY_UNAVAILABLE,
  rejected: FollowupResult.HUNG_UP,
  wechat_added: FollowupResult.WECHAT_ADDED,
  appointment_scheduled: FollowupResult.APPOINTMENT_SCHEDULED,
  no_need: FollowupResult.NO_NEED,
  wrong_number: FollowupResult.WRONG_NUMBER,
  no_child: FollowupResult.NO_CHILD,
  age_mismatch: FollowupResult.AGE_MISMATCH,
  hung_up: FollowupResult.HUNG_UP,
  student: FollowupResult.OTHER,
  other: FollowupResult.OTHER,
}

export function ContinuousCallPage() {
  useDocumentTitle('连续外呼')
  const queryClient = useQueryClient()
  const { setOpen: setSidebarOpen } = useSidebar()

  // 状态
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [currentLead, setCurrentLead] = useState<ContinuousCallLead | null>(null)
  const [callDrawerVisible, setCallDrawerVisible] = useState(false)
  const [currentCallId, setCurrentCallId] = useState('')
  const [callStartTime, setCallStartTime] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [hangingUp, setHangingUp] = useState(false)
  const [dialing, setDialing] = useState(false)

  // 跟进表单状态
  const [followupResult, setFollowupResult] = useState('')
  const [intentionLevel, setIntentionLevel] = useState<IntentionLevel>(IntentionLevel.MEDIUM)
  const [wechatAdded, setWechatAdded] = useState(false)
  const [followupContent, setFollowupContent] = useState('')
  const [nextFollowupAt, setNextFollowupAt] = useState<string>('')
  const [sendToDingding, setSendToDingding] = useState(false)
  const [releaseToPool, setReleaseToPool] = useState(false)

  // 获取统计数据
  const { data: statsData } = useQuery({
    queryKey: ['continuous-call-stats'],
    queryFn: async () => {
      const res = await continuousCallApi.getStats()
      if (res.success) {
        return res.data
      }
      throw new Error(res.message || '获取统计数据失败')
    },
  })

  // 获取线索列表
  const {
    data: leadsData,
    isLoading,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ['continuous-call-leads', selectedChannelId],
    queryFn: async () => {
      const res = await continuousCallApi.getLeads({
        channel_id: selectedChannelId || undefined,
        page: 1,
        page_size: 50,
      })
      if (res.success) {
        return res.data
      }
      throw new Error(res.message || '获取线索列表失败')
    },
  })

  // 线索列表
  const leads = useMemo(() => leadsData?.items || [], [leadsData?.items])

  // 自动选择第一个线索
  useEffect(() => {
    if (leads.length > 0 && !currentLead) {
      selectLead(leads[0])
    }
  }, [leads, currentLead])

  // 通话面板激活时自动收缩侧边栏
  useEffect(() => {
    if (callDrawerVisible) {
      setSidebarOpen(false)
    }
  }, [callDrawerVisible, setSidebarOpen])

  // 选择线索
  const selectLead = useCallback((lead: ContinuousCallLead) => {
    setCurrentLead(lead)
    setFollowupResult('')
    setFollowupContent('')
    setWechatAdded(false)
    setIntentionLevel(
      (lead.intention_level as IntentionLevel) || IntentionLevel.MEDIUM
    )
  }, [])


  // 发起外呼
  const startCall = useCallback(async () => {
    const phone = currentLead?.parent_phone || currentLead?.phone
    if (!phone) {
      toast.error('当前线索没有手机号，无法外呼')
      return
    }

    try {
      setDialing(true)
      const res = await yunkeApi.dialPhone(phone)
      if (res.success && res.data) {
        setCurrentCallId(res.data.call_id)
        setCallStartTime(Date.now())
        setCallDrawerVisible(true)
        toast.success('外呼发起成功')
      } else {
        toast.error(res.message || '外呼失败')
      }
    } catch (error: any) {
      toast.error(error?.message || '外呼失败')
    } finally {
      setDialing(false)
    }
  }, [currentLead])

  // 挂断通话
  const hangUpCall = useCallback(async () => {
    if (!currentCallId) {
      toast.error('没有活跃的通话')
      return
    }

    try {
      setHangingUp(true)
      const res = await yunkeApi.hangUpCall(currentCallId)
      if (res.success) {
        toast.success('通话已挂断')
        closeCallDrawer()
      } else {
        toast.error(res.message || '挂断失败')
      }
    } catch (error: any) {
      toast.error(error?.message || '挂断失败')
    } finally {
      setHangingUp(false)
    }
  }, [currentCallId])

  // 关闭外呼面板
  const closeCallDrawer = useCallback(() => {
    setCallDrawerVisible(false)
    setCurrentCallId('')
    setCallStartTime(null)
  }, [])

  // 判断跟进结果属于哪个分组
  const getResultGroup = (result: string) => {
    if (
      followupResultGroups.continuing.find((item) => item.value === result)
    ) {
      return 'continuing'
    }
    if (
      followupResultGroups.releaseToPool.find((item) => item.value === result)
    ) {
      return 'releaseToPool'
    }
    if (followupResultGroups.statusOnly.find((item) => item.value === result)) {
      return 'statusOnly'
    }
    return null
  }

  // 保存并下一个
  const saveAndNext = useCallback(async () => {
    if (!followupResult) {
      toast.warning('请选择跟进结果')
      return
    }

    if (!currentLead) {
      toast.warning('未选中线索')
      return
    }

    try {
      setSaving(true)

      // 自动挂断当前通话
      if (currentCallId && callDrawerVisible) {
        try {
          await yunkeApi.hangUpCall(currentCallId)
          closeCallDrawer()
        } catch (error) {
          console.warn('挂断通话失败:', error)
        }
      }

      const resultGroup = getResultGroup(followupResult)
      const currentLeadId = currentLead.id

      // 准备跟进记录数据
      const data: LeadFollowupCreate = {
        followup_at: new Date().toISOString(),
        method: FollowupMethod.PHONE,
        result: resultMapping[followupResult] || FollowupResult.OTHER,
        content: followupContent || undefined,
        result_remark: followupContent || undefined,
        next_followup_at: nextFollowupAt || undefined,
      }

      // 保存跟进记录
      const res = await leadsApi.addLeadFollowup(currentLeadId, data)

      if (res.success) {
        // 特殊处理：如果是"学员"，先更新状态为已支付
        if (followupResult === 'student') {
          try {
            await leadsApi.updateLead(currentLeadId, {
              status: LeadStatus.PAID,
            })
          } catch (error) {
            console.error('更新线索状态失败：', error)
          }
        }

        // 如果勾选了释放到公海
        if (releaseToPool) {
          const releaseReason = followupResult === 'student' ? 'MANUAL_RELEASE' : 'INVALID_LEAD'
          const selectedOption = followupResultOptions.find(o => o.value === followupResult)
          const releaseRemark = followupResult === 'student'
            ? '已转为学员，防止重复触达'
            : `跟进结果：${selectedOption?.label || followupResult}`

          try {
            await leadsApi.batchReleaseLeads({
              lead_ids: [currentLeadId],
              reason: releaseReason,
              remark: releaseRemark,
            })
            toast.success('跟进记录已保存，线索已释放到公海')
          } catch (error) {
            toast.warning('跟进记录已保存，但释放到公海失败')
          }
        } else {
          // 根据分组显示不同的提示
          if (resultGroup === 'continuing') {
            toast.success('跟进记录已保存，线索状态已更新为跟进中')
          } else if (resultGroup === 'statusOnly') {
            toast.success('跟进记录已保存，线索状态已更新为已回访')
          } else {
            toast.success('跟进记录保存成功')
          }
        }

        // 刷新列表并选择下一个
        await refetchLeads()

        // 重置表单
        resetForm()
      } else {
        toast.error(res.message || '保存失败')
      }
    } catch (error: any) {
      toast.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }, [
    followupResult,
    currentLead,
    currentCallId,
    callDrawerVisible,
    followupContent,
    releaseToPool,
    closeCallDrawer,
    refetchLeads,
  ])

  // 重置表单
  const resetForm = useCallback(() => {
    setFollowupResult('')
    setFollowupContent('')
    setWechatAdded(false)
    setNextFollowupAt('')
    setSendToDingding(false)
    setReleaseToPool(false)
    if (currentLead) {
      setIntentionLevel(
        (currentLead.intention_level as IntentionLevel) || IntentionLevel.MEDIUM
      )
    }
  }, [currentLead])

  // 快捷编辑字段更新
  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      if (!currentLead) throw new Error('线索不存在')

      const updateData: Record<string, unknown> = {}
      if (field === 'age') {
        updateData[field] = value ? parseInt(value, 10) : null
      } else if (field === 'course_interests') {
        updateData[field] = value ? value.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
      } else {
        updateData[field] = value || null
      }

      const response = await leadsApi.updateLead(currentLead.id, updateData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', currentLead?.id] })
      queryClient.invalidateQueries({ queryKey: ['continuous-call-leads'] })
    },
  })

  const handleFieldUpdate = useCallback(async (field: string, value: string) => {
    await updateFieldMutation.mutateAsync({ field, value })
  }, [updateFieldMutation])

  // 键盘事件处理 - 空格键外呼
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const phone = currentLead?.parent_phone || currentLead?.phone
      // 添加 dialing 检查，防止重复触发
      if (event.code === 'Space' && phone && !callDrawerVisible && !dialing) {
        const target = event.target as HTMLElement
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
        ) {
          return
        }
        event.preventDefault()
        startCall()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentLead, callDrawerVisible, startCall, dialing])

  // 渲染线索详情卡片骨架屏
  const renderLeadDetailSkeleton = () => {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 space-y-4 p-4">
          {/* 基本信息骨架 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          {/* 分隔线 */}
          <Skeleton className="h-px w-full" />
          {/* 跟进记录骨架 */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-20" />
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 渲染线索详情卡片
  const renderLeadDetail = () => {
    // 加载中显示骨架屏
    if (isLoading) {
      return renderLeadDetailSkeleton()
    }

    if (!currentLead) {
      return (
        <Card className="h-full">
          <CardContent className="flex h-full flex-col items-center justify-center">
            <Phone className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              使用导航栏的控件选择渠道，选择线索后按空格键即可外呼
            </p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-3 shrink-0 space-y-3">
          {/* 外呼操作区：渠道选择 + 外呼按钮 */}
          {!callDrawerVisible && (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">外呼操作</span>
              </div>
              <div className="flex items-center gap-3">
                {/* 渠道选择器 */}
                {statsData && (
                  <Select
                    value={selectedChannelId || 'all'}
                    onValueChange={(value) =>
                      setSelectedChannelId(value === 'all' ? null : value)
                    }
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="选择渠道" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        全部渠道 ({statsData.total_leads})
                      </SelectItem>
                      {statsData.channels.map((channel) => (
                        <SelectItem key={channel.channel_id} value={channel.channel_id}>
                          {channel.channel_name} ({channel.lead_count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {/* 外呼按钮 */}
                <Button
                  onClick={startCall}
                  disabled={!currentLead.parent_phone || dialing}
                  className="h-9"
                >
                  {dialing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Phone className="mr-2 h-4 w-4" />
                  )}
                  {dialing ? '正在呼叫...' : '按空格键外呼'}
                </Button>
              </div>
            </div>
          )}
          {/* 线索标题 */}
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              {currentLead.child_name || '未填写'}
            </CardTitle>
            {currentLead.intention_level && (
              <IntentionLevelBadge
                level={currentLead.intention_level as IntentionLevel}
              />
            )}
          </div>
        </CardHeader>
        <div className="flex-1 min-h-0">
          <LeadDetailTabs
            leadId={currentLead.id}
            useScrollArea={true}
            height="h-full"
            onFieldUpdate={handleFieldUpdate}
          />
        </div>
      </Card>
    )
  }

  // 渲染外呼控制面板
  const renderCallPanel = () => {
    if (!callDrawerVisible) return null

    return (
      <Card className="h-full flex flex-col overflow-hidden">
        {/* 固定顶部：通话状态栏 */}
        <CardHeader className="border-b pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Phone className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <span className="font-medium">通话中</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">通话时长</p>
                <CallTimer startTime={callStartTime} className="text-lg font-bold tabular-nums" />
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={hangUpCall}
                disabled={hangingUp}
              >
                挂断
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* 可滚动中间区域：表单内容 */}
        <CardContent className="flex-1 overflow-auto min-h-0 space-y-3 p-4">
          {/* 区块1: 跟进结果 */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <Label className="mb-2 block text-sm font-medium">跟进结果</Label>
            <FollowupResultSelect
              value={followupResult}
              onChange={setFollowupResult}
            />
          </div>

          {/* 区块2: 意向与回访 */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div>
              <Label className="mb-2 block text-sm font-medium">意向等级</Label>
              <RadioGroup
                value={intentionLevel}
                onValueChange={(value) =>
                  setIntentionLevel(value as IntentionLevel)
                }
                className="flex gap-4"
              >
                {intentionLevelOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="text-sm">{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">下次回访时间</Label>
              <DateTimePicker
                value={nextFollowupAt}
                onChange={(val) => setNextFollowupAt(val || '')}
                placeholder="选择时间"
                showQuickButtons={true}
              />
            </div>
          </div>

          {/* 区块3: 释放公海选项 */}
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20 p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="release-to-pool"
                checked={releaseToPool}
                onCheckedChange={(checked) => setReleaseToPool(checked as boolean)}
              />
              <Label htmlFor="release-to-pool" className="text-sm font-medium text-orange-700 dark:text-orange-400">
                释放该线索到公海
              </Label>
            </div>
            {releaseToPool && (
              <p className="mt-1.5 text-xs text-orange-600/80 dark:text-orange-500/80 ml-6">
                保存后线索将被释放到公海池，其他顾问可领取
              </p>
            )}
          </div>

          {/* 区块4: 跟进内容 */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wechat-added"
                  checked={wechatAdded}
                  onCheckedChange={(checked) => setWechatAdded(checked as boolean)}
                />
                <Label htmlFor="wechat-added" className="text-sm">已添加微信</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-dingding"
                  checked={sendToDingding}
                  onCheckedChange={(checked) => setSendToDingding(checked as boolean)}
                />
                <Label htmlFor="send-dingding" className="flex items-center gap-1 text-sm">
                  <Send className="h-3 w-3" />
                  发送到钉钉群
                </Label>
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">跟进内容</Label>
              <Textarea
                placeholder="输入跟进内容..."
                value={followupContent}
                onChange={(e) => setFollowupContent(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </CardContent>

        {/* 固定底部：操作按钮 */}
        <CardFooter className="border-t pt-3 pb-3 shrink-0 bg-background">
          <div className="flex w-full justify-between">
            <Button variant="outline" size="sm" onClick={closeCallDrawer}>
              <X className="mr-1.5 h-4 w-4" />
              关闭
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                重置
              </Button>
              <Button
                size="sm"
                onClick={saveAndNext}
                disabled={!followupResult || saving}
              >
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                保存并下一个
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    )
  }

  return (
    <>
      <Header fixed>
        <h1 className="text-lg font-semibold">快捷外呼</h1>
      </Header>

      <Main fixed className="min-h-0">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {callDrawerVisible ? (
            <ResizablePanelGroup orientation="horizontal" className="min-h-0 h-full">
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full overflow-hidden p-2">{renderLeadDetail()}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full overflow-hidden p-2">{renderCallPanel()}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="h-full w-full overflow-hidden p-2">{renderLeadDetail()}</div>
          )}
        </div>
      </Main>
    </>
  )
}
