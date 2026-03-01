/**
 * InfoCard 信息分组卡片组件 - Semi Design 版本
 */

import * as React from 'react'
import { IconChevronDown } from '@douyinfe/semi-icons'

interface InfoCardProps {
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  compact?: boolean
  hideTitle?: boolean
  className?: string
}

export function InfoCard({
  title,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true,
  compact = false,
  hideTitle = false,
  className,
}: InfoCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultExpanded)

  const showHeader = !hideTitle && title

  return (
    <div
      className={className}
      style={{
        border: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-bg-0)',
        padding: 16,
        borderRadius: 6,
      }}
    >
      {showHeader && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: collapsible ? 'pointer' : undefined,
          }}
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
        >
          {icon && (
            <span style={{ color: 'var(--semi-color-text-2)', fontSize: 14 }}>
              {icon}
            </span>
          )}
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</h3>
          {collapsible && (
            <IconChevronDown
              style={{
                marginLeft: 'auto',
                fontSize: 16,
                color: 'var(--semi-color-text-2)',
                transition: 'transform 0.2s',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          )}
        </div>
      )}
      {(!collapsible || isOpen) && (
        <div style={{ marginTop: showHeader ? (compact ? 8 : 12) : 0 }}>
          {children}
        </div>
      )}
    </div>
  )
}
