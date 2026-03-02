import { useState, useEffect, useRef } from 'react'
import { ChevronRight, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'
import type { ToolCallInfo } from './use-ai-chat'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SIZE_CONFIG = {
  fontSize: 'text-[13px]',
  iconSize: 'w-3 h-3',
  spinnerSize: 'text-[10px]',
  activityRowHeight: 24,
  maxVisibleActivities: 15,
  staggeredAnimationLimit: 10,
}

// ---------------------------------------------------------------------------
// ActivityStatusIcon – spinner ↔ checkmark crossfade
// ---------------------------------------------------------------------------

function ActivityStatusIcon({ status }: { status: 'running' | 'done' }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="shrink-0"
      >
        {status === 'running' ? (
          <div className={cn(SIZE_CONFIG.iconSize, 'flex items-center justify-center shrink-0')}>
            <Spinner className={SIZE_CONFIG.spinnerSize} />
          </div>
        ) : (
          <CheckCircle2 className={cn(SIZE_CONFIG.iconSize, 'shrink-0 text-green-500')} />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// ActivityRow – single tool‑call row
// ---------------------------------------------------------------------------

function ActivityRow({ tool }: { tool: ToolCallInfo }) {
  return (
    <div className={cn('flex items-center gap-2 py-0.5 text-muted-foreground', SIZE_CONFIG.fontSize)}>
      <ActivityStatusIcon status={tool.status} />
      <span className="font-medium truncate">{tool.displayName}</span>
      {tool.argsSummary && (
        <>
          <span className="text-foreground/30">&middot;</span>
          <span className="text-foreground/50 truncate">{tool.argsSummary}</span>
        </>
      )}
      {tool.status === 'done' && tool.summary && (
        <>
          <span className="text-foreground/30">&middot;</span>
          <span className="text-foreground/40 truncate">{tool.summary}</span>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preview text helper
// ---------------------------------------------------------------------------

function getPreviewText(toolCalls: ToolCallInfo[], hasRunning: boolean): string {
  if (hasRunning) {
    const runningTools = toolCalls.filter((t) => t.status === 'running')
    return runningTools.map((t) => t.displayName).slice(0, 3).join(', ') + '...'
  }
  const doneCount = toolCalls.filter((t) => t.status === 'done').length
  return `${doneCount} 个步骤已完成`
}

// ---------------------------------------------------------------------------
// ChatToolIndicator – main exported component
// ---------------------------------------------------------------------------

interface ChatToolIndicatorProps {
  toolCalls: ToolCallInfo[]
  isThinking?: boolean
  isBuffering?: boolean
}

export function ChatToolIndicator({
  toolCalls,
  isThinking = false,
  isBuffering = false,
}: ChatToolIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const userToggledRef = useRef(false)

  const hasRunning = toolCalls.some((t) => t.status === 'running')
  const allDone = toolCalls.length > 0 && toolCalls.every((t) => t.status === 'done')

  // Auto expand/collapse unless the user has manually toggled.
  // Don't auto-collapse while isThinking — the thinking indicator
  // lives inside the expanded section and must remain visible during
  // the "awaiting" phase (tools done, response not yet started).
  useEffect(() => {
    if (userToggledRef.current) return
    const nextExpanded = hasRunning || isThinking ? true : allDone && !isThinking ? false : null
    if (nextExpanded === null) return
    const syncTimer = window.setTimeout(() => {
      setIsExpanded(nextExpanded)
    }, 0)
    return () => window.clearTimeout(syncTimer)
  }, [hasRunning, allDone, isThinking])

  if (!toolCalls.length) return null

  const previewText = getPreviewText(toolCalls, hasRunning)

  const toggleExpanded = () => {
    userToggledRef.current = true
    setIsExpanded((prev) => !prev)
  }

  return (
    <div className="mb-2">
      {/* ---- Header button ---- */}
      <button
        onClick={toggleExpanded}
        className={cn(
          'flex items-center gap-2 w-full pl-2.5 pr-1.5 py-1.5 rounded-[8px] text-left',
          SIZE_CONFIG.fontSize,
          'text-muted-foreground',
          'hover:bg-muted/50 transition-colors'
        )}
      >
        {/* Chevron */}
        <motion.div
          initial={false}
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(SIZE_CONFIG.iconSize, 'flex items-center justify-center shrink-0')}
        >
          <ChevronRight className={SIZE_CONFIG.iconSize} />
        </motion.div>

        {/* Step count badge */}
        <span className="-ml-0.5 shrink-0 px-1.5 py-0.5 rounded-[4px] bg-background shadow-minimal text-[10px] font-medium tabular-nums">
          {toolCalls.length}
        </span>

        {/* Preview text with crossfade */}
        <span className="relative flex-1 min-w-0 h-5 flex items-center">
          <AnimatePresence initial={false}>
            <motion.span
              key={previewText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 truncate"
            >
              {previewText}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>

      {/* ---- Expandable activity list ---- */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.15 },
            }}
            className="overflow-hidden"
          >
            <div className="pl-4 pr-2 py-0 space-y-0.5 border-l-2 border-muted ml-[13px]">
              {/* Activity rows with stagger animation */}
              {toolCalls.map((tool, index) => (
                <motion.div
                  key={`${tool.name}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay:
                      index < SIZE_CONFIG.staggeredAnimationLimit
                        ? index * 0.03
                        : 0.3,
                  }}
                >
                  <ActivityRow tool={tool} />
                </motion.div>
              ))}

              {/* Thinking indicator at bottom */}
              {isThinking && (
                <motion.div
                  key="thinking"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex items-center gap-2 py-0.5 text-muted-foreground/70',
                    SIZE_CONFIG.fontSize
                  )}
                >
                  <Spinner className={SIZE_CONFIG.spinnerSize} />
                  <span>{isBuffering ? '正在生成回复...' : '正在思考...'}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
