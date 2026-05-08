import { createFileRoute } from '@tanstack/react-router'
import { ParentsPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/parents')({
  staticData: { title: '家长管理' },
  component: ParentsPage,
})
