import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Phone, RotateCcw, Loader2, Send, RefreshCw, PhoneOff,
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { showApiErrorToast } from '@/lib/api/error-toast'

import {
  Button,
  Select,
  RadioGroup,
  Radio,
  Checkbox,
  Toast,
  Skeleton,
  Typography,
  DatePicker,
  Tag,
  Divider,
  TextArea,
  Spin,
  Modal,
} from '@douyinfe/semi-ui-19'
import { Main } from '@/components/layout/main'
import { useSidebar } from '@/context/sidebar-context'

import { continuousCallApi } from './api'
import { leadsApi, yunkeApi } from '../leads/api'
import { visitScheduleApi } from '../visit-schedule/api'
import {
  IntentionLevel,
  FollowupMethod,
  FollowupResult,
  type LeadFollowupCreate,
} from '../leads/types'
import type { ContinuousCallLead, TaskBriefItem } from './types'
import { LeadDetailTabs } from '../leads/components/detail/lead-detail-tabs'
import { CallTimer } from './components/call-timer'
import { followupResultOptions } from './components/followup-options'

const { Text } = Typography

const BRAND = {
  green: '#00b42a',   // Semi success green
  orange: '#ff7d00',  // Semi warning orange
  blue: '#0077fa',    // Semi primary blue
} as const

type ColorGroup = 'green' | 'blue' | 'orange'

const groupByColor: Record<string, ColorGroup> = {
  '#00b42a': 'green',
  '#0077fa': 'blue',
  '#ff7d00': 'orange',
}

const resultOptionGroups = (() => {
  const groups: { color: string; groupKey: ColorGroup; items: typeof followupResultOptions }[] = [
    { color: BRAND.green, groupKey: 'green', items: [] },
    { color: BRAND.blue, groupKey: 'blue', items: [] },
    { color: BRAND.orange, groupKey: 'orange', items: [] },
  ]
  for (const opt of followupResultOptions) {
    const g = groupByColor[opt.color]
    if (g) groups.find(x => x.groupKey === g)!.items.push(opt)
  }
  return groups
})()

const intentionLevelOptions = [
  { label: '高意向', value: IntentionLevel.HIGH },
  { label: '中意向', value: IntentionLevel.MEDIUM },
  { label: '低意向', value: IntentionLevel.LOW },
]

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

// ── PageHeader ──────────────────────────────────────────────

function PageHeader({
  statsData,
  selectedChannelId,
  onChannelChange,
  selectedTaskId,
  onTaskChange,
  onRefresh,
}: {
  statsData: {
    total_leads: number
    channels: { channel_id: string; channel_name: string; lead_count: number }[]
    tasks: TaskBriefItem[]
  } | undefined
  selectedChannelId: string | null
  onChannelChange: (id: string | null) => void
  selectedTaskId: string | null
  onTaskChange: (id: string | null) => void
  onRefresh: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px',
      borderBottom: '1px solid var(--semi-color-border)',
      backgroundColor: 'var(--semi-color-bg-0)',
      flexShrink: 0,
    }}>
      <Text strong style={{ fontSize: 16 }}>连续外呼</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Select
          value={selectedTaskId || 'all'}
          onChange={(value) => onTaskChange(value === 'all' ? null : value as string)}
          style={{ width: 200, textAlign: 'center' }}
          placeholder="选择任务"
          emptyContent="暂无分配任务"
        >
          <Select.Option value="all">全部任务</Select.Option>
          {statsData?.tasks?.map((task) => (
            <Select.Option key={task.id} value={task.id}>
              {task.name} ({task.lead_count})
            </Select.Option>
          ))}
        </Select>
        {statsData && (
          <Select
            value={selectedChannelId || 'all'}
            onChange={(value) => onChannelChange(value === 'all' ? null : value as string)}
            style={{ width: 200, textAlign: 'center' }}
            placeholder="选择渠道"
          >
            <Select.Option value="all">
              全部渠道 ({statsData.total_leads})
            </Select.Option>
            {statsData.channels.map((ch) => (
              <Select.Option key={ch.channel_id} value={ch.channel_id}>
                {ch.channel_name} ({ch.lead_count})
              </Select.Option>
            ))}
          </Select>
        )}
        <Button
          icon={<RefreshCw style={{ width: 16, height: 16 }} />}
          onClick={onRefresh}
        />
        <Text type="tertiary" style={{ fontSize: 12 }}>按空格外呼</Text>
      </div>
    </div>
  )
}

// ── CallStatusSection (inline footer variant) ──────────────

// ── FollowupResultGrid ──────────────────────────────────────

// 分组 → Semi Tag color 映射
const groupTagColor: Record<ColorGroup, 'green' | 'blue' | 'orange'> = {
  green: 'green',
  blue: 'blue',
  orange: 'orange',
}

const groupLabel: Record<ColorGroup, string> = {
  green: '继续跟进',
  blue: '改状态',
  orange: '无效',
}

function FollowupResultGrid({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--semi-color-danger)' }}>跟进结果</label>
      {resultOptionGroups.map((group) => (
        <div key={group.groupKey}>
          <Text type="tertiary" style={{ fontSize: 11, marginBottom: 6, display: 'block' }}>
            {groupLabel[group.groupKey]}
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {group.items.map((option) => {
              const Icon = option.icon
              const isSelected = value === option.value
              return (
                <Tag
                  key={option.value}
                  color={groupTagColor[group.groupKey]}
                  type={isSelected ? 'solid' : 'light'}
                  size="large"
                  shape="circle"
                  prefixIcon={<span style={{ display: 'inline-flex' }}><Icon style={{ width: 14, height: 14 }} /></span>}
                  onClick={() => onChange(option.value)}
                  style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {option.label}
                </Tag>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── LeadDetailPanel ─────────────────────────────────────────

function LeadDetailPanel({
  currentLead,
  isLoading,
  onFieldUpdate,
}: {
  currentLead: ContinuousCallLead | null
  isLoading: boolean
  onFieldUpdate: (field: string, value: string) => Promise<void>
}) {
  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <Skeleton.Title style={{ width: 96, height: 24 }} />
          <Skeleton.Title style={{ width: 64, height: 20, borderRadius: 9999 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton.Title style={{ width: 64, height: 16 }} />
              <Skeleton.Title style={{ width: 96 + i * 8, height: 20 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!currentLead) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--semi-color-text-2)',
      }}>
        <Phone style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.3 }} />
        <Text type="tertiary">选择渠道后，线索将自动加载</Text>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <LeadDetailTabs
          leadId={currentLead.id}
          useScrollArea={true}
          height="h-full"
          onFieldUpdate={onFieldUpdate}
          compact={true}
        />
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--semi-color-text-2)',
  marginBottom: 6, display: 'block',
}


export function ContinuousCallPage() {
  useDocumentTitle('连续外呼')
  const queryClient = useQueryClient()
  const { setOpen: setSidebarOpen } = useSidebar()

  // 页面状态
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
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
  const [nextFollowupAt, setNextFollowupAt] = useState<Date | undefined>(undefined)
  const [sendToDingding, setSendToDingding] = useState(false)
  const [releaseToPool, setReleaseToPool] = useState(false)
  const [appointmentAt, setAppointmentAt] = useState<Date | undefined>(undefined)
  const [appointmentReason, setAppointmentReason] = useState<string>('')

  // IME 组合输入状态跟踪，防止中文输入被打断
  const isComposingRef = useRef(false)

  // 数据查询
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['continuous-call-stats', selectedTaskId],
    queryFn: async () => {
      const res = await continuousCallApi.getStats({
        task_id: selectedTaskId || undefined,
      })
      if (res.success) return res.data
      throw new Error(res.message || '获取统计数据失败')
    },
  })

  const {
    data: leadsData,
    isLoading,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ['continuous-call-leads', selectedChannelId, selectedTaskId],
    queryFn: async () => {
      const res = await continuousCallApi.getLeads({
        channel_id: selectedChannelId || undefined,
        task_id: selectedTaskId || undefined,
        page: 1,
        page_size: 50,
      })
      if (res.success) return res.data
      throw new Error(res.message || '获取线索列表失败')
    },
  })

  const leads = useMemo(() => leadsData?.items || [], [leadsData?.items])
  const currentPhone = currentLead?.parent_phone || currentLead?.phone
  const canDialCurrentLead = Boolean(currentLead?.id || currentPhone)

  // 进入页面时自动收缩侧边栏，离开时恢复
  useEffect(() => {
    setSidebarOpen(false)
    return () => setSidebarOpen(true)
  }, [setSidebarOpen])

  const selectLead = useCallback((lead: ContinuousCallLead) => {
    setCurrentLead(lead)
    setFollowupResult('')
    setFollowupContent('')
    setWechatAdded(false)
    setIntentionLevel(
      (lead.intention_level as IntentionLevel) || IntentionLevel.MEDIUM
    )
  }, [])

  // 自动选择第一个线索
  useEffect(() => {
    if (leads.length > 0 && !currentLead) {
      selectLead(leads[0])
    }
  }, [leads, currentLead, selectLead])

  const startCall = useCallback(async () => {
    if (!currentLead?.id && !currentPhone) {
      Toast.error({ content: '当前线索没有手机号，无法外呼' })
      return
    }
    try {
      setDialing(true)
      const res = await yunkeApi.dialPhone({
        leadId: currentLead?.id,
        phone: currentPhone,
      })
      if (res.success && res.data) {
        setCurrentCallId(res.data.call_id)
        setCallStartTime(Date.now())
        setCallDrawerVisible(true)
        Toast.success({ content: '外呼发起成功' })
      } else {
        Toast.error({ content: res.message || '外呼失败' })
      }
    } catch (error: unknown) {
      showApiErrorToast(error, '外呼失败')
    } finally {
      setDialing(false)
    }
  }, [currentLead?.id, currentPhone])

  const closeCallDrawer = useCallback(() => {
    setCallDrawerVisible(false)
    setCurrentCallId('')
    setCallStartTime(null)
  }, [])

  const hangUpCall = useCallback(async () => {
    if (!currentCallId) {
      Toast.error({ content: '没有活跃的通话' })
      return
    }
    try {
      setHangingUp(true)
      const res = await yunkeApi.hangUpCall(currentCallId)
      if (res.success) {
        Toast.success({ content: '通话已挂断' })
        closeCallDrawer()
      } else {
        Toast.error({ content: res.message || '挂断失败' })
      }
    } catch (error: unknown) {
      showApiErrorToast(error, '挂断失败')
    } finally {
      setHangingUp(false)
    }
  }, [currentCallId, closeCallDrawer])

  const resetForm = useCallback(() => {
    setFollowupResult('')
    setFollowupContent('')
    setWechatAdded(false)
    setNextFollowupAt(undefined)
    setSendToDingding(false)
    setReleaseToPool(false)
    setAppointmentAt(undefined)
    setAppointmentReason('')
    if (currentLead) {
      setIntentionLevel(
        (currentLead.intention_level as IntentionLevel) || IntentionLevel.MEDIUM
      )
    }
  }, [currentLead])

  const handleFollowupResultChange = useCallback((value: string) => {
    setFollowupResult(value)
    if (value === 'can_continue' || value === 'appointment_scheduled') {
      setSendToDingding(true)
    }
  }, [])

  const saveAndNext = useCallback(async () => {
    if (!followupResult) {
      Toast.warning({ content: '请选择跟进结果' })
      return
    }
    if (followupResult === 'appointment_scheduled') {
      if (!appointmentAt) {
        Toast.warning({ content: '请选择预约到访时间' })
        return
      }
      if (!appointmentReason.trim()) {
        Toast.warning({ content: '请填写诺到理由' })
        return
      }
    }
    if (!currentLead) {
      Toast.warning({ content: '未选中线索' })
      return
    }

    try {
      setSaving(true)

      // 自动挂断当前通话
      if (currentCallId && callDrawerVisible) {
        try {
          await yunkeApi.hangUpCall(currentCallId)
          closeCallDrawer()
        } catch {
          Toast.warning({ content: '自动挂断当前通话失败，已继续保存跟进' })
        }
      }

      const currentLeadId = currentLead.id

      // 下次回访时间
      const nextFollowupAtIso = nextFollowupAt?.toISOString()

      // 组合预约到访时间内容
      let finalFollowupContent = followupContent || ''
      if (followupResult === 'appointment_scheduled' && appointmentAt) {
        const appointmentStr = format(appointmentAt, 'yyyy-MM-dd HH:mm', { locale: zhCN })
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
        yunke_call_id: currentCallId || undefined,
      }

      const res = await leadsApi.addLeadFollowup(currentLeadId, data)

      if (res.success) {
        // 更新意向等级
        if (intentionLevel && intentionLevel !== currentLead.intention_level) {
          try {
            await leadsApi.updateLead(currentLeadId, { intention_level: intentionLevel })
          } catch {
            Toast.warning({ content: '意向等级更新失败，跟进记录已保存' })
          }
        }

        // 创建预约到访记录
        if (followupResult === 'appointment_scheduled' && appointmentAt) {
          try {
            const visitDate = format(appointmentAt, 'yyyy-MM-dd')
            const visitTime = format(appointmentAt, 'HH:mm:ss')
            await visitScheduleApi.createVisitSchedule({
              lead_id: currentLeadId,
              visit_date: visitDate,
              visit_time: visitTime,
              advisor_id: currentLead.advisor_id || null,
              course_ids: [],
              status: 'scheduled',
              remark: finalFollowupContent || undefined,
            })
          } catch {
            Toast.warning({ content: '跟进记录已保存，但创建预约到访记录失败' })
          }
        }

        // 释放公海
        if (releaseToPool) {
          const selectedOption = followupResultOptions.find(o => o.value === followupResult)
          try {
            await leadsApi.batchReleaseLeads({
              lead_ids: [currentLeadId],
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

        await refetchLeads()
        setCurrentLead(null)
        resetForm()
      } else {
        Toast.error({ content: res.message || '保存失败' })
      }
    } catch (error: unknown) {
      showApiErrorToast(error, '保存失败')
    } finally {
      setSaving(false)
    }
  }, [
    followupResult, currentLead, currentCallId, callDrawerVisible,
    followupContent, nextFollowupAt, releaseToPool,
    appointmentAt, appointmentReason,
    closeCallDrawer, refetchLeads, intentionLevel, sendToDingding, resetForm,
  ])

  // 快捷编辑字段
  const { mutateAsync: updateLeadField } = useMutation({
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
    await updateLeadField({ field, value })
  }, [updateLeadField])

  // 右侧面板可拖拽调整宽度（localStorage 缓存）
  const RIGHT_PANEL_STORAGE_KEY = 'continuous-call-right-panel-width'
  const RIGHT_PANEL_DEFAULT = 420
  const RIGHT_PANEL_MIN = 320
  const RIGHT_PANEL_MAX = 620
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    try {
      const cached = localStorage.getItem(RIGHT_PANEL_STORAGE_KEY)
      if (cached) {
        const val = Number(cached)
        if (val >= RIGHT_PANEL_MIN && val <= RIGHT_PANEL_MAX) return val
      }
    } catch {
      // ignore storage read failures
    }
    return RIGHT_PANEL_DEFAULT
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = containerRect.right - ev.clientX
      setRightPanelWidth(Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, newWidth)))
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  // 宽度变化时写入 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(RIGHT_PANEL_STORAGE_KEY, String(rightPanelWidth))
    } catch {
      // ignore storage write failures
    }
  }, [rightPanelWidth])

  // 键盘事件 - 空格键外呼（capture 阶段，确保在 Semi 组件拦截前触发）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !canDialCurrentLead || callDrawerVisible || dialing) return
      const target = event.target as HTMLElement
      // 排除所有可交互元素：表单控件、按钮、contentEditable、Semi 组件内部
      const isInteractive =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON' ||
        target.isContentEditable ||
        target.closest(
          '.semi-select, .semi-input-wrapper, .semi-textarea-wrapper, ' +
          '.semi-checkbox, .semi-radio, .semi-datepicker, .semi-timepicker, ' +
          '.semi-tag, [role="listbox"], [role="combobox"], [role="option"], [role="button"]'
        )
      if (isInteractive) {
        // 交互元素内按空格：先让元素处理自身行为，然后移走焦点，下次空格就能触发外呼
        requestAnimationFrame(() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
        })
        return
      }
      event.preventDefault()
      startCall()
    }
    document.addEventListener('keydown', handleKeyDown, true) // capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [canDialCurrentLead, callDrawerVisible, startCall, dialing])

  return (
    <Main fixed className="min-h-0">
      {/* 外呼拨号全屏遮罩 */}
      <Modal
        visible={dialing}
        header={null}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width="auto"
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 60px',
        }}
        style={{ boxShadow: 'none', backgroundColor: 'transparent' }}
        maskStyle={{ backdropFilter: 'blur(4px)' }}
        modalContentClass="dialing-overlay-content"
      >
        <Spin size="large" />
        <Text strong style={{ fontSize: 16, marginTop: 20 }}>正在拨号中...</Text>
        <Text type="tertiary" style={{ fontSize: 13, marginTop: 8 }}>
          {currentLead?.child_name || ''} {currentPhone}
        </Text>
      </Modal>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <PageHeader
          statsData={statsData}
          selectedChannelId={selectedChannelId}
          onChannelChange={setSelectedChannelId}
          selectedTaskId={selectedTaskId}
          onTaskChange={(id) => {
            setSelectedTaskId(id)
            setSelectedChannelId(null)
            setCurrentLead(null)
          }}
          onRefresh={() => { refetchStats(); refetchLeads() }}
        />
        <div ref={containerRef} style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* 左侧：线索详情 */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <LeadDetailPanel
              currentLead={currentLead}
              isLoading={isLoading}
              onFieldUpdate={handleFieldUpdate}
            />
          </div>

          {/* 可拖拽分割条 */}
          <div
            data-resizer=""
            onMouseDown={handleDividerMouseDown}
            style={{
              width: 6,
              flexShrink: 0,
              cursor: 'col-resize',
              backgroundColor: 'transparent',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <div style={{
              position: 'absolute',
              left: 2,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: 'var(--semi-color-border)',
              transition: 'all 0.15s',
              pointerEvents: 'none',
            }} />
            <style>{`
              [data-resizer]:hover > div,
              [data-resizer]:active > div {
                width: 3px !important;
                left: 1px !important;
                background-color: var(--semi-color-primary) !important;
              }
              .dialing-overlay-content {
                background-color: transparent !important;
                box-shadow: none !important;
              }
            `}</style>
          </div>

          {/* 右侧：外呼操作面板 */}
          <div style={{
            width: rightPanelWidth, flexShrink: 0, height: '100%',
            display: 'flex', flexDirection: 'column',
            backgroundColor: 'var(--semi-color-bg-1)',
          }}>
            {/* 跟进表单区 */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
                {/* 第一区：跟进结果 */}
                <FollowupResultGrid value={followupResult} onChange={handleFollowupResultChange} />

                {/* 第二区：跟进信息 */}
                <Divider margin="12px" align="left">
                  <Text type="tertiary" style={{ fontSize: 12 }}>跟进信息</Text>
                </Divider>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>意向等级</label>
                    <RadioGroup
                      value={intentionLevel}
                      onChange={(e) => setIntentionLevel(e.target.value as IntentionLevel)}
                      direction="horizontal"
                      style={{ display: 'flex' }}
                    >
                      {intentionLevelOptions.map((opt) => (
                        <Radio key={opt.value} value={opt.value} style={{ fontSize: 13, flex: 1 }}>{opt.label}</Radio>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <label style={labelStyle}>下次回访</label>
                    <DatePicker
                      type="dateTime"
                      value={nextFollowupAt}
                      onChange={(date) => setNextFollowupAt(date as Date || undefined)}
                      disabledDate={(date?: Date) => !!date && date < new Date(new Date().setHours(0, 0, 0, 0))}
                      placeholder="选择日期时间"
                      format="MM月dd日 HH:mm"
                      style={{ width: 200 }}
                    />
                  </div>

                  {followupResult === 'appointment_scheduled' && (
                    <div style={{
                      padding: 12, borderRadius: 8,
                      backgroundColor: BRAND.green + '0a',
                      border: `1px solid ${BRAND.green}30`,
                    }}>
                      <label style={{ ...labelStyle, color: 'var(--semi-color-danger)', fontWeight: 600 }}>预约到访</label>
                      <div style={{ marginBottom: 8 }}>
                        <DatePicker
                          type="dateTime"
                          value={appointmentAt}
                          onChange={(date) => setAppointmentAt(date as Date || undefined)}
                          disabledDate={(date?: Date) => !!date && date < new Date(new Date().setHours(0, 0, 0, 0))}
                          placeholder="选择预约日期时间"
                          format="MM月dd日 HH:mm"
                          style={{ width: 200 }}
                        />
                      </div>
                      <label style={{ ...labelStyle, color: 'var(--semi-color-danger)' }}>诺到理由</label>
                      <TextArea
                        placeholder="请输入诺到理由..."
                        value={appointmentReason}
                        onChange={(value) => { if (!isComposingRef.current) setAppointmentReason(value) }}
                        onCompositionStart={() => { isComposingRef.current = true }}
                        onCompositionEnd={(e) => { isComposingRef.current = false; setAppointmentReason((e.target as HTMLTextAreaElement).value) }}
                        autosize={{ minRows: 1, maxRows: 4 }}
                      />
                    </div>
                  )}
                </div>

                {/* 第三区：操作选项 */}
                <Divider margin="12px" align="left">
                  <Text type="tertiary" style={{ fontSize: 12 }}>操作选项</Text>
                </Divider>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Checkbox checked={releaseToPool} onChange={(e) => setReleaseToPool(e.target.checked)}>
                      释放公海
                    </Checkbox>
                    <Checkbox checked={wechatAdded} onChange={(e) => setWechatAdded(e.target.checked)}>
                      已加微信
                    </Checkbox>
                    <Checkbox checked={sendToDingding} onChange={(e) => setSendToDingding(e.target.checked)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Send style={{ width: 12, height: 12 }} />
                        发钉钉
                      </span>
                    </Checkbox>
                  </div>

                  <div>
                    <label style={labelStyle}>跟进内容</label>
                    <TextArea
                      placeholder="输入跟进内容..."
                      value={followupContent}
                      onChange={(value) => { if (!isComposingRef.current) setFollowupContent(value) }}
                      onCompositionStart={() => { isComposingRef.current = true }}
                      onCompositionEnd={(e) => { isComposingRef.current = false; setFollowupContent((e.target as HTMLTextAreaElement).value) }}
                      maxCount={500}
                      autosize={{ minRows: 2, maxRows: 6 }}
                    />
                  </div>
                </div>
              </div>

              {/* 底部操作栏：外呼 + 保存 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderTop: '1px solid var(--semi-color-border)',
                flexShrink: 0, gap: 8, backgroundColor: 'var(--semi-color-bg-0)',
              }}>
                {/* 左侧：外呼/通话状态 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {callDrawerVisible ? (
                    <>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: '#ef4444', flexShrink: 0,
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }} />
                      <CallTimer startTime={callStartTime} style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />
                      <Button
                        type="danger"
                        onClick={hangUpCall}
                        disabled={hangingUp}
                        icon={<PhoneOff style={{ width: 16, height: 16 }} />}
                      >
                        {hangingUp ? '挂断中' : '挂断'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={startCall}
                      disabled={!canDialCurrentLead || dialing}
                      icon={dialing
                        ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                        : <Phone style={{ width: 16, height: 16 }} />
                      }
                    >
                      {dialing ? '呼叫中' : '外呼'}
                    </Button>
                  )}
                </div>

                {/* 右侧：重置 + 保存 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Button icon={<RotateCcw style={{ width: 14, height: 14 }} />} onClick={resetForm}>
                    重置
                  </Button>
                  <Button
                    theme="solid"
                    onClick={saveAndNext}
                    disabled={!followupResult || saving}
                    icon={saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : undefined}
                  >
                    保存并下一个
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Main>
  )
}
