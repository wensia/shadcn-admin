import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, PanelLeft, Square, Star } from 'lucide-react'
import { Button, Tag, TextArea, Typography } from '@douyinfe/semi-ui-19'
import type { TrainingMessage, TrainingSession } from './coach-types'

const { Text } = Typography

const STAGE_LABELS: Record<string, string> = {
  opening: '开场建立联系',
  discovery: '需求摸底',
  pitch: '价值呈现',
  objection: '异议处理',
  closing: '收口邀约',
}

function MessageBubble({ message }: { message: TrainingMessage }) {
  const isAdvisor = message.role === 'user'

  return (
    <div className={`flex ${isAdvisor ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isAdvisor ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{isAdvisor ? '顾问' : '家长'}</span>
          {message.stage && <span>{STAGE_LABELS[message.stage] || message.stage}</span>}
        </div>
        <div
          className="rounded-[22px] px-4 py-3 text-sm leading-7"
          style={{
            background: isAdvisor
              ? 'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))'
              : 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,247,237,0.94))',
            color: isAdvisor ? '#F8FAFC' : '#0F172A',
            border: isAdvisor ? 'none' : '1px solid rgba(148, 163, 184, 0.18)',
            boxShadow: isAdvisor ? '0 18px 28px rgba(15, 23, 42, 0.14)' : '0 10px 22px rgba(15, 23, 42, 0.05)',
          }}
        >
          {message.content || (message.isStreaming ? '...' : '')}
          {!message.content && message.thinking ? (
            <div className="text-xs text-slate-400">{message.thinking}</div>
          ) : null}
        </div>
        {message.thinking && message.content ? (
          <div className="max-w-[80%] text-xs leading-6 text-slate-400">
            {message.thinking}
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface CoachTextPanelProps {
  session: TrainingSession | null
  messages: TrainingMessage[]
  currentStage: string | null
  isLoading: boolean
  onSend: (message: string) => void
  onStop: () => void
  onGenerateReview: () => void
  onOpenSidebar?: () => void
  onOpenReview?: () => void
  hasReview: boolean
}

export function CoachTextPanel({
  session,
  messages,
  currentStage,
  isLoading,
  onSend,
  onStop,
  onGenerateReview,
  onOpenSidebar,
  onOpenReview,
  hasReview,
}: CoachTextPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages])

  const stageLabel = useMemo(
    () => (currentStage ? (STAGE_LABELS[currentStage] || currentStage) : '等待顾问开场'),
    [currentStage]
  )

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <section
      className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-[28px] border"
      style={{
        borderColor: 'rgba(148, 163, 184, 0.18)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))',
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4" style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {onOpenSidebar ? (
              <Button
                theme="borderless"
                type="tertiary"
                icon={<PanelLeft className="h-4 w-4" />}
                onClick={onOpenSidebar}
              />
            ) : null}
            <div className="truncate text-sm font-semibold text-slate-900">
              {session ? session.title : '先创建一场文字陪练'}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tag color="blue">文字陪练</Tag>
            <Tag type="light">{stageLabel}</Tag>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenReview ? (
            <Button theme="borderless" type="tertiary" icon={<Star className="h-4 w-4" />} onClick={onOpenReview}>
              {hasReview ? '查看评分' : '评分区'}
            </Button>
          ) : null}
          <Button type="primary" disabled={!session || messages.length < 2} onClick={onGenerateReview}>
            结束并评分
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {!session ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="text-xl font-semibold text-slate-900">先创建一场文字陪练</div>
              <Text type="tertiary" size="small" className="mt-3 block">
                建议先用 L1 和友好型家长热身，把开场、提问和课程价值表达顺一遍，再切到更高难度。
              </Text>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="text-xl font-semibold text-slate-900">先由顾问开第一句</div>
              <Text type="tertiary" size="small" className="mt-3 block">
                推荐从身份介绍、孩子年级和当前学习困扰切入，别一上来就报课和报价格。
              </Text>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t px-4 py-4" style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}>
        <div
          className="rounded-[24px] border bg-white/80 px-3 py-3"
          style={{ borderColor: 'rgba(148, 163, 184, 0.18)' }}
        >
          <TextArea
            value={input}
            onChange={(value) => setInput(value)}
            onKeyDown={handleKeyDown}
            placeholder="以顾问身份输入话术，例如：您好，我是 XX 校区的课程顾问，想了解下孩子最近数学学习的情况。"
            borderless
            autosize={{ minRows: 2, maxRows: 5 }}
          />
          <div className="mt-3 flex items-center justify-between">
            <Text type="tertiary" size="small">
              Enter 发送，Shift + Enter 换行
            </Text>
            {isLoading ? (
              <Button icon={<Square className="h-4 w-4" />} onClick={onStop}>
                停止
              </Button>
            ) : (
              <Button icon={<ArrowUp className="h-4 w-4" />} type="primary" onClick={handleSend} disabled={!input.trim()}>
                发送
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

