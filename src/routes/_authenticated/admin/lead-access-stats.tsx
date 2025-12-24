/**
 * 线索查看统计路由
 * 路径: /admin/lead-access-stats
 */

import { createFileRoute } from '@tanstack/react-router'
import { LeadAccessStatsPage } from '@/features/admin/pages/lead-access-stats-page'

export const Route = createFileRoute('/_authenticated/admin/lead-access-stats')({
  component: LeadAccessStatsPage
})
