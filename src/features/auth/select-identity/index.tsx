/**
 * 身份选择页面
 * 多身份用户登录后，在此页面选择工作身份
 */

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Spin } from '@douyinfe/semi-ui-19'
import { motion } from 'motion/react'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth-store'
import type { IdentityInfo } from '@/stores/auth-store'
import { AuthLayout } from '../auth-layout'
import { IdentityCard } from './components/identity-card'
import { getIdentityScopeName } from './utils'

export function SelectIdentity() {
  const navigate = useNavigate()
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const { availableIdentities, selectIdentity } = useAuthStore()

  // 按 is_last_used 排序，上次使用的排在前面
  const sortedIdentities = [...availableIdentities].sort((a, b) => {
    if (a.is_last_used && !b.is_last_used) return -1
    if (!a.is_last_used && b.is_last_used) return 1
    return 0
  })

  // 如果没有可用身份，跳回登录页
  if (availableIdentities.length === 0) {
    navigate({ to: '/sign-in', replace: true })
    return null
  }

  async function handleSelect(identity: IdentityInfo) {
    if (selectingId) return
    setSelectingId(identity.id)

    try {
      const result = await selectIdentity(identity.id)
      toast.success(`已切换到 ${getIdentityScopeName(identity)}`)

      // 更新可用身份的 is_last_used 标记
      const updatedIdentities = availableIdentities.map((item) => ({
        ...item,
        is_last_used: item.id === identity.id,
      }))
      useAuthStore.getState().setAvailableIdentities(updatedIdentities)

      // 用返回的 user 信息完成认证
      useAuthStore.getState().setAuthState(
        useAuthStore.getState().accessToken,
        useAuthStore.getState().refreshToken,
        result.user
      )

      navigate({ to: '/', replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : '选择身份失败'
      toast.error(message)
    } finally {
      setSelectingId(null)
    }
  }

  return (
    <AuthLayout>
      <div style={{ marginBottom: 32 }}>
        <h2 className='text-[1.625rem] font-semibold tracking-tight text-[#141413]'>
          选择工作身份
        </h2>
        <p className='mt-2 text-[0.9rem] text-[#8a8880]'>
          您拥有多个工作身份，请选择本次使用的身份
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sortedIdentities.map((identity, index) => (
          <motion.div
            key={identity.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
          >
            <IdentityCard
              identity={identity}
              isSelecting={selectingId === identity.id}
              disabled={selectingId !== null && selectingId !== identity.id}
              onClick={() => handleSelect(identity)}
            />
          </motion.div>
        ))}
      </div>

      {selectingId && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 20,
          color: 'var(--semi-color-text-2)',
          fontSize: 14,
        }}>
          <Spin size='small' />
          <span>正在切换身份...</span>
        </div>
      )}
    </AuthLayout>
  )
}

// 重新导出工具函数
export { getIdentityScopeName, getScopeTypeLabel } from './utils'
