/**
 * 区域部门配置路由
 * 路径: /admin/area-departments
 */

import { createFileRoute } from '@tanstack/react-router'
import { AreaDepartmentsPage } from '@/features/admin/pages/area-departments-page'

export const Route = createFileRoute('/_authenticated/admin/area-departments')({
  staticData: { title: '区域部门配置' },
  component: AreaDepartmentsPage
})
