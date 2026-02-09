import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop: () => void
  isLoading: boolean
}

const QUICK_QUESTIONS = [
  '今日通话统计',
  '高意向线索列表',
  '员工业绩排名',
  '本周跟进情况',
]

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput('')
    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isLoading, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 150)
      textarea.style.height = `${newHeight}px`
    }
  }

  return (
    <div className="space-y-3">
      {/* 快捷提问 */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <Button
              key={q}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onSend(q)}
            >
              {q}
            </Button>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="输入你的问题..."
          className="min-h-[40px] max-h-[150px] resize-none"
          rows={1}
          disabled={isLoading}
        />
        {isLoading ? (
          <Button
            size="icon"
            variant="destructive"
            onClick={onStop}
            className="shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
