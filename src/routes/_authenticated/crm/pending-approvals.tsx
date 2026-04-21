/**
 * 待审批订单路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { PendingApprovalsPage } from '@/features/crm/orders'

export const Route = createFileRoute('/_authenticated/crm/pending-approvals')({
  staticData: { title: '待审批' },
  component: PendingApprovalsPage,
})
