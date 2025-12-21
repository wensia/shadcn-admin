/**
 * 快捷外呼页面
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Phone, X, RotateCcw, ChevronRight, User } from 'lucide-react'
import { toast } from 'sonner'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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

import { continuousCallApi } from './api'
import { leadsApi, yunkeApi } from '../leads/api'
import {
  IntentionLevel,
  FollowupMethod,
  FollowupResult,
  LeadStatus,
  intentionLevelLabels,
  followupResultLabels,
} from '../leads/types'
import type { ContinuousCallLead, ContinuousCallStats } from './types'
import type { LeadFollowupCreate } from '../leads/types'
import { LeadDetailSheet } from '../leads/components/lead-detail-sheet'

// 跟进结果分组
const followupResultGroups = {
  continuing: [
    { label: '可持续跟进', value: 'can_continue' },
    { label: '已预约到访', value: 'appointment_scheduled' },
  ],
  releaseToPool: [
    { label: '空错号', value: 'wrong_number' },
    { label: '没孩子', value: 'no_child' },
    { label: '年龄不符', value: 'age_mismatch' },
    { label: '不需要', value: 'no_need' },
    { label: '秒挂', value: 'hung_up' },
    { label: '学员', value: 'student' },
  ],
  statusOnly: [{ label: '未接通', value: 'not_connected' }],
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
  const queryClient = useQueryClient()
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 状态
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [currentLead, setCurrentLead] = useState<ContinuousCallLead | null>(null)
  const [callDrawerVisible, setCallDrawerVisible] = useState(false)
  const [currentCallId, setCurrentCallId] = useState('')
  const [callDuration, setCallDuration] = useState('00:00')
  const [callStartTime, setCallStartTime] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [hangingUp, setHangingUp] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // 跟进表单状态
  const [followupResult, setFollowupResult] = useState('')
  const [intentionLevel, setIntentionLevel] = useState<IntentionLevel>(IntentionLevel.MEDIUM)
  const [wechatAdded, setWechatAdded] = useState(false)
  const [followupContent, setFollowupContent] = useState('')

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

  // 开始通话计时
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
    }
    callTimerRef.current = setInterval(() => {
      if (callStartTime) {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000)
        const minutes = Math.floor(elapsed / 60)
        const seconds = elapsed % 60
        setCallDuration(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      }
    }, 1000)
  }, [callStartTime])

  // 启动通话计时器
  useEffect(() => {
    if (callStartTime) {
      startCallTimer()
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [callStartTime, startCallTimer])

  // 发起外呼
  const startCall = useCallback(async () => {
    const phone = currentLead?.parent_phone || currentLead?.phone
    if (!phone) {
      toast.error('当前线索没有手机号，无法外呼')
      return
    }

    try {
      const res = await yunkeApi.dialPhone(phone)
      if (res.success && res.data) {
        setCurrentCallId(res.data.call_id)
        setCallStartTime(Date.now())
        setCallDrawerVisible(true)
        setCallDuration('00:00')
        toast.success('外呼发起成功')
      } else {
        toast.error(res.message || '外呼失败')
      }
    } catch (error: any) {
      toast.error(error?.message || '外呼失败')
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
    setCallDuration('00:00')
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
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
      }

      // 保存跟进记录
      const res = await leadsApi.addLeadFollowup(currentLeadId, data)

      if (res.success) {
        // 根据分组执行不同操作
        if (resultGroup === 'continuing') {
          toast.success('跟进记录已保存，线索状态已更新为跟进中')
        } else if (resultGroup === 'releaseToPool') {
          // 特殊处理：如果是"学员"，先更新状态
          if (followupResult === 'student') {
            try {
              await leadsApi.updateLead(currentLeadId, {
                status: LeadStatus.PAID,
              })
            } catch (error) {
              console.error('更新线索状态失败：', error)
            }
          }

          // 释放到公海
          const releaseReason =
            followupResult === 'student' ? 'MANUAL_RELEASE' : 'INVALID_LEAD'
          const releaseRemark =
            followupResult === 'student'
              ? '已转为学员，防止重复触达'
              : `跟进结果：${
                  followupResultGroups.releaseToPool.find(
                    (o) => o.value === followupResult
                  )?.label
                }`

          try {
            await leadsApi.batchReleaseLeads({
              lead_ids: [currentLeadId],
              reason: releaseReason,
              remark: releaseRemark,
            })
            const successMsg =
              followupResult === 'student'
                ? '跟进记录已保存，线索已标记为学员并释放到公海'
                : '跟进记录已保存，线索已释放到公海'
            toast.success(successMsg)
          } catch (error) {
            toast.warning('跟进记录已保存，但释放到公海失败')
          }
        } else if (resultGroup === 'statusOnly') {
          toast.success('跟进记录已保存，线索状态已更新为已回访')
        } else {
          toast.success('跟进记录保存成功')
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
    closeCallDrawer,
    refetchLeads,
  ])

  // 重置表单
  const resetForm = useCallback(() => {
    setFollowupResult('')
    setFollowupContent('')
    setWechatAdded(false)
    if (currentLead) {
      setIntentionLevel(
        (currentLead.intention_level as IntentionLevel) || IntentionLevel.MEDIUM
      )
    }
  }, [currentLead])

  // 键盘事件处理 - 空格键外呼
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const phone = currentLead?.parent_phone || currentLead?.phone
      if (event.code === 'Space' && phone && !callDrawerVisible) {
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
  }, [currentLead, callDrawerVisible, startCall])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [])

  // 查看线索详情
  const viewLeadDetail = useCallback((leadId: string) => {
    setSelectedLeadId(leadId)
    setDetailSheetOpen(true)
  }, [])

  // 渲染渠道选择器
  const renderChannelSelector = () => {
    if (!statsData) return null

    return (
      <div className="flex items-center gap-2">
        <Select
          value={selectedChannelId || 'all'}
          onValueChange={(value) =>
            setSelectedChannelId(value === 'all' ? null : value)
          }
        >
          <SelectTrigger className="w-[200px]">
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
      </div>
    )
  }

  // 渲染线索详情卡片
  const renderLeadDetail = () => {
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
      <Card className="h-full overflow-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {currentLead.child_name || '未填写'}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => viewLeadDetail(currentLead.id)}
            >
              查看详情
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">家长电话</Label>
              <p className="font-medium">
                {currentLead.parent_phone || currentLead.phone || '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">年龄</Label>
              <p className="font-medium">
                {currentLead.age ? `${currentLead.age}岁` : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">来源渠道</Label>
              <p className="font-medium">
                {currentLead.source_channel_name || '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">意向等级</Label>
              <p className="font-medium">
                {currentLead.intention_level
                  ? intentionLevelLabels[
                      currentLead.intention_level as IntentionLevel
                    ]
                  : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">在读学校</Label>
              <p className="font-medium">{currentLead.school_name || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">创建时间</Label>
              <p className="font-medium">
                {currentLead.created_at
                  ? new Date(currentLead.created_at).toLocaleString('zh-CN')
                  : '-'}
              </p>
            </div>
          </div>

          {/* 外呼按钮 */}
          {!callDrawerVisible && (
            <Button
              className="w-full"
              size="lg"
              onClick={startCall}
              disabled={
                !currentLead.parent_phone && !currentLead.phone
              }
            >
              <Phone className="mr-2 h-4 w-4" />
              按空格键外呼
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // 渲染外呼控制面板
  const renderCallPanel = () => {
    if (!callDrawerVisible) return null

    return (
      <Card className="h-full overflow-auto">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Phone className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-500" />
              </div>
              <span>通话中</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">通话时长</p>
                <p className="text-lg font-bold">{callDuration}</p>
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

        <CardContent className="space-y-4 p-4">
          <h4 className="font-medium">记录跟进信息</h4>

          {/* 继续跟进分组 */}
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              继续跟进（状态改为跟进中）
            </p>
            <div className="flex flex-wrap gap-2">
              {followupResultGroups.continuing.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    followupResult === option.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setFollowupResult(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 释放到公海分组 */}
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              释放到公海（状态改为已回访 + 释放到公海）
            </p>
            <div className="flex flex-wrap gap-2">
              {followupResultGroups.releaseToPool.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    followupResult === option.value ? 'secondary' : 'outline'
                  }
                  size="sm"
                  onClick={() => setFollowupResult(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 仅改状态分组 */}
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              仅改状态（状态改为已回访）
            </p>
            <div className="flex flex-wrap gap-2">
              {followupResultGroups.statusOnly.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    followupResult === option.value ? 'secondary' : 'outline'
                  }
                  size="sm"
                  onClick={() => setFollowupResult(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 意向等级 */}
          <div>
            <Label className="mb-2 block">意向等级</Label>
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
                  <Label htmlFor={option.value}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 添加微信 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="wechat-added"
              checked={wechatAdded}
              onCheckedChange={(checked) => setWechatAdded(checked as boolean)}
            />
            <Label htmlFor="wechat-added">已添加微信</Label>
          </div>

          {/* 跟进内容 */}
          <div>
            <Label className="mb-2 block">跟进内容</Label>
            <Textarea
              placeholder="输入跟进内容..."
              value={followupContent}
              onChange={(e) => setFollowupContent(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>

        <CardFooter className="border-t pt-3">
          <div className="flex w-full justify-between">
            <Button variant="outline" onClick={closeCallDrawer}>
              <X className="mr-2 h-4 w-4" />
              关闭
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>
                <RotateCcw className="mr-2 h-4 w-4" />
                重置
              </Button>
              <Button
                onClick={saveAndNext}
                disabled={!followupResult || saving}
              >
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
        <div className="flex w-full items-center justify-between">
          <h1 className="text-lg font-semibold">快捷外呼</h1>
          {renderChannelSelector()}
        </div>
      </Header>

      <Main>
        <div className="h-[calc(100vh-8rem)]">
          {callDrawerVisible ? (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={60} minSize={40}>
                <div className="h-full p-2">{renderLeadDetail()}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="h-full p-2">{renderCallPanel()}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="h-full p-2">{renderLeadDetail()}</div>
          )}
        </div>
      </Main>

      {/* 线索详情抽屉 */}
      <LeadDetailSheet
        leadId={selectedLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </>
  )
}
