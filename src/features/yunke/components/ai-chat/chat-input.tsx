import { useState, useCallback, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { TextArea, Button as SemiButton } from '@douyinfe/semi-ui-19'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop: () => void
  isLoading: boolean
}

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput('')
  }, [input, isLoading, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = input.trim().length > 0

  return (
    <div className="border rounded-[16px] flex flex-col">
      {/* 输入框 */}
      <TextArea
        value={input}
        onChange={(value) => setInput(value)}
        onKeyDown={handleKeyDown}
        placeholder="输入你的问题..."
        autosize={{ minRows: 1, maxRows: 5 }}
        borderless
        style={{
          padding: '12px 16px',
          '--semi-color-focus-border': 'transparent',
        } as React.CSSProperties}
        disabled={isLoading}
      />

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end px-3 pb-2">
        {isLoading ? (
          <SemiButton
            theme="solid"
            onClick={onStop}
            className="bg-foreground text-background rounded-[8px] h-8 w-8 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <Square className="h-3.5 w-3.5" />
          </SemiButton>
        ) : (
          <SemiButton
            theme="solid"
            onClick={handleSend}
            disabled={!canSend}
            className="bg-foreground text-background rounded-[8px] h-8 w-8 flex items-center justify-center transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </SemiButton>
        )}
      </div>
    </div>
  )
}
