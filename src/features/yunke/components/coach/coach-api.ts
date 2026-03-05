import { apiClient } from '@/lib/api/client'
import { unwrapData, type ApiResponse } from '@/lib/api/types'
import type {
  TrainingCatalog,
  TrainingCreatePayload,
  TrainingReview,
  TrainingSession,
  TrainingSessionDetail,
} from './coach-types'

const BASE_URL = '/yunke/advisor-training'
const STREAM_BASE_URL = '/api/v1/yunke/advisor-training'

type StreamEventType = 'stage' | 'thinking' | 'text' | 'done' | 'error'

function getAuthHeaders() {
  const token = localStorage.getItem('access_token') || ''
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

export const coachApi = {
  async getCatalog() {
    const response = await apiClient.get<ApiResponse<TrainingCatalog>>(`${BASE_URL}/catalog`)
    return unwrapData(response)
  },

  async listSessions() {
    const response = await apiClient.get<ApiResponse<TrainingSession[]>>(`${BASE_URL}/sessions`)
    return unwrapData(response)
  },

  async getSession(sessionId: string) {
    const response = await apiClient.get<ApiResponse<TrainingSessionDetail>>(`${BASE_URL}/sessions/${sessionId}`)
    return unwrapData(response)
  },

  async createSession(payload: TrainingCreatePayload) {
    const response = await apiClient.post<ApiResponse<TrainingSession>>(`${BASE_URL}/sessions`, payload)
    return unwrapData(response)
  },

  async renameSession(sessionId: string, title: string) {
    const response = await apiClient.patch<ApiResponse<TrainingSession>>(`${BASE_URL}/sessions/${sessionId}`, { title })
    return unwrapData(response)
  },

  async deleteSession(sessionId: string) {
    await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`${BASE_URL}/sessions/${sessionId}`)
  },

  /** 获取语音 WebSocket URL。 */
  getVoiceWsUrl(sessionId: string): string {
    const token = localStorage.getItem('access_token') || ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/v1/yunke/advisor-training/sessions/${sessionId}/voice/ws?token=${encodeURIComponent(token)}`
  },

  /** 备用停止端点 (WebSocket 异常时)。 */
  async stopVoice(sessionId: string) {
    const response = await apiClient.post<ApiResponse<{ accepted: boolean; status: string }>>(
      `${BASE_URL}/sessions/${sessionId}/voice/stop`
    )
    return unwrapData(response)
  },

  async generateReview(sessionId: string) {
    const response = await apiClient.post<ApiResponse<{ review: TrainingReview }>>(
      `${BASE_URL}/sessions/${sessionId}/review/generate`
    )
    return unwrapData(response).review
  },

  async streamTextChat(
    sessionId: string,
    message: string,
    options: {
      signal?: AbortSignal
      onEvent: (eventType: StreamEventType, payload: Record<string, unknown>) => void
    }
  ) {
    const response = await fetch(`${STREAM_BASE_URL}/sessions/${sessionId}/text-chat`, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        ...Object.fromEntries(getAuthHeaders().entries()),
      }),
      body: JSON.stringify({ message }),
      signal: options.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法建立流式连接')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() || ''

      for (const chunk of chunks) {
        const lines = chunk.split('\n')
        let eventType: StreamEventType = 'text'
        let payload = ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim() as StreamEventType
          }
          if (line.startsWith('data:')) {
            payload += line.slice(5).trim()
          }
        }

        if (!payload) continue
        try {
          options.onEvent(eventType, JSON.parse(payload) as Record<string, unknown>)
        } catch {
          // 忽略单条坏数据，继续消费流
        }
      }
    }
  },
}
