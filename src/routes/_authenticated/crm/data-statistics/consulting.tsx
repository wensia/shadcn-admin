/**
 * 咨询数据统计页面路由
 * 路径: /crm/data-statistics/consulting
 */

import { createFileRoute } from '@tanstack/react-router'
import { ConsultingStatisticsPage } from '@/features/crm/data-statistics/consulting-statistics-page'

export const Route = createFileRoute('/_authenticated/crm/data-statistics/consulting')({
  component: ConsultingStatisticsPage
})
