import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import leadsApi from '@/features/crm/leads/api'

export interface AdvisorCurrentLoad {
  advisorId: string
  advisorName: string
  totalLeads: number
  pendingFollowup: number
}

export interface AdvisorCurrentLoadSummary {
  totalLeads: number
  totalPending: number
}

export function useAdvisorCurrentLoadData() {
  const {
    data: response,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['advisor-dashboard-current-load'],
    queryFn: async () => {
      const res = await leadsApi.getAdvisorLeadSummary()
      return res.data
    },
    staleTime: 60 * 1000,
  })

  const items = useMemo<AdvisorCurrentLoad[]>(
    () =>
      (response?.items || []).map((item) => ({
        advisorId: item.advisor_id,
        advisorName: item.advisor_name,
        totalLeads: item.total_leads,
        pendingFollowup: item.pending_followup,
      })),
    [response?.items]
  )

  const summaryMap = useMemo(
    () => new Map(items.map((item) => [item.advisorId, item])),
    [items]
  )

  const summary = useMemo<AdvisorCurrentLoadSummary>(
    () => ({
      totalLeads: response?.total_leads || 0,
      totalPending: response?.total_pending || 0,
    }),
    [response?.total_leads, response?.total_pending]
  )

  return {
    items,
    rows: items,
    summaryMap,
    summary,
    isLoading,
    isRefetching,
    refetch,
  }
}
