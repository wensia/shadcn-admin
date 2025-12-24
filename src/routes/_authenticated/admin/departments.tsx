/**
 * 部门管理路由
 * 路径: /admin/departments
 */

import { createFileRoute } from '@tanstack/react-router'
import { DepartmentsPage } from '@/features/admin/pages/departments-page'

export const Route = createFileRoute('/_authenticated/admin/departments')({
  component: DepartmentsPage
})
