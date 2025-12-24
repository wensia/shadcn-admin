/**
 * 临时DISC记录路由
 * 路径: /admin/temp-disc-records
 */

import { createFileRoute } from '@tanstack/react-router'
import { TempDiscRecordsPage } from '@/features/admin/pages/temp-disc-records-page'

export const Route = createFileRoute('/_authenticated/admin/temp-disc-records')({
  component: TempDiscRecordsPage
})
