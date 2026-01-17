/**
 * 日控表路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { DailyControlPage } from '@/features/crm/daily-control'

export const Route = createFileRoute('/_authenticated/crm/visit-schedule')({
  component: DailyControlPage,
})
