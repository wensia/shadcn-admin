import axios from 'axios'

const publicClient = axios.create({ baseURL: '/api/v1' })

export interface DirectVisitValidateResponse {
  valid: boolean
  campus_id: string
  campus_name: string
  channel_name: string
}

export interface DirectVisitSubmitRequest {
  token: string
  parent_phone: string
  parent_name?: string
  child_name?: string
  grade?: string
  school_name?: string
  notes?: string
}

export interface DirectVisitSubmitResponse {
  phone: string
  status: 'created' | 'collision_taken' | 'collision_active' | 'duplicate' | 'invalid' | 'error'
  message: string
}

export async function validateDirectVisitToken(token: string) {
  const { data } = await publicClient.get('/public/leads/direct-visit/validate', {
    params: { token },
  })
  if (data.success === false) throw new Error(data.message || '验证失败')
  return data.data as DirectVisitValidateResponse
}

export async function submitDirectVisitLead(payload: DirectVisitSubmitRequest) {
  const { data } = await publicClient.post('/public/leads/direct-visit-submit', payload)
  if (data.success === false) throw new Error(data.message || '提交失败')
  return data.data as DirectVisitSubmitResponse
}
