/**
 * 大区管理路由
 * 路径: /admin/regions
 */

import { createFileRoute } from '@tanstack/react-router'
import { RegionsPage } from '@/features/admin/pages/regions-page'

export const Route = createFileRoute('/_authenticated/admin/regions')({
  component: RegionsPage
})
