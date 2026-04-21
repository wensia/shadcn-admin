/**
 * 定时任务管理路由
 * 路径: /admin/scheduled-tasks
 */

import { createFileRoute } from '@tanstack/react-router'
import { ScheduledTasksPage } from '@/features/admin/pages/scheduled-tasks-page'

export const Route = createFileRoute('/_authenticated/admin/scheduled-tasks')({
  staticData: { title: '定时任务' },
  component: ScheduledTasksPage
})
