/**
 * Admin Dashboard 路由
 * 路径: /admin/dashboard
 */

import { createFileRoute } from '@tanstack/react-router'
import { AdminDashboardPage } from '@/features/admin/pages/admin-dashboard'

export const Route = createFileRoute('/_authenticated/admin/dashboard')({
  staticData: { title: '系统概览' },
  component: AdminDashboardPage
})
