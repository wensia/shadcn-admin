/**
 * 地区管理路由
 * 路径: /admin/districts
 */

import { createFileRoute } from '@tanstack/react-router'
import { DistrictsPage } from '@/features/admin/pages/districts-page'

export const Route = createFileRoute('/_authenticated/admin/districts')({
  staticData: { title: '地区管理' },
  component: DistrictsPage
})
