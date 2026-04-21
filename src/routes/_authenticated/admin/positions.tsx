/**
 * 职位管理路由
 * 路径: /admin/positions
 */

import { createFileRoute } from '@tanstack/react-router'
import { PositionsPage } from '@/features/admin/pages/positions-page'

export const Route = createFileRoute('/_authenticated/admin/positions')({
  staticData: { title: '职位管理' },
  component: PositionsPage
})
