/**
 * 区域管理路由
 * 路径: /admin/areas
 */

import { createFileRoute } from '@tanstack/react-router'
import { AreasPage } from '@/features/admin/pages/areas-page'

export const Route = createFileRoute('/_authenticated/admin/areas')({
  component: AreasPage
})
