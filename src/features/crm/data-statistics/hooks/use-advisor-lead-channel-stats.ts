import { useQuery } from '@tanstack/react-query'
import {
  getLeadChannelStats,
  type AdvisorLeadChannelStatsResponse,
} from '../api/advisor-stats-api'

interface Options {
  campusId: string
  dateFrom: string
  dateTo: string
}

export function useAdvisorLeadChannelStats({ campusId, dateFrom, dateTo }: Options) {
  const campus_id = campusId !== 'all' ? campusId : undefined

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['advisor-lead-channel-stats', campus_id ?? 'all', dateFrom, dateTo],
    queryFn: () => getLeadChannelStats({ date_from: dateFrom, date_to: dateTo, campus_id }),
    staleTime: 60 * 1000,
  })

  return { data: data ?? null, isLoading, isRefetching, refetch }
}
