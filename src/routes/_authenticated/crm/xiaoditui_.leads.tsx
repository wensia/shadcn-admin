import { createFileRoute } from '@tanstack/react-router'
import { XiaodituiLeadDetailsPage } from '@/features/crm/xiaoditui'

export const Route = createFileRoute('/_authenticated/crm/xiaoditui_/leads')({
  staticData: { title: '名单明细' },
  component: XiaodituiLeadDetailsPage,
})
