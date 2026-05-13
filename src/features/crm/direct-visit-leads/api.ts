import { apiClient } from '@/lib/api/client'
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types'
import type {
  DirectVisitCampusTokenItem,
  DirectVisitCampusTokensResponse,
  DirectVisitLeadAccess,
  DirectVisitLeadDetail,
  DirectVisitLeadItem,
  DirectVisitLeadParams,
  DirectVisitReceptionistItem,
  DirectVisitReceptionRequest,
  DirectVisitReceptionUpsertResult,
} from './types'

export const directVisitLeadsApi = {
  access(): Promise<ApiResponse<DirectVisitLeadAccess>> {
    return apiClient.get('/crm/direct-visit-leads/access')
  },

  tokens(): Promise<ApiResponse<DirectVisitCampusTokensResponse>> {
    return apiClient.get('/crm/direct-visit-leads/tokens')
  },

  createToken(campusId: string): Promise<ApiResponse<DirectVisitCampusTokenItem>> {
    return apiClient.post(`/crm/direct-visit-leads/tokens/${campusId}`)
  },

  list(
    params?: DirectVisitLeadParams,
  ): Promise<ApiResponse<PaginatedResponse<DirectVisitLeadItem>>> {
    return apiClient.get('/crm/direct-visit-leads', { params })
  },

  detail(id: string): Promise<ApiResponse<DirectVisitLeadDetail>> {
    return apiClient.get(`/crm/direct-visit-leads/${id}`)
  },

  receptionists(
    campusId: string,
    search?: string,
  ): Promise<ApiResponse<DirectVisitReceptionistItem[]>> {
    return apiClient.get('/crm/direct-visit-leads/receptionists', {
      params: {
        campus_id: campusId,
        search: search || undefined,
      },
    })
  },

  saveReception(
    id: string,
    data: DirectVisitReceptionRequest,
  ): Promise<ApiResponse<DirectVisitReceptionUpsertResult>> {
    return apiClient.put(`/crm/direct-visit-leads/${id}/reception`, data)
  },

  assign(id: string, advisorId: string): Promise<ApiResponse<DirectVisitLeadDetail>> {
    return apiClient.post(`/crm/direct-visit-leads/${id}/assign`, {
      advisor_id: advisorId,
    })
  },
}
