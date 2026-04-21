import { createFileRoute } from '@tanstack/react-router'
import { AssignmentTasksPage } from '@/features/crm/lead-assignment-tasks'

export const Route = createFileRoute(
  '/_authenticated/crm/leads/assignment-tasks/'
)({
  staticData: { title: '分配任务' },
  component: AssignmentTasksPage,
})
