/**
 * CRM 通话记录页面路由（复用云客通话记录页面组件）
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeCallRecordsPage } from '@/features/yunke/pages/yunke-call-records-page'

export const Route = createFileRoute('/_authenticated/crm/call-records')({
  component: YunkeCallRecordsPage,
})
