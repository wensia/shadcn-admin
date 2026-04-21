import { createFileRoute } from '@tanstack/react-router'
import { RedemptionManagePage } from '@/features/tools/redemption/pages/redemption-manage-page'

export const Route = createFileRoute('/_authenticated/tools/redemption-codes')({
  staticData: { title: '兑换码管理' },
  component: RedemptionManagePage,
})
