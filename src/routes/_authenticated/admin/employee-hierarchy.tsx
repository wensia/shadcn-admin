/**
 * 管理层级路由
 * 路径: /admin/employee-hierarchy
 */

import { createFileRoute } from '@tanstack/react-router'
import { EmployeeHierarchyPage } from '@/features/admin/pages/employee-hierarchy-page'

export const Route = createFileRoute('/_authenticated/admin/employee-hierarchy')({
  staticData: { title: '管理层级' },
  component: EmployeeHierarchyPage
})
