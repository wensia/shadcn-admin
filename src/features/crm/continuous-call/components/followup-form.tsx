/**
 * 可复用的跟进表单组件
 * 用于连续外呼页面和线索详情抽屉
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, addDays, setHours, setMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Phone, RotateCcw, Loader2, Send,
  TrendingUp, CalendarCheck, PhoneOff, UserX,
  Clock, Ban, PhoneMissed, GraduationCap, ChevronDown,
  type LucideIcon
} from 'lucide-react'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { TimePickerWheel } from '@/components/ui/time-picker-wheel'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { leadsApi } from '../../leads/api'
import { visitScheduleApi } from '../../visit-schedule/api'
import {
  IntentionLevel,
  FollowupMethod,
  FollowupResult,
} from '../../leads/types'
import type { LeadFollowupCreate } from '../../leads/types'

// Anthropic 品牌色
const BRAND_COLORS = {
  green: '#788c5d',   // 继续跟进
  orange: '#d97757',  // 释放公海
  blue: '#6a9bcc',    // 仅改状态
} as const

// 跟进结果选项
interface FollowupResultOption {
  value: string
  label: string
  icon: LucideIcon
  color: string
}

export const followupResultOptions: FollowupResultOption[] = [
  { value: 'can_continue', label: '可持续跟进', icon: TrendingUp, color: BRAND_COLORS.green },
  { value: 'appointment_scheduled', label: '已预约到访', icon: CalendarCheck, color: BRAND_COLORS.green },
  { value: 'not_connected', label: '未接通', icon: PhoneMissed, color: BRAND_COLORS.blue },
  { value: 'temporarily_unavailable', label: '暂时不便', icon: Clock, color: BRAND_COLORS.blue },
  { value: 'wrong_number', label: '空错号', icon: PhoneOff, color: BRAND_COLORS.orange },
  { value: 'no_child', label: '没孩子', icon: UserX, color: BRAND_COLORS.orange },
  { value: 'age_mismatch', label: '年龄不符', icon: Clock, color: BRAND_COLORS.orange },
  { value: 'no_need', label: '不需要', icon: Ban, color: BRAND_COLORS.orange },
  { value: 'hung_up', label: '秒挂', icon: PhoneMissed, color: BRAND_COLORS.orange },
  { value: 'student', label: '学员', icon: GraduationCap, color: BRAND_COLORS.orange },
]

// 跟进结果到API枚举的映射
const resultMapping: Record<string, FollowupResult> = {
  can_continue: FollowupResult.CAN_CONTINUE,
  not_connected: FollowupResult.NOT_CONNECTED,
  temporarily_unavailable: FollowupResult.TEMPORARILY_UNAVAILABLE,
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

// 意向等级选项（带颜色）
const intentionLevelOptions = [
  { label: '高意向', value: IntentionLevel.HIGH, color: '#22c55e' },   // 绿色
  { label: '中意向', value: IntentionLevel.MEDIUM, color: '#f59e0b' }, // 橙色
  { label: '低意向', value: IntentionLevel.LOW, color: '#ef4444' },    // 红色
]

// 跟进结果选择器组件
interface FollowupResultSelectProps {
  value: string
  onChange: (value: string) => void
}

export function FollowupResultSelect({ value, onChange }: FollowupResultSelectProps) {
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

// 跟进表单Props
export interface FollowupFormProps {
  leadId: string
  advisorId?: string
  initialIntentionLevel?: IntentionLevel
  onSuccess?: () => void
  onCancel?: () => void
  /** 是否显示释放公海选项 */
  showReleaseToPool?: boolean
  /** 提交按钮文字 */
  submitText?: string
  /** 是否在Card中显示 */
  asCard?: boolean
  /** 类名 */
  className?: string
}

export function FollowupForm({
  leadId,
  advisorId,
  initialIntentionLevel = IntentionLevel.MEDIUM,
  onSuccess,
  onCancel,
  showReleaseToPool = true,
  submitText = '保存',
  asCard = true,
  className,
}: FollowupFormProps) {
  // 表单状态
  const [saving, setSaving] = useState(false)
  const [followupResult, setFollowupResult] = useState('')
  const [intentionLevel, setIntentionLevel] = useState<IntentionLevel>(initialIntentionLevel)
  const [wechatAdded, setWechatAdded] = useState(false)
  const [followupContent, setFollowupContent] = useState('')
  const [nextFollowupDate, setNextFollowupDate] = useState<Date | undefined>(undefined)
  const [nextFollowupTime, setNextFollowupTime] = useState<string>('10:00')
  const [sendToDingding, setSendToDingding] = useState(false)
  const [releaseToPool, setReleaseToPool] = useState(false)
  // 预约到访
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined)
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00')
  const [appointmentReason, setAppointmentReason] = useState<string>('')

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
    setIntentionLevel(initialIntentionLevel)
  }, [initialIntentionLevel])

  // 提交表单
  const handleSubmit = useCallback(async () => {
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

    try {
      setSaving(true)

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
        send_dingtalk: sendToDingding,
      }

      // 保存跟进记录
      const res = await leadsApi.addLeadFollowup(leadId, data)

      if (res.success) {
        // 如果是预约到访，创建 VisitSchedule 记录
        if (followupResult === 'appointment_scheduled' && appointmentDate) {
          try {
            const [aHours, aMinutes] = appointmentTime.split(':').map(Number)
            const visitDate = format(appointmentDate, 'yyyy-MM-dd')
            const visitTime = `${String(aHours).padStart(2, '0')}:${String(aMinutes).padStart(2, '0')}:00`

            await visitScheduleApi.createVisitSchedule({
              lead_id: leadId,
              visit_date: visitDate,
              visit_time: visitTime,
              advisor_id: advisorId || null,
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
          const selectedOption = followupResultOptions.find(o => o.value === followupResult)
          try {
            await leadsApi.batchReleaseLeads({
              lead_ids: [leadId],
              reason: 'MANUAL_RELEASE',
              remark: `跟进结果：${selectedOption?.label || followupResult}`,
            })
            toast.success('跟进记录已保存，线索已释放到公海')
          } catch (error) {
            toast.warning('跟进记录已保存，但释放到公海失败')
          }
        } else {
          toast.success('跟进记录保存成功')
        }

        resetForm()
        onSuccess?.()
      } else {
        toast.error(res.message || '保存失败')
      }
    } catch (error: any) {
      toast.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }, [
    leadId,
    advisorId,
    followupResult,
    followupContent,
    nextFollowupDate,
    nextFollowupTime,
    sendToDingding,
    releaseToPool,
    appointmentDate,
    appointmentTime,
    appointmentReason,
    resetForm,
    onSuccess,
  ])

  // 表单内容
  const formContent = (
    <>
      {/* 跟进结果 */}
      <div className="flex items-center">
        <Label className="text-xs font-medium text-red-500 whitespace-nowrap w-16 shrink-0">跟进结果</Label>
        <div className="flex-1">
          <FollowupResultSelect
            value={followupResult}
            onChange={(value) => {
              setFollowupResult(value)
              // 选择"可持续跟进"或"已预约到访"时自动勾选发钉钉
              if (value === 'can_continue' || value === 'appointment_scheduled') {
                setSendToDingding(true)
              }
            }}
          />
        </div>
      </div>

      <div className="border-t my-3" />

      {/* 意向等级 */}
      <div className="flex items-center">
        <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap w-16 shrink-0">意向等级</Label>
        <Select
          value={intentionLevel}
          onValueChange={(value) => setIntentionLevel(value as IntentionLevel)}
        >
          <SelectTrigger className="flex-1 h-8">
            <SelectValue placeholder="选择意向等级">
              {intentionLevel && (() => {
                const selected = intentionLevelOptions.find(o => o.value === intentionLevel)
                return selected ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: selected.color }}
                    />
                    <span style={{ color: selected.color }}>{selected.label}</span>
                  </span>
                ) : null
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {intentionLevelOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  <span>{option.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t my-3" />

      {/* 下次回访时间 */}
      <div className="flex items-center">
        <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap w-16 shrink-0">下次回访</Label>
        <div className="flex-1 flex items-center gap-2 flex-wrap">
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
          {/* 快捷按钮 */}
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

      {/* 释放公海 + 微信/钉钉 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {showReleaseToPool && (
          <div className="flex items-center space-x-1.5">
            <Checkbox
              id="followup-release-to-pool"
              checked={releaseToPool}
              onCheckedChange={(checked) => setReleaseToPool(checked as boolean)}
              className="h-4 w-4 rounded-sm border-2 data-[state=checked]:text-white"
              style={{
                borderColor: '#d97757',
                backgroundColor: releaseToPool ? '#d97757' : 'transparent'
              }}
            />
            <Label htmlFor="followup-release-to-pool" className="text-sm cursor-pointer" style={{ color: '#d97757' }}>
              释放到公海
            </Label>
          </div>
        )}
        <div className="flex items-center space-x-1.5">
          <Checkbox
            id="followup-wechat-added"
            checked={wechatAdded}
            onCheckedChange={(checked) => setWechatAdded(checked as boolean)}
            className="h-4 w-4 rounded-sm border-2 data-[state=checked]:text-white"
            style={{
              borderColor: '#6a9bcc',
              backgroundColor: wechatAdded ? '#6a9bcc' : 'transparent'
            }}
          />
          <Label htmlFor="followup-wechat-added" className="text-sm cursor-pointer" style={{ color: '#6a9bcc' }}>
            已加微信
          </Label>
        </div>
        <div className="flex items-center space-x-1.5">
          <Checkbox
            id="followup-send-dingding"
            checked={sendToDingding}
            onCheckedChange={(checked) => setSendToDingding(checked as boolean)}
            className="h-4 w-4 rounded-sm border-2 data-[state=checked]:text-white"
            style={{
              borderColor: '#788c5d',
              backgroundColor: sendToDingding ? '#788c5d' : 'transparent'
            }}
          />
          <Label htmlFor="followup-send-dingding" className="text-sm cursor-pointer flex items-center gap-1" style={{ color: '#788c5d' }}>
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
    </>
  )

  // 操作按钮
  const actionButtons = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => { resetForm(); onCancel?.() }}>
        <RotateCcw className="mr-1.5 h-4 w-4" />
        {onCancel ? '取消' : '重置'}
      </Button>
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!followupResult || saving}
      >
        {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        {submitText}
      </Button>
    </div>
  )

  if (asCard) {
    return (
      <Card className={cn("flex flex-col overflow-hidden", className)}>
        <CardContent className="flex-1 overflow-auto min-h-0 px-4 pt-4 pb-0">
          {formContent}
        </CardContent>
        <CardFooter className="flex items-center justify-end px-4 py-2.5 border-t shrink-0">
          {actionButtons}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1 overflow-auto">
        {formContent}
      </div>
      <div className="flex items-center justify-end pt-4 border-t mt-4">
        {actionButtons}
      </div>
    </div>
  )
}
