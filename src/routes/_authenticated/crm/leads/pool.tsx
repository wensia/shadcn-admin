/**
 * 公海线索页面路由
 * 路径: /crm/leads/pool
 */

import { createFileRoute } from '@tanstack/react-router'
import { LeadsPoolPage } from '@/features/crm/leads-pool'

export const Route = createFileRoute('/_authenticated/crm/leads/pool')({
  staticData: { title: '公海线索' },
  component: LeadsPoolPage
})
