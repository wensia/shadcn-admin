/**
 * 云客通话记录页面路由
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeCallRecordsPage } from '@/features/yunke/pages/yunke-call-records-page'

export const Route = createFileRoute('/_authenticated/yunke/call-records')({
  component: YunkeCallRecordsPage
})
