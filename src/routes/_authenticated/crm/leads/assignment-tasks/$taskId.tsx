import { createFileRoute } from '@tanstack/react-router'
import { AssignmentTaskDetailPage } from '@/features/crm/lead-assignment-tasks'

export const Route = createFileRoute(
  '/_authenticated/crm/leads/assignment-tasks/$taskId'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { taskId } = Route.useParams()
  return <AssignmentTaskDetailPage taskId={taskId} />
}
