import { useEffect, useRef } from 'react'
import { Trash2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAIChat } from './use-ai-chat'
import { ChatMessageItem } from './chat-message-item'
import { ChatInput } from './chat-input'

export function AIChatContainer() {
  const { messages, isLoading, sendMessage, stopGeneration, clearMessages } = useAIChat()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    )
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))]">
      {/* 头部工具栏 */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end px-4 py-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-muted-foreground"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            清除对话
          </Button>
        </div>
      )}

      {/* 消息区域 */}
      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          /* 空状态欢迎页 */
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">AI 数据助手</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              我可以帮你查询通话记录、线索数据、员工业绩等信息。
              试试下面的快捷提问，或直接输入你的问题。
            </p>
          </div>
        ) : (
          /* 消息列表 */
          <div className="space-y-6 py-4">
            {messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 输入区域 */}
      <div className="border-t px-4 py-3">
        <ChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
