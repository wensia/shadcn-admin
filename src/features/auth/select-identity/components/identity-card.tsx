/**
 * 身份卡片组件
 * 用于身份选择页面和侧边栏切换面板
 */

import { Spin, Tag } from '@douyinfe/semi-ui-19'
import { IconTick } from '@douyinfe/semi-icons'
import { Building2, MapPin, Globe, Map } from 'lucide-react'
import type { IdentityInfo } from '@/stores/auth-store'
import { getIdentityScopeName, getScopeTypeLabel } from '../utils'

interface IdentityCardProps {
  identity: IdentityInfo
  isSelecting?: boolean
  disabled?: boolean
  isActive?: boolean
  compact?: boolean
  onClick: () => void
}

const SCOPE_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  campus: Building2,
  area: MapPin,
  district: Map,
  region: Globe,
}

export function IdentityCard({
  identity,
  isSelecting = false,
  disabled = false,
  isActive = false,
  compact = false,
  onClick,
}: IdentityCardProps) {
  const ScopeIcon = SCOPE_ICONS[identity.scope_type] || Building2
  const scopeName = getIdentityScopeName(identity)
  const scopeLabel = getScopeTypeLabel(identity.scope_type)

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 10 : 14,
        padding: compact ? '10px 14px' : '16px 20px',
        borderRadius: 12,
        border: `1.5px solid ${isActive ? 'var(--semi-color-primary)' : 'var(--semi-color-border)'}`,
        backgroundColor: isActive
          ? 'var(--semi-color-primary-light-default)'
          : 'var(--semi-color-bg-0)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.borderColor = 'var(--semi-color-primary)'
          e.currentTarget.style.backgroundColor = 'var(--semi-color-fill-0)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.borderColor = 'var(--semi-color-border)'
          e.currentTarget.style.backgroundColor = 'var(--semi-color-bg-0)'
        }
      }}
    >
      {/* Scope 图标 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: compact ? 36 : 44,
        height: compact ? 36 : 44,
        borderRadius: 10,
        backgroundColor: isActive
          ? 'var(--semi-color-primary)'
          : 'var(--semi-color-fill-1)',
        color: isActive ? '#fff' : 'var(--semi-color-text-2)',
        flexShrink: 0,
        transition: 'all 0.2s ease',
      }}>
        <ScopeIcon size={compact ? 18 : 22} />
      </div>

      {/* 信息 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            fontSize: compact ? 14 : 16,
            fontWeight: 600,
            color: 'var(--semi-color-text-0)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {scopeName}
          </span>
          {!compact && (
            <Tag size='small' color='blue' style={{ flexShrink: 0 }}>
              {scopeLabel}
            </Tag>
          )}
          {identity.is_last_used && !isActive && !compact && (
            <Tag size='small' color='green' style={{ flexShrink: 0 }}>
              上次使用
            </Tag>
          )}
        </div>
        <div style={{
          fontSize: compact ? 12 : 13,
          color: 'var(--semi-color-text-2)',
          marginTop: compact ? 2 : 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {identity.department_name} · {identity.position_name}
        </div>
      </div>

      {/* 右侧状态 */}
      {isSelecting ? (
        <Spin size='small' style={{ flexShrink: 0 }} />
      ) : isActive ? (
        <IconTick
          size='large'
          style={{
            color: 'var(--semi-color-primary)',
            flexShrink: 0,
          }}
        />
      ) : null}
    </div>
  )
}
