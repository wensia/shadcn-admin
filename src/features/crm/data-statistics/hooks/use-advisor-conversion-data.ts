import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type DailyControlReportResponse,
  dailyControlQueryKeys,
  getDailyControlReport,
  getPayments,
  getVisitSchedules,
} from '@/features/crm/daily-control/api'
import type { ApiResponse } from '@/lib/api/types'

export interface AdvisorConversionRow {
  id: string
  advisorId: string
  advisorName: string
  campusId?: string
  campusName?: string
  promisedCount: number
  visitedCount: number
  paymentCount: number
  paymentAmount: number
  visitRate: number
}

export interface AdvisorConversionSummary {
  totalAdvisors: number
  totalPromised: number
  totalVisited: number
  totalPaymentCount: number
  totalPaymentAmount: number
  totalVisitRate: number
  visitRate: number
}

interface UseAdvisorConversionDataOptions {
  campusId: string
  dateFrom: string
  dateTo: string
}

interface PaymentSummary {
  totalCount: number
  totalAmount: number
}

function normalizeReportResponse(
  payload: ApiResponse<DailyControlReportResponse> | DailyControlReportResponse
): DailyControlReportResponse {
  if ('stats' in payload) return payload
  return payload.data || {
    stats: [],
    total_advisors: 0,
    total_promised: 0,
    total_visited: 0,
    total_payment_count: 0,
    total_payment_amount: 0,
  }
}

export function useAdvisorConversionData({
  campusId,
  dateFrom,
  dateTo,
}: UseAdvisorConversionDataOptions) {
  const creatorCampusId = campusId !== 'all' ? campusId : undefined

  const {
    data: rawData,
    isLoading: isReportLoading,
    isRefetching: isReportRefetching,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['advisor-dashboard-conversion', creatorCampusId ?? 'all', dateFrom, dateTo],
    queryFn: async () => getDailyControlReport({
      campus_id: creatorCampusId,
      date_from: dateFrom,
      date_to: dateTo,
    }),
    staleTime: 60 * 1000,
  })

  const {
    data: totalPromisedFromVisitSchedule,
    isLoading: isPromisedLoading,
    isRefetching: isPromisedRefetching,
    refetch: refetchPromised,
  } = useQuery({
    queryKey: dailyControlQueryKeys.visitScheduleStat({
      status: 'scheduled',
      visit_date_from: dateFrom,
      visit_date_to: dateTo,
      creator_campus_id: creatorCampusId,
    }),
    queryFn: async () => {
      const result = await getVisitSchedules({
        page: 1,
        size: 1,
        status: 'scheduled',
        visit_date_from: dateFrom,
        visit_date_to: dateTo,
        creator_campus_id: creatorCampusId,
      })
      return result.total ?? 0
    },
    staleTime: 60 * 1000,
  })

  const {
    data: totalVisitedFromVisitSchedule,
    isLoading: isVisitedLoading,
    isRefetching: isVisitedRefetching,
    refetch: refetchVisited,
  } = useQuery({
    queryKey: dailyControlQueryKeys.visitScheduleStat({
      status: 'visited',
      visit_date_from: dateFrom,
      visit_date_to: dateTo,
      creator_campus_id: creatorCampusId,
    }),
    queryFn: async () => {
      const result = await getVisitSchedules({
        page: 1,
        size: 1,
        status: 'visited',
        visit_date_from: dateFrom,
        visit_date_to: dateTo,
        creator_campus_id: creatorCampusId,
      })
      return result.total ?? 0
    },
    staleTime: 60 * 1000,
  })

  const {
    data: paymentSummaryFromVisitSchedule,
    isLoading: isPaymentLoading,
    isRefetching: isPaymentRefetching,
    refetch: refetchPayment,
  } = useQuery({
    queryKey: [...dailyControlQueryKeys.paymentStat({
      page: 1,
      size: 1,
      status: 'confirmed',
      date_from: dateFrom,
      date_to: dateTo,
      creator_campus_id: creatorCampusId,
    }), 'summary'],
    queryFn: async () => {
      const firstPage = await getPayments({
        page: 1,
        size: 100,
        status: 'confirmed',
        date_from: dateFrom,
        date_to: dateTo,
        creator_campus_id: creatorCampusId,
      })

      const sumAmount = (items: Array<{ amount: number }>) =>
        items.reduce((total, item) => total + Number(item.amount || 0), 0)

      let totalAmount = sumAmount(firstPage.items || [])

      if ((firstPage.pages || 0) > 1) {
        const restPages = await Promise.all(
          Array.from({ length: firstPage.pages - 1 }, (_, index) =>
            getPayments({
              page: index + 2,
              size: 100,
              status: 'confirmed',
              date_from: dateFrom,
              date_to: dateTo,
              creator_campus_id: creatorCampusId,
            })
          )
        )

        totalAmount += restPages.reduce(
          (summary, page) => summary + sumAmount(page.items || []),
          0
        )
      }

      return {
        totalCount: firstPage.total ?? 0,
        totalAmount,
      } satisfies PaymentSummary
    },
    staleTime: 60 * 1000,
  })

  const reportData = useMemo(
    () => rawData ? normalizeReportResponse(rawData) : undefined,
    [rawData]
  )

  const rows = useMemo<AdvisorConversionRow[]>(() => {
    return (reportData?.stats || []).map((item) => {
      const totalVisits = item.promised_count + item.visited_count
      return {
        id: item.advisor_id,
        advisorId: item.advisor_id,
        advisorName: item.advisor_name,
        campusId: item.campus_id,
        campusName: item.campus_name,
        promisedCount: item.promised_count,
        visitedCount: item.visited_count,
        paymentCount: item.payment_count,
        paymentAmount: item.payment_amount,
        visitRate: totalVisits > 0
          ? Number(((item.visited_count / totalVisits) * 100).toFixed(1))
          : 0,
      }
    })
  }, [reportData?.stats])

  const summary = useMemo<AdvisorConversionSummary>(() => {
    const totalPromised = totalPromisedFromVisitSchedule ?? reportData?.total_promised ?? 0
    const totalVisited = totalVisitedFromVisitSchedule ?? reportData?.total_visited ?? 0
    const totalVisits = totalPromised + totalVisited

    return {
      totalAdvisors: reportData?.total_advisors || 0,
      totalPromised,
      totalVisited,
      totalPaymentCount: paymentSummaryFromVisitSchedule?.totalCount ?? reportData?.total_payment_count ?? 0,
      totalPaymentAmount: paymentSummaryFromVisitSchedule?.totalAmount ?? reportData?.total_payment_amount ?? 0,
      totalVisitRate: totalVisits > 0
        ? Number(((totalVisited / totalVisits) * 100).toFixed(1))
        : 0,
      visitRate: totalVisits > 0
        ? Number(((totalVisited / totalVisits) * 100).toFixed(1))
        : 0,
    }
  }, [paymentSummaryFromVisitSchedule, reportData, totalPromisedFromVisitSchedule, totalVisitedFromVisitSchedule])

  const isLoading = isReportLoading || isPromisedLoading || isVisitedLoading || isPaymentLoading
  const isRefetching = isReportRefetching || isPromisedRefetching || isVisitedRefetching || isPaymentRefetching

  const refetch = async () => {
    await Promise.all([
      refetchReport(),
      refetchPromised(),
      refetchVisited(),
      refetchPayment(),
    ])
  }

  return {
    rows,
    summary,
    isLoading,
    isRefetching,
    refetch,
  }
}
