/**
 * useLeadStatistics Hook
 * 计算线索统计数据，用于详情页展示
 */

import * as React from 'react'
import type { Lead, LeadFollowup, LeadStatus, FollowupMethod, FollowupResult } from '../types'
import { followupMethodLabels } from '../types'
import { getFollowupResultStyle } from '@/lib/status-styles'
import type { FollowupFrequencyData } from '../components/detail/charts/followup-frequency-chart'
import type { MethodDistributionData } from '../components/detail/charts/followup-method-pie'
import type { ResultDistributionData } from '../components/detail/charts/followup-result-pie'

// 状态流程顺序（从左到右表示销售漏斗进度）
const STATUS_ORDER: LeadStatus[] = [
  'pending_assign',
  'pending_followup',
  'following_up',
  'followed_up',
  'trial_scheduled',
  'visited',
  'paid',
]

const TERMINAL_STATUSES: LeadStatus[] = ['invalid', 'closed']

// 跟进方式颜色
const METHOD_COLORS: Record<FollowupMethod, string> = {
  phone: 'hsl(var(--primary))',
  wechat: 'hsl(142, 76%, 36%)',
  face_to_face: 'hsl(262, 83%, 58%)',
  sms: 'hsl(38, 92%, 50%)',
  email: 'hsl(199, 89%, 48%)',
}

// 跟进结果颜色
const RESULT_COLORS: Record<string, string> = {
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 84%, 60%)',
  default: 'hsl(var(--primary))',
  secondary: 'hsl(var(--muted-foreground))',
  outline: 'hsl(var(--muted-foreground))',
  info: 'hsl(199, 89%, 48%)',
  purple: 'hsl(262, 83%, 58%)',
}

interface LeadStatistics {
  // KPI 数据
  statusProgress: number
  statusStage: string
  daysUntilNextFollowup: number | null
  isOverdue: boolean
  lastFollowupDaysAgo: number | null

  // 图表数据
  followupFrequencyData: FollowupFrequencyData[]
  methodDistribution: MethodDistributionData[]
  resultDistribution: ResultDistributionData[]
}

export function useLeadStatistics(
  lead: Lead | null,
  followups: LeadFollowup[] | undefined
): LeadStatistics {
  return React.useMemo(() => {
    // 默认值
    const defaultStats: LeadStatistics = {
      statusProgress: 0,
      statusStage: '未开始',
      daysUntilNextFollowup: null,
      isOverdue: false,
      lastFollowupDaysAgo: null,
      followupFrequencyData: [],
      methodDistribution: [],
      resultDistribution: [],
    }

    if (!lead) return defaultStats

    // 计算状态进度
    const statusProgress = getStatusProgress(lead.status)
    const statusStage = getStatusStage(lead.status)

    // 计算距离下次跟进的天数
    let daysUntilNextFollowup: number | null = null
    let isOverdue = false
    if (lead.next_followup_at) {
      const nextFollowup = new Date(lead.next_followup_at + 'Z')
      const now = new Date()
      const diffMs = nextFollowup.getTime() - now.getTime()
      daysUntilNextFollowup = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      isOverdue = daysUntilNextFollowup < 0
    }

    // 计算最后跟进距今天数
    let lastFollowupDaysAgo: number | null = null
    if (lead.last_followup_at) {
      const lastFollowup = new Date(lead.last_followup_at + 'Z')
      const now = new Date()
      const diffMs = now.getTime() - lastFollowup.getTime()
      lastFollowupDaysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }

    // 如果没有跟进记录，返回基础统计
    if (!followups || followups.length === 0) {
      return {
        ...defaultStats,
        statusProgress,
        statusStage,
        daysUntilNextFollowup,
        isOverdue,
        lastFollowupDaysAgo,
      }
    }

    // 计算跟进频率数据（最近30天）
    const followupFrequencyData = calculateFrequencyData(followups)

    // 计算跟进方式分布
    const methodDistribution = calculateMethodDistribution(followups)

    // 计算跟进结果分布
    const resultDistribution = calculateResultDistribution(followups)

    return {
      statusProgress,
      statusStage,
      daysUntilNextFollowup,
      isOverdue,
      lastFollowupDaysAgo,
      followupFrequencyData,
      methodDistribution,
      resultDistribution,
    }
  }, [lead, followups])
}

// ==================== 辅助函数 ====================

function getStatusProgress(status: LeadStatus): number {
  if (TERMINAL_STATUSES.includes(status)) return 0

  const index = STATUS_ORDER.indexOf(status)
  if (index === -1) return 0

  return Math.round((index / (STATUS_ORDER.length - 1)) * 100)
}

function getStatusStage(status: LeadStatus): string {
  if (TERMINAL_STATUSES.includes(status)) {
    return status === 'invalid' ? '无效' : '已关闭'
  }

  const progress = getStatusProgress(status)
  if (progress === 0) return '待分配'
  if (progress <= 30) return '初期接触'
  if (progress <= 60) return '深度沟通'
  if (progress <= 80) return '即将成交'
  return '已成交'
}

function calculateFrequencyData(followups: LeadFollowup[]): FollowupFrequencyData[] {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // 初始化30天的数据
  const dateMap = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
    dateMap.set(dateStr, 0)
  }

  // 统计每天的跟进次数
  followups.forEach((followup) => {
    const followupDate = new Date(followup.followup_at + 'Z')
    if (followupDate >= thirtyDaysAgo) {
      const dateStr = followupDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
      if (dateMap.has(dateStr)) {
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1)
      }
    }
  })

  return Array.from(dateMap.entries()).map(([date, count]) => ({
    date,
    count,
  }))
}

function calculateMethodDistribution(followups: LeadFollowup[]): MethodDistributionData[] {
  const methodCount = new Map<FollowupMethod, number>()

  followups.forEach((followup) => {
    const count = methodCount.get(followup.method) || 0
    methodCount.set(followup.method, count + 1)
  })

  return Array.from(methodCount.entries())
    .map(([method, value]) => ({
      name: followupMethodLabels[method],
      value,
      color: METHOD_COLORS[method],
    }))
    .sort((a, b) => b.value - a.value)
}

function calculateResultDistribution(followups: LeadFollowup[]): ResultDistributionData[] {
  const resultCount = new Map<FollowupResult, number>()

  followups.forEach((followup) => {
    if (followup.result) {
      const count = resultCount.get(followup.result) || 0
      resultCount.set(followup.result, count + 1)
    }
  })

  return Array.from(resultCount.entries())
    .map(([result, value]) => {
      const style = getFollowupResultStyle(result)
      return {
        name: style.label,
        value,
        color: RESULT_COLORS[style.variant] || RESULT_COLORS.default,
      }
    })
    .sort((a, b) => b.value - a.value)
}
