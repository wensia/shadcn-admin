import { useQuery } from '@tanstack/react-query'
import { callRecordsApi, type AppCallAndMsgStatisticsRow } from '@/features/yunke/api'

export interface AdvisorAppCallRankingRow {
  id: string
  name: string
  campusNames: string
  outboundCallCount: number
  inboundCallCount: number
  missedInboundCount: number
  outboundDuration: number
  inboundDuration: number
  totalDuration: number
}

interface UseAdvisorAppCallRankingDataOptions {
  selectedAccountId?: string
  departmentId?: string
  selectedCampusId?: string
  time?: string
  enabled?: boolean
}

interface UseAdvisorAppCallRankingDataResult {
  rows: AdvisorAppCallRankingRow[]
  isLoading: boolean
  isRefetching: boolean
  refetch: () => Promise<unknown[]>
}

function normalizeEmployeeName(name: string) {
  return name.replace(/_\d+$/, '')
}

function getMatchedCampuses(
  employeeName: string,
  employeeCampusMapping: Record<string, Array<{ campus_id: string; campus_name: string }>>,
) {
  const exactMatch = employeeCampusMapping[employeeName]
  if (exactMatch) return exactMatch

  return employeeCampusMapping[normalizeEmployeeName(employeeName)] || []
}

function transformRow(
  row: AppCallAndMsgStatisticsRow,
  employeeCampusMapping: Record<string, Array<{ campus_id: string; campus_name: string }>>,
) {
  const campuses = getMatchedCampuses(row.nm, employeeCampusMapping)

  return {
    id: row.id,
    name: row.nm,
    campusNames: campuses.map((campus) => campus.campus_name).join(' / '),
    outboundCallCount: row.hc || 0,
    inboundCallCount: row.hr || 0,
    missedInboundCount: row.wjld || 0,
    outboundDuration: row.hcsc || 0,
    inboundDuration: row.hrsc || 0,
    totalDuration: (row.hcsc || 0) + (row.hrsc || 0),
  }
}

export function useAdvisorAppCallRankingData({
  selectedAccountId,
  departmentId,
  selectedCampusId = 'all',
  time = '0',
  enabled = true,
}: UseAdvisorAppCallRankingDataOptions): UseAdvisorAppCallRankingDataResult {
  const isQueryEnabled = enabled && Boolean(departmentId)

  const {
    data: statisticsData,
    isLoading: isStatisticsLoading,
    isRefetching: isStatisticsRefetching,
    refetch: refetchStatistics,
  } = useQuery({
    queryKey: ['advisor-dashboard-app-call-ranking', selectedAccountId ?? null, departmentId ?? null, time],
    queryFn: async () => callRecordsApi.getAppCallAndMsgStatistics({
      department_id: departmentId!,
      time,
      account_id: selectedAccountId || undefined,
    }),
    staleTime: 60 * 1000,
    enabled: isQueryEnabled,
  })

  const {
    data: employeeCampusMapping,
    isLoading: isCampusMappingLoading,
    isRefetching: isCampusMappingRefetching,
    refetch: refetchCampusMapping,
  } = useQuery({
    queryKey: ['advisor-dashboard-employee-campus-mapping'],
    queryFn: async () => callRecordsApi.getEmployeeCampusMapping(),
    staleTime: 5 * 60 * 1000,
    enabled,
    retry: false,
  })

  const rows: AdvisorAppCallRankingRow[] = !statisticsData?.data || !employeeCampusMapping
    ? []
    : statisticsData.data
      .map((row) => transformRow(row, employeeCampusMapping))
      .filter((row) => {
        if (selectedCampusId === 'all') return true
        const campuses = getMatchedCampuses(row.name, employeeCampusMapping)
        return campuses.some((campus) => campus.campus_id === selectedCampusId)
      })

  return {
    rows,
    isLoading: isStatisticsLoading || isCampusMappingLoading,
    isRefetching: isStatisticsRefetching || isCampusMappingRefetching,
    refetch: async () => {
      if (!isQueryEnabled) return []
      return Promise.all([refetchStatistics(), refetchCampusMapping()])
    },
  }
}
