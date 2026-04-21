/**
 * 课程配置路由
 * 路径: /admin/courses
 */

import { createFileRoute } from '@tanstack/react-router'
import { CoursesPage } from '@/features/admin/pages/courses-page'

export const Route = createFileRoute('/_authenticated/admin/courses')({
  staticData: { title: '课程配置' },
  component: CoursesPage
})
