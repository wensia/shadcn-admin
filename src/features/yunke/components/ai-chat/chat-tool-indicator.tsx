import { useState, useEffect, useRef } from 'react'
import { ChevronRight, CheckCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
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
  const useStagger = toolCalls.length <= 10

  const handleToggle = () => {
    userToggledRef.current = true
    setIsExpanded((prev) => !prev)
  }

  return (
    <div className="mb-2">
      <div
        className="flex items-center gap-2 py-1.5 cursor-pointer group"
        onClick={handleToggle}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <ChevronRight className="h-3.5 w-3.5 text-foreground/60" />
        </motion.div>
        <span className="text-[13px] text-foreground/60">
          {hasRunning ? (
            <span className="inline-flex items-center gap-1.5">
              正在执行...
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          ) : (
            <>{doneCount} 个步骤已完成</>
          )}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-1 space-y-0.5">
              {toolCalls.map((tool, index) => (
                <motion.div
                  key={`${tool.name}-${index}`}
                  initial={useStagger ? { opacity: 0, x: -4 } : undefined}
                  animate={useStagger ? { opacity: 1, x: 0 } : undefined}
                  transition={useStagger ? { duration: 0.15, delay: index * 0.03 } : undefined}
                  className="flex items-center gap-2.5 h-6"
                >
                  {tool.status === 'running' ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-foreground/40" />
                  ) : (
                    <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
                  )}
                  <span className="text-[13px] font-medium">{tool.displayName}</span>
                  {tool.argsSummary && (
                    <>
                      <span className="text-foreground/30">&middot;</span>
                      <span className="text-[13px] text-foreground/50">{tool.argsSummary}</span>
                    </>
                  )}
                  {tool.status === 'done' && tool.summary && (
                    <>
                      <span className="text-foreground/30">&middot;</span>
                      <span className="text-[13px] text-foreground/40">{tool.summary}</span>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
