import { createFileRoute } from '@tanstack/react-router'
import { BalancesPage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/balances')({
  staticData: { title: '课时余额' },
  component: BalancesPage,
})
