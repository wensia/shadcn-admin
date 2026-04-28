import { createFileRoute } from '@tanstack/react-router'
import { XiaoditangPage } from '@/features/crm/xiaoditui'

export const Route = createFileRoute('/_authenticated/crm/xiaoditui')({
  staticData: { title: '小地推' },
  component: XiaoditangPage,
})
