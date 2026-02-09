import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Format duration in human-readable form
 * @param ms Duration in milliseconds
 * @returns "45s" for under a minute, "1:02" for 1+ minutes
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Spinner - 3x3 grid spinner based on SpinKit Grid (from Agent Craft)
 *
 * Features:
 * - Uses currentColor (inherits text color from parent)
 * - Uses em sizing (scales with font-size)
 * - 3x3 grid of cubes with staggered scale animation
 * - Pure CSS animation (no JS state)
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('spinner', className)}
      role="status"
      aria-label="Loading"
    >
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
      <span className="spinner-cube" />
    </span>
  )
}

/**
 * LoadingIndicator - Spinner with optional label and elapsed time (from Agent Craft)
 *
 * Features:
 * - Animated 3x3 dot grid spinner (CSS-only)
 * - Optional label text
 * - Optional elapsed time display (e.g. "7s", "1:02")
 */
export function LoadingIndicator({
  label,
  showElapsed = false,
  className,
  spinnerClassName,
}: {
  label?: string
  showElapsed?: boolean | number
  className?: string
  spinnerClassName?: string
}) {
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!showElapsed) return

    if (typeof showElapsed === 'number') {
      startTimeRef.current = showElapsed
    } else if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
    }

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Date.now() - startTimeRef.current)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [showElapsed])

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Spinner className={spinnerClassName} />
      {label && <span className="text-muted-foreground">{label}</span>}
      {showElapsed && elapsed >= 1000 && (
        <span className="text-muted-foreground/60 tabular-nums">
          {formatDuration(elapsed)}
        </span>
      )}
    </span>
  )
}
