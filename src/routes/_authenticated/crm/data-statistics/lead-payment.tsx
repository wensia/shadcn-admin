/**
 * 线索与缴费统计页面路由
 * 路径: /crm/data-statistics/lead-payment
 */

import { createFileRoute } from '@tanstack/react-router'
import { LeadPaymentStatisticsPage } from '@/features/crm/lead-payment-statistics'

export const Route = createFileRoute('/_authenticated/crm/data-statistics/lead-payment')({
  staticData: { title: '线索缴费统计' },
  component: LeadPaymentStatisticsPage,
})
