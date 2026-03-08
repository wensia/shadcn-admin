import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { callRecordsApi, yunkeCredentialsApi } from '@/features/yunke/api'
import {
  buildAdvisorCallRows,
  summarizeAdvisorCallRows,
  type AdvisorCallRow,
  type AdvisorCallSummary,
} from '../utils/advisor-call-stats'

const DEFAULT_DEPT_ID = '50EDD867A7C04917B53FA277EE706D08'

interface UseAdvisorCallDataOptions {
  selectedAccountId?: string
  selectedCampusId?: string
  period?: number
  startDate?: string
  endDate?: string
}

interface AccountOption {
  value: string
  label: string
  deptId: string
}

interface CampusOption {
  value: string
  label: string
}

interface UseAdvisorCallDataResult {
  rows: AdvisorCallRow[]
  totals: AdvisorCallSummary
  summary: AdvisorCallSummary
  accountOptions: AccountOption[]
  campusOptions: CampusOption[]
  effectiveAccountId: string
  effectiveDepartmentId: string
  hasAccounts: boolean
  isLoading: boolean
  isRefetching: boolean
  refetch: () => Promise<unknown[]>
}

export function useAdvisorCallData({
  selectedAccountId,
  selectedCampusId = 'all',
  period,
  startDate,
  endDate,
}: UseAdvisorCallDataOptions): UseAdvisorCallDataResult {
  const hasCustomDateRange = Boolean(startDate && endDate)

  const {
    data: accountsData,
    isLoading: isAccountsLoading,
    isRefetching: isAccountsRefetching,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ['advisor-dashboard-yunke-accounts'],
    queryFn: async () => yunkeCredentialsApi.getCredentials({ status: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
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
  })

  const accountOptions = useMemo<AccountOption[]>(() => {
    const accounts = accountsData?.items || []
    return accounts.map((account) => ({
      value: account.id,
      label: account.company_name || account.phone,
      deptId: account.root_dept_id || DEFAULT_DEPT_ID,
    }))
  }, [accountsData])

  const campusOptions = useMemo<CampusOption[]>(() => {
    if (!employeeCampusMapping) return []

    const campusMap = new Map<string, string>()
    Object.values(employeeCampusMapping).forEach((campuses) => {
      campuses.forEach((campus) => {
        campusMap.set(campus.campus_id, campus.campus_name)
      })
    })

    return Array.from(campusMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
  }, [employeeCampusMapping])

  const effectiveAccountId = selectedAccountId || accountOptions[0]?.value || ''
  const departmentId = useMemo(() => {
    const selectedOption = accountOptions.find((option) => option.value === effectiveAccountId)
    return selectedOption?.deptId || DEFAULT_DEPT_ID
  }, [accountOptions, effectiveAccountId])

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    isRefetching: isOverviewRefetching,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: [
      'advisor-dashboard-call-overview',
      effectiveAccountId,
      departmentId,
      hasCustomDateRange,
      period ?? null,
      startDate ?? null,
      endDate ?? null,
    ],
    queryFn: async () => callRecordsApi.getCallStatistics(
      hasCustomDateRange
        ? {
            department_id: departmentId,
            flag: 'department',
            period: 3,
            start_date: startDate,
            end_date: endDate,
            account_id: effectiveAccountId || undefined,
            stat_type: 0,
          }
        : {
            department_id: departmentId,
            flag: 'department',
            period: period ?? 0,
            account_id: effectiveAccountId || undefined,
            stat_type: 0,
          }
    ),
    staleTime: 60 * 1000,
    enabled: !!effectiveAccountId && !!departmentId,
  })

  const {
    data: contactData,
    isLoading: isContactLoading,
    isRefetching: isContactRefetching,
    refetch: refetchContact,
  } = useQuery({
    queryKey: [
      'advisor-dashboard-call-contact',
      effectiveAccountId,
      departmentId,
      hasCustomDateRange,
      period ?? null,
      startDate ?? null,
      endDate ?? null,
    ],
    queryFn: async () => callRecordsApi.getCallStatistics(
      hasCustomDateRange
        ? {
            department_id: departmentId,
            flag: 'department',
            period: 3,
            start_date: startDate,
            end_date: endDate,
            account_id: effectiveAccountId || undefined,
            stat_type: 1,
          }
        : {
            department_id: departmentId,
            flag: 'department',
            period: period ?? 0,
            account_id: effectiveAccountId || undefined,
            stat_type: 1,
          }
    ),
    staleTime: 60 * 1000,
    enabled: !!effectiveAccountId && !!departmentId,
  })

  const rows = useMemo(
    () =>
      buildAdvisorCallRows({
        callCountList: overviewData?.chart2Counts1 || [],
        contactCountList: contactData?.chart2Counts2 || [],
        callDurationList: overviewData?.chart2Counts3 || [],
        employeeCampusMapping,
        selectedCampusId,
      }),
    [contactData?.chart2Counts2, employeeCampusMapping, overviewData?.chart2Counts1, overviewData?.chart2Counts3, selectedCampusId]
  )

  const summary = useMemo(() => summarizeAdvisorCallRows(rows), [rows])

  return {
    rows,
    totals: summary,
    summary,
    accountOptions,
    campusOptions,
    effectiveAccountId,
    effectiveDepartmentId: departmentId,
    hasAccounts: accountOptions.length > 0,
    isLoading: isAccountsLoading || isCampusMappingLoading || isOverviewLoading || isContactLoading,
    isRefetching:
      isAccountsRefetching || isCampusMappingRefetching || isOverviewRefetching || isContactRefetching,
    refetch: async () =>
      Promise.all([
        refetchAccounts(),
        refetchCampusMapping(),
        refetchOverview(),
        refetchContact(),
      ]),
  }
}
