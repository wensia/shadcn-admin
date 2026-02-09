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
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    // 构建历史（从现有消息中提取）
    const history = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // 创建 assistant 占位消息
    const assistantId = crypto.randomUUID()
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
      thinking: '',
    }
    setMessages(prev => [...prev, assistantMessage])

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const token = localStorage.getItem('access_token') || ''
      const response = await fetch('/api/v1/yunke/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content.trim(), history }),
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
  }, [messages, isLoading])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isLoading, sendMessage, stopGeneration, clearMessages }
}
