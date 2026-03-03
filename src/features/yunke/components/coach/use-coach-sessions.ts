import { useCallback, useEffect, useState, type SetStateAction } from 'react'
import { coachApi } from './coach-api'
import type {
  TrainingCatalog,
  TrainingCreatePayload,
  TrainingMessage,
  TrainingReview,
  TrainingSession,
  TrainingSessionDetail,
  TrainingVoiceStatus,
} from './coach-types'

export function useCoachSessions() {
  const [catalog, setCatalog] = useState<TrainingCatalog | null>(null)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentDetail, setCurrentDetail] = useState<TrainingSessionDetail | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [sessionListError, setSessionListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [isSessionListLoading, setIsSessionListLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const fetchCatalog = useCallback(async () => {
    setIsCatalogLoading(true)
    try {
      setCatalog(await coachApi.getCatalog())
      setCatalogError(null)
    } catch (error) {
      setCatalogError((error as Error).message || '加载训练目录失败')
      throw error
    } finally {
      setIsCatalogLoading(false)
    }
  }, [])

  const fetchSessions = useCallback(async () => {
    setIsSessionListLoading(true)
    try {
      const items = await coachApi.listSessions()
      setSessions(items)
      setSessionListError(null)
      setCurrentSessionId((prev) => (prev && items.some((item) => item.id === prev) ? prev : (items[0]?.id ?? null)))
    } catch (error) {
      setSessionListError((error as Error).message || '加载陪练记录失败')
      throw error
    } finally {
      setIsSessionListLoading(false)
    }
  }, [])

  const loadSession = useCallback(async (sessionId: string) => {
    setIsDetailLoading(true)
    try {
      const detail = await coachApi.getSession(sessionId)
      setCurrentDetail(detail)
      setDetailError(null)
      setSessions((prev) => prev.map((item) => (item.id === detail.session.id ? detail.session : item)))
      return detail
    } catch (error) {
      setDetailError((error as Error).message || '加载会话详情失败')
      throw error
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCatalog().catch(() => undefined)
    void fetchSessions().catch(() => undefined)
  }, [fetchCatalog, fetchSessions])

  useEffect(() => {
    if (!currentSessionId) {
      setCurrentDetail(null)
      setDetailError(null)
      return
    }
    void loadSession(currentSessionId).catch(() => undefined)
  }, [currentSessionId, loadSession])

  const createSession = useCallback(async (payload: TrainingCreatePayload) => {
    setIsCreating(true)
    try {
      const created = await coachApi.createSession(payload)
      setSessions((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
      setCurrentDetail({
        session: created,
        messages: [],
        voice_status: null,
        review: null,
      })
      setCurrentSessionId(created.id)
      return created
    } finally {
      setIsCreating(false)
    }
  }, [])

  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
  }, [])

  const renameSession = useCallback(async (sessionId: string, title: string) => {
    const updated = await coachApi.renameSession(sessionId, title)
    setSessions((prev) => prev.map((item) => (item.id === sessionId ? updated : item)))
    setCurrentDetail((prev) => (prev?.session.id === sessionId ? { ...prev, session: updated } : prev))
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    await coachApi.deleteSession(sessionId)
    setSessions((prev) => {
      const next = prev.filter((item) => item.id !== sessionId)
      setCurrentSessionId((current) => (current === sessionId ? (next[0]?.id ?? null) : current))
      return next
    })
    setCurrentDetail((prev) => (prev?.session.id === sessionId ? null : prev))
  }, [])

  const refreshCurrentSession = useCallback(async () => {
    if (!currentSessionId) return null
    return loadSession(currentSessionId)
  }, [currentSessionId, loadSession])

  const setCurrentMessages = useCallback((updater: SetStateAction<TrainingMessage[]>) => {
    setCurrentDetail((prev) => {
      if (!prev) return prev
      const nextMessages = typeof updater === 'function' ? updater(prev.messages) : updater
      return { ...prev, messages: nextMessages }
    })
  }, [])

  const patchCurrentSession = useCallback((patch: Partial<TrainingSession>) => {
    setCurrentDetail((prev) => {
      if (!prev) return prev
      const nextSession = { ...prev.session, ...patch }
      return { ...prev, session: nextSession }
    })
    setSessions((prev) => prev.map((item) => (item.id === currentSessionId ? { ...item, ...patch } : item)))
  }, [currentSessionId])

  const setCurrentReview = useCallback((review: TrainingReview | null) => {
    setCurrentDetail((prev) => (prev ? { ...prev, review } : prev))
  }, [])

  const setCurrentVoiceStatus = useCallback((voiceStatus: TrainingVoiceStatus | null) => {
    setCurrentDetail((prev) => (prev ? { ...prev, voice_status: voiceStatus } : prev))
  }, [])

  return {
    catalog,
    sessions,
    currentSessionId,
    currentDetail,
    currentSession: currentDetail?.session ?? null,
    catalogError,
    sessionListError,
    detailError,
    isCatalogLoading,
    isSessionListLoading,
    isDetailLoading,
    isCreating,
    fetchSessions,
    createSession,
    selectSession,
    renameSession,
    deleteSession,
    refreshCurrentSession,
    setCurrentMessages,
    patchCurrentSession,
    setCurrentReview,
    setCurrentVoiceStatus,
  }
}
