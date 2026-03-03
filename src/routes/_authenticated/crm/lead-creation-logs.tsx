import { createFileRoute } from '@tanstack/react-router'
import { LeadCreationLogsPage } from '@/features/crm/lead-creation-logs'

export const Route = createFileRoute('/_authenticated/crm/lead-creation-logs')({
  component: LeadCreationLogsPage,
})
