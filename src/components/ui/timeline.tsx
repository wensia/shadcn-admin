/**
 * Timeline 时间轴组件
 * 用于展示跟进记录、变更历史等时序数据
 * 支持 Mira/Lyra/Maia 三种风格
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

// ==================== Timeline 容器 ====================
interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Timeline({ className, children, ...props }: TimelineProps) {
  return (
    <div className={cn('relative', className)} {...props}>
      {children}
    </div>
  )
}

// ==================== TimelineItem 项目 ====================
interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function TimelineItem({ className, children, ...props }: TimelineItemProps) {
  return (
    <div
      className={cn('relative flex gap-4 pb-6 last:pb-0', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ==================== TimelineNode 节点 ====================
type NodeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'purple' | 'muted'

interface TimelineNodeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: NodeVariant
  icon?: React.ReactNode
  showConnector?: boolean
}

const nodeVariantClasses: Record<NodeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-white',
  destructive: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
  purple: 'bg-purple-500 text-white',
  muted: 'bg-muted text-muted-foreground',
}

export function TimelineNode({
  className,
  variant = 'default',
  icon,
  showConnector = true,
  ...props
}: TimelineNodeProps) {
  const s = useStyleClasses()

  return (
    <div className="relative flex flex-col items-center">
      {/* 节点圆点/图标 */}
      <div
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full shrink-0',
          icon ? 'h-8 w-8' : 'h-3 w-3',
          nodeVariantClasses[variant],
          s.rounded === 'rounded-none' && icon && 'rounded-sm',
          className
        )}
        {...props}
      >
        {icon}
      </div>
      {/* 连接线 */}
      {showConnector && (
        <div
          className={cn(
            'absolute w-0.5 bg-border',
            icon ? 'top-8 h-[calc(100%+0.5rem)]' : 'top-3 h-[calc(100%+1rem)]'
          )}
        />
      )}
    </div>
  )
}

// ==================== TimelineConnector 连接线 (独立使用) ====================
interface TimelineConnectorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal'
}

export function TimelineConnector({
  className,
  orientation = 'vertical',
  ...props
}: TimelineConnectorProps) {
  return (
    <div
      className={cn(
        'bg-border',
        orientation === 'vertical' ? 'w-0.5 h-full' : 'h-0.5 w-full',
        className
      )}
      {...props}
    />
  )
}

// ==================== TimelineContent 内容区 ====================
interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function TimelineContent({
  className,
  children,
  ...props
}: TimelineContentProps) {
  const s = useStyleClasses()

  return (
    <div
      className={cn('flex-1 min-w-0 pt-0.5', s.text.xs, className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ==================== TimelineHeader 头部 ====================
interface TimelineHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function TimelineHeader({
  className,
  children,
  ...props
}: TimelineHeaderProps) {
  return (
    <div
      className={cn('flex items-center gap-2 mb-1.5', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ==================== TimelineTitle 标题 ====================
interface TimelineTitleProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function TimelineTitle({
  className,
  children,
  ...props
}: TimelineTitleProps) {
  const s = useStyleClasses()

  return (
    <p
      className={cn(s.text.sm, 'font-medium', className)}
      {...props}
    >
      {children}
    </p>
  )
}

// ==================== TimelineDescription 描述 ====================
interface TimelineDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function TimelineDescription({
  className,
  children,
  ...props
}: TimelineDescriptionProps) {
  const s = useStyleClasses()

  return (
    <p
      className={cn(s.text.xs, 'text-muted-foreground', className)}
      {...props}
    >
      {children}
    </p>
  )
}

// ==================== TimelineBody 内容主体 ====================
interface TimelineBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function TimelineBody({
  className,
  children,
  ...props
}: TimelineBodyProps) {
  const s = useStyleClasses()

  return (
    <div
      className={cn('mt-2 p-3 rounded-md bg-muted/50', s.text.xs, s.rounded, className)}
      {...props}
    >
      {children}
    </div>
  )
}
