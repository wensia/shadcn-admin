/**
 * PreviewHeader - Shared header component for overlay previews
 *
 * Provides a consistent header with:
 * - Left side: badge row (children)
 * - Right side: actions + close button
 * - Configurable height
 */

import * as React from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '../utils'

export type PreviewBadgeVariant =
  | 'gray'
  | 'blue'
  | 'green'
  | 'orange'
  | 'red'
  | 'purple'
  | 'yellow'
  | 'cyan'

const BADGE_VARIANT_CLASSES: Record<PreviewBadgeVariant, string> = {
  gray: 'bg-foreground/5 text-foreground/70',
  blue: 'bg-primary/10 text-primary',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
}

export interface PreviewHeaderBadgeProps {
  icon?: LucideIcon
  label: string
  variant?: PreviewBadgeVariant
  onClick?: () => void
  title?: string
  shrinkable?: boolean
}

export function PreviewHeaderBadge({
  icon: Icon,
  label,
  variant = 'gray',
  onClick,
  title,
  shrinkable,
}: PreviewHeaderBadgeProps) {
  const classes = cn(
    'flex items-center gap-1.5 h-[26px] px-2.5 rounded-[6px]',
    'font-sans text-[13px] font-medium',
    'bg-background shadow-minimal',
    BADGE_VARIANT_CLASSES[variant],
    shrinkable && 'min-w-0',
    onClick && 'cursor-pointer hover:opacity-80',
  )

  const content = (
    <>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span className={shrinkable ? 'truncate' : undefined}>{label}</span>
    </>
  )

  if (onClick) {
    return (
      <button className={classes} onClick={onClick} title={title}>
        {content}
      </button>
    )
  }

  return (
    <div className={classes} title={title}>
      {content}
    </div>
  )
}

export interface PreviewHeaderProps {
  onClose: () => void
  height?: number
  rightActions?: React.ReactNode
  children?: React.ReactNode
}

export function PreviewHeader({
  onClose,
  height = 48,
  rightActions,
  children,
}: PreviewHeaderProps) {
  return (
    <div
      className="flex items-center gap-2 px-4 shrink-0"
      style={{ height }}
    >
      {/* Badge row — left side */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
        {children}
      </div>

      {/* Right side — actions + close */}
      <div className="flex items-center gap-1.5 shrink-0">
        {rightActions}
        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-[6px] bg-background shadow-minimal cursor-pointer',
            'opacity-70 hover:opacity-100 transition-opacity',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          )}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
