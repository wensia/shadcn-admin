import { createFileRoute } from '@tanstack/react-router'
import { ClassGroupsPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/classes')({
  staticData: { title: '班级管理' },
  component: ClassGroupsPage,
})
