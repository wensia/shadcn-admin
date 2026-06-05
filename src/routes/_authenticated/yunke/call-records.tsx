/**
 * 云客通话记录页面路由
 */

import { useCallback } from 'react'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { YunkeCallRecordsPage } from '@/features/yunke/pages/yunke-call-records-page'

export const Route = createFileRoute('/_authenticated/yunke/call-records')({
  staticData: { title: '云客通话记录' },
  component: YunkeCallRecordsRoute
})

function YunkeCallRecordsRoute() {
  const navigate = Route.useNavigate()
  const { recordId } = useParams({ strict: false })
  const activeRecordId = typeof recordId === 'string' ? recordId : undefined

  const handleOpenRecord = useCallback((recordId: string) => {
    navigate({ to: '/yunke/call-records/$recordId', params: { recordId } })
  }, [navigate])

  const handleCloseRecord = useCallback(() => {
    navigate({ to: '/yunke/call-records', replace: true })
  }, [navigate])

  return (
    <YunkeCallRecordsPage
      recordRoute={{
        activeRecordId,
        onOpenRecord: handleOpenRecord,
        onCloseRecord: handleCloseRecord,
      }}
    />
  )
}
