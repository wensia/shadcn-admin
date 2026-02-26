import axios from 'axios'

const publicClient = axios.create({ baseURL: '/api/v1' })

export interface SubmitResultItem {
  phone: string
  status: 'created' | 'collision_taken' | 'collision_active' | 'duplicate' | 'invalid' | 'error'
  message: string
}

export interface ChannelSubmitResponse {
  results: SubmitResultItem[]
  summary: {
    total: number
    created: number
    collision_taken: number
    collision_active: number
    duplicate: number
    invalid: number
    error: number
  }
}

export async function validateChannelToken(token: string) {
  const { data } = await publicClient.get('/public/leads/channel-validate', { params: { token } })
  // ApiResponse wrapper: { success, data, message }
  if (data.success === false) throw new Error(data.message || '验证失败')
  return data.data as { valid: boolean; channel_name: string }
}

export async function submitChannelLeads(token: string, phones: string[]) {
  const { data } = await publicClient.post('/public/leads/channel-submit', { token, phones })
  if (data.success === false) throw new Error(data.message || '提交失败')
  return data.data as ChannelSubmitResponse
}
