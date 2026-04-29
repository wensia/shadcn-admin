import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { callRecordsApi, type EffectiveOutboundRankingRow } from '@/features/yunke/api'

interface UseAdvisorEffectiveOutboundDataOptions {
  dateFrom: string
  dateTo: string
  selectedCampusId?: string
  minDuration?: number
  enabled?: boolean
}

interface UseAdvisorEffectiveOutboundDataResult {
  rows: EffectiveOutboundRankingRow[]
  totalEffectiveOutboundCallCount: number
  countByAdvisorName: Map<string, number>
  isLoading: boolean
  isRefetching: boolean
  refetch: () => Promise<unknown>
}

function normalizeAdvisorName(name: string) {
  return name.replace(/_\d+$/, '')
}

export function getEffectiveOutboundCountByName(
  countByAdvisorName: Map<string, number>,
  advisorName: string,
) {
  return countByAdvisorName.get(advisorName) ?? countByAdvisorName.get(normalizeAdvisorName(advisorName)) ?? 0
}

export function useAdvisorEffectiveOutboundData({
  dateFrom,
  dateTo,
  selectedCampusId = 'all',
  minDuration = 30,
  enabled = true,
}: UseAdvisorEffectiveOutboundDataOptions): UseAdvisorEffectiveOutboundDataResult {
  const isQueryEnabled = enabled && Boolean(dateFrom && dateTo)

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: [
      'advisor-dashboard-effective-outbound-ranking',
      dateFrom,
      dateTo,
      selectedCampusId,
      minDuration,
    ],
    queryFn: async () => callRecordsApi.getEffectiveOutboundRanking({
      start_date: dateFrom,
      end_date: dateTo,
      campus_id: selectedCampusId === 'all' ? undefined : selectedCampusId,
      min_duration: minDuration,
    }),
    staleTime: 60 * 1000,
    enabled: isQueryEnabled,
  })

  const rows = useMemo(() => data?.rows ?? [], [data?.rows])
  const countByAdvisorName = useMemo(() => {
    const map = new Map<string, number>()

    rows.forEach((row) => {
      const names = new Set([row.staffName, normalizeAdvisorName(row.staffName)])

      names.forEach((name) => {
        map.set(name, (map.get(name) ?? 0) + row.effectiveOutboundCallCount)
      })
    })

    return map
  }, [rows])

  return {
    rows,
    totalEffectiveOutboundCallCount: data?.totalEffectiveOutboundCallCount ?? 0,
    countByAdvisorName,
    isLoading,
    isRefetching,
    refetch: async () => refetch(),
  }
}
