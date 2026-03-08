import type { EmployeeCampusMapping } from '@/features/yunke/api'

interface CallMetricItem {
  name: string
  value: number
}

export type AdvisorCallMetric = 'callCount' | 'contactCount' | 'duration'

export interface AdvisorCallRow {
  id: string
  name: string
  campusNames: string
  callCount: number
  contactCount: number
  duration: number
  avgDuration: number
  contactRate: number
}

export interface AdvisorCallSummary {
  totalCallCount: number
  totalContactCount: number
  totalDuration: number
  advisorCount: number
  avgDuration: number
}

export function getAdvisorCallMetricValue(row: AdvisorCallRow, metric: AdvisorCallMetric): number {
  if (metric === 'callCount') return row.callCount
  if (metric === 'contactCount') return row.contactCount
  return row.duration
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds === 0) return '0秒'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) return `${hours}时${minutes}分${secs}秒`
  if (minutes > 0) return `${minutes}分${secs}秒`
  return `${secs}秒`
}

export function formatDurationShort(seconds?: number): string {
  if (!seconds || seconds === 0) return '0:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function buildAdvisorCallRows({
  callCountList,
  contactCountList,
  callDurationList,
  employeeCampusMapping,
  selectedCampusId = 'all',
}: {
  callCountList: CallMetricItem[]
  contactCountList: CallMetricItem[]
  callDurationList: CallMetricItem[]
  employeeCampusMapping?: EmployeeCampusMapping
  selectedCampusId?: string
}): AdvisorCallRow[] {
  const countMap = new Map(callCountList.map((item) => [item.name, item.value]))
  const contactMap = new Map(contactCountList.map((item) => [item.name, item.value]))
  const durationMap = new Map(callDurationList.map((item) => [item.name, item.value]))

  const allNames = new Set([
    ...callCountList.map((item) => item.name),
    ...contactCountList.map((item) => item.name),
    ...callDurationList.map((item) => item.name),
  ])

  let rows = Array.from(allNames).map((name) => {
    const callCount = countMap.get(name) || 0
    const contactCount = contactMap.get(name) || 0
    const duration = durationMap.get(name) || 0
    const campuses = employeeCampusMapping?.[name] || []
    const campusNames = campuses.map((campus) => campus.campus_name).join(' / ')

    return {
      id: `${name}::${campusNames || 'no-campus'}`,
      name,
      campusNames,
      callCount,
      contactCount,
      duration,
      avgDuration: callCount > 0 ? Math.round(duration / callCount) : 0,
      contactRate: callCount > 0 ? Number(((contactCount / callCount) * 100).toFixed(1)) : 0,
    }
  })

  if (selectedCampusId !== 'all' && employeeCampusMapping) {
    rows = rows.filter((row) => {
      const campusList = employeeCampusMapping[row.name] || []
      return campusList.some((campus) => campus.campus_id === selectedCampusId)
    })
  }

  return rows
}

export function summarizeAdvisorCallRows(rows: AdvisorCallRow[]): AdvisorCallSummary {
  const totalCallCount = rows.reduce((sum, row) => sum + row.callCount, 0)
  const totalContactCount = rows.reduce((sum, row) => sum + row.contactCount, 0)
  const totalDuration = rows.reduce((sum, row) => sum + row.duration, 0)
  const advisorCount = rows.length

  return {
    totalCallCount,
    totalContactCount,
    totalDuration,
    advisorCount,
    avgDuration: totalCallCount > 0 ? Math.round(totalDuration / totalCallCount) : 0,
  }
}

export function sortAdvisorCallRows(rows: AdvisorCallRow[], metric: AdvisorCallMetric): AdvisorCallRow[] {
  return [...rows].sort((a, b) => {
    const metricDiff = getAdvisorCallMetricValue(b, metric) - getAdvisorCallMetricValue(a, metric)
    if (metricDiff !== 0) return metricDiff
    const callDiff = b.callCount - a.callCount
    if (callDiff !== 0) return callDiff
    return a.name.localeCompare(b.name, 'zh-Hans-CN')
  })
}
