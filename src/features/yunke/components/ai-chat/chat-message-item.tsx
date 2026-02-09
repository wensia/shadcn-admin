import { useState, useEffect, useRef } from 'react'
import { Bot, User, Brain, ChevronDown, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { ChatMessage } from './use-ai-chat'
import { ChatToolIndicator } from './chat-tool-indicator'

function ThinkingSection({ thinking, isStreaming }: { thinking: string; isStreaming?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const prevLengthRef = useRef(thinking.length)

  // 流式时 thinking 正在增长则自动展开
  useEffect(() => {
    if (isStreaming && thinking.length > prevLengthRef.current) {
      setIsOpen(true)
    }
    prevLengthRef.current = thinking.length
  }, [thinking, isStreaming])

  const ChevronIcon = isOpen ? ChevronDown : ChevronRight

  return (
    <div className="border rounded-lg mb-2">
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Brain className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">思考过程</span>
        <ChevronIcon className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
      </div>
      {isOpen && (
        <div className="px-3 pb-3">
          <div className="max-h-[200px] overflow-y-auto">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{thinking}</p>
            {isStreaming && (
              <span className="inline-block w-1.5 h-3 bg-muted-foreground/50 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ChatMessageItemProps {
  message: ChatMessage
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('max-w-[80%] space-y-1', isUser && 'items-end')}>
        {/* 思考过程 - 在工具调用之前 */}
        {!isUser && message.thinking && (
          <ThinkingSection thinking={message.thinking} isStreaming={message.isStreaming} />
        )}

        {/* 工具调用指示 */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ChatToolIndicator toolCalls={message.toolCalls} />
        )}

        {/* 消息内容 */}
        <div className={cn(
          'rounded-lg px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children, ...props }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full text-xs" {...props}>
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children, ...props }) => (
                    <th className="border px-2 py-1 bg-muted/50 text-left font-medium" {...props}>
                      {children}
                    </th>
                  ),
                  td: ({ children, ...props }) => (
                    <td className="border px-2 py-1" {...props}>
                      {children}
                    </td>
                  ),
                  code: ({ children, className, ...props }) => {
                    const isInline = !className
                    return isInline ? (
                      <code className="bg-muted/50 px-1 py-0.5 rounded text-xs" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                  pre: ({ children, ...props }) => (
                    <pre className="bg-muted/50 rounded p-3 overflow-x-auto text-xs" {...props}>
                      {children}
                    </pre>
                  ),
                }}
              >
                {message.content || ' '}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
