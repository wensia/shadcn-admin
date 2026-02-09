import { useState, useEffect, useRef } from 'react'
import { Brain, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from './use-ai-chat'
import { ChatToolIndicator } from './chat-tool-indicator'

function ThinkingSection({ thinking, isStreaming }: { thinking: string; isStreaming?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const prevLengthRef = useRef(thinking.length)

  useEffect(() => {
    if (isStreaming && thinking.length > prevLengthRef.current) {
      setIsOpen(true)
    }
    prevLengthRef.current = thinking.length
  }, [thinking, isStreaming])

  return (
    <div className="rounded-[8px] border border-foreground/10 overflow-hidden mb-2">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-foreground/[0.03] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Brain className="h-3.5 w-3.5 text-foreground/40" />
        <span className="text-[13px] text-foreground/50 font-medium">思考过程</span>
        <motion.div
          className="ml-auto"
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <ChevronRight className="h-3.5 w-3.5 text-foreground/40" />
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 max-h-[200px] overflow-y-auto">
              <p className="text-xs text-foreground/50 whitespace-pre-wrap leading-relaxed">
                {thinking}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-3 bg-foreground/50 animate-pulse ml-0.5 align-text-bottom" />
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ChatMessageItemProps {
  message: ChatMessage
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {isUser ? (
        <div className="flex flex-col items-end w-full">
          <div className="max-w-[80%] bg-foreground/5 rounded-[16px] px-5 py-3.5">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-1">
          {message.thinking && (
            <ThinkingSection thinking={message.thinking} isStreaming={message.isStreaming} />
          )}

          {message.toolCalls && message.toolCalls.length > 0 && (
            <ChatToolIndicator toolCalls={message.toolCalls} />
          )}

          {message.content && (
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
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}

          {!message.content && message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse" />
          )}
        </div>
      )}
    </motion.div>
  )
}
