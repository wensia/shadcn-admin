import { useState, useRef, useCallback } from 'react'

export interface ToolCallInfo {
  name: string
  displayName: string
  status: 'running' | 'done'
  summary?: string
  argsSummary?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  toolCalls?: ToolCallInfo[]
  thinking?: string
  streamStartTime?: number
}

export function useAIChat(options?: {
  sessionId?: string | null
  onTitleGenerated?: (title: string) => void
}) {
  const sessionId = options?.sessionId
  const onTitleGenerated = options?.onTitleGenerated

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
      thinking: '',
      streamStartTime: Date.now(),
    }
    setMessages(prev => [...prev, assistantMessage])

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const token = localStorage.getItem('access_token') || ''

      // 无 sessionId 时构建历史（向后兼容）
      const url = sessionId
        ? `/api/v1/yunke/ai-chat/sessions/${sessionId}/chat`
        : '/api/v1/yunke/ai-chat'

      const body = sessionId
        ? { message: content.trim() }
        : { message: content.trim(), history: messagesRef.current.map(msg => ({ role: msg.role, content: msg.content })) }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          try {
            const data = JSON.parse(trimmed.slice(6))

            switch (data.type) {
              case 'thinking':
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, thinking: (msg.thinking || '') + data.content }
                    : msg
                ))
                break

              case 'text':
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                ))
                break

              case 'tool_start':
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        toolCalls: [
                          ...(msg.toolCalls || []),
                          {
                            name: data.name,
                            displayName: data.display_name,
                            status: 'running' as const,
                            argsSummary: data.args_summary,
                          },
                        ],
                      }
                    : msg
                ))
                break

              case 'tool_result':
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        toolCalls: (msg.toolCalls || []).map(tc =>
                          tc.name === data.name
                            ? { ...tc, status: 'done' as const, summary: data.summary }
                            : tc
                        ),
                      }
                    : msg
                ))
                break

              case 'error':
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + `\n\n> ${data.message}`, isStreaming: false }
                    : msg
                ))
                break

              case 'done':
                if (data.title && onTitleGenerated) {
                  onTitleGenerated(data.title)
                }
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, isStreaming: false }
                    : msg
                ))
                break
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: msg.content + '\n\n*[已停止生成]*', isStreaming: false }
            : msg
        ))
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: '抱歉，请求失败，请稍后重试。', isStreaming: false }
            : msg
        ))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [isLoading, sessionId, onTitleGenerated])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const loadMessages = useCallback(async (sid: string) => {
    try {
      const token = localStorage.getItem('access_token') || ''
      const res = await fetch(`/api/v1/yunke/ai-chat/sessions/${sid}/messages`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const json = await res.json()
      if (json.code === 200 && Array.isArray(json.data)) {
        const loaded: ChatMessage[] = json.data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
          isStreaming: false,
        }))
        setMessages(loaded)
      }
    } catch (e) {
      console.error('加载消息失败', e)
    }
  }, [])

  return { messages, isLoading, sendMessage, stopGeneration, clearMessages, loadMessages }
}
