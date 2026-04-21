import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { RedemptionGate } from '@/features/tools/redemption/components/redemption-gate'
import { XiaoshengchuPage } from './xiaoshengchu-page'
import { fetchConfig, type Config } from '../api'

export function XiaoshengchuPublicPage() {
  useDocumentTitle('小升初志愿模拟')
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [accessTicket, setAccessTicket] = useState<string | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  const hasAccess = isAuthenticated || !!accessTicket

  useEffect(() => {
    if (!hasAccess) return
    const ticket = isAuthenticated ? undefined : accessTicket ?? undefined
    setConfigError(null)
    fetchConfig(ticket)
      .then(setConfig)
      .catch((err: Error & { code?: string }) => {
        if (err.code === 'REDEMPTION_TICKET_INVALID' || err.code === 'REDEMPTION_TICKET_EXPIRED') {
          setAccessTicket(null)
          return
        }
        setConfigError(err.message || '加载配置失败')
      })
  }, [hasAccess, isAuthenticated, accessTicket])

  if (!hasAccess) {
    return (
      <RedemptionGate
        toolId="xiaoshengchu"
        onVerified={(ticket) => setAccessTicket(ticket)}
      />
    )
  }

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        {configError}
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    )
  }

  return (
    <XiaoshengchuPage
      config={config}
      accessTicket={accessTicket}
      isAuthenticated={isAuthenticated}
    />
  )
}
