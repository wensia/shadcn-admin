import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop: () => void
  isLoading: boolean
}

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput('')
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

  const canSend = input.trim().length > 0

  return (
    <div className="border rounded-[16px] flex flex-col">
      {/* 输入框 */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="输入你的问题..."
        className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm placeholder:text-foreground/40 focus:outline-none"
        style={{ maxHeight: '150px' }}
        rows={1}
        disabled={isLoading}
      />

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end px-3 pb-2">
        {isLoading ? (
          <button
            onClick={onStop}
            className="bg-foreground text-background rounded-[8px] h-8 w-8 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="bg-foreground text-background rounded-[8px] h-8 w-8 flex items-center justify-center transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
