import { createFileRoute } from '@tanstack/react-router'
import { TeachersPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/teachers')({
  staticData: { title: '老师管理' },
  component: TeachersPage,
})
