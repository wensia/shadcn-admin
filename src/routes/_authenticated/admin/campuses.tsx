/**
 * 校区管理路由
 * 路径: /admin/campuses
 */

import { createFileRoute } from '@tanstack/react-router'
import { CampusesPage } from '@/features/admin/pages/campuses-page'

export const Route = createFileRoute('/_authenticated/admin/campuses')({
  staticData: { title: '校区管理' },
  component: CampusesPage
})
