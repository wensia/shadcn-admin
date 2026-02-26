/**
 * 临时DISC记录路由
 * 路径: /hr/temp-disc-records
 */

import { createFileRoute } from '@tanstack/react-router'
import { TempDiscRecordsPage } from '@/features/admin/pages/temp-disc-records-page'

export const Route = createFileRoute('/_authenticated/hr/temp-disc-records')({
  component: TempDiscRecordsPage,
})
