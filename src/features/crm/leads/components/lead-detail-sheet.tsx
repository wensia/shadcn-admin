/**
 * 线索详情Sheet组件
 * 使用 LeadDetailTabs 复用组件展示详情内容
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Phone,
  PhoneOff,
  Edit,
  Plus,
  X,
  Star,
  Loader2,
} from 'lucide-react'
import { leadsApi, yunkeApi } from '../api'
import type { Lead } from '../types'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { LeadStatusBadge, IntentionLevelBadge } from './status-badges'

// 详情 Tabs 组件
import { LeadDetailTabs } from './detail/lead-detail-tabs'

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

  // ==================== 外呼状态 ====================
  const [isInCall, setIsInCall] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [currentCallId, setCurrentCallId] = useState<string | null>(null)
  const [outboundLoading, setOutboundLoading] = useState(false)
  const callTimerRef = useRef<number | null>(null)
  const callStartTimeRef = useRef<Date | null>(null)

  // 格式化通话时长
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 开始计时
  const startCallTimer = useCallback(() => {
    setIsInCall(true)
    callStartTimeRef.current = new Date()
    callTimerRef.current = window.setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000))
      }
    }, 1000)
  }, [])

  // 停止计时
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

  // 外呼
  const makeOutboundCall = useCallback(async (phone: string) => {
    if (!phone || isInCall || outboundLoading) return false
    setOutboundLoading(true)
    try {
      const response = await yunkeApi.dialPhone(phone)
      if (response.data?.call_id) {
        setCurrentCallId(response.data.call_id)
        startCallTimer()
        toast.success('拨号成功')
        return true
      }
      toast.error('拨号失败')
      return false
    } catch {
      toast.error('外呼失败')
      return false
    } finally {
      setOutboundLoading(false)
    }
  }, [isInCall, outboundLoading, startCallTimer])

  // 挂断
  const hangUpCall = useCallback(async () => {
    if (currentCallId) {
      try {
        await yunkeApi.hangUpCall(currentCallId)
      } catch {
        // 静默失败
      }
    }
    stopCallTimer()
    toast.success('通话已挂断')
  }, [currentCallId, stopCallTimer])

  // 获取线索详情（仅用于 Header 区域显示状态和操作按钮）
  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) return null
      const response = await leadsApi.getLead(leadId, true)
      return response.data
    },
    enabled: !!leadId && open
  })

  // ==================== 快捷键监听 ====================
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查焦点是否在可编辑元素上
      const el = document.activeElement as HTMLElement
      const isEditable = el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        el?.isContentEditable

      // 空格键外呼
      if (event.code === 'Space' && !isEditable && open && !isInCall && !outboundLoading && lead?.parent_phone) {
        event.preventDefault()
        makeOutboundCall(lead.parent_phone)
      }

      // ESC 键挂断（阻止关闭抽屉）
      if (event.key === 'Escape' && isInCall) {
        event.preventDefault()
        event.stopPropagation()
        hangUpCall()
      }
    }

    if (open) {
      // 使用 capture 阶段监听，确保在 Sheet 组件之前处理 ESC 键
      window.addEventListener('keydown', handleKeyDown, true)
      return () => window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open, isInCall, outboundLoading, lead?.parent_phone, makeOutboundCall, hangUpCall])

  // 清理计时器
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [])

  if (!lead && !isLoading) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl md:max-w-[70%] lg:max-w-3xl xl:max-w-4xl p-0 flex flex-col [&>button]:hidden">
        {/* ==================== Header 区域 ==================== */}
        <SheetHeader className="px-4 py-2.5 border-b shrink-0">
          <SheetTitle className="sr-only">线索详情</SheetTitle>
          <SheetDescription className="sr-only">查看和管理线索信息</SheetDescription>
          <div className="flex items-center gap-2">
            {/* 状态标签 */}
            <div className="flex items-center gap-2 flex-wrap">
              {lead && (
                <LeadStatusBadge status={lead.status} className={cn(s.text.xs, s.height.badge, s.rounded)} />
              )}
              {lead?.intention_level && (
                <IntentionLevelBadge level={lead.intention_level} className={cn(s.text.xs, s.height.badge, s.rounded)} />
              )}
              {lead?.is_starred && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>

            {/* 操作按钮 */}
            <div className={cn('flex items-center ml-auto', s.gap.buttons)}>
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
                    variant={isInCall ? "destructive" : "outline"}
                    onClick={() => isInCall ? hangUpCall() : makeOutboundCall(lead.parent_phone || '')}
                    disabled={outboundLoading || (!isInCall && !lead?.parent_phone)}
                    className={cn(s.height.controlSm, s.text.xs)}
                  >
                    {outboundLoading ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : isInCall ? (
                      <PhoneOff className="mr-1 h-3 w-3" />
                    ) : (
                      <Phone className="mr-1 h-3 w-3" />
                    )}
                    {isInCall ? `挂断 ${formatCallDuration(callDuration)}` : '外呼'}
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* ==================== Tabs 区域 ==================== */}
        {leadId && (
          <LeadDetailTabs
            leadId={leadId}
            lead={lead}
            isLoading={isLoading}
            useScrollArea={true}
            height="h-full"
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
