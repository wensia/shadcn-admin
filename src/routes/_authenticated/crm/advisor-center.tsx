/**
 * 顾问数据中心路由
 * 路径: /crm/advisor-center
 * 合并了原「顾问看板」、「数据统计」、「任务战情」三个页面
 */

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AdvisorCenterPage } from '@/features/crm/data-statistics'

export const Route = createFileRoute('/_authenticated/crm/advisor-center')({
  staticData: { title: '顾问数据中心' },
  validateSearch: z.object({
    tab: z.enum(['overview', 'call-stats', 'tasks', 'followup-analysis']).optional().catch('overview'),
  }),
  component: AdvisorCenterPage,
})
