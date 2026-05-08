import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'
import type {
  EducationDomain,
  EducationListParams,
  EducationListResponse,
  EducationPayload,
  EducationRecord,
} from './types'

const BASE_URL = '/education'

const domainPathMap: Record<EducationDomain, string> = {
  students: 'students',
  parents: 'parents',
  teachers: 'teachers',
  'course-products': 'course-products',
  packages: 'packages',
  classes: 'classes',
  lessons: 'lessons',
  consumption: 'consumption',
  balances: 'balances',
  finance: 'finance',
  'teacher-fees': 'teacher-fees',
  'teacher-settlements': 'teacher-settlements',
}

const buildPath = (domain: EducationDomain, id?: string | number) => {
  const path = `${BASE_URL}/${domainPathMap[domain]}`
  return id == null ? path : `${path}/${id}`
}

export const educationApi = {
  list(domain: EducationDomain, params?: EducationListParams): Promise<ApiResponse<EducationListResponse>> {
    return apiClient.get(buildPath(domain), { params })
  },

  get(domain: EducationDomain, id: string | number): Promise<ApiResponse<EducationRecord>> {
    return apiClient.get(buildPath(domain, id))
  },

  create(domain: EducationDomain, data: EducationPayload): Promise<ApiResponse<EducationRecord>> {
    return apiClient.post(buildPath(domain), data)
  },

  update(
    domain: EducationDomain,
    id: string | number,
    data: EducationPayload,
  ): Promise<ApiResponse<EducationRecord>> {
    return apiClient.put(buildPath(domain, id), data)
  },

  delete(domain: EducationDomain, id: string | number): Promise<ApiResponse<void>> {
    return apiClient.delete(buildPath(domain, id))
  },

  export(domain: EducationDomain, params?: EducationListParams): Promise<Blob> {
    return apiClient.get(`${buildPath(domain)}/export`, {
      params,
      responseType: 'blob',
    }) as unknown as Promise<Blob>
  },

  confirmAttendance(lessonId: string | number, attendances: EducationPayload[]): Promise<ApiResponse<EducationRecord[]>> {
    return apiClient.post(`${BASE_URL}/lessons/${lessonId}/confirm-attendance`, { attendances })
  },

  cancelLesson(lessonId: string | number): Promise<ApiResponse<EducationRecord>> {
    return apiClient.post(`${BASE_URL}/lessons/${lessonId}/cancel`)
  },

  reverseAttendance(attendanceId: string | number, reason?: string): Promise<ApiResponse<EducationRecord>> {
    return apiClient.post(`${BASE_URL}/attendance/${attendanceId}/reverse`, { reason })
  },

  adjustBalance(data: EducationPayload): Promise<ApiResponse<EducationRecord>> {
    return apiClient.post(`${BASE_URL}/balance-transactions/adjust`, data)
  },

  generateTeacherSettlement(data: EducationPayload): Promise<ApiResponse<EducationRecord>> {
    return apiClient.post(`${BASE_URL}/teacher-settlements/generate`, data)
  },

  confirmTeacherSettlement(settlementId: string | number, remark?: string): Promise<ApiResponse<EducationRecord>> {
    return apiClient.post(`${BASE_URL}/teacher-settlements/${settlementId}/confirm`, { remark })
  },

  markTeacherSettlementPaid(settlementId: string | number, remark?: string): Promise<ApiResponse<EducationRecord>> {
    return apiClient.post(`${BASE_URL}/teacher-settlements/${settlementId}/mark-paid`, { remark })
  },
}
