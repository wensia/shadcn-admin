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
import { format, addDays, setHours, setMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { Calendar } from '@/components/ui/calendar'
import { TimePickerWheel } from '@/components/ui/time-picker-wheel'
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
import { visitScheduleApi } from '../visit-schedule/api'
import {
  IntentionLevel,
  FollowupMethod,
  FollowupResult,
  LeadStatus,
} from '../leads/types'
import type { ContinuousCallLead, ContinuousCallStats } from './types'
import type { LeadFollowupCreate } from '../leads/types'
import { LeadDetailTabs } from '../leads/components/detail/lead-detail-tabs'
import { IntentionLevelBadge, LeadStatusBadge } from '../leads/components/status-badges'
import { CallTimer } from './components/call-timer'


// 跟进结果分组配置 - 使用 Anthropic 品牌色
type FollowupResultGroup = 'continuing' | 'releaseToPool' | 'statusOnly'

// Anthropic 品牌色
const BRAND_COLORS = {
  green: '#788c5d',   // 继续跟进
  orange: '#d97757',  // 释放公海
  blue: '#6a9bcc',    // 仅改状态
} as const

interface FollowupResultGroupConfig {
  key: FollowupResultGroup
  title: string
  description: string
  color: string
}

interface FollowupResultOption {
  value: string
  label: string
  icon: LucideIcon
  color: string
  group: FollowupResultGroup
}

const followupResultGroupConfig: FollowupResultGroupConfig[] = [
  {
    key: 'statusOnly',
    title: '跟进结果',
    description: '选择本次跟进结果',
    color: BRAND_COLORS.blue,
  },
]

const followupResultOptions: FollowupResultOption[] = [
  // 所有跟进结果选项（不再分组）
  { value: 'can_continue', label: '可持续跟进', icon: TrendingUp, color: BRAND_COLORS.green, group: 'statusOnly' },
  { value: 'appointment_scheduled', label: '已预约到访', icon: CalendarCheck, color: BRAND_COLORS.green, group: 'statusOnly' },
  { value: 'not_connected', label: '未接通', icon: PhoneMissed, color: BRAND_COLORS.blue, group: 'statusOnly' },
  { value: 'wrong_number', label: '空错号', icon: PhoneOff, color: BRAND_COLORS.orange, group: 'statusOnly' },
  { value: 'no_child', label: '没孩子', icon: UserX, color: BRAND_COLORS.orange, group: 'statusOnly' },
  { value: 'age_mismatch', label: '年龄不符', icon: Clock, color: BRAND_COLORS.orange, group: 'statusOnly' },
  { value: 'no_need', label: '不需要', icon: Ban, color: BRAND_COLORS.orange, group: 'statusOnly' },
  { value: 'hung_up', label: '秒挂', icon: PhoneMissed, color: BRAND_COLORS.orange, group: 'statusOnly' },
  { value: 'student', label: '学员', icon: GraduationCap, color: BRAND_COLORS.orange, group: 'statusOnly' },
]

// 保留旧结构兼容 saveAndNext 逻辑（根据选项值判断类型）
const followupResultGroups = {
  continuing: followupResultOptions.filter(o => ['can_continue', 'appointment_scheduled'].includes(o.value)),
  releaseToPool: followupResultOptions.filter(o => ['wrong_number', 'no_child', 'age_mismatch', 'no_need', 'hung_up', 'student'].includes(o.value)),
  statusOnly: followupResultOptions.filter(o => ['not_connected'].includes(o.value)),
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
          className={cn(
            "w-full justify-center relative transition-all duration-200",
            selectedOption && "border-2 font-medium shadow-sm"
          )}
          style={selectedOption ? {
            borderColor: selectedOption.color,
            backgroundColor: selectedOption.color + '15',
          } : undefined}
        >
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <selectedOption.icon className="h-4 w-4" style={{ color: selectedOption.color }} />
              <span style={{ color: selectedOption.color }}>{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">选择跟进结果...</span>
          )}
          <ChevronDown
            className="absolute right-3 h-4 w-4 shrink-0 opacity-50"
            style={selectedOption ? { color: selectedOption.color } : undefined}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-2 gap-2">
          {followupResultOptions.map(option => {
            const isSelected = value === option.value
            return (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start gap-2 text-xs transition-all duration-200",
                  "hover:scale-105 hover:shadow-md",
                  isSelected && "ring-2 ring-offset-1"
                )}
                style={{
                  color: isSelected ? 'white' : option.color,
                  backgroundColor: isSelected ? option.color : 'transparent',
                  borderColor: option.color,
                  ['--tw-ring-color' as string]: option.color,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = option.color + '20'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <option.icon className="h-3.5 w-3.5" />
                {option.label}
              </Button>
            )
          })}
        </div>
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
  const [nextFollowupDate, setNextFollowupDate] = useState<Date | undefined>(undefined)
  const [nextFollowupTime, setNextFollowupTime] = useState<string>('10:00')
  const [sendToDingding, setSendToDingding] = useState(false)
  const [releaseToPool, setReleaseToPool] = useState(false)
  // 预约到访时间（仅当选择已预约到访时使用）
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined)
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00')
  // 诺到理由（仅当选择已预约到访时使用）
  const [appointmentReason, setAppointmentReason] = useState<string>('')

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

    // 如果选择了预约到访，必须选择预约时间和诺到理由
    if (followupResult === 'appointment_scheduled') {
      if (!appointmentDate) {
        toast.warning('请选择预约到访时间')
        return
      }
      if (!appointmentReason.trim()) {
        toast.warning('请填写诺到理由')
        return
      }
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

      // 组合下次回访日期时间
      let nextFollowupAtIso: string | undefined = undefined
      if (nextFollowupDate) {
        const [hours, minutes] = nextFollowupTime.split(':').map(Number)
        const combinedDate = setMinutes(setHours(nextFollowupDate, hours), minutes)
        nextFollowupAtIso = combinedDate.toISOString()
      }

      // 组合预约到访时间内容
      let finalFollowupContent = followupContent || ''
      if (followupResult === 'appointment_scheduled' && appointmentDate) {
        const [aHours, aMinutes] = appointmentTime.split(':').map(Number)
        const appointmentDateTime = setMinutes(setHours(appointmentDate, aHours), aMinutes)
        const appointmentStr = format(appointmentDateTime, 'yyyy-MM-dd HH:mm', { locale: zhCN })
        const appointmentInfo = `预约到访时间：${appointmentStr}\n诺到理由：${appointmentReason.trim()}`
        finalFollowupContent = finalFollowupContent
          ? `${finalFollowupContent}\n${appointmentInfo}`
          : appointmentInfo
      }

      // 准备跟进记录数据
      const data: LeadFollowupCreate = {
        followup_at: new Date().toISOString(),
        method: FollowupMethod.PHONE,
        result: resultMapping[followupResult] || FollowupResult.OTHER,
        content: finalFollowupContent || undefined,
        result_remark: finalFollowupContent || undefined,
        next_followup_at: nextFollowupAtIso,
      }

      // 保存跟进记录
      const res = await leadsApi.addLeadFollowup(currentLeadId, data)

      if (res.success) {
        // 如果是预约到访，创建 VisitSchedule 记录
        if (followupResult === 'appointment_scheduled' && appointmentDate) {
          try {
            const [aHours, aMinutes] = appointmentTime.split(':').map(Number)
            const visitDate = format(appointmentDate, 'yyyy-MM-dd')
            const visitTime = `${String(aHours).padStart(2, '0')}:${String(aMinutes).padStart(2, '0')}:00`

            await visitScheduleApi.createVisitSchedule({
              lead_id: currentLeadId,
              visit_date: visitDate,
              visit_time: visitTime,
              advisor_id: currentLead.advisor_id || null,
              course_ids: [],
              status: 'scheduled',
              remark: finalFollowupContent || undefined,
            })
          } catch (error) {
            console.error('创建预约到访记录失败:', error)
            toast.warning('跟进记录已保存，但创建预约到访记录失败')
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
    nextFollowupDate,
    nextFollowupTime,
    releaseToPool,
    appointmentDate,
    appointmentTime,
    appointmentReason,
    closeCallDrawer,
    refetchLeads,
  ])

  // 重置表单
  const resetForm = useCallback(() => {
    setFollowupResult('')
    setFollowupContent('')
    setWechatAdded(false)
    setNextFollowupDate(undefined)
    setNextFollowupTime('10:00')
    setSendToDingding(false)
    setReleaseToPool(false)
    setAppointmentDate(undefined)
    setAppointmentTime('10:00')
    setAppointmentReason('')
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
        {/* 外呼操作区：线索名称 + 状态 + 渠道选择 + 外呼按钮 */}
        {!callDrawerVisible && (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 mx-4 mt-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currentLead.child_name || '未填写'}</span>
              {currentLead.status && (
                <LeadStatusBadge status={currentLead.status as LeadStatus} />
              )}
              {currentLead.intention_level && (
                <IntentionLevelBadge level={currentLead.intention_level as IntentionLevel} />
              )}
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
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
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

  // 渲染通话状态卡片
  const renderCallStatusCard = () => {
    if (!callDrawerVisible) return null

    return (
      <Card className="shrink-0">
        <CardContent className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Phone className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <span className="text-sm font-medium">通话中</span>
            <span className="text-muted-foreground">·</span>
            <CallTimer startTime={callStartTime} className="text-sm font-semibold tabular-nums" />
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 px-6 text-xs"
            onClick={hangUpCall}
            disabled={hangingUp}
          >
            挂断
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 渲染跟进结果标记卡片
  const renderFollowupFormCard = () => {
    if (!callDrawerVisible) return null

    return (
      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        <CardHeader className="px-4 py-3 shrink-0">
          <CardTitle className="text-sm font-medium">跟进结果标记</CardTitle>
        </CardHeader>

        {/* 可滚动中间区域：表单内容 */}
        <CardContent className="flex-1 overflow-auto min-h-0 px-4 py-0">
          {/* 跟进结果 */}
          <div className="flex items-center">
            <Label className="text-xs font-medium text-red-500 whitespace-nowrap w-16 shrink-0">跟进结果</Label>
            <div className="flex-1">
              <FollowupResultSelect
                value={followupResult}
                onChange={setFollowupResult}
              />
            </div>
          </div>

          <div className="border-t my-3" />

          {/* 意向等级 */}
          <div className="flex items-center">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap w-16 shrink-0">意向等级</Label>
            <RadioGroup
              value={intentionLevel}
              onValueChange={(value) => setIntentionLevel(value as IntentionLevel)}
              className="flex-1 flex justify-between"
            >
              {intentionLevelOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-1.5">
                  <RadioGroupItem value={option.value} id={option.value} className="h-3.5 w-3.5" />
                  <Label htmlFor={option.value} className="text-sm cursor-pointer">{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="border-t my-3" />

          {/* 下次回访时间 */}
          <div className="flex items-center">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap w-16 shrink-0">下次回访</Label>
            <div className="flex-1 flex items-center gap-2">
              {/* 日期选择器 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-7 px-2 text-xs justify-center font-normal min-w-[90px]",
                      !nextFollowupDate && "text-muted-foreground"
                    )}
                  >
                    {nextFollowupDate ? format(nextFollowupDate, 'MM月dd日', { locale: zhCN }) : '选择日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={nextFollowupDate}
                    onSelect={setNextFollowupDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    locale={zhCN}
                  />
                </PopoverContent>
              </Popover>
              {/* 时间选择器 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-7 px-2 text-xs font-normal min-w-[70px]",
                      !nextFollowupDate && "text-muted-foreground"
                    )}
                  >
                    {nextFollowupDate ? nextFollowupTime : '选择时间'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <TimePickerWheel
                    value={nextFollowupTime}
                    onChange={setNextFollowupTime}
                  />
                </PopoverContent>
              </Popover>
              {/* 快捷按钮：今天、明天 */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setNextFollowupDate(new Date())
                  setNextFollowupTime('18:00')
                }}
              >
                今天
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setNextFollowupDate(addDays(new Date(), 1))
                  setNextFollowupTime('10:00')
                }}
              >
                明天
              </Button>
            </div>
          </div>

          {/* 预约到访时间（仅当选择已预约到访时显示） */}
          {followupResult === 'appointment_scheduled' && (
            <>
              <div className="border-t my-3" />
              <div className="flex items-center">
                <Label className="text-xs font-medium text-red-500 whitespace-nowrap w-16 shrink-0">
                  预约时间
                </Label>
                <div className="flex-1 flex items-center gap-2">
                  {/* 预约日期选择器 */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-7 px-2 text-xs justify-center font-normal min-w-[90px]",
                          !appointmentDate && "text-muted-foreground"
                        )}
                      >
                        {appointmentDate ? format(appointmentDate, 'MM月dd日', { locale: zhCN }) : '选择日期'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={appointmentDate}
                        onSelect={setAppointmentDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        locale={zhCN}
                      />
                    </PopoverContent>
                  </Popover>
                  {/* 预约时间选择器 */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-7 px-2 text-xs font-normal min-w-[70px]",
                          !appointmentDate && "text-muted-foreground"
                        )}
                      >
                        {appointmentDate ? appointmentTime : '选择时间'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <TimePickerWheel
                        value={appointmentTime}
                        onChange={setAppointmentTime}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {/* 诺到理由 */}
              <div className="flex items-start mt-3">
                <Label className="text-xs font-medium text-red-500 whitespace-nowrap w-16 shrink-0 pt-2">
                  诺到理由
                </Label>
                <Textarea
                  placeholder="请输入诺到理由..."
                  value={appointmentReason}
                  onChange={(e) => {
                    setAppointmentReason(e.target.value)
                    // 自动调整高度
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  rows={1}
                  className="flex-1 resize-none min-h-[32px] py-1.5 text-sm"
                  style={{ overflow: 'hidden' }}
                />
              </div>
            </>
          )}

          <div className="border-t my-3" />

          {/* 释放公海 + 微信/钉钉 - 使用 Anthropic 品牌色 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Checkbox
                id="release-to-pool"
                checked={releaseToPool}
                onCheckedChange={(checked) => setReleaseToPool(checked as boolean)}
                className="h-4 w-4 rounded-sm border-2 data-[state=checked]:text-white"
                style={{
                  borderColor: '#d97757',
                  backgroundColor: releaseToPool ? '#d97757' : 'transparent'
                }}
              />
              <Label htmlFor="release-to-pool" className="text-sm cursor-pointer" style={{ color: '#d97757' }}>
                释放到公海
              </Label>
            </div>
            <div className="flex items-center space-x-1.5">
              <Checkbox
                id="wechat-added"
                checked={wechatAdded}
                onCheckedChange={(checked) => setWechatAdded(checked as boolean)}
                className="h-4 w-4 rounded-sm border-2 data-[state=checked]:text-white"
                style={{
                  borderColor: '#6a9bcc',
                  backgroundColor: wechatAdded ? '#6a9bcc' : 'transparent'
                }}
              />
              <Label htmlFor="wechat-added" className="text-sm cursor-pointer" style={{ color: '#6a9bcc' }}>
                已加微信
              </Label>
            </div>
            <div className="flex items-center space-x-1.5">
              <Checkbox
                id="send-dingding"
                checked={sendToDingding}
                onCheckedChange={(checked) => setSendToDingding(checked as boolean)}
                className="h-4 w-4 rounded-sm border-2 data-[state=checked]:text-white"
                style={{
                  borderColor: '#788c5d',
                  backgroundColor: sendToDingding ? '#788c5d' : 'transparent'
                }}
              />
              <Label htmlFor="send-dingding" className="text-sm cursor-pointer flex items-center gap-1" style={{ color: '#788c5d' }}>
                <Send className="h-3 w-3" />
                发钉钉
              </Label>
            </div>
          </div>

          <div className="border-t my-3" />

          {/* 跟进内容 */}
          <div className="flex items-start">
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap w-16 shrink-0 pt-2">跟进内容</Label>
            <Textarea
              placeholder="输入跟进内容..."
              value={followupContent}
              onChange={(e) => setFollowupContent(e.target.value)}
              rows={2}
              className="flex-1 resize-none"
            />
          </div>
        </CardContent>

        {/* 固定底部：操作按钮 */}
        <CardFooter className="flex items-center justify-between px-4 py-2 border-t shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={closeCallDrawer}>
            <X className="mr-1 h-3.5 w-3.5" />
            关闭
          </Button>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetForm}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              重置
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={saveAndNext}
              disabled={!followupResult || saving}
            >
              {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              保存并下一个
            </Button>
          </div>
        </CardFooter>
      </Card>
    )
  }

  // 渲染外呼控制面板（包含两个卡片）
  const renderCallPanel = () => {
    if (!callDrawerVisible) return null

    return (
      <div className="h-full flex flex-col gap-2">
        {renderCallStatusCard()}
        {renderFollowupFormCard()}
      </div>
    )
  }

  return (
    <>
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
