import { useEffect, useRef, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { useAIChat } from './use-ai-chat'
import { ChatMessageItem } from './chat-message-item'
import { ChatInput } from './chat-input'

const QUICK_QUESTIONS = [
  '今日通话统计',
  '高意向线索列表',
  '员工业绩排名',
  '本周跟进情况',
]

interface AIChatContainerProps {
  sessionId: string | null
  onTitleGenerated?: (sessionId: string, title: string) => void
}

export function AIChatContainer({ sessionId, onTitleGenerated }: AIChatContainerProps) {
  const handleTitleGenerated = useCallback((title: string) => {
    if (sessionId && onTitleGenerated) {
      onTitleGenerated(sessionId, title)
    }
  }, [sessionId, onTitleGenerated])

  const { messages, isLoading, sendMessage, stopGeneration, clearMessages, loadMessages } = useAIChat({
    sessionId,
    onTitleGenerated: handleTitleGenerated,
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  // sessionId 变化时加载消息
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId)
    } else {
      clearMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))]">
      {/* 消息区域 - 带滚动渐变遮罩 */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto"
          style={{
            maskImage: hasMessages
              ? 'linear-gradient(to bottom, transparent 0%, black 32px, black calc(100% - 32px), transparent 100%)'
              : undefined,
            WebkitMaskImage: hasMessages
              ? 'linear-gradient(to bottom, transparent 0%, black 32px, black calc(100% - 32px), transparent 100%)'
              : undefined,
          }}
        >
          {!hasMessages ? (
            /* 空状态欢迎页 */
            <div className="flex flex-col items-center justify-center h-full">
              <div className="flex flex-col items-center max-w-[840px] mx-auto px-5">
                <div className="rounded-full bg-foreground/5 p-4 mb-4">
                  <Sparkles className="h-8 w-8 text-foreground/60" />
                </div>
                <h2 className="text-xl font-semibold mb-2">AI 数据助手</h2>
                <p className="text-foreground/50 text-center text-sm mb-8">
                  我可以帮你查询通话记录、线索数据、员工业绩等信息。
                </p>
                {/* 快捷提问按钮 */}
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className="rounded-[8px] bg-foreground/5 hover:bg-foreground/[0.08] text-[13px] px-3 py-2 transition-colors text-foreground/80"
                      onClick={() => sendMessage(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 消息列表 */
            <div className="max-w-[840px] mx-auto px-5 py-4 space-y-2.5">
              {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="shrink-0 max-w-[840px] w-full mx-auto px-5 pb-4 pt-2">
        <ChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
