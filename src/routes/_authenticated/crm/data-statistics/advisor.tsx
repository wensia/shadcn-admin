/**
 * 顾问看板页面路由
 * 路径: /crm/data-statistics/advisor
 */

import { createFileRoute } from '@tanstack/react-router'
import { AdvisorDashboardPage } from '@/features/crm/data-statistics/advisor-dashboard-page'

export const Route = createFileRoute('/_authenticated/crm/data-statistics/advisor')({
  component: AdvisorDashboardPage,
})
