/**
 * 云客仪表盘页面
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeDashboardPage } from '@/features/yunke/pages/yunke-dashboard-page'

export const Route = createFileRoute('/_authenticated/yunke/dashboard')({
  staticData: { title: '云客概览' },
  component: YunkeDashboardPage
})
