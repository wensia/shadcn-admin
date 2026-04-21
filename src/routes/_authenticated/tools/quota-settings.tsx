import { createFileRoute } from '@tanstack/react-router'
import { QuotaManagePage } from '@/features/tools/quota/pages/quota-manage-page'

export const Route = createFileRoute('/_authenticated/tools/quota-settings')({
  staticData: { title: '用量配额' },
  component: QuotaManagePage,
})
