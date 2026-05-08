import { createFileRoute } from '@tanstack/react-router'
import { CoursePackagesPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/packages')({
  staticData: { title: '课程课包' },
  component: CoursePackagesPage,
})
