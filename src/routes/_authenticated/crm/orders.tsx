/**
 * 订单管理路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { OrdersPage } from '@/features/crm/orders'

export const Route = createFileRoute('/_authenticated/crm/orders')({
  component: OrdersPage,
})
