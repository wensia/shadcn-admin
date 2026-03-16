/**
 * 咨询数据统计旧路由（已合并到顾问数据中心）
 * 路径: /crm/data-statistics/consulting → redirect → /crm/advisor-center?tab=call-stats
 */

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/crm/data-statistics/consulting')({
  beforeLoad: () => {
    throw redirect({ to: '/crm/advisor-center', search: { tab: 'call-stats' } })
  },
})
