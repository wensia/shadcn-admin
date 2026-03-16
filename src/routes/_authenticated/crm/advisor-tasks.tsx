/**
 * 顾问任务战情旧路由（已合并到顾问数据中心）
 * 路径: /crm/advisor-tasks → redirect → /crm/advisor-center?tab=tasks
 */

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/crm/advisor-tasks')({
  beforeLoad: () => {
    throw redirect({ to: '/crm/advisor-center', search: { tab: 'tasks' } })
  },
})
