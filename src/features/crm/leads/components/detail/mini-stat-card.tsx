/**
 * MiniStatCard 迷你统计卡片组件 - Semi Design 版本
 */

import * as React from 'react'

type StatVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface MiniStatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
  variant?: StatVariant
  progress?: number
  highlight?: boolean
  className?: string
}

const variantColors: Record<StatVariant, string> = {
  default: 'var(--semi-color-text-0)',
  success: '#00b42a',
  warning: '#ff7d00',
  danger: '#f53f3f',
  info: '#0077fa',
}

const progressColors: Record<StatVariant, string> = {
  default: 'var(--semi-color-primary)',
  success: '#00b42a',
  warning: '#ff7d00',
  danger: '#f53f3f',
  info: '#0077fa',
}

export function MiniStatCard({
  icon,
  label,
  value,
  subtext,
  variant = 'default',
  progress,
  highlight = false,
  className,
}: MiniStatCardProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        background: highlight ? '#fef2f2' : 'var(--semi-color-bg-0)',
        border: `1px solid ${highlight ? '#fca5a5' : 'var(--semi-color-border)'}`,
        borderRadius: 6,
        transition: 'background-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--semi-color-text-2)', fontSize: 14 }}>
          {icon}
        </span>
        <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: variantColors[variant] }}>
        {value}
      </div>
      {subtext && (
        <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {subtext}
        </span>
      )}
      {progress !== undefined && (
        <div style={{ marginTop: 8, height: 6, background: 'var(--semi-color-fill-0)', borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 3,
              transition: 'width 0.3s',
              backgroundColor: progressColors[variant],
              width: `${Math.min(100, Math.max(0, progress))}%`,
            }}
          />
        </div>
      )}
    </div>
  )
}
