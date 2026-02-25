/**
 * 每日通知管理路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { DailyNoticesPage } from '@/features/admin/pages/daily-notices-page'

export const Route = createFileRoute('/_authenticated/admin/daily-notices')({
  component: DailyNoticesPage,
})
