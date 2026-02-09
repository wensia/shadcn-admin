import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCallInfo } from './use-ai-chat'

interface ChatToolIndicatorProps {
  toolCalls: ToolCallInfo[]
}

export function ChatToolIndicator({ toolCalls }: ChatToolIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const userToggledRef = useRef(false)

  const hasRunning = toolCalls.some((t) => t.status === 'running')
  const allDone = toolCalls.length > 0 && toolCalls.every((t) => t.status === 'done')

  useEffect(() => {
    if (userToggledRef.current) return
    if (hasRunning) {
      setIsExpanded(true)
    } else if (allDone) {
      setIsExpanded(false)
    }
  }, [hasRunning, allDone])

  if (!toolCalls.length) return null

  const doneCount = toolCalls.filter((t) => t.status === 'done').length

  const handleToggle = () => {
    userToggledRef.current = true
    setIsExpanded((prev) => !prev)
  }

  return (
    <div className="mb-2 rounded-lg border">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors rounded-lg"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-muted text-xs font-medium">
          {doneCount}
        </span>
        {hasRunning ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            正在执行...
          </span>
        ) : (
          <span className="text-muted-foreground">
            {doneCount} 个步骤已完成
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-2.5 space-y-1.5">
          {toolCalls.map((tool, index) => (
            <div key={`${tool.name}-${index}`} className="pl-1">
              <div className="flex items-center gap-2 text-sm">
                {tool.status === 'running' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                )}
                <span className="font-medium">{tool.displayName}</span>
                {tool.argsSummary && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground text-sm">
                      {tool.argsSummary}
                    </span>
                  </>
                )}
              </div>
              {tool.status === 'done' && tool.summary && (
                <div className={cn(
                  'ml-6 mt-0.5 text-xs text-muted-foreground/70'
                )}>
                  {tool.summary}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
