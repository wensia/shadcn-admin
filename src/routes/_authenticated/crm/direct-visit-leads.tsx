import { createFileRoute } from '@tanstack/react-router'

import { DirectVisitLeadsPage } from '@/features/crm/direct-visit-leads'

export const Route = createFileRoute('/_authenticated/crm/direct-visit-leads')({
  staticData: { title: '直访线索' },
  component: DirectVisitLeadsPage,
})
