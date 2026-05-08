import { createFileRoute } from '@tanstack/react-router'
import { LessonsPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/lessons')({
  staticData: { title: '排课管理' },
  component: LessonsPage,
})
