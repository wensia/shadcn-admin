/**
 * 顾问看板旧路由（已合并到顾问数据中心）
 * 路径: /crm/data-statistics/advisor → redirect → /crm/advisor-center?tab=overview
 */

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/crm/data-statistics/advisor')({
  beforeLoad: () => {
    throw redirect({ to: '/crm/advisor-center', search: { tab: 'overview' } })
  },
})
