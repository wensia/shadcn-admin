/**
 * 员工管理路由
 * 路径: /admin/employees
 */

import { createFileRoute } from '@tanstack/react-router'
import { EmployeesPage } from '@/features/admin/pages/employees-page'

export const Route = createFileRoute('/_authenticated/admin/employees')({
  staticData: { title: '员工管理' },
  component: EmployeesPage
})
