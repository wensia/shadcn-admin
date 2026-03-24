/**
 * 身份指示器组件
 * 显示在侧边栏 Nav.Header 下方
 * - 显示当前身份的 scope 名称 + 部门·职位
 * - 多身份时显示 ▾ 图标，点击弹出切换面板
 * - 单身份时静态显示，不可点击
 */

import { useState, useCallback } from 'react'
import { Popover, Spin } from '@douyinfe/semi-ui-19'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { toast } from '@/lib/toast'
import {
  useAuthStore,
  useCurrentIdentity,
  useAvailableIdentities,
  useHasMultipleIdentities,
} from '@/stores/auth-store'
import type { IdentityInfo } from '@/stores/auth-store'
import { getIdentityScopeName } from '@/features/auth/select-identity/utils'
import { IdentityCard } from '@/features/auth/select-identity/components/identity-card'

interface IdentityIndicatorProps {
  collapsed?: boolean
}

export function IdentityIndicator({ collapsed = false }: IdentityIndicatorProps) {
  const currentIdentity = useCurrentIdentity()
  const availableIdentities = useAvailableIdentities()
  const hasMultiple = useHasMultipleIdentities()
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSwitch = useCallback(async (identity: IdentityInfo) => {
    if (switchingId) return
    if (identity.id === currentIdentity?.id) {
      setPopoverVisible(false)
      return
    }

    setSwitchingId(identity.id)
    try {
      await useAuthStore.getState().selectIdentity(identity.id)

      // 更新 is_last_used 标记
      const updatedIdentities = availableIdentities.map((item) => ({
        ...item,
        is_last_used: item.id === identity.id,
      }))
      useAuthStore.getState().setAvailableIdentities(updatedIdentities)

      toast.success(`已切换到 ${getIdentityScopeName(identity)}`)
      setPopoverVisible(false)

      // 清空所有数据缓存
      queryClient.invalidateQueries()

      // 如果当前页面可能无权限，跳到首页
      const restrictedPaths = ['/crm/', '/admin/', '/yunke/', '/hr/']
      const isRestricted = restrictedPaths.some((p) => location.pathname.startsWith(p))
      if (isRestricted) {
        navigate({ to: '/', replace: true })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '切换身份失败'
      toast.error(message)
    } finally {
      setSwitchingId(null)
    }
  }, [switchingId, currentIdentity, availableIdentities, queryClient, navigate, location.pathname])

  // 没有身份信息时不渲染
  if (!currentIdentity) return null

  const scopeName = getIdentityScopeName(currentIdentity)

  // 折叠态：只显示 scope 首字
  if (collapsed) {
    const abbr = scopeName.slice(0, 1)

    if (!hasMultiple) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 0',
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: 'var(--semi-color-primary-light-default)',
            color: 'var(--semi-color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {abbr}
          </div>
        </div>
      )
    }

    return (
      <Popover
        visible={popoverVisible}
        onVisibleChange={setPopoverVisible}
        trigger='click'
        position='rightTop'
        showArrow
        content={
          <IdentitySwitchPanel
            identities={availableIdentities}
            currentId={currentIdentity.id}
            switchingId={switchingId}
            onSwitch={handleSwitch}
          />
        }
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 0',
          cursor: 'pointer',
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: 'var(--semi-color-primary-light-default)',
            color: 'var(--semi-color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {abbr}
          </div>
        </div>
      </Popover>
    )
  }

  // 展开态
  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        cursor: hasMultiple ? 'pointer' : 'default',
        borderRadius: 6,
        transition: 'background-color 0.2s',
        margin: '0 8px',
      }}
      onMouseEnter={(e) => {
        if (hasMultiple) {
          e.currentTarget.style.backgroundColor = 'var(--semi-color-fill-0)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--semi-color-text-0)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}>
          {scopeName}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--semi-color-text-2)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}>
          {currentIdentity.department_name} · {currentIdentity.position_name}
        </div>
      </div>
      {hasMultiple && (
        <ChevronDown
          size={14}
          style={{
            color: 'var(--semi-color-text-2)',
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: popoverVisible ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      )}
    </div>
  )

  if (!hasMultiple) {
    return content
  }

  return (
    <Popover
      visible={popoverVisible}
      onVisibleChange={setPopoverVisible}
      trigger='click'
      position='bottomLeft'
      showArrow
      content={
        <IdentitySwitchPanel
          identities={availableIdentities}
          currentId={currentIdentity.id}
          switchingId={switchingId}
          onSwitch={handleSwitch}
        />
      }
    >
      {content}
    </Popover>
  )
}

/**
 * 身份切换面板（Popover 内容）
 */
function IdentitySwitchPanel({
  identities,
  currentId,
  switchingId,
  onSwitch,
}: {
  identities: IdentityInfo[]
  currentId: string
  switchingId: string | null
  onSwitch: (identity: IdentityInfo) => void
}) {
  // 当前身份排第一
  const sorted = [...identities].sort((a, b) => {
    if (a.id === currentId) return -1
    if (b.id === currentId) return 1
    return 0
  })

  return (
    <div style={{
      padding: 8,
      width: 300,
      maxHeight: 400,
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--semi-color-text-0)',
        padding: '4px 8px 8px',
      }}>
        切换工作身份
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((identity) => (
          <IdentityCard
            key={identity.id}
            identity={identity}
            isActive={identity.id === currentId}
            isSelecting={switchingId === identity.id}
            disabled={switchingId !== null && switchingId !== identity.id}
            compact
            onClick={() => onSwitch(identity)}
          />
        ))}
      </div>
      {switchingId && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 8,
          color: 'var(--semi-color-text-2)',
          fontSize: 12,
        }}>
          <Spin size='small' />
          <span>正在切换...</span>
        </div>
      )}
    </div>
  )
}
