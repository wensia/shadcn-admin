import { useCallback, useRef, useState, type SetStateAction } from 'react'
import { coachApi } from './coach-api'
import type { TrainingMessage } from './coach-types'

function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

interface UseCoachTextChatOptions {
  sessionId: string | null
  setMessages: (updater: SetStateAction<TrainingMessage[]>) => void
  onStageChange?: (stage: string) => void
  onAfterDone?: () => Promise<void> | void
}

export function useCoachTextChat({
  sessionId,
  setMessages,
  onStageChange,
  onAfterDone,
}: UseCoachTextChatOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || !sessionId || isLoading) return

    const now = new Date().toISOString()
    const userId = createLocalId('coach-user')
    const assistantId = createLocalId('coach-assistant')

    setMessages((prev) => [
      ...prev,
      {
        id: userId,
        role: 'user',
        content: trimmed,
        source: 'text',
        sequence_no: prev.length + 1,
        created_at: now,
      },
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        source: 'text',
        sequence_no: prev.length + 2,
        created_at: now,
        isStreaming: true,
        thinking: '',
      },
    ])

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setIsLoading(true)

    try {
      await coachApi.streamTextChat(sessionId, trimmed, {
        signal: abortController.signal,
        onEvent: (eventType, payload) => {
          if (eventType === 'stage') {
            const nextStage = String(payload.stage || '')
            setCurrentStage(nextStage)
            onStageChange?.(nextStage)
            return
          }

          if (eventType === 'thinking') {
            setMessages((prev) => prev.map((item) => (
              item.id === assistantId
                ? { ...item, thinking: `${item.thinking || ''}${String(payload.content || '')}` }
                : item
            )))
            return
          }

          if (eventType === 'text') {
            setMessages((prev) => prev.map((item) => (
              item.id === assistantId
                ? { ...item, content: `${item.content}${String(payload.content || '')}` }
                : item
            )))
            return
          }

          if (eventType === 'error') {
            setMessages((prev) => prev.map((item) => (
              item.id === assistantId
                ? {
                    ...item,
                    content: item.content || String(payload.message || '陪练请求失败，请稍后重试。'),
                    isStreaming: false,
                  }
                : item
            )))
            return
          }

          if (eventType === 'done') {
            setMessages((prev) => prev.map((item) => (
              item.id === assistantId ? { ...item, isStreaming: false } : item
            )))
          }
        },
      })

      await onAfterDone?.()
    } catch (error) {
      const isAbort = (error as Error).name === 'AbortError'
      setMessages((prev) => prev.map((item) => (
        item.id === assistantId
          ? {
              ...item,
              content: item.content || (isAbort ? '已停止本次生成。' : '陪练请求失败，请稍后重试。'),
              isStreaming: false,
            }
          : item
      )))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [isLoading, onAfterDone, onStageChange, sessionId, setMessages])

  return {
    isLoading,
    currentStage,
    setCurrentStage,
    sendMessage,
    stopGeneration,
  }
}

