import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  ArrowUp,
  AudioLines,
  ChevronDown,
  Copy,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Share2,
  Square,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { useAIChat, type ChatMessage, type ToolCallInfo } from './use-ai-chat'

const QUICK_QUESTIONS = [
  '今日通话统计',
  '高意向线索列表',
  '员工业绩排名',
  '本周跟进情况',
]

const threadWidthStyle: CSSProperties = {
  width: '100%',
  maxWidth: 768,
  margin: '0 auto',
}

const iconButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: 'rgb(95, 95, 95)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

function IconButton({
  label,
  children,
  onClick,
  style,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <button
      type='button'
      aria-label={label}
      onClick={onClick}
      style={{ ...iconButtonStyle, ...style }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'rgb(244, 244, 244)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

function copyText(content: string) {
  if (!content) return
  void navigator.clipboard?.writeText(content)
}

function ToolCallBlock({ tool }: { tool: ToolCallInfo }) {
  const detail = [tool.argsSummary, tool.summary].filter(Boolean).join(' · ')

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: '100%',
        border: '1px solid rgb(232, 232, 232)',
        borderRadius: 12,
        background: 'rgb(250, 250, 250)',
        padding: '8px 10px',
        color: 'rgb(95, 95, 95)',
        fontSize: 13,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background:
            tool.status === 'done' ? 'rgb(52, 168, 83)' : 'rgb(245, 166, 35)',
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600, color: 'rgb(13, 13, 13)' }}>
        {tool.displayName || tool.name}
      </span>
      {detail && (
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {detail}
        </span>
      )}
    </div>
  )
}

function AssistantActions({ content }: { content: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        marginTop: 10,
        color: 'rgb(95, 95, 95)',
      }}
    >
      <IconButton label='复制' onClick={() => copyText(content)}>
        <Copy size={18} strokeWidth={1.7} />
      </IconButton>
      <IconButton label='评论'>
        <MessageSquare size={18} strokeWidth={1.7} />
      </IconButton>
      <IconButton label='分享'>
        <Share2 size={18} strokeWidth={1.7} />
      </IconButton>
      <IconButton label='重新生成'>
        <RefreshCw size={18} strokeWidth={1.7} />
      </IconButton>
      <IconButton label='赞同'>
        <ThumbsUp size={18} strokeWidth={1.7} />
      </IconButton>
      <IconButton label='不赞同'>
        <ThumbsDown size={18} strokeWidth={1.7} />
      </IconButton>
      <IconButton label='更多'>
        <MoreHorizontal size={18} strokeWidth={1.7} />
      </IconButton>
    </div>
  )
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '12px 0',
      }}
    >
      <div
        style={{
          maxWidth: '72%',
          borderRadius: 20,
          background: 'rgb(244, 244, 244)',
          color: 'rgb(13, 13, 13)',
          padding: '10px 16px',
          fontSize: 16,
          lineHeight: '26px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>
    </div>
  )
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const hasContent = Boolean(message.content)

  return (
    <div style={{ padding: '18px 0' }}>
      {message.thinking && (
        <div
          style={{
            marginBottom: 12,
            color: 'rgb(143, 143, 143)',
            fontSize: 14,
            lineHeight: '22px',
          }}
        >
          {message.isStreaming ? '正在思考' : '已思考'} · {message.thinking}
        </div>
      )}

      {message.toolCalls?.length ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: hasContent ? 12 : 0,
          }}
        >
          {message.toolCalls.map((tool, index) => (
            <ToolCallBlock key={`${tool.name}-${index}`} tool={tool} />
          ))}
        </div>
      ) : null}

      {hasContent || message.isStreaming ? (
        <div
          style={{
            color: 'rgb(13, 13, 13)',
            fontSize: 16,
            lineHeight: '28px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
          {message.isStreaming && (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 18,
                marginLeft: 2,
                verticalAlign: '-2px',
                borderRadius: 2,
                background: 'rgb(13, 13, 13)',
                opacity: 0.8,
              }}
            />
          )}
        </div>
      ) : null}

      {!message.isStreaming && hasContent && (
        <AssistantActions content={message.content} />
      )}
    </div>
  )
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return <UserMessage message={message} />
  }

  return <AssistantMessage message={message} />
}

function EmptyState({
  onQuestionClick,
}: {
  onQuestionClick: (text: string) => void
}) {
  return (
    <div
      style={{
        ...threadWidthStyle,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px 0 36px',
      }}
    >
      <h1
        style={{
          margin: 0,
          color: 'rgb(13, 13, 13)',
          fontSize: 30,
          lineHeight: '38px',
          fontWeight: 600,
          letterSpacing: 0,
          textAlign: 'center',
        }}
      >
        有什么可以帮忙的？
      </h1>
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {QUICK_QUESTIONS.map((question) => (
          <button
            key={question}
            type='button'
            onClick={() => onQuestionClick(question)}
            style={{
              height: 40,
              border: '1px solid rgb(232, 232, 232)',
              borderRadius: 999,
              background: 'rgb(255, 255, 255)',
              color: 'rgb(95, 95, 95)',
              padding: '0 14px',
              fontSize: 14,
              cursor: 'pointer',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'rgb(247, 247, 247)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'rgb(255, 255, 255)'
            }}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}

function Composer({
  isLoading,
  onSend,
  onStop,
}: {
  isLoading: boolean
  onSend: (content: string) => void
  onStop: () => void
}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = input.trim().length > 0

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '40px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [input])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading) {
      onStop()
      return
    }
    const trimmed = input.trim()
    if (!trimmed) return
    setInput('')
    onSend(trimmed)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  return (
    <div
      style={{
        ...threadWidthStyle,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          minHeight: 102,
          border: '1px solid rgb(217, 217, 217)',
          borderRadius: 28,
          background: 'rgb(255, 255, 255)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          padding: '12px 14px 10px',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='有问题，尽管问'
          rows={1}
          style={{
            width: '100%',
            minHeight: 40,
            maxHeight: 160,
            border: 0,
            outline: 0,
            resize: 'none',
            background: 'transparent',
            color: 'rgb(13, 13, 13)',
            fontSize: 16,
            lineHeight: '26px',
            padding: '0 8px',
            overflowY: 'auto',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconButton label='添加' style={{ width: 34, height: 34 }}>
              <Plus size={20} strokeWidth={1.8} />
            </IconButton>
            <button
              type='button'
              style={{
                height: 34,
                border: '1px solid rgb(232, 232, 232)',
                borderRadius: 999,
                background: 'rgb(255, 255, 255)',
                color: 'rgb(95, 95, 95)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 12px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'rgb(231, 248, 235)',
                  color: 'rgb(34, 139, 79)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                $
              </span>
              CRM 数据
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type='button'
              style={{
                height: 34,
                border: 0,
                borderRadius: 999,
                background: 'transparent',
                color: 'rgb(143, 143, 143)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 8px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              进阶专业
              <ChevronDown size={14} strokeWidth={1.8} />
            </button>
            <IconButton label='语音输入' style={{ width: 34, height: 34 }}>
              <Mic size={18} strokeWidth={1.8} />
            </IconButton>
            <button
              type='submit'
              aria-label={isLoading ? '停止生成' : '发送'}
              disabled={!isLoading && !canSend}
              style={{
                width: 38,
                height: 38,
                border: 0,
                borderRadius: '50%',
                background:
                  isLoading || canSend
                    ? 'rgb(13, 13, 13)'
                    : 'rgb(214, 214, 214)',
                color: 'rgb(255, 255, 255)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLoading || canSend ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? (
                <Square size={14} fill='currentColor' strokeWidth={0} />
              ) : canSend ? (
                <ArrowUp size={20} strokeWidth={2.2} />
              ) : (
                <AudioLines size={20} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </form>
      <div
        style={{
          marginTop: 8,
          color: 'rgb(143, 143, 143)',
          fontSize: 12,
          lineHeight: '18px',
          textAlign: 'center',
        }}
      >
        AI 数据助手可能会出错。请核查重要信息。
      </div>
    </div>
  )
}

interface AIChatContainerProps {
  sessionId: string | null
  onTitleGenerated?: (sessionId: string, title: string) => void
  ensureSession?: () => Promise<string>
}

export function AIChatContainer({
  sessionId,
  onTitleGenerated,
  ensureSession,
}: AIChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleTitleGenerated = useCallback(
    (title: string) => {
      if (sessionId && onTitleGenerated) {
        onTitleGenerated(sessionId, title)
      }
    },
    [sessionId, onTitleGenerated]
  )

  const skipNextLoadRef = useRef(false)
  const wrappedEnsureSession = useCallback(async () => {
    if (!ensureSession) throw new Error('no ensureSession')
    skipNextLoadRef.current = true
    return ensureSession()
  }, [ensureSession])

  const {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    clearMessages,
    loadMessages,
  } = useAIChat({
    sessionId,
    onTitleGenerated: handleTitleGenerated,
    ensureSession: ensureSession ? wrappedEnsureSession : undefined,
  })

  useEffect(() => {
    if (sessionId) {
      if (skipNextLoadRef.current) {
        skipNextLoadRef.current = false
      } else {
        loadMessages(sessionId)
      }
    } else {
      clearMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    const scrollNode = scrollRef.current
    if (!scrollNode) return
    scrollNode.scrollTop = scrollNode.scrollHeight
  }, [messages, isLoading])

  const hasMessages = messages.length > 0
  const renderedMessages = useMemo(() => messages, [messages])

  const handleSend = useCallback(
    (content: string) => {
      void sendMessage(content)
    },
    [sendMessage]
  )

  return (
    <div
      style={{
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgb(255, 255, 255)',
      }}
    >
      <div
        ref={scrollRef}
        style={{
          minHeight: 0,
          flex: 1,
          overflowY: 'auto',
          padding: '0 24px',
        }}
      >
        {hasMessages ? (
          <div
            style={{
              ...threadWidthStyle,
              padding: '8px 0 44px',
            }}
          >
            {renderedMessages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </div>
        ) : (
          <EmptyState onQuestionClick={handleSend} />
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '12px 24px 8px',
          background: 'rgb(255, 255, 255)',
        }}
      >
        <Composer
          isLoading={isLoading}
          onSend={handleSend}
          onStop={stopGeneration}
        />
      </div>
    </div>
  )
}
