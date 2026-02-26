import { useState, useEffect, useRef, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, copyToClipboard } from '@/lib/utils'
import type { ChatMessage } from './use-ai-chat'
import { ChatToolIndicator } from './chat-tool-indicator'
import { Spinner } from './spinner'

// ---------------------------------------------------------------------------
// Content buffering logic (from Agent Craft)
// ---------------------------------------------------------------------------

const BUFFER_CONFIG = {
  MIN_WORDS_STANDARD: 40,
  MIN_WORDS_CODE: 15,
  MIN_WORDS_LIST: 20,
  MIN_BUFFER_MS: 500,
  MAX_BUFFER_MS: 2500,
  CONTENT_THROTTLE_MS: 300,
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length
}

function hasCodeBlock(text: string): boolean {
  return /```/.test(text)
}

function hasList(text: string): boolean {
  return /^\s*[-*\u2022]\s/m.test(text) || /^\s*\d+\.\s/m.test(text)
}

function hasHeader(text: string): boolean {
  return /^#{1,4}\s/m.test(text)
}

function hasStructure(text: string): boolean {
  if (/[.!?:]\s*$/.test(text.trimEnd())) return true
  if (/\n\s*\n/.test(text)) return true
  if (/\n\s*#{1,4}\s/.test(text)) return true
  if (hasCodeBlock(text)) return true
  return false
}

function shouldShowContent(
  text: string,
  isStreaming: boolean,
  streamStartTime?: number
): { shouldShow: boolean; reason: string } {
  const wordCount = countWords(text)
  if (!isStreaming) return { shouldShow: true, reason: 'complete' }
  const elapsed = streamStartTime ? Date.now() - streamStartTime : 0
  if (elapsed < BUFFER_CONFIG.MIN_BUFFER_MS)
    return { shouldShow: false, reason: 'min_time' }
  if (elapsed > BUFFER_CONFIG.MAX_BUFFER_MS && wordCount >= 5)
    return { shouldShow: true, reason: 'timeout' }
  if (hasCodeBlock(text) && wordCount >= BUFFER_CONFIG.MIN_WORDS_CODE)
    return { shouldShow: true, reason: 'code' }
  if (hasHeader(text) && wordCount >= 12)
    return { shouldShow: true, reason: 'header' }
  if (hasList(text) && wordCount >= BUFFER_CONFIG.MIN_WORDS_LIST)
    return { shouldShow: true, reason: 'list' }
  if (wordCount >= BUFFER_CONFIG.MIN_WORDS_STANDARD && hasStructure(text))
    return { shouldShow: true, reason: 'threshold' }
  if (wordCount >= 60) return { shouldShow: true, reason: 'high_count' }
  return { shouldShow: false, reason: 'buffering' }
}

function isResponseBuffering(
  content: string,
  isStreaming: boolean,
  streamStartTime?: number
): boolean {
  if (!isStreaming) return false
  return !shouldShowContent(content, isStreaming, streamStartTime).shouldShow
}

// ---------------------------------------------------------------------------
// ResponseCard - AI response card with markdown rendering
// ---------------------------------------------------------------------------

function ResponseCard({
  text,
  isStreaming,
}: {
  text: string
  isStreaming: boolean
  streamStartTime?: number
}) {
  const [copied, setCopied] = useState(false)

  // Content throttle (300ms) for streaming
  const [displayedText, setDisplayedText] = useState(text)
  const throttleRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text)
      return
    }
    if (throttleRef.current) return
    throttleRef.current = setTimeout(() => {
      setDisplayedText(text)
      throttleRef.current = undefined
    }, BUFFER_CONFIG.CONTENT_THROTTLE_MS)
    return () => {
      if (throttleRef.current) clearTimeout(throttleRef.current)
    }
  }, [text, isStreaming])

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text])

  return (
    <div className="bg-background shadow-minimal rounded-[8px] overflow-hidden">
      {/* Content area */}
      <div
        className="pl-[22px] pr-[16px] py-3 text-sm overflow-y-auto prose prose-sm dark:prose-invert max-w-none max-h-[70vh] md:max-h-[540px]"
      >
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
              <th
                className="border px-2 py-1 bg-muted/50 text-left font-medium"
                {...props}
              >
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
                <code
                  className="bg-muted/50 px-1 py-0.5 rounded text-xs"
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            },
            pre: ({ children, ...props }) => (
              <pre
                className="bg-muted/50 rounded p-3 overflow-x-auto text-xs"
                {...props}
              >
                {children}
              </pre>
            ),
          }}
        >
          {displayedText}
        </ReactMarkdown>
      </div>

      {/* Footer */}
      {isStreaming ? (
        <div className="px-4 py-2 border-t border-border/30 flex items-center bg-muted/20 text-[13px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner className="text-[10px]" />
            <span>回复中...</span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between bg-muted/20 text-[13px]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1.5 transition-colors select-none',
                copied
                  ? 'text-green-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChatMessageItem - main exported component
// ---------------------------------------------------------------------------

interface ChatMessageItemProps {
  message: ChatMessage
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex flex-col items-end w-full">
          <div className="max-w-[90%] md:max-w-[80%] bg-foreground/5 rounded-[16px] px-4 md:px-5 py-3 md:py-3.5">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  // AI message - TurnCard style
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0
  const isBuffering = message.content
    ? isResponseBuffering(
        message.content,
        !!message.isStreaming,
        message.streamStartTime
      )
    : false
  const isThinking = !hasToolCalls && message.isStreaming && !message.content
  const allToolsDone = hasToolCalls && message.toolCalls!.every(t => t.status === 'done')
  const showThinkingInToolIndicator = !!allToolsDone && !!message.isStreaming && (!message.content || isBuffering)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="w-full space-y-1">
        {/* Activity area */}
        {hasToolCalls && (
          <ChatToolIndicator
            toolCalls={message.toolCalls!}
            isThinking={showThinkingInToolIndicator}
            isBuffering={isBuffering}
          />
        )}

        {/* Standalone thinking indicator (no tool calls) */}
        {isThinking && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground text-[13px]">
            <Spinner className="text-[10px]" />
            <span>正在思考...</span>
          </div>
        )}

        {/* ResponseCard - only show when not buffering */}
        {message.content && !isBuffering && (
          <ResponseCard
            text={message.content}
            isStreaming={!!message.isStreaming}
            streamStartTime={message.streamStartTime}
          />
        )}

        {/* Buffering indicator (only when tool indicator isn't already showing it) */}
        {isBuffering && !showThinkingInToolIndicator && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground text-[13px]">
            <Spinner className="text-[10px]" />
            <span>正在生成回复...</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
