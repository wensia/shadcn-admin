/**
 * 市场部数据统计页面路由
 * 路径: /crm/data-statistics/marketing
 */

import { createFileRoute } from '@tanstack/react-router'
import { MarketingStatisticsPage } from '@/features/crm/data-statistics/marketing-statistics-page'

export const Route = createFileRoute('/_authenticated/crm/data-statistics/marketing')({
  component: MarketingStatisticsPage
})
