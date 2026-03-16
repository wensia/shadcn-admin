/**
 * 通话统计卡片组件 - 基于通用 StatsBar
 */

import { PhoneCall, Clock, PhoneIncoming, Percent, Database } from 'lucide-react'
import { StatsBar, type StatsBarItem } from '@/components/semi/stats-bar'
import type { CallRecordStats } from '../../types'

interface StatsCardsProps {
  stats: CallRecordStats | null
  isLoading?: boolean
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0分'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return `${hours}时${minutes}分`
  if (minutes > 0) return `${minutes}分${secs}秒`
  return `${secs}秒`
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const items: StatsBarItem[] = [
    { label: '今日通话', value: `${stats?.today_count ?? 0}通`, icon: PhoneCall, color: 'var(--semi-color-primary)' },
    { label: '今日时长', value: formatDuration(stats?.today_duration ?? 0), icon: Clock, color: 'var(--semi-color-success)' },
    { label: '今日接通', value: `${stats?.answered_count ?? 0}通`, icon: PhoneIncoming, color: '#722ed1' },
    { label: '接通率', value: `${stats?.answer_rate ?? 0}%`, icon: Percent, color: 'var(--semi-color-warning)' },
    { label: '总记录', value: `${(stats?.total_count ?? 0).toLocaleString()}条`, icon: Database, color: 'var(--semi-color-text-2)' },
  ]

  return <StatsBar items={items} isLoading={isLoading} />
}
