import { createFileRoute } from '@tanstack/react-router'
import { CourseProductsPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/courses')({
  staticData: { title: '课程产品' },
  component: CourseProductsPage,
})
