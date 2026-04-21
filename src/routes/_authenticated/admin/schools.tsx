/**
 * 学校管理路由
 * 路径: /admin/schools
 */

import { createFileRoute } from '@tanstack/react-router'
import { SchoolsPage } from '@/features/admin/pages/schools-page'

export const Route = createFileRoute('/_authenticated/admin/schools')({
  staticData: { title: '学校管理' },
  component: SchoolsPage
})
