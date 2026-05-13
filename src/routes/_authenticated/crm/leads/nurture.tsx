/**
 * 长期跟进路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { LongTermFollowupPage } from '@/features/crm/leads'

export const Route = createFileRoute('/_authenticated/crm/leads/nurture')({
  staticData: { title: '长期跟进' },
  component: LongTermFollowupPage,
})
