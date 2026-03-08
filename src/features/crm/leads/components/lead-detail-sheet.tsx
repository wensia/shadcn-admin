/**
 * 线索详情 SideSheet - Semi Design 版本
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  SideSheet,
  Modal,
  Button,
  Tag,
  Typography,
  Toast,
  Popover,
  Skeleton,
  Empty,
} from '@douyinfe/semi-ui-19'
import {
  IconEdit,
  IconPhone,
  IconClose,
  IconPlus,
  IconStar,
} from '@douyinfe/semi-icons'
import { leadsApi, yunkeApi } from '../api'
import { intentionLevelLabels, type Lead, type IntentionLevel } from '../types'
import { LeadStatusBadge, IntentionLevelBadge } from './status-badges'
import { LeadDetailTabs } from './detail/lead-detail-tabs'
import { FollowupForm } from '../../continuous-call/components/followup-form'

const { Text } = Typography

interface LeadDetailSheetProps {
  leadId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (lead: Lead) => void
}

export function LeadDetailSheet({
  leadId,
  open,
  onOpenChange,
  onEdit,
}: LeadDetailSheetProps) {
  const queryClient = useQueryClient()

  // 跟进表单
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false)

  // 意向等级编辑
  const [intentionPopoverOpen, setIntentionPopoverOpen] = useState(false)

  // 外呼状态
  const [isInCall, setIsInCall] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [currentCallId, setCurrentCallId] = useState<string | null>(null)
  const [outboundLoading, setOutboundLoading] = useState(false)
  const callTimerRef = useRef<number | null>(null)
  const callStartTimeRef = useRef<Date | null>(null)

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startCallTimer = useCallback(() => {
    setIsInCall(true)
    callStartTimeRef.current = new Date()
    callTimerRef.current = window.setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000))
      }
    }, 1000)
  }, [])

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    setIsInCall(false)
    setCallDuration(0)
    setCurrentCallId(null)
    callStartTimeRef.current = null
  }, [])

  const makeOutboundCall = useCallback(async (params: { phone?: string; leadId?: string }) => {
    if ((!params.phone && !params.leadId) || isInCall || outboundLoading) return false
    setOutboundLoading(true)
    try {
      const response = await yunkeApi.dialPhone(params)
      if (response.data?.call_id) {
        setCurrentCallId(response.data.call_id)
        startCallTimer()
        Toast.success({ content: '拨号成功' })
        return true
      }
      Toast.error({ content: '拨号失败' })
      return false
    } catch {
      Toast.error({ content: '外呼失败' })
      return false
    } finally {
      setOutboundLoading(false)
    }
  }, [isInCall, outboundLoading, startCallTimer])

  const hangUpCall = useCallback(async () => {
    if (currentCallId) {
      try { await yunkeApi.hangUpCall(currentCallId) } catch { /* 静默 */ }
    }
    stopCallTimer()
    Toast.success({ content: '通话已挂断' })
  }, [currentCallId, stopCallTimer])

  // 获取线索详情
  const { data: lead, isLoading, error: leadError } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) return null
      const response = await leadsApi.getLead(leadId, true)
      return response.data
    },
    enabled: !!leadId && open,
    retry: (failureCount, error) => {
      // 业务错误（如访问限制）不重试
      const err = error as { isBusinessError?: boolean }
      if (err?.isBusinessError) return false
      return failureCount < 2
    },
  })

  // 快捷编辑字段
  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      if (!leadId) throw new Error('线索ID不存在')
      const updateData: Record<string, unknown> = {}
      if (field === 'age') {
        updateData[field] = value ? parseInt(value, 10) : null
      } else if (field === 'course_interests') {
        updateData[field] = value ? value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : []
      } else {
        updateData[field] = value || null
      }
      const response = await leadsApi.updateLead(leadId, updateData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
  const { mutateAsync: updateLeadField } = updateFieldMutation

  const handleFieldUpdate = useCallback(
    async (field: string, value: string) => {
      await updateLeadField({ field, value })
    },
    [updateLeadField]
  )

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement
      const isEditable = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable
      if (event.code === 'Space' && !isEditable && open && !isInCall && !outboundLoading && leadId) {
        event.preventDefault()
        makeOutboundCall({ leadId, phone: lead?.parent_phone || undefined })
      }
      if (event.key === 'Escape' && isInCall) {
        event.preventDefault()
        event.stopPropagation()
        hangUpCall()
      }
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown, true)
      return () => window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open, isInCall, outboundLoading, leadId, lead?.parent_phone, makeOutboundCall, hangUpCall])

  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
  }, [])

  return (
    <>
      <SideSheet
        title={null}
        visible={open}
        onCancel={() => onOpenChange(false)}
        placement="right"
        width="min(70%, 960px)"
        bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
        headerStyle={{ padding: 0, borderBottom: 'none' }}
        closable={false}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--semi-color-border)',
            flexShrink: 0,
          }}
        >
          {isLoading && !lead ? (
            /* 骨架屏 Header */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Skeleton.Title style={{ width: 60, height: 22 }} />
                <Skeleton.Title style={{ width: 52, height: 22 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <Skeleton.Button style={{ width: 64, height: 32 }} />
                <Skeleton.Button style={{ width: 64, height: 32 }} />
                <Skeleton.Button style={{ width: 88, height: 32 }} />
                <Button icon={<IconClose />} theme="borderless" onClick={() => onOpenChange(false)} />
              </div>
            </>
          ) : (
            <>
              {/* 状态标签 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {lead && <LeadStatusBadge status={lead.status} />}
                {lead && (
                  <Popover
                    visible={intentionPopoverOpen}
                    onVisibleChange={setIntentionPopoverOpen}
                    trigger="click"
                    position="bottomLeft"
                    content={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 4 }}>
                        {Object.entries(intentionLevelLabels).map(([value]) => (
                          <div
                            key={value}
                            style={{
                              padding: '6px 12px',
                              cursor: 'pointer',
                              borderRadius: 4,
                              background: lead.intention_level === value ? 'var(--semi-color-fill-0)' : 'transparent',
                            }}
                            onClick={async () => {
                              await handleFieldUpdate('intention_level', value)
                              setIntentionPopoverOpen(false)
                            }}
                          >
                            <IntentionLevelBadge level={value as IntentionLevel} />
                          </div>
                        ))}
                      </div>
                    }
                  >
                    <span style={{ cursor: 'pointer' }} title="点击修改意向等级">
                      {lead.intention_level ? (
                        <IntentionLevelBadge level={lead.intention_level} />
                      ) : (
                        <Tag style={{ border: '1px dashed var(--semi-color-border)' }}>
                          设置意向
                        </Tag>
                      )}
                    </span>
                  </Popover>
                )}
                {lead?.is_starred && (
                  <IconStar style={{ color: '#fadb14', fontSize: 16 }} />
                )}
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                {lead && (
                  <>
                    <Button
                      icon={<IconEdit />}
                      theme="light"
                      onClick={() => onEdit?.(lead)}
                    >
                      编辑
                    </Button>
                    <Button
                      icon={<IconPhone />}
                      theme={isInCall ? 'solid' : 'light'}
                      type={isInCall ? 'danger' : 'primary'}
                      onClick={() => isInCall ? hangUpCall() : makeOutboundCall({
                        leadId: leadId || undefined,
                        phone: lead?.parent_phone || undefined,
                      })}
                      disabled={outboundLoading || (!isInCall && !leadId && !lead?.parent_phone)}
                      loading={outboundLoading}
                    >
                      {isInCall ? `挂断 ${formatCallDuration(callDuration)}` : '外呼'}
                    </Button>
                    <Button
                      icon={<IconPlus />}
                      theme="solid"
                      onClick={() => setFollowupDialogOpen(true)}
                    >
                      新建跟进
                    </Button>
                  </>
                )}
                <Button
                  icon={<IconClose />}
                  theme="borderless"
                  onClick={() => onOpenChange(false)}
                />
              </div>
            </>
          )}
        </div>

        {/* Tabs 区域 */}
        {isLoading && !lead ? (
          <div style={{ flex: 1, padding: '16px 20px' }}>
            <Skeleton loading active>
              {/* Tab 栏骨架 */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 20, borderBottom: '1px solid var(--semi-color-border)', paddingBottom: 10 }}>
                <Skeleton.Title style={{ width: 48, height: 20 }} />
                <Skeleton.Title style={{ width: 48, height: 20 }} />
                <Skeleton.Title style={{ width: 64, height: 20 }} />
              </div>
              {/* 内容骨架 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton.Title style={{ width: 60, height: 14, marginBottom: 8 }} />
                    <Skeleton.Paragraph rows={1} style={{ width: '100%' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24 }}>
                <Skeleton.Title style={{ width: 80, height: 16, marginBottom: 12 }} />
                <Skeleton.Paragraph rows={3} style={{ width: '100%' }} />
              </div>
              <div style={{ marginTop: 24 }}>
                <Skeleton.Title style={{ width: 80, height: 16, marginBottom: 12 }} />
                <Skeleton.Paragraph rows={2} style={{ width: '100%' }} />
              </div>
            </Skeleton>
          </div>
        ) : leadError ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <Empty
              title="无法加载线索详情"
              description={leadError.message || '请稍后重试'}
            >
              <Button theme="solid" onClick={() => queryClient.invalidateQueries({ queryKey: ['lead', leadId] })}>
                重试
              </Button>
            </Empty>
          </div>
        ) : leadId ? (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <LeadDetailTabs
              leadId={leadId}
              lead={lead}
              isLoading={isLoading}
              useScrollArea={true}
              height="h-full"
              onFieldUpdate={handleFieldUpdate}
            />
          </div>
        ) : null}
      </SideSheet>

      {/* 新建跟进对话框 */}
      <Modal
        title="新建跟进记录"
        visible={followupDialogOpen}
        onCancel={() => setFollowupDialogOpen(false)}
        footer={null}
        width={520}
        bodyStyle={{ maxHeight: '70vh', overflow: 'auto' }}
      >
        <Text type="tertiary" style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
          {lead?.child_name || lead?.parent_phone || '线索'}
        </Text>
        {leadId && (
          <FollowupForm
            leadId={leadId}
            advisorId={lead?.advisor_id}
            initialIntentionLevel={lead?.intention_level as IntentionLevel}
            asCard={false}
            showReleaseToPool={true}
            submitText="保存跟进"
            enableAiSuggestion={true}
            onSuccess={() => {
              setFollowupDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
              queryClient.invalidateQueries({ queryKey: ['lead-followups', leadId] })
              queryClient.invalidateQueries({ queryKey: ['leads'] })
            }}
            onCancel={() => setFollowupDialogOpen(false)}
          />
        )}
      </Modal>
    </>
  )
}
