/**
 * EmptyState 空状态组件 - Semi Design 版本
 */

import * as React from 'react'
import { Button } from '@douyinfe/semi-ui-19'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{ marginBottom: 16, color: 'var(--semi-color-text-2)' }}>
          {React.cloneElement(icon as React.ReactElement<{ style?: React.CSSProperties }>, {
            style: { width: 48, height: 48 },
          })}
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--semi-color-text-0)', marginBottom: 4 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', maxWidth: 360 }}>
          {description}
        </div>
      )}
      {action && (
        <Button
          theme="light"
          onClick={action.onClick}
          style={{ marginTop: 16 }}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
