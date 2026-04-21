import { useQuery } from '@tanstack/react-query'
import {
  getFollowupResultStats,
  type AdvisorFollowupResultStatsResponse,
} from '../api/advisor-stats-api'

interface Options {
  campusId: string
  dateFrom: string
  dateTo: string
}

export function useAdvisorFollowupResultStats({ campusId, dateFrom, dateTo }: Options) {
  const campus_id = campusId !== 'all' ? campusId : undefined

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['advisor-followup-result-stats', campus_id ?? 'all', dateFrom, dateTo],
    queryFn: () => getFollowupResultStats({ date_from: dateFrom, date_to: dateTo, campus_id }),
    staleTime: 60 * 1000,
  })

  return { data: data ?? null, isLoading, isRefetching, refetch }
}
