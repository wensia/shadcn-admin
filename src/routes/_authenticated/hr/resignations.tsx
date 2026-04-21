/**
 * 离职审批路由
 * 路径: /hr/resignations
 */

import { createFileRoute } from '@tanstack/react-router'
import { ResignationsPage } from '@/features/hr/pages/resignations-page'

export const Route = createFileRoute('/_authenticated/hr/resignations')({
  staticData: { title: '离职审批' },
  component: ResignationsPage,
})
