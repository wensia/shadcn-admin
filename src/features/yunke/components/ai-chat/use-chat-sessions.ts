import { useState, useCallback, useEffect } from 'react'

export interface ChatSession {
  id: string
  title: string
  last_message_at: string | null
  message_count: number
  created_at: string
}

const API_BASE = '/api/v1/yunke/ai-chat'

function getAuthHeaders() {
  const token = localStorage.getItem('access_token') || ''
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/sessions`, { headers: getAuthHeaders() })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setSessions(json.data)
      }
    } catch (e) {
      console.error('加载会话列表失败', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const createSession = useCallback(async (): Promise<string> => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title: '新对话' }),
    })
    const json = await res.json()
    if (json.success && json.data) {
      const newSession = json.data as ChatSession
      setSessions(prev => [newSession, ...prev])
      setCurrentSessionId(newSession.id)
      return newSession.id
    }
    throw new Error('创建会话失败')
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    const json = await res.json()
    if (json.success) {
      setSessions(prev => prev.filter(s => s.id !== id))
      if (currentSessionId === id) {
        setCurrentSessionId(null)
      }
    }
  }, [currentSessionId])

  const renameSession = useCallback(async (id: string, title: string) => {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    })
    const json = await res.json()
    if (json.success) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s))
    }
  }, [])

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id)
  }, [])

  const updateSessionTitle = useCallback((id: string, title: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s))
  }, [])

  return {
    sessions,
    currentSessionId,
    isLoading,
    createSession,
    deleteSession,
    renameSession,
    selectSession,
    updateSessionTitle,
    fetchSessions,
  }
}
