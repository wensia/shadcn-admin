import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type {
  LeadPaymentDashboardParams,
  LeadPaymentDashboardResponse,
  LeadPaymentLedgerParams,
  LeadPaymentLedgerResponse,
} from './types'

const BASE_URL = '/leads/statistics/lead-payment'

export const leadPaymentStatisticsApi = {
  getLedger(
    params?: LeadPaymentLedgerParams,
  ): Promise<ApiResponse<LeadPaymentLedgerResponse>> {
    return apiClient.get(`${BASE_URL}/ledger`, { params })
  },

  getDashboard(
    params?: LeadPaymentDashboardParams,
  ): Promise<ApiResponse<LeadPaymentDashboardResponse>> {
    return apiClient.get(`${BASE_URL}/dashboard`, { params })
  },
}
