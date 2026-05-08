import { createFileRoute } from '@tanstack/react-router'
import { StudentsPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/students')({
  staticData: { title: '学员管理' },
  component: StudentsPage,
})
