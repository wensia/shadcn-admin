/**
 * Leads页面路由
 * 路径: /crm/leads
 */

import { createFileRoute } from '@tanstack/react-router'
import { LeadsPage } from '@/features/crm/leads/leads-page'

export const Route = createFileRoute('/_authenticated/crm/leads')({
  component: LeadsPage
})
