import { createFileRoute } from '@tanstack/react-router'
import { TeacherSettlementsPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/teacher-settlements')({
  staticData: { title: '老师结算' },
  component: TeacherSettlementsPage,
})
