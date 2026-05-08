import { createFileRoute } from '@tanstack/react-router'
import { ConsumptionPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/consumption')({
  staticData: { title: '消课管理' },
  component: ConsumptionPage,
})
