/**
 * 可复用的跟进表单组件 (Semi Design)
 * 用于连续外呼页面和线索详情抽屉
 */

import { useState, useCallback, useEffect, useRef, type Ref } from 'react'
import { format, addDays, setHours, setMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Phone, RotateCcw, Loader2, Send,
  ChevronDown,
  Sparkles, X,
} from 'lucide-react'
import { showApiErrorToast } from '@/lib/api/error-toast'

import {
  Button,
  Card,
  Select,
  Checkbox,
  Popover,
  Toast,
  Divider,
  DatePicker,
  TimePicker,
  TextArea,
} from '@douyinfe/semi-ui-19'

import {
  leadsApi,
  getFollowupSuggestion,
  triggerCallPipeline,
  type FollowupSuggestion,
  type PipelineStatus,
} from '../../leads/api'
import { visitScheduleApi } from '../../visit-schedule/api'
import {
  IntentionLevel,
  FollowupMethod,
  FollowupResult,
  type LeadFollowupCreate,
} from '../../leads/types'
import { followupResultOptions } from './followup-options'

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
  { label: '高意向', value: IntentionLevel.HIGH, color: '#00b42a' },
  { label: '中意向', value: IntentionLevel.MEDIUM, color: '#ff7d00' },
  { label: '低意向', value: IntentionLevel.LOW, color: '#f53f3f' },
]

// 跟进结果选择器组件
interface FollowupResultSelectProps {
  value: string
  onChange: (value: string) => void
}

interface SelectOptionNode {
  value?: string
}

interface DateTriggerRenderProps {
  value?: Date
  ref?: Ref<HTMLSpanElement>
}

interface TimeTriggerRenderProps {
  ref?: Ref<HTMLSpanElement>
}

export function FollowupResultSelect({ value, onChange }: FollowupResultSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedOption = followupResultOptions.find(o => o.value === value)

  return (
    <Popover
      visible={open}
      onVisibleChange={setOpen}
      trigger="click"
      position="bottomLeft"
      content={
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12 }}>
          {followupResultOptions.map(option => {
            const Icon = option.icon
            const isSelected = value === option.value
            return (
              <Button
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 8,
                  height: 32,
                  fontSize: 12,
                  color: isSelected ? 'white' : option.color,
                  backgroundColor: isSelected ? option.color : 'transparent',
                  borderColor: option.color,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = option.color + '20'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  }
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {option.label}
              </Button>
            )
          })}
        </div>
      }
    >
      <span style={{ display: 'block', width: '100%' }}>
        <Button
          style={{
            width: '100%',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.2s',
            ...(selectedOption ? {
              borderColor: selectedOption.color,
              borderWidth: 2,
              backgroundColor: selectedOption.color + '15',
              fontWeight: 500,
            } : {}),
          }}
        >
          {selectedOption ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <selectedOption.icon style={{ width: 16, height: 16, color: selectedOption.color }} />
              <span style={{ color: selectedOption.color }}>{selectedOption.label}</span>
            </span>
          ) : (
            <span style={{ color: 'var(--semi-color-text-2)' }}>选择跟进结果...</span>
          )}
          <ChevronDown
            style={{
              position: 'absolute',
              right: 12,
              width: 16,
              height: 16,
              opacity: 0.5,
              ...(selectedOption ? { color: selectedOption.color } : {}),
            }}
          />
        </Button>
      </span>
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
  showReleaseToPool?: boolean
  submitText?: string
  asCard?: boolean
  className?: string
  enableAiSuggestion?: boolean
  callRecordId?: string
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
  enableAiSuggestion = false,
  callRecordId,
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
  // AI 建议 + 流水线状态
  const [aiSuggestion, setAiSuggestion] = useState<FollowupSuggestion | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiApplied, setAiApplied] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | 'idle'>('idle')
  const [hasAiFollowup, setHasAiFollowup] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // (日期选择使用 Semi DatePicker/TimePicker 内置弹出)

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
    setAiSuggestion(null)
    setAiApplied(false)
    setPipelineStatus('idle')
    setHasAiFollowup(false)
  }, [initialIntentionLevel])

  // 应用 AI 建议到表单
  const applyAiSuggestion = useCallback((suggestion: FollowupSuggestion) => {
    if (suggestion.followup_result) {
      setFollowupResult(suggestion.followup_result)
      if (suggestion.followup_result === 'can_continue' || suggestion.followup_result === 'appointment_scheduled') {
        setSendToDingding(true)
      }
    }
    if (suggestion.intention_level) {
      setIntentionLevel(suggestion.intention_level as IntentionLevel)
    }
    if (suggestion.followup_content) {
      setFollowupContent(suggestion.followup_content)
    }
    if (suggestion.next_followup_at) {
      const dt = new Date(suggestion.next_followup_at)
      if (!isNaN(dt.getTime())) {
        setNextFollowupDate(dt)
        setNextFollowupTime(format(dt, 'HH:mm'))
      }
    }
    setAiApplied(true)
  }, [])

  // AI 跟进建议轮询
  useEffect(() => {
    if (!enableAiSuggestion || !leadId) return

    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 30
    const POLL_INTERVAL = 10000

    setAiLoading(true)
    setPipelineStatus('idle')

    async function checkExistingAiFollowup() {
      try {
        const followupsRes = await leadsApi.getLeadFollowups(leadId, { page: 1, size: 10 })
        if (!cancelled && followupsRes.success && followupsRes.data) {
          const hasAi = followupsRes.data.some(f => f.source === 'ai_auto')
          setHasAiFollowup(hasAi)
        }
      } catch {
        // ignore
      }
    }
    checkExistingAiFollowup()

    async function poll() {
      if (cancelled || attempts >= MAX_ATTEMPTS) {
        setAiLoading(false)
        return
      }
      attempts++

      try {
        const sugRes = await getFollowupSuggestion(leadId, callRecordId)
        if (cancelled) return

        if (sugRes.success && sugRes.data) {
          setAiSuggestion(sugRes.data)
          setPipelineStatus('ready')
          applyAiSuggestion(sugRes.data)
          setAiLoading(false)
          return
        }

        const pipeRes = await triggerCallPipeline(leadId)
        if (cancelled) return

        if (pipeRes.success && pipeRes.data) {
          const status = pipeRes.data.pipeline_status
          setPipelineStatus(status)
          if (status === 'no_calls' || status === 'no_recording' || status === 'short_call') {
            setAiLoading(false)
            return
          }
        }

        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL)
      } catch {
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL)
      }
    }

    poll()

    return () => {
      cancelled = true
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [enableAiSuggestion, leadId, callRecordId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 提交表单
  const handleSubmit = useCallback(async () => {
    if (!followupResult) {
      Toast.warning({ content: '请选择跟进结果' })
      return
    }

    if (followupResult === 'appointment_scheduled') {
      if (!appointmentDate) {
        Toast.warning({ content: '请选择预约到访时间' })
        return
      }
      if (!appointmentReason.trim()) {
        Toast.warning({ content: '请填写诺到理由' })
        return
      }
    }

    try {
      setSaving(true)

      let nextFollowupAtIso: string | undefined = undefined
      if (nextFollowupDate) {
        const [hours, minutes] = nextFollowupTime.split(':').map(Number)
        const combinedDate = setMinutes(setHours(nextFollowupDate, hours), minutes)
        nextFollowupAtIso = combinedDate.toISOString()
      }

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

      const data: LeadFollowupCreate = {
        followup_at: new Date().toISOString(),
        method: FollowupMethod.PHONE,
        result: resultMapping[followupResult] || FollowupResult.OTHER,
        content: finalFollowupContent || undefined,
        result_remark: finalFollowupContent || undefined,
        next_followup_at: nextFollowupAtIso,
        send_dingtalk: sendToDingding,
      }

      const res = await leadsApi.addLeadFollowup(leadId, data)

      if (res.success) {
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
          } catch {
            Toast.warning({ content: '跟进记录已保存，但创建预约到访记录失败' })
          }
        }

        if (releaseToPool) {
          const selectedOption = followupResultOptions.find(o => o.value === followupResult)
          try {
            await leadsApi.batchReleaseLeads({
              lead_ids: [leadId],
              reason: 'MANUAL_RELEASE',
              remark: `跟进结果：${selectedOption?.label || followupResult}`,
            })
            Toast.success({ content: '跟进记录已保存，线索已释放到公海' })
          } catch {
            Toast.warning({ content: '跟进记录已保存，但释放到公海失败' })
          }
        } else {
          Toast.success({ content: '跟进记录保存成功' })
        }

        resetForm()
        onSuccess?.()
      } else {
        Toast.error({ content: res.message || '保存失败' })
      }
    } catch (error: unknown) {
      showApiErrorToast(error, '保存失败')
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

  // 横幅样式
  const bannerStyle = (borderColor: string, bgColor: string, textColor: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8,
    borderRadius: 6, border: `1px solid ${borderColor}`, backgroundColor: bgColor,
    padding: '8px 12px', fontSize: 12, color: textColor, marginBottom: 12,
  })

  // 表单内容
  const formContent = (
    <>
      {/* AI 流水线状态横幅 */}
      {aiLoading && enableAiSuggestion && pipelineStatus !== 'idle' && (
        <div style={bannerStyle('#bfdbfe', '#eff6ff', '#1d4ed8')}>
          <Loader2 style={{ width: 14, height: 14, flexShrink: 0, animation: 'spin 1s linear infinite' }} />
          <span>
            {pipelineStatus === 'transcribing' && '正在转录通话录音...'}
            {pipelineStatus === 'analyzing' && 'AI 正在分析通话内容...'}
            {(pipelineStatus === 'idle' || !pipelineStatus) && '正在获取 AI 跟进建议...'}
          </span>
        </div>
      )}
      {aiLoading && enableAiSuggestion && pipelineStatus === 'idle' && (
        <div style={bannerStyle('#bfdbfe', '#eff6ff', '#1d4ed8')}>
          <Loader2 style={{ width: 14, height: 14, flexShrink: 0, animation: 'spin 1s linear infinite' }} />
          <span>正在检查通话记录...</span>
        </div>
      )}
      {!aiLoading && enableAiSuggestion && pipelineStatus === 'no_calls' && (
        <div style={bannerStyle('var(--semi-color-border)', 'transparent', 'var(--semi-color-text-2)')}>
          <Phone style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>暂无通话记录，等待云客数据同步（约 5 分钟）</span>
        </div>
      )}
      {!aiLoading && enableAiSuggestion && (pipelineStatus === 'no_recording' || pipelineStatus === 'short_call') && (
        <div style={bannerStyle('var(--semi-color-border)', 'transparent', 'var(--semi-color-text-2)')}>
          <Phone style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>{pipelineStatus === 'no_recording' ? '最近通话无录音，无法生成 AI 建议' : '通话时长不足，无法生成 AI 建议'}</span>
        </div>
      )}
      {aiApplied && aiSuggestion && (
        <div style={bannerStyle('#fde68a', '#fffbeb', '#b45309')}>
          <Sparkles style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            AI 已根据{aiSuggestion.call_time ? format(new Date(aiSuggestion.call_time), 'MM/dd HH:mm') : '最近'}通话
            {aiSuggestion.ai_quality_score ? `（评分 ${aiSuggestion.ai_quality_score}）` : ''}
            预填充建议，可直接修改
          </span>
          <Button
            theme="borderless"
            style={{ flexShrink: 0, borderRadius: 4, padding: 2, minWidth: 'auto', height: 'auto' }}
            onClick={() => {
              setAiApplied(false)
              resetForm()
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </Button>
        </div>
      )}
      {hasAiFollowup && !aiLoading && (
        <div style={bannerStyle('#e9d5ff', '#faf5ff', '#7c3aed')}>
          <Sparkles style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>AI 已根据通话分析自动生成跟进记录，可在时间轴中查看。如需补充可继续填写。</span>
        </div>
      )}

      {/* 跟进结果 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#ef4444', whiteSpace: 'nowrap', width: 64, flexShrink: 0 }}>跟进结果</label>
        <div style={{ flex: 1 }}>
          <FollowupResultSelect
            value={followupResult}
            onChange={(value) => {
              setFollowupResult(value)
              if (value === 'can_continue' || value === 'appointment_scheduled') {
                setSendToDingding(true)
              }
            }}
          />
        </div>
      </div>

      <Divider margin={12} />

      {/* 意向等级 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--semi-color-text-2)', whiteSpace: 'nowrap', width: 64, flexShrink: 0 }}>意向等级</label>
        <Select
          value={intentionLevel}
          onChange={(value) => setIntentionLevel(value as IntentionLevel)}
          style={{ flex: 1 }}
          renderSelectedItem={(optionNode?: SelectOptionNode) => {
            const selected = intentionLevelOptions.find(o => o.value === optionNode?.value)
            return selected ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: selected.color, display: 'inline-block' }} />
                <span style={{ color: selected.color }}>{selected.label}</span>
              </span>
            ) : null
          }}
        >
          {intentionLevelOptions.map((option) => (
            <Select.Option key={option.value} value={option.value}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: option.color, display: 'inline-block' }} />
                <span>{option.label}</span>
              </span>
            </Select.Option>
          ))}
        </Select>
      </div>

      <Divider margin={12} />

      {/* 下次回访时间 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--semi-color-text-2)', whiteSpace: 'nowrap', width: 64, flexShrink: 0 }}>下次回访</label>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <DatePicker
            type="date"
            value={nextFollowupDate}
            onChange={(date: Date | null) => setNextFollowupDate(date || undefined)}
            disabledDate={(date?: Date) => !!date && date < new Date(new Date().setHours(0, 0, 0, 0))}
            triggerRender={({ ref }: DateTriggerRenderProps) => (
              <span ref={ref} style={{ display: 'inline-flex' }}>
                <Button
                  style={{
                    height: 28, padding: '0 8px', fontSize: 12, minWidth: 90,
                    color: nextFollowupDate ? undefined : 'var(--semi-color-text-2)',
                  }}
                >
                  {nextFollowupDate ? format(nextFollowupDate, 'MM月dd日', { locale: zhCN }) : '选择日期'}
                </Button>
              </span>
            )}
          />
          <TimePicker
            value={nextFollowupTime}
            onChange={(_time: unknown, timeStr: string) => setNextFollowupTime(timeStr)}
            format="HH:mm"
            triggerRender={({ ref }: TimeTriggerRenderProps) => (
              <span ref={ref} style={{ display: 'inline-flex' }}>
                <Button
                  style={{
                    height: 28, padding: '0 8px', fontSize: 12, minWidth: 70,
                    color: nextFollowupDate ? undefined : 'var(--semi-color-text-2)',
                  }}
                >
                  {nextFollowupDate ? nextFollowupTime : '选择时间'}
                </Button>
              </span>
            )}
          />
          <Button
            style={{ height: 28, padding: '0 8px', fontSize: 12 }}
            onClick={() => {
              setNextFollowupDate(new Date())
              setNextFollowupTime('18:00')
            }}
          >
            今天
          </Button>
          <Button
            style={{ height: 28, padding: '0 8px', fontSize: 12 }}
            onClick={() => {
              setNextFollowupDate(addDays(new Date(), 1))
              setNextFollowupTime('10:00')
            }}
          >
            明天
          </Button>
        </div>
      </div>

      {/* 预约到访时间 */}
      {followupResult === 'appointment_scheduled' && (
        <>
          <Divider margin={12} />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#ef4444', whiteSpace: 'nowrap', width: 64, flexShrink: 0 }}>
              预约时间
            </label>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DatePicker
                type="date"
                value={appointmentDate}
                onChange={(date: Date | null) => setAppointmentDate(date || undefined)}
                disabledDate={(date?: Date) => !!date && date < new Date(new Date().setHours(0, 0, 0, 0))}
                triggerRender={({ ref }: DateTriggerRenderProps) => (
                  <span ref={ref} style={{ display: 'inline-flex' }}>
                    <Button
                      style={{
                        height: 28, padding: '0 8px', fontSize: 12, minWidth: 90,
                        color: appointmentDate ? undefined : 'var(--semi-color-text-2)',
                      }}
                    >
                      {appointmentDate ? format(appointmentDate, 'MM月dd日', { locale: zhCN }) : '选择日期'}
                    </Button>
                  </span>
                )}
              />
              <TimePicker
                value={appointmentTime}
                onChange={(_time: unknown, timeStr: string) => setAppointmentTime(timeStr)}
                format="HH:mm"
                triggerRender={({ ref }: TimeTriggerRenderProps) => (
                  <span ref={ref} style={{ display: 'inline-flex' }}>
                    <Button
                      style={{
                        height: 28, padding: '0 8px', fontSize: 12, minWidth: 70,
                        color: appointmentDate ? undefined : 'var(--semi-color-text-2)',
                      }}
                    >
                      {appointmentDate ? appointmentTime : '选择时间'}
                    </Button>
                  </span>
                )}
              />
            </div>
          </div>
          {/* 诺到理由 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#ef4444', whiteSpace: 'nowrap', width: 64, flexShrink: 0, paddingTop: 8 }}>
              诺到理由
            </label>
            <TextArea
              placeholder="请输入诺到理由..."
              value={appointmentReason}
              onChange={(value) => setAppointmentReason(value)}
              autosize={{ minRows: 1, maxRows: 4 }}
              style={{ flex: 1 }}
            />
          </div>
        </>
      )}

      <Divider margin={12} />

      {/* 释放公海 + 微信/钉钉 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        {showReleaseToPool && (
          <span style={{ '--semi-color-primary': '#ff7d00', '--semi-color-primary-hover': '#ff7d00' } as React.CSSProperties}>
            <Checkbox
              checked={releaseToPool}
              onChange={(e) => setReleaseToPool(e.target.checked)}
            >
              <span style={{ color: '#ff7d00' }}>释放到公海</span>
            </Checkbox>
          </span>
        )}
        <span style={{ '--semi-color-primary': '#0077fa', '--semi-color-primary-hover': '#0077fa' } as React.CSSProperties}>
          <Checkbox
            checked={wechatAdded}
            onChange={(e) => setWechatAdded(e.target.checked)}
          >
            <span style={{ color: '#0077fa' }}>已加微信</span>
          </Checkbox>
        </span>
        <span style={{ '--semi-color-primary': '#00b42a', '--semi-color-primary-hover': '#00b42a' } as React.CSSProperties}>
          <Checkbox
            checked={sendToDingding}
            onChange={(e) => setSendToDingding(e.target.checked)}
          >
            <span style={{ color: '#00b42a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Send style={{ width: 12, height: 12 }} />
              发钉钉
            </span>
          </Checkbox>
        </span>
      </div>

      <Divider margin={12} />

      {/* 跟进内容 */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--semi-color-text-2)', whiteSpace: 'nowrap', width: 64, flexShrink: 0, paddingTop: 8 }}>跟进内容</label>
        <TextArea
          placeholder="输入跟进内容..."
          value={followupContent}
          onChange={(value) => setFollowupContent(value)}
          maxCount={500}
          autosize={{ minRows: 2, maxRows: 6 }}
          style={{ flex: 1 }}
        />
      </div>
    </>
  )

  // 操作按钮
  const actionButtons = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button icon={<RotateCcw style={{ width: 16, height: 16 }} />} onClick={() => { resetForm(); onCancel?.() }}>
        {onCancel ? '取消' : '重置'}
      </Button>
      <Button
        theme="solid"
        onClick={handleSubmit}
        disabled={!followupResult || saving}
        icon={saving ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : undefined}
      >
        {submitText}
      </Button>
    </div>
  )

  if (asCard) {
    return (
      <Card
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        className={className}
        bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '16px 16px 0' }}>
          {formContent}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '10px 16px', borderTop: '1px solid var(--semi-color-border)', flexShrink: 0,
        }}>
          {actionButtons}
        </div>
      </Card>
    )
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {formContent}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--semi-color-border)', marginTop: 16 }}>
        {actionButtons}
      </div>
    </div>
  )
}
