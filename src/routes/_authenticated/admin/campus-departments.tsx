/**
 * 校区部门配置路由
 * 路径: /admin/campus-departments
 */

import { createFileRoute } from '@tanstack/react-router'
import { CampusDepartmentsPage } from '@/features/admin/pages/campus-departments-page'

export const Route = createFileRoute('/_authenticated/admin/campus-departments')({
  component: CampusDepartmentsPage
})
